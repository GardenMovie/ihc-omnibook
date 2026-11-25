import type { BookFormat, BookMetadata } from "@/lib/db/types";

export type Extracted = {
  /** Only what the file really says; `title` may be missing. */
  metadata: Partial<BookMetadata>;
  cover?: Blob;
};

export function formatOf(fileName: string): BookFormat | undefined {
  const extension = fileName.split(".").pop()?.toLowerCase();
  if (extension === "markdown") return "md";
  return (["pdf", "epub", "txt", "md"] as const).find((f) => f === extension);
}

export const titleFromFileName = (fileName: string) =>
  fileName
    .replace(/\.[^.]+$/, "")
    .replace(/_+/g, " ")
    .trim() || fileName;

/** A plausible publication year in a date such as "2012-03-01". */
export function yearFrom(date: string | undefined): number | undefined {
  const year = Number(date?.match(/\b(1[4-9]\d\d|20\d\d|21\d\d)\b/)?.[1]);
  return year || undefined;
}

/** ISBN-10 or ISBN-13 digits, from "urn:isbn:978-…" and similar. */
export function isbnFrom(text: string | undefined): string | undefined {
  const digits = text?.replace(/^(urn:)?isbn:?/i, "").replace(/[\s-]/g, "");
  return digits && /^(97[89]\d{10}|\d{9}[\dXx])$/.test(digits) ? digits : undefined;
}

/** Keeps a valid BCP-47 tag only ("en_US" is accepted as "en-US"). */
export function languageFrom(value: string | undefined): string | undefined {
  if (!value?.trim()) return undefined;
  try {
    const [tag] = Intl.getCanonicalLocales(value.trim().replace(/_/g, "-"));
    return tag === "und" ? undefined : tag;
  } catch {
    return undefined;
  }
}
