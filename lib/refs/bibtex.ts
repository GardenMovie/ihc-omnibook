/** BibTeX @book entries (SPEC 8). Missing fields are left out, never invented. */
import type { BookMetadata } from "@/lib/db/types";
import { parseName } from "@/lib/names";

const ESCAPES: Record<string, string> = {
  "\\": "\\textbackslash{}",
  "&": "\\&",
  "%": "\\%",
  $: "\\$",
  "#": "\\#",
  _: "\\_",
  "{": "\\{",
  "}": "\\}",
  "~": "\\textasciitilde{}",
  "^": "\\textasciicircum{}",
};

const escape = (text: string) => text.replace(/[\\&%$#_{}~^]/g, (c) => ESCAPES[c]);

/**
 * Braces keep BibTeX from lowercasing a word. Only words that are clearly
 * proper (a capital after the first letter: "DNA", "LaTeX") can be detected.
 */
const protectTitle = (title: string) =>
  title
    .split(" ")
    .map((word) => (/.\p{Lu}/u.test(word) ? `{${escape(word)}}` : escape(word)))
    .join(" ");

const ascii = (text: string) =>
  text.normalize("NFD").toLowerCase().replace(/[^a-z0-9]/g, "");

/** authorYearFirstTitleWord, e.g. "uchoa2026optimizing" */
export function bibtexKey(book: BookMetadata): string {
  const author = book.authors[0] ? ascii(parseName(book.authors[0]).family) : "";
  const word = book.title.split(/\s+/).map(ascii).find(Boolean) ?? "";
  return `${author}${book.year ?? ""}${word}` || "livro";
}

function author(name: string): string {
  const { family, given } = parseName(name);
  // Double braces keep an institution's name from being split.
  if (!given) return family.includes(" ") ? `{${escape(family)}}` : escape(family);
  return `${escape(family)}, ${escape(given)}`;
}

export function toBibtex(book: BookMetadata, key = bibtexKey(book)): string {
  const fields: [string, string | undefined][] = [
    ["author", book.authors.map(author).join(" and ") || undefined],
    ["title", protectTitle(book.title) || undefined],
    ["edition", book.edition && escape(book.edition)],
    ["publisher", book.publisher && escape(book.publisher)],
    ["address", book.place && escape(book.place)],
    ["year", book.year?.toString()],
    ["isbn", book.isbn && escape(book.isbn)],
  ];
  const lines = fields.flatMap(([name, value]) => (value ? [`  ${name} = {${value}},`] : []));
  return `@book{${key},\n${lines.join("\n")}\n}\n`;
}

/** The contents of Biblioteca.bib. Repeated keys get "a", "b", … */
export function toBibtexFile(books: BookMetadata[]): string {
  const used = new Set<string>();
  return books
    .map((book) => {
      const base = bibtexKey(book);
      let key = base;
      for (let i = 0; used.has(key); i++) {
        key = base + (i < 26 ? String.fromCharCode(97 + i) : `-${i}`);
      }
      used.add(key);
      return toBibtex(book, key);
    })
    .join("\n");
}
