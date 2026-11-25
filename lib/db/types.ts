/** Data model (SPEC section 7, plus the storage fields it needs). */

export type BookFormat = "pdf" | "epub" | "txt" | "md";

/**
 * Accessibility of the book file (SPEC section 7). `notes` names the standard
 * the file claims, e.g. "PDF/UA" or "EPUB 1.1 (W3C)". Absent for plain text
 * (txt/md), which is inherently accessible and has nothing to declare.
 */
export type BookAccessibility = {
  status: "yes" | "partial" | "no" | "unknown";
  notes?: string;
};

/** The descriptive fields: what extraction can fill and the user can edit. */
export type BookMetadata = {
  title: string;
  /** "First Last" or "Last, First"; see lib/names.ts. */
  authors: string[];
  year?: number;
  publisher?: string;
  /** Place of publication (city), needed by ABNT. */
  place?: string;
  /** "2" or free text such as "2. ed. rev." */
  edition?: string;
  isbn?: string;
  /** BCP-47, e.g. "en", "pt-BR" */
  language?: string;
  areas: string[];
  topics: string[];
  accessibility?: BookAccessibility;
};

export type MetaField = keyof BookMetadata;

export const META_FIELDS: MetaField[] = [
  "title",
  "authors",
  "year",
  "publisher",
  "place",
  "edition",
  "isbn",
  "language",
  "areas",
  "topics",
  "accessibility",
];

export type MetaSource = Partial<Record<MetaField, "auto" | "user">>;

export type Book = BookMetadata & {
  id: string;
  format: BookFormat;
  /** Key of the file in the FileStore (internal, never the display name). */
  fileKey: string;
  coverKey?: string;
  /** Name of the file as the user added it. */
  fileName: string;
  size: number;
  /** SHA-256 of the file, hex. Used to detect duplicates. */
  hash: string;
  /** "draft" = file saved, metadata not yet confirmed by the user. */
  status: "draft" | "ready";
  addedAt: number;
  lastOpenedAt?: number;
  /** How far the user has read, from 0 to 1. */
  readPosition?: number;
  /** Set while the book is in the "undo delete" state. */
  deletedAt?: number;
  /** A "user" field is never overwritten by extraction or import. */
  metaSource: MetaSource;
};

export type Collection = { id: string; name: string; bookIds: string[] };
