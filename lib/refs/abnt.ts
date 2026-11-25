/**
 * ABNT NBR 6023 reference for a book:
 *   SOBRENOME, Nome. Título: subtítulo. 2. ed. Local: Editora, ano.
 * Missing parts are omitted (SPEC 8), not replaced by "[S. l.]" or "[s. n.]".
 */
import type { BookMetadata } from "@/lib/db/types";
import { parseName } from "@/lib/names";

/** `bold` marks the title, so the UI can show and copy it highlighted. */
export type RefPart = { text: string; bold?: boolean };

const upper = (text: string) => text.toLocaleUpperCase("pt-BR");
/** Adds the closing period unless the text already ends a sentence. */
const stop = (text: string) => (/[.?!]$/.test(text) ? text : `${text}.`);

function authorList(authors: string[]): string {
  const format = (name: string) => {
    const { family, given } = parseName(name);
    return given ? `${upper(family)}, ${given}` : upper(family);
  };
  // Four or more: first author plus "et al." (allowed by NBR 6023:2018).
  if (authors.length >= 4) return `${format(authors[0])} et al.`;
  return authors.map(format).join("; ");
}

function editionText(edition: string): string {
  return /^\d+$/.test(edition) ? `${edition}. ed.` : stop(edition);
}

export function toAbntParts(book: BookMetadata): RefPart[] {
  const parts: RefPart[] = [];
  const add = (text: string, bold?: boolean) =>
    parts.push(bold ? { text, bold } : { text });

  const colon = book.title.indexOf(": ");
  let title = colon > 0 ? book.title.slice(0, colon) : book.title;
  const subtitle = colon > 0 ? book.title.slice(colon) : "";

  if (book.authors.length) add(`${stop(authorList(book.authors))} `);
  else {
    // Without authors, the entry starts with the title's first word in capitals.
    const [first, ...rest] = title.split(" ");
    title = [upper(first), ...rest].join(" ");
  }

  add(title, true);
  const tail = subtitle || (/[.?!]$/.test(title) ? "" : ".");
  add(subtitle ? stop(tail) : tail);

  if (book.edition) add(` ${editionText(book.edition)}`);

  const publisher = [book.place, book.publisher].filter(Boolean).join(": ");
  const imprint = [publisher, book.year].filter(Boolean).join(", ");
  if (imprint) add(` ${stop(imprint)}`);

  return parts.filter((p) => p.text);
}

export const toAbnt = (book: BookMetadata) =>
  toAbntParts(book)
    .map((p) => p.text)
    .join("");
