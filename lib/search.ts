/**
 * The search box syntax: plain words, plus "@área:Matemática",
 * '@tópico:"Análise Numérica"' and "@arquivo:.pdf" filters.
 */

export type FilterKind = "area" | "topic" | "file";

/** The values of "@arquivo:". */
export const FILE_TYPES = [".txt", ".md", ".pdf", ".epub"];

/** True if a file type (".pdf" or "pdf") starts with what was typed, dot or not. */
export const fileTypeMatches = (type: string, typed: string) =>
  type.replace(/^\./, "").startsWith(norm(typed.trim()).replace(/^\./, ""));

/** Case- and accent-insensitive form used for every comparison. */
export const norm = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

/** What is suggested for each kind. English is accepted too. */
export const KEYWORDS: Record<FilterKind, string> = {
  area: "@área:",
  topic: "@tópico:",
  file: "@arquivo:",
};
const KINDS: Record<string, FilterKind> = {
  area: "area",
  topico: "topic",
  topic: "topic",
  arquivo: "file",
  file: "file",
};

export type Token = {
  /** Position in the query: [start, end). */
  start: number;
  end: number;
} & (
  | { kind: "text"; value: string }
  /** `value` is what follows the colon, without quotes; may be empty. */
  | { kind: FilterKind; value: string }
);

// A filter (its value quoted, possibly still unclosed) or a plain word.
const TOKEN = /@([\p{L}\p{M}]+):(?:"([^"]*)"?|(\S*))|\S+/gu;

export function parseQuery(query: string): Token[] {
  return Array.from(query.matchAll(TOKEN), (match): Token => {
    const [raw, keyword, quoted, bare] = match;
    const start = match.index;
    const end = start + raw.length;
    const kind = keyword ? KINDS[norm(keyword)] : undefined;
    return kind
      ? { start, end, kind, value: quoted ?? bare ?? "" }
      : { start, end, kind: "text", value: raw };
  });
}

/** "@", "@ár" or "@topic": a filter still being typed, not a word to search. */
export function isPartialKeyword(word: string): boolean {
  if (!word.startsWith("@")) return false;
  const typed = norm(word.slice(1));
  return Object.keys(KINDS).some((name) => name.startsWith(typed));
}

/** One of each term (spelling aside), in alphabetical order. */
export function uniqueTerms(terms: string[]): string[] {
  const seen = new Map(terms.map((term) => [norm(term), term]));
  return [...seen.values()].sort((a, b) => a.localeCompare(b, "pt-BR"));
}

/** True if the term,or one of its words, starts with what was typed. */
export function termMatches(term: string, typed: string): boolean {
  const haystack = ` ${norm(term)}`;
  return haystack.includes(` ${norm(typed.trim())}`);
}

export type Suggestion =
  | { type: "keyword"; kind: FilterKind; insert: string }
  | { type: "term"; kind: FilterKind; term: string; insert: string };

export type Suggestions = {
  /** The part of the query a suggestion replaces. */
  start: number;
  end: number;
  items: Suggestion[];
};

const quote = (term: string) => (/\s/.test(term) ? `"${term.replaceAll('"', "")}"` : term);

/** What to offer for the "@…" the caret is in, if any. */
export function suggest(
  query: string,
  caret: number,
  terms: Record<FilterKind, string[]>,
): Suggestions | undefined {
  const token = parseQuery(query).find((t) => t.start < caret && caret <= t.end);
  if (!token || query[token.start] !== "@") return;
  const { start, end } = token;

  let items: Suggestion[];
  // "@arquivo" lists the types at once: there are only a few.
  if (token.kind === "text" && ["@arquivo", "@file"].includes(norm(token.value))) {
    items = terms.file.map((term) => ({
      type: "term",
      kind: "file",
      term,
      insert: KEYWORDS.file + term,
    }));
  } else if (token.kind === "text") {
    if (!isPartialKeyword(token.value)) return;
    const typed = norm(token.value);
    items = (Object.keys(KEYWORDS) as FilterKind[])
      // The English "@topic" also finds "@tópico:".
      .filter((kind) =>
        Object.entries(KINDS).some(([name, k]) => k === kind && `@${name}`.startsWith(typed)),
      )
      .map((kind) => ({ type: "keyword", kind, insert: KEYWORDS[kind] }));
  } else {
    const keyword = query.slice(start, query.indexOf(":", start) + 1);
    items = terms[token.kind]
      .filter(
        (term) =>
          !token.value ||
          (token.kind === "file" ? fileTypeMatches : termMatches)(term, token.value),
      )
      .map((term) => ({ type: "term", kind: token.kind as FilterKind, term, insert: keyword + quote(term) }));
    // Nothing left to complete.
    if (items.length === 1 && items[0].insert === query.slice(start, end)) return;
  }
  return items.length ? { start, end, items } : undefined;
}

/** The query with a suggestion put in, and where the caret goes. */
export function applySuggestion(
  query: string,
  { start, end }: Suggestions,
  item: Suggestion,
): { query: string; caret: number } {
  const rest = query.slice(end);
  // A finished filter is followed by a space; a keyword waits for its value.
  const space = item.type === "term" && !rest.startsWith(" ") ? " " : "";
  const before = query.slice(0, start) + item.insert + space;
  const skip = item.type === "term" && rest.startsWith(" ") ? 1 : 0;
  return { query: before + rest, caret: before.length + skip };
}
