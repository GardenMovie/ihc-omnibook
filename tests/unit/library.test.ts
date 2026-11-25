import { BlobReader, ZipReader } from "@zip.js/zip.js";
import { beforeEach, describe, expect, it } from "vitest";
import {
  clearDatabase,
  confirmDraft,
  createCollection,
  deleteBook,
  listBooks,
  listCollections,
  updateBook,
} from "@/lib/db/books";
import { exportLibrary, importLibrary } from "@/lib/files/backup";
import { fileStore } from "@/lib/files/store";
import { addFile, getBookFile } from "@/lib/library";
import { makeEpub } from "./fixtures";

const textFile = (text: string, name = "notas.md") => new File([text], name);

async function addBook(text = "# Cálculo") {
  const result = await addFile(textFile(text));
  if (result.status !== "added") throw new Error(result.status);
  return confirmDraft(result.book.id, { authors: ["Ana Souza"] });
}

beforeEach(clearDatabase);

describe("adding", () => {
  it("saves a draft, and reports duplicates and unsupported files", async () => {
    const first = await addFile(textFile("# Cálculo"));
    expect(first).toMatchObject({ status: "added", book: { title: "Cálculo", status: "draft" } });
    expect((await addFile(textFile("# Cálculo", "copy.md"))).status).toBe("duplicate");
    expect((await addFile(textFile("x", "a.docx"))).status).toBe("unsupported");
  });

  it("can skip auto-fill", async () => {
    const result = await addFile(textFile("# Cálculo"), { autoFill: false });
    expect(result).toMatchObject({ book: { title: "notas" } });
  });

  it("names downloads by the pattern", async () => {
    const book = await addBook();
    expect((await getBookFile(book.id)).name).toBe("Souza - Cálculo.md");
  });
});

describe("backup", () => {
  it("round-trips the library, covers and collections", async () => {
    const epub = await makeEpub(
      "<dc:title>Com Capa</dc:title>",
      `<item id="c" href="images/cover.png" media-type="image/png" properties="cover-image"/>`,
    );
    const added = await addFile(new File([epub], "capa.epub"));
    if (added.status !== "added") throw new Error(added.status);
    const book = await addBook();
    await createCollection("TCC", [book.id]);

    const { blob } = await exportLibrary();
    const reader = new ZipReader(new BlobReader(blob));
    const names = (await reader.getEntries()).map((e) => e.filename);
    await reader.close();
    expect(names).toEqual(
      expect.arrayContaining([
        "Souza - Cálculo.md",
        "Com Capa.epub",
        "Biblioteca.bib",
        ".biblioteca/library.json",
      ]),
    );

    await clearDatabase();
    const result = await importLibrary(blob);
    expect(result).toMatchObject({ added: 2, merged: 0, skipped: 0, unlisted: [] });
    expect((await listBooks()).map((b) => b.id)).toEqual([book.id]); // the other is still a draft
    expect((await listCollections())[0]).toMatchObject({ name: "TCC", bookIds: [book.id] });
    const cover = await fileStore.get(`cover/${added.book.id}`);
    expect(cover?.type).toBe("image/png");
  });

  it("merges without replacing local user edits, and undoes deletion", async () => {
    const book = await addBook();
    await updateBook(book.id, { title: "No backup", publisher: "Do backup" });
    const { blob } = await exportLibrary();
    await updateBook(book.id, { title: "Local", publisher: "" });
    await deleteBook(book.id);

    expect(await importLibrary(blob)).toMatchObject({ added: 0, merged: 1 });
    const [restored] = await listBooks();
    expect(restored.title).toBe("Local");
    expect(restored.publisher).toBeUndefined(); // cleared by the user: stays empty
  });
});
