import type { BookMetadata, MetaField } from "@/lib/db/types";

export type RefFormat = "abnt" | "bibtex";

// Edition and ISBN are optional: not every book has them.
const NEEDED: Record<RefFormat, MetaField[]> = {
  abnt: ["authors", "title", "place", "publisher", "year"],
  bibtex: ["authors", "title", "publisher", "year"],
};

/** Fields the user should fill for a complete reference (SPEC 8). */
export function missingFields(book: BookMetadata, format: RefFormat): MetaField[] {
  return NEEDED[format].filter((field) => {
    const value = book[field];
    return Array.isArray(value) ? value.length === 0 : !value;
  });
}
