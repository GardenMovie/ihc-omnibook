/** Every change to books and collections goes through here. */
import { fileStore } from "@/lib/files/store";
import { db } from "./database";
import {
  META_FIELDS,
  type Book,
  type BookFormat,
  type BookMetadata,
  type Collection,
  type MetaField,
  type MetaSource,
} from "./types";

// ---------- metadata rules ----------

const cleanText = (value: string) => value.trim().replace(/\s+/g, " ");

/** Trim, drop blanks, and remove repeats that differ only in case or accents. */
export function cleanList(values: string[]): string[] {
  const seen = new Map<string, string>();
  for (const value of values.map(cleanText)) {
    if (!value) continue;
    const key = value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
    if (!seen.has(key)) seen.set(key, value);
  }
  return [...seen.values()];
}

/** Normalizes only the fields present in the patch. Blank text means "empty". */
export function cleanMetadata(patch: Partial<BookMetadata>): Partial<BookMetadata> {
  const out: Record<string, unknown> = {};
  for (const field of META_FIELDS) {
    if (!(field in patch)) continue;
    const value = patch[field];
    if (field === "authors" || field === "areas" || field === "topics") {
      out[field] = cleanList((value as string[] | undefined) ?? []);
    } else if (field === "year") {
      out[field] = Number.isInteger(value) && (value as number) > 0 ? value : undefined;
    } else if (typeof value === "string") {
      const text = cleanText(value);
      out[field] = field === "title" ? text : text || undefined;
    } else {
      out[field] = value;
    }
  }
  return out as Partial<BookMetadata>;
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const isEmpty = (value: unknown) =>
  value === undefined || value === "" || (Array.isArray(value) && value.length === 0);

/** A user edit: fields that actually changed become "user". */
export function applyUserEdit(book: Book, patch: Partial<BookMetadata>): Book {
  const next: Book = { ...book, metaSource: { ...book.metaSource } };
  const cleaned = cleanMetadata(patch);
  for (const field of Object.keys(cleaned) as MetaField[]) {
    if (field === "title" && !cleaned.title) continue; // a book always has a title
    if (same(book[field], cleaned[field])) continue;
    Object.assign(next, { [field]: cleaned[field] });
    next.metaSource[field] = "user";
  }
  return next;
}

/** Automatic values (re-extraction): never touch a "user" field. */
export function applyAutoMetadata(book: Book, found: Partial<BookMetadata>): Book {
  const next: Book = { ...book, metaSource: { ...book.metaSource } };
  const cleaned = cleanMetadata(found);
  for (const field of Object.keys(cleaned) as MetaField[]) {
    if (next.metaSource[field] === "user" || isEmpty(cleaned[field])) continue;
    Object.assign(next, { [field]: cleaned[field] });
    next.metaSource[field] = "auto";
  }
  return next;
}

export function autoSources(metadata: Partial<BookMetadata>): MetaSource {
  const source: MetaSource = {};
  for (const field of META_FIELDS) {
    if (!isEmpty(metadata[field])) source[field] = "auto";
  }
  return source;
}

// ---------- books ----------

export async function sha256(blob: Blob): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", await blob.arrayBuffer());
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

export type NewBook = {
  file: Blob;
  fileName: string;
  format: BookFormat;
  metadata: BookMetadata;
  cover?: Blob;
};

/** Saves the file, cover and record together, or nothing at all. */
export async function createBook(
  input: NewBook,
  overrides: Partial<
    Pick<Book, "id" | "status" | "addedAt" | "lastOpenedAt" | "metaSource" | "hash">
  > = {},
): Promise<Book> {
  // Hash first: awaiting non-database work inside a transaction would end it.
  const hash = overrides.hash ?? (await sha256(input.file));
  const id = overrides.id ?? crypto.randomUUID();
  const metadata = { ...input.metadata, ...cleanMetadata(input.metadata) };
  const book: Book = {
    ...metadata,
    id,
    format: input.format,
    fileKey: `book/${id}`,
    coverKey: input.cover ? `cover/${id}` : undefined,
    fileName: input.fileName,
    size: input.file.size,
    hash,
    status: overrides.status ?? "draft",
    addedAt: overrides.addedAt ?? Date.now(),
    lastOpenedAt: overrides.lastOpenedAt,
    metaSource: overrides.metaSource ?? autoSources(metadata),
  };
  await db.transaction("rw", db.books, db.files, async () => {
    await fileStore.put(book.fileKey, input.file);
    if (book.coverKey && input.cover) await fileStore.put(book.coverKey, input.cover);
    await db.books.add(book);
  });
  return book;
}

export const getBook = (id: string) => db.books.get(id);

/** Confirmed books that are not deleted: what the library shows. */
export async function listBooks(): Promise<Book[]> {
  const books = await db.books.where("status").equals("ready").toArray();
  return books.filter((b) => !b.deletedAt);
}

/** Files waiting for the user to review them, oldest first. */
export async function listDrafts(): Promise<Book[]> {
  const books = await db.books.where("status").equals("draft").toArray();
  return books.filter((b) => !b.deletedAt).sort((a, b) => a.addedAt - b.addedAt);
}

/** A book (not deleted) with exactly the same file. */
export async function findByHash(hash: string): Promise<Book | undefined> {
  return db.books
    .where("hash")
    .equals(hash)
    .filter((b) => !b.deletedAt)
    .first();
}

async function change(id: string, update: (book: Book) => Book): Promise<Book> {
  return db.transaction("rw", db.books, async () => {
    const book = await db.books.get(id);
    if (!book) throw new Error(`Book not found: ${id}`);
    const next = update(book);
    await db.books.put(next);
    return next;
  });
}

export const updateBook = (id: string, patch: Partial<BookMetadata>) =>
  change(id, (book) => applyUserEdit(book, patch));

/** Ends the review step: applies the user's corrections and shows the book. */
export const confirmDraft = (id: string, patch: Partial<BookMetadata> = {}) =>
  change(id, (book) => ({ ...applyUserEdit(book, patch), status: "ready" }));

export const markOpened = (id: string) =>
  change(id, (book) => ({ ...book, lastOpenedAt: Date.now() }));

/** Hides the book but keeps everything, so the user can undo. */
export const deleteBook = (id: string) =>
  change(id, (book) => ({ ...book, deletedAt: Date.now() }));

export const restoreBook = (id: string) =>
  change(id, (book) => ({ ...book, deletedAt: undefined }));

/** Removes books for good, with their files and collection entries. */
export async function purgeBooks(ids: string[]): Promise<void> {
  await db.transaction("rw", db.books, db.files, db.collections, async () => {
    const books = (await db.books.bulkGet(ids)).filter((b) => b !== undefined);
    await fileStore.delete(books.flatMap((b) => [b.fileKey, b.coverKey ?? []].flat()));
    await db.books.bulkDelete(ids);
    await db.collections.toCollection().modify((c) => {
      c.bookIds = c.bookIds.filter((id) => !ids.includes(id));
    });
  });
}

/** Call on startup: frees the space of books deleted in earlier sessions. */
export async function purgeDeleted(olderThanMs = 24 * 60 * 60 * 1000): Promise<void> {
  const limit = Date.now() - olderThanMs;
  const ids = await db.books.filter((b) => !!b.deletedAt && b.deletedAt <= limit).primaryKeys();
  if (ids.length) await purgeBooks(ids);
}

/** Erases every book, file and collection. Settings: see lib/library.ts. */
export async function clearDatabase(): Promise<void> {
  await db.transaction("rw", db.books, db.files, db.collections, async () => {
    await Promise.all([db.books.clear(), db.files.clear(), db.collections.clear()]);
  });
}

/** Areas and topics already in use, for suggestions. */
export async function listTerms(): Promise<{ areas: string[]; topics: string[] }> {
  const books = await listBooks();
  const sorted = (values: string[]) =>
    cleanList(values).sort((a, b) => a.localeCompare(b, "pt-BR"));
  return {
    areas: sorted(books.flatMap((b) => b.areas)),
    topics: sorted(books.flatMap((b) => b.topics)),
  };
}

// ---------- collections ----------

export const listCollections = () => db.collections.toArray();

export async function createCollection(name: string, bookIds: string[] = []): Promise<Collection> {
  const collection = {
    id: crypto.randomUUID(),
    name: cleanText(name),
    bookIds: [...new Set(bookIds)],
  };
  if (!collection.name) throw new Error("A collection needs a name");
  await db.collections.add(collection);
  return collection;
}

export async function renameCollection(id: string, name: string): Promise<void> {
  if (!cleanText(name)) throw new Error("A collection needs a name");
  await db.collections.update(id, { name: cleanText(name) });
}

export const deleteCollection = (id: string) => db.collections.delete(id);

export async function addToCollection(id: string, bookIds: string[]): Promise<void> {
  await db.collections
    .where("id")
    .equals(id)
    .modify((c) => {
      c.bookIds = [...new Set([...c.bookIds, ...bookIds])];
    });
}

export async function removeFromCollection(id: string, bookIds: string[]): Promise<void> {
  await db.collections
    .where("id")
    .equals(id)
    .modify((c) => {
      c.bookIds = c.bookIds.filter((b) => !bookIds.includes(b));
    });
}
