/** The operations screens call that combine several parts of the backend. */
import { clearDatabase, createBook, findByHash, getBook, sha256 } from "@/lib/db/books";
import type { Book, BookMetadata } from "@/lib/db/types";
import { extract, formatOf } from "@/lib/extract";
import { titleFromFileName } from "@/lib/extract/common";
import { bookFileName } from "@/lib/files/filename";
import { fileStore } from "@/lib/files/store";
import { SETTINGS_KEY } from "@/lib/settings";
import { requestPersistence, LAST_EXPORT_KEY } from "@/lib/storage";

export type AddResult =
  /** Saved as a draft; show the review step. `unreadable`: only the filename was used. */
  | { status: "added"; book: Book; unreadable: boolean }
  /** The same file is already in the library; nothing was saved. */
  | { status: "duplicate"; book: Book }
  | { status: "unsupported"; fileName: string }
  | { status: "failed"; fileName: string; reason: "storage-full" | "unknown" };

export async function addFile(file: File, { autoFill = true } = {}): Promise<AddResult> {
  const format = formatOf(file.name);
  if (!format) return { status: "unsupported", fileName: file.name };
  try {
    const hash = await sha256(file);
    const existing = await findByHash(hash);
    if (existing) return { status: "duplicate", book: existing };

    await requestPersistence();
    const empty: BookMetadata = {
      title: titleFromFileName(file.name),
      authors: [],
      areas: [],
      topics: [],
    };
    const found = autoFill
      ? await extract(file, file.name, format)
      : { metadata: empty, cover: undefined, failed: false };
    const book = await createBook(
      { file, fileName: file.name, format, metadata: found.metadata, cover: found.cover },
      { hash },
    );
    return { status: "added", book, unreadable: found.failed };
  } catch (error) {
    console.error("Could not add file", error);
    const name = (error as { name?: string; inner?: { name?: string } }) ?? {};
    const full = name.name === "QuotaExceededError" || name.inner?.name === "QuotaExceededError";
    return { status: "failed", fileName: file.name, reason: full ? "storage-full" : "unknown" };
  }
}

/** One at a time, so memory stays low and the queue keeps the user's order. */
export async function addFiles(
  files: Iterable<File>,
  onResult?: (result: AddResult) => void,
): Promise<AddResult[]> {
  const results: AddResult[] = [];
  for (const file of files) {
    const result = await addFile(file);
    results.push(result);
    onResult?.(result);
  }
  return results;
}

/** The stored file with its "Autor - Título (Ano).ext" name, ready to download. */
export async function getBookFile(id: string): Promise<File> {
  const book = await getBook(id);
  const blob = book && (await fileStore.get(book.fileKey));
  if (!book || !blob) throw new Error(`No file for book ${id}`);
  const types = { pdf: "application/pdf", epub: "application/epub+zip", txt: "text/plain", md: "text/markdown" };
  return new File([blob], bookFileName(book), { type: types[book.format] });
}

/** Deletes books, files, collections and settings. Cannot be undone. */
export async function deleteEverything(): Promise<void> {
  await clearDatabase();
  try {
    localStorage.removeItem(SETTINGS_KEY);
    localStorage.removeItem(LAST_EXPORT_KEY);
  } catch {
    // Storage blocked: nothing was saved there either.
  }
}
