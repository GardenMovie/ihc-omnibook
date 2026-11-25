/** Searching, sorting and describing books for the screens. */
import type { Book, BookAccessibility } from "@/lib/db/types";
import { t } from "@/lib/i18n";
import { surname } from "@/lib/names";
import { fileTypeMatches, isPartialKeyword, norm, parseQuery, termMatches } from "@/lib/search";

export type { Book, BookAccessibility };

export type SortKey = "recent" | "title" | "author" | "year" | "added";
export const SORT_KEYS: SortKey[] = ["recent", "title", "author", "year", "added"];

/**
 * Plain words must all appear in the title or authors. "@área:", "@tópico:" and
 * "@arquivo:" filters (see lib/search.ts) match any of the values of one kind,
 * and every kind used.
 */
export function matchesQuery(book: Book, query: string): boolean {
  const haystack = norm([book.title, ...book.authors].join(" "));
  const wanted = { area: [] as string[], topic: [] as string[], file: [] as string[] };
  for (const token of parseQuery(query)) {
    if (token.kind !== "text") {
      if (token.value.trim()) wanted[token.kind].push(token.value);
    } else if (!isPartialKeyword(token.value) && !haystack.includes(norm(token.value))) {
      return false;
    }
  }
  const any = (values: string[], terms: string[]) =>
    !values.length || values.some((value) => terms.some((term) => termMatches(term, value)));
  return (
    any(wanted.area, book.areas) &&
    any(wanted.topic, book.topics) &&
    (!wanted.file.length || wanted.file.some((value) => fileTypeMatches(book.format, value)))
  );
}

export type BookFilter = {
  query?: string;
  /** A book matches if it has any of the chosen values; groups combine with "and". */
  areas?: string[];
  topics?: string[];
  /** The `bookIds` of the chosen collection. */
  bookIds?: string[];
};

export function filterBooks(books: Book[], filter: BookFilter): Book[] {
  const any = (chosen: string[] | undefined, has: string[]) =>
    !chosen?.length || chosen.some((c) => has.some((h) => norm(h) === norm(c)));
  const ids = filter.bookIds && new Set(filter.bookIds);
  return books.filter(
    (book) =>
      matchesQuery(book, filter.query ?? "") &&
      any(filter.areas, book.areas) &&
      any(filter.topics, book.topics) &&
      (!ids || ids.has(book.id)),
  );
}

export function sortBooks(books: Book[], key: SortKey): Book[] {
  const collator = new Intl.Collator("pt-BR", { sensitivity: "base" });
  const copy = [...books];
  copy.sort((a, b) => {
    switch (key) {
      case "recent":
        // Never opened books come last, newest first.
        return (b.lastOpenedAt ?? 0) - (a.lastOpenedAt ?? 0) || b.addedAt - a.addedAt;
      case "title":
        return collator.compare(a.title, b.title);
      case "author":
        return collator.compare(surname(a.authors[0] ?? ""), surname(b.authors[0] ?? ""));
      case "year":
        return (b.year ?? 0) - (a.year ?? 0);
      case "added":
        return b.addedAt - a.addedAt;
    }
  });
  return copy;
}

export function authorLine(book: Book): string {
  return book.authors.join(", ");
}

/** Compact byline for cards: "A", "Sobrenome e Sobrenome", "A et al." */
export function authorShort(book: Book): string {
  const [first, second] = book.authors;
  if (!first) return "";
  if (book.authors.length === 1) return first;
  if (book.authors.length === 2 && second) return `${surname(first)} e ${surname(second)}`;
  return `${first} et al.`;
}

/** "Compatível (PDF/UA)" */
export function accessibilityText(accessibility: BookAccessibility): string {
  const label = t(`accessibility.${accessibility.status}`);
  return accessibility.notes ? `${label} (${accessibility.notes})` : label;
}

/** Short text shown on the badge itself; null = no badge ("no"). */
export function accessibilityBadgeText(accessibility: BookAccessibility): string | null {
  switch (accessibility.status) {
    case "yes":
      return accessibility.notes ?? t("accessibility.badge.yes");
    case "partial":
      return t("accessibility.badge.partial");
    case "unknown":
      return t("accessibility.badge.unknown");
    case "no":
      return null;
  }
}

/** Spoken summary for the card's accessible name; undefined = say nothing. */
export function accessibilitySummary(book: Book): string | undefined {
  return book.accessibility
    ? `${t("panel.accessibility")}: ${accessibilityText(book.accessibility)}.`
    : undefined;
}

export function languageLabel(code?: string): string {
  if (!code) return t("panel.none");
  try {
    return new Intl.DisplayNames(["pt-BR"], { type: "language" }).of(code) ?? code;
  } catch {
    return code;
  }
}
