import type { BookFormat, BookMetadata } from "@/lib/db/types";
import { fixCaps } from "@/lib/names";
import { titleFromFileName, type Extracted } from "./common";

export { formatOf } from "./common";

export type Extraction = {
  metadata: BookMetadata;
  cover?: Blob;
  /** The file could not be read; only the filename was used. */
  failed: boolean;
};

// Loaded on demand: the parsers are large and only needed when adding.
async function read(file: Blob, format: BookFormat): Promise<Extracted> {
  if (format === "pdf") return (await import("./pdf")).extractPdf(file);
  if (format === "epub") return (await import("./epub")).extractEpub(file);
  return (await import("./text")).extractText(file, format);
}

/** Never throws: a damaged or protected file can still be added. */
export async function extract(
  file: Blob,
  fileName: string,
  format: BookFormat,
): Promise<Extraction> {
  let found: Extracted = { metadata: {} };
  let failed = false;
  try {
    found = await read(file, format);
  } catch (error) {
    console.warn("Could not read metadata", error);
    failed = true;
  }
  return {
    metadata: {
      ...found.metadata,
      title: found.metadata.title || titleFromFileName(fileName),
      authors: (found.metadata.authors ?? []).map(fixCaps),
      areas: [],
      topics: [],
    },
    cover: found.cover,
    failed,
  };
}
