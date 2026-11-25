/**
 * Library export and import (SPEC 9.1). The zip holds the books under their
 * pattern names, Biblioteca.bib, and .biblioteca/library.json (plus covers).
 */
import {
  BlobReader,
  BlobWriter,
  TextReader,
  TextWriter,
  ZipReader,
  ZipWriter,
  type FileEntry,
} from "@zip.js/zip.js";
import { cleanList, cleanMetadata, createBook, sha256 } from "@/lib/db/books";
import { db } from "@/lib/db/database";
import {
  META_FIELDS,
  type Book,
  type BookMetadata,
  type Collection,
  type MetaSource,
} from "@/lib/db/types";
import { addFile, type AddResult } from "@/lib/library";
import { toBibtexFile } from "@/lib/refs/bibtex";
import type { Settings } from "@/lib/settings";
import { recordExport } from "@/lib/storage";
import { bookFileName, uniqueFileName } from "./filename";
import { fileStore } from "./store";

const MANIFEST = ".biblioteca/library.json";
const VERSION = 1;

type ManifestBook = Omit<Book, "fileKey" | "coverKey" | "deletedAt"> & {
  file: string;
  cover?: { path: string; type: string };
};

type Manifest = {
  app: "omnibook";
  version: number;
  books: ManifestBook[];
  collections: Collection[];
  settings?: Settings;
};

/** The whole library, or only `ids`. */
export async function exportLibrary({
  ids,
  settings,
}: { ids?: string[]; settings?: Settings } = {}): Promise<{ blob: Blob; fileName: string }> {
  const wanted = ids && new Set(ids);
  const books = (await db.books.toArray()).filter(
    (b) => !b.deletedAt && (!wanted || wanted.has(b.id)),
  );
  const zip = new ZipWriter(new BlobWriter("application/zip"));
  const taken = new Set<string>(["biblioteca.bib"]);
  const manifest: Manifest = { app: "omnibook", version: VERSION, books: [], collections: [], settings };

  for (const book of books) {
    const blob = await fileStore.get(book.fileKey);
    if (!blob) throw new Error(`Missing file for "${book.title}"`);
    const name = uniqueFileName(bookFileName(book), taken);
    // PDF and EPUB are already compressed.
    const level = book.format === "pdf" || book.format === "epub" ? 0 : 6;
    await zip.add(name, new BlobReader(blob), { level });

    // Storage keys are internal: import creates new ones.
    const entry: ManifestBook & Partial<Book> = { ...book, file: name };
    delete entry.fileKey;
    delete entry.coverKey;
    delete entry.deletedAt;
    const cover = book.coverKey ? await fileStore.get(book.coverKey) : undefined;
    if (cover) {
      entry.cover = { path: `.biblioteca/covers/${book.id}`, type: cover.type };
      await zip.add(entry.cover.path, new BlobReader(cover), { level: 0 });
    }
    manifest.books.push(entry);
  }

  const exported = new Set(books.map((b) => b.id));
  manifest.collections = (await db.collections.toArray())
    .map((c) => ({ ...c, bookIds: c.bookIds.filter((id) => exported.has(id)) }))
    // A partial export has no use for collections without any of its books.
    .filter((c) => !wanted || c.bookIds.length > 0);

  await zip.add("Biblioteca.bib", new TextReader(toBibtexFile(books.filter((b) => b.status === "ready"))));
  await zip.add(MANIFEST, new TextReader(JSON.stringify(manifest, null, 2)));
  const blob = await zip.close();
  if (!wanted) recordExport();
  return { blob, fileName: `Biblioteca ${new Date().toISOString().slice(0, 10)}.zip` };
}

// ---------- import ----------

export type ImportResult = {
  added: number;
  /** Already in the library; empty fields may have been filled in. */
  merged: number;
  /** Entries that could not be read. */
  skipped: number;
  /** Files without saved metadata went through the normal add flow. */
  unlisted: AddResult[];
  /** Apply with applySettings/saveSettings only if the user wants them. */
  settings?: Settings;
};

const isText = (v: unknown): v is string => typeof v === "string";
const textList = (v: unknown) => (Array.isArray(v) ? v.filter(isText) : []);
const number = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : undefined);

/** The zip may have been edited by hand: keep only values of the right type. */
function readMetadata(raw: Record<string, unknown>): BookMetadata {
  const optional = (key: string) => (isText(raw[key]) ? (raw[key] as string) : undefined);
  const accessibility = raw.accessibility as BookMetadata["accessibility"];
  return cleanMetadata({
    title: optional("title") ?? "",
    authors: textList(raw.authors),
    year: number(raw.year),
    publisher: optional("publisher"),
    place: optional("place"),
    edition: optional("edition"),
    isbn: optional("isbn"),
    language: optional("language"),
    areas: textList(raw.areas),
    topics: textList(raw.topics),
    accessibility: ["yes", "partial", "no", "unknown"].includes(accessibility?.status ?? "")
      ? {
          status: accessibility!.status,
          notes: isText(accessibility!.notes) ? accessibility!.notes : undefined,
        }
      : undefined,
  }) as BookMetadata;
}

function readSources(raw: unknown): MetaSource {
  const sources: MetaSource = {};
  for (const field of META_FIELDS) {
    const value = (raw as Record<string, unknown> | undefined)?.[field];
    if (value === "auto" || value === "user") sources[field] = value;
  }
  return sources;
}

/** Fills gaps and brings in user edits, without replacing local user edits. */
export function mergeMetadata(local: Book, incoming: BookMetadata, sources: MetaSource): Book {
  const next: Book = { ...local, metaSource: { ...local.metaSource } };
  for (const field of META_FIELDS) {
    if (local.metaSource[field] === "user") continue;
    const value = incoming[field];
    const blank = (v: unknown) => v === undefined || v === "" || (Array.isArray(v) && !v.length);
    const fromUser = sources[field] === "user";
    if (!fromUser && (!blank(local[field]) || blank(value))) continue;
    if (field === "title" && !value) continue;
    Object.assign(next, { [field]: value });
    if (sources[field]) next.metaSource[field] = sources[field];
  }
  return next;
}

async function importCollections(raw: unknown, idMap: Map<string, string>): Promise<void> {
  if (!Array.isArray(raw)) return;
  await db.transaction("rw", db.collections, async () => {
    const existing = await db.collections.toArray();
    for (const item of raw as Partial<Collection>[]) {
      if (!isText(item?.name) || !item.name.trim()) continue;
      const bookIds = textList(item.bookIds).flatMap((id) => idMap.get(id) ?? []);
      const same = existing.find(
        (c) => c.id === item.id || cleanList([c.name, item.name!]).length === 1,
      );
      if (same) {
        same.bookIds = [...new Set([...same.bookIds, ...bookIds])];
        await db.collections.put(same);
      } else {
        const created = { id: item.id ?? crypto.randomUUID(), name: item.name, bookIds };
        await db.collections.add(created);
        existing.push(created);
      }
    }
  });
}

export async function importLibrary(zipBlob: Blob): Promise<ImportResult> {
  const reader = new ZipReader(new BlobReader(zipBlob));
  try {
    const entries = new Map(
      (await reader.getEntries())
        .filter((e): e is FileEntry => !e.directory)
        .map((e) => [e.filename, e]),
    );
    const result: ImportResult = { added: 0, merged: 0, skipped: 0, unlisted: [] };

    let manifest: Partial<Manifest> = {};
    const manifestEntry = entries.get(MANIFEST);
    if (manifestEntry) {
      manifest = JSON.parse(await manifestEntry.getData(new TextWriter()));
      if (manifest.app !== "omnibook" || !(Number(manifest.version) <= VERSION)) {
        throw new Error("This backup was made by a newer or different app");
      }
      result.settings = manifest.settings;
    }

    const used = new Set<string>();
    const idMap = new Map<string, string>();
    for (const item of manifest.books ?? []) {
      try {
        const entry = entries.get(item.file);
        if (!entry || !["pdf", "epub", "txt", "md"].includes(item.format)) {
          result.skipped++;
          continue;
        }
        used.add(item.file);
        const file = await entry.getData(new BlobWriter());
        const hash = await sha256(file);
        const metadata = readMetadata(item as unknown as Record<string, unknown>);
        const metaSource = readSources(item.metaSource);

        const matches = await db.books.where("hash").equals(hash).toArray();
        const local = matches.find((b) => !b.deletedAt) ?? matches[0];
        if (local) {
          const merged = mergeMetadata(local, metadata, metaSource);
          merged.deletedAt = undefined;
          if (item.status === "ready") merged.status = "ready";
          // The reading place comes from whichever copy was read last.
          if ((number(item.lastOpenedAt) ?? 0) > (local.lastOpenedAt ?? 0)) {
            merged.readPosition = number(item.readPosition) ?? local.readPosition;
          } else {
            merged.readPosition = local.readPosition ?? number(item.readPosition);
          }
          merged.lastOpenedAt =
            Math.max(local.lastOpenedAt ?? 0, number(item.lastOpenedAt) ?? 0) || undefined;
          await db.books.put(merged);
          idMap.set(item.id, local.id);
          result.merged++;
          continue;
        }

        const coverEntry = item.cover && entries.get(item.cover.path);
        const cover = coverEntry
          ? await coverEntry.getData(new BlobWriter(String(item.cover!.type)))
          : undefined;
        const taken = !isText(item.id) || !item.id || (await db.books.get(item.id));
        const book = await createBook(
          {
            file,
            fileName: isText(item.fileName) ? item.fileName : item.file,
            format: item.format,
            metadata: { ...metadata, title: metadata.title || item.file },
            cover,
          },
          {
            id: taken ? undefined : item.id,
            hash,
            status: item.status === "draft" ? "draft" : "ready",
            addedAt: number(item.addedAt),
            lastOpenedAt: number(item.lastOpenedAt),
            readPosition: number(item.readPosition),
            metaSource,
          },
        );
        idMap.set(item.id, book.id);
        result.added++;
      } catch (error) {
        console.warn("Could not import a book", error);
        result.skipped++;
      }
    }
    await importCollections(manifest.collections, idMap);

    // Books dropped into the zip by hand, or a zip that is not a backup.
    for (const [name, entry] of entries) {
      if (used.has(name) || name.startsWith(".") || name === "Biblioteca.bib") continue;
      const baseName = name.split("/").pop()!;
      if (baseName.startsWith(".") || !/\.(pdf|epub|txt|md|markdown)$/i.test(baseName)) continue;
      const file = new File([await entry.getData(new BlobWriter())], baseName);
      result.unlisted.push(await addFile(file));
    }
    return result;
  } finally {
    await reader.close();
  }
}
