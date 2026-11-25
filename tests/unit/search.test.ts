import { describe, expect, it } from "vitest";
import { matchesQuery, type Book } from "@/lib/books";
import { applySuggestion, FILE_TYPES, parseQuery, suggest, uniqueTerms } from "@/lib/search";

const book = {
  title: "Cálculo Numérico",
  authors: ["Ana Souza"],
  areas: ["Ciência da Computação", "Matemática"],
  topics: ["Grafos"],
  year: 2020,
} as Book;

const terms = {
  area: ["Ciência da Computação", "Matemática"],
  topic: ["Grafos"],
  file: FILE_TYPES,
};

/** Accepts the first suggestion with the caret at the end. */
function complete(query: string) {
  const found = suggest(query, query.length, terms)!;
  return applySuggestion(query, found, found.items[0]).query;
}

describe("search filters", () => {
  it("reads filters in Portuguese or English, with or without accents", () => {
    for (const query of ["@área:matem", "@AREA:Matemática", '@area:"ciencia da comp'])
      expect(matchesQuery(book, query), query).toBe(true);
    for (const query of ["@tópico:grafos", "@topico:Graf", "@topic:grafos"])
      expect(matchesQuery(book, query), query).toBe(true);
    expect(matchesQuery(book, "@area:grafos")).toBe(false);
    expect(matchesQuery(book, "@topic:matemática")).toBe(false);
  });

  it("joins the same kind with OR, and different kinds and words with AND", () => {
    expect(matchesQuery(book, "@area:física @area:matemática")).toBe(true);
    expect(matchesQuery(book, "@area:matemática @topic:redes")).toBe(false);
    expect(matchesQuery(book, "souza @topic:grafos numerico")).toBe(true);
    expect(matchesQuery(book, "silva @topic:grafos")).toBe(false);
  });

  it("searches plain words in the title and authors only", () => {
    for (const query of ["cálculo", "ana"]) expect(matchesQuery(book, query), query).toBe(true);
    for (const query of ["grafos", "matemática", "2020"])
      expect(matchesQuery(book, query), query).toBe(false);
  });

  it("ignores filters still being typed", () => {
    for (const query of ["@", "@ár", "@area:", '@topic:"'])
      expect(matchesQuery(book, query), query).toBe(true);
    expect(matchesQuery(book, "ana@exemplo.com")).toBe(false);
  });

  it("marks where each filter is, quotes included", () => {
    const query = 'x @área:"Ciência da Computação" y';
    const [, filter] = parseQuery(query);
    expect(filter.kind).toBe("area");
    expect(query.slice(filter.start, filter.end)).toBe('@área:"Ciência da Computação"');
  });

  it("suggests keywords, then terms, quoting those with spaces", () => {
    expect(suggest("@", 1, terms)?.items.map((i) => i.insert)).toEqual([
      "@área:",
      "@tópico:",
      "@arquivo:",
    ]);
    expect(complete("@top")).toBe("@tópico:");
    expect(complete("@área:comp")).toBe('@área:"Ciência da Computação" ');
    expect(complete("ana @topic:")).toBe("ana @topic:Grafos ");
    expect(suggest("@area:Matemática", 16, terms)).toBeUndefined();
    expect(suggest("matem", 5, terms)).toBeUndefined();
  });

  it("filters by file type, listing the types after @arquivo", () => {
    const pdf = { ...book, format: "pdf" } as Book;
    for (const query of ["@arquivo:.pdf", "@arquivo:PDF", "@file:p", "@arquivo:.md @arquivo:.pdf"])
      expect(matchesQuery(pdf, query), query).toBe(true);
    expect(matchesQuery(pdf, "@arquivo:.epub")).toBe(false);
    for (const query of ["@arquivo", "@arquivo:", "@arquivo:."])
      expect(matchesQuery(pdf, query), query).toBe(true);

    for (const query of ["@arquivo", "@arquivo:"])
      expect(
        suggest(query, query.length, terms)?.items.map((i) => i.insert),
        query,
      ).toEqual(["@arquivo:.txt", "@arquivo:.md", "@arquivo:.pdf", "@arquivo:.epub"]);
    expect(complete("@arquivo:ep")).toBe("@arquivo:.epub ");
  });

  it("lists each term once", () => {
    expect(uniqueTerms(["Redes", "álgebra", "redes"])).toEqual(["álgebra", "redes"]);
  });
});
