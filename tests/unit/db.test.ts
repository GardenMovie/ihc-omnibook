import { beforeEach, describe, expect, it } from "vitest";
import {
  addToCollection,
  applyAutoMetadata,
  clearDatabase,
  confirmDraft,
  createBook,
  createCollection,
  deleteBook,
  findByHash,
  listBooks,
  listCollections,
  listDrafts,
  purgeDeleted,
  restoreBook,
  updateBook,
} from "@/lib/db/books";
import { db } from "@/lib/db/database";
import { fileStore } from "@/lib/files/store";

const input = (text = "hello") => ({
  file: new Blob([text]),
  fileName: "a.txt",
  format: "txt" as const,
  metadata: { title: "Title", authors: ["Ana Souza"], areas: [], topics: [] },
});

beforeEach(clearDatabase);

describe("books", () => {
  it("saves a draft with its file, then confirms it", async () => {
    const draft = await createBook(input());
    expect(await listBooks()).toHaveLength(0);
    expect(await listDrafts()).toHaveLength(1);
    expect(await (await fileStore.get(draft.fileKey))!.text()).toBe("hello");

    const book = await confirmDraft(draft.id, { title: "Title", areas: ["Math", " math "] });
    expect(book.areas).toEqual(["Math"]);
    expect(book.metaSource).toMatchObject({ title: "auto", areas: "user" });
    expect(await listBooks()).toHaveLength(1);
  });

  it("writes nothing if the record cannot be saved", async () => {
    await createBook(input(), { id: "same" });
    await expect(createBook(input("other"), { id: "same" })).rejects.toThrow();
    expect(await (await fileStore.get("book/same"))!.text()).toBe("hello");
    expect(await db.files.count()).toBe(1);
  });

  it("never overwrites a user field", async () => {
    const { id } = await createBook(input());
    const edited = await updateBook(id, { title: "Mine", year: 2000 });
    const again = applyAutoMetadata(edited, { title: "Auto", publisher: "P", year: 1999 });
    expect(again).toMatchObject({ title: "Mine", year: 2000, publisher: "P" });
  });

  it("keeps a field the user cleared empty", async () => {
    const { id } = await createBook(input());
    const edited = await updateBook(id, { authors: [] });
    expect(applyAutoMetadata(edited, { authors: ["X"] }).authors).toEqual([]);
  });

  it("finds duplicates, ignoring deleted books", async () => {
    const book = await createBook(input());
    expect((await findByHash(book.hash))?.id).toBe(book.id);
    await deleteBook(book.id);
    expect(await findByHash(book.hash)).toBeUndefined();
  });

  it("can undo a delete, and purges old deletions completely", async () => {
    const { id } = await createBook(input(), { status: "ready" });
    const collection = await createCollection("TCC");
    await addToCollection(collection.id, [id, id]);

    await deleteBook(id);
    expect(await listBooks()).toHaveLength(0);
    await restoreBook(id);
    expect(await listBooks()).toHaveLength(1);

    await deleteBook(id);
    await purgeDeleted(0);
    expect(await db.books.count()).toBe(0);
    expect(await db.files.count()).toBe(0);
    expect((await listCollections())[0].bookIds).toEqual([]);
  });
});
