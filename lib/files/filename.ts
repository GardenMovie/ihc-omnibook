/** "Autor - Título (Ano).ext" (SPEC 9.1), used on download and export only. */
import type { Book } from "@/lib/db/types";
import { surname } from "@/lib/names";

const MAX_LENGTH = 120; // including the extension

const safe = (text: string) =>
  text
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\.+/, "");

const trimEnd = (text: string) => text.replace(/[. ]+$/, "");

/** Cuts on whole characters, so an emoji is never split in half. */
function cut(text: string, length: number): string {
  let out = "";
  for (const char of text) {
    if (out.length + char.length > length) break;
    out += char;
  }
  return trimEnd(out);
}

export function bookFileName(
  book: Pick<Book, "title" | "authors" | "year" | "format">,
): string {
  const extension = `.${book.format}`;
  const first = book.authors[0] ? safe(surname(book.authors[0])) : "";
  const author = first && book.authors.length >= 3 ? `${first} et al.` : first;
  const title = safe(book.title);
  const year = book.year ? ` (${book.year})` : "";
  const start = [author, title].filter(Boolean).join(" - ");
  // The year survives a long title; the title is what gets shortened.
  let base = trimEnd(cut(start, MAX_LENGTH - extension.length - year.length) + year).trim();
  if (!base) base = "livro";
  // Windows refuses these device names, with or without an extension.
  if (/^(con|prn|aux|nul|com\d|lpt\d)$/i.test(base)) base = `${base}_`;
  return base + extension;
}

/** Returns the name, or "name (2).ext" and so on. Records it in `taken`. */
export function uniqueFileName(name: string, taken: Set<string>): string {
  const dot = name.lastIndexOf(".");
  let candidate = name;
  // Compared in lower case: Windows and macOS ignore case.
  for (let n = 2; taken.has(candidate.toLowerCase()); n++) {
    candidate = `${name.slice(0, dot)} (${n})${name.slice(dot)}`;
  }
  taken.add(candidate.toLowerCase());
  return candidate;
}
