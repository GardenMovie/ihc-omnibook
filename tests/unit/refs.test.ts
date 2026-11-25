import { describe, expect, it } from "vitest";
import type { Book } from "@/lib/db/types";
import { bookFileName, uniqueFileName } from "@/lib/files/filename";
import { parseName } from "@/lib/names";
import { toAbnt } from "@/lib/refs/abnt";
import { toBibtex, toBibtexFile } from "@/lib/refs/bibtex";
import { missingFields } from "@/lib/refs/missing";

const book = (patch: Partial<Book> = {}): Book =>
  ({
    title: "Optimizing DNA Storage: a survey",
    authors: ["Maria Uchôa"],
    year: 2026,
    publisher: "Editora & Cia",
    place: "São Paulo",
    edition: "2",
    areas: [],
    topics: [],
    format: "pdf",
    ...patch,
  }) as Book;

describe("names", () => {
  it("keeps kinship suffixes and institutions whole", () => {
    expect(parseName("João da Silva Neto")).toEqual({ family: "Silva Neto", given: "João da" });
    expect(parseName("Stewart, James")).toEqual({ family: "Stewart", given: "James" });
    expect(parseName("Universidade Federal do ABC,").given).toBe("");
  });
});

describe("filenames", () => {
  it("follows the pattern and drops missing parts", () => {
    expect(bookFileName(book({ title: "A/B: why?" }))).toBe("Uchôa - A B why (2026).pdf");
    expect(bookFileName(book({ authors: [], year: undefined, title: "Notas." }))).toBe("Notas.pdf");
    expect(bookFileName(book({ authors: ["A One", "B Two", "C Three"], title: "T" }))).toBe(
      "One et al. - T (2026).pdf",
    );
  });

  it("caps the length, keeping year and extension", () => {
    const name = bookFileName(book({ title: "x".repeat(300) }));
    expect(name).toHaveLength(120);
    expect(name.endsWith(" (2026).pdf")).toBe(true);
  });

  it("numbers collisions, ignoring case", () => {
    const taken = new Set<string>();
    expect(uniqueFileName("A.pdf", taken)).toBe("A.pdf");
    expect(uniqueFileName("a.pdf", taken)).toBe("a (2).pdf");
    expect(uniqueFileName("A.pdf", taken)).toBe("A (3).pdf");
  });
});

describe("BibTeX", () => {
  it("builds an entry, escaping and protecting acronyms", () => {
    expect(toBibtex(book())).toBe(
      [
        "@book{uchoa2026optimizing,",
        "  author = {Uchôa, Maria},",
        "  title = {Optimizing {DNA} Storage: a survey},",
        "  edition = {2},",
        "  publisher = {Editora \\& Cia},",
        "  address = {São Paulo},",
        "  year = {2026},",
        "}",
        "",
      ].join("\n"),
    );
  });

  it("omits missing fields and keeps keys unique", () => {
    const bare = book({ authors: [], year: undefined, publisher: undefined });
    expect(toBibtex(bare)).not.toMatch(/author|year|publisher/);
    const file = toBibtexFile([book(), book()]);
    expect(file).toContain("{uchoa2026optimizing,");
    expect(file).toContain("{uchoa2026optimizinga,");
  });
});

describe("ABNT", () => {
  it("formats a full reference", () => {
    expect(toAbnt(book())).toBe(
      "UCHÔA, Maria. Optimizing DNA Storage: a survey. 2. ed. São Paulo: Editora & Cia, 2026.",
    );
  });

  it("uses et al. and omits what is missing", () => {
    const authors = ["A One", "B Two", "C Three", "D Four"];
    const bare = { publisher: undefined, place: undefined, edition: undefined, title: "Título" };
    expect(toAbnt(book({ ...bare, authors }))).toBe("ONE, A et al. Título. 2026.");
    expect(toAbnt(book({ ...bare, authors: [], year: undefined, title: "Um livro" }))).toBe(
      "UM livro.",
    );
  });

  it("lists what is missing", () => {
    expect(missingFields(book({ place: undefined, authors: [] }), "abnt")).toEqual([
      "authors",
      "place",
    ]);
  });
});
