/** PDF metadata (info dictionary + XMP) and a cover from the first page. */
import type { PDFDocumentProxy } from "pdfjs-dist";
import type { BookAccessibility } from "@/lib/db/types";
import { isbnFrom, languageFrom, yearFrom, type Extracted } from "./common";

const COVER_WIDTH = 400;

// The legacy build also runs in Node (tests) and in slightly older browsers.
async function loadPdfjs() {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  if (typeof window !== "undefined") {
    // Bundled with the app: no CDN.
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/legacy/build/pdf.worker.min.mjs",
      import.meta.url,
    ).toString();
  }
  return pdfjs;
}

// Titles that programs write by themselves are worse than the filename.
const isJunkTitle = (title: string) =>
  /^(untitled|sem t[ií]tulo|microsoft (word|powerpoint) - )/i.test(title) ||
  /\.(docx?|pptx?|tex|dvi|indd|pdf|odt)$/i.test(title);

export function splitAuthors(value: string): string[] {
  const parts = value.split(/\s*(?:;|&|\band\b)\s*/i).filter(Boolean);
  if (parts.length > 1) return parts;
  // "Ana Souza, Beto Lima" is a list; "Souza, Ana" is one name.
  const byComma = value.split(",").map((p) => p.trim());
  const isList = byComma.length > 1 && byComma.every((p) => p.includes(" "));
  return isList ? byComma : parts;
}

type Metadata = Awaited<ReturnType<PDFDocumentProxy["getMetadata"]>>["metadata"];

function xmpValue(xmp: Metadata, name: string): string | string[] | undefined {
  const parsed = xmp?.get(name);
  if (parsed) return parsed;
  // pdf.js skips XMP written as attributes: <rdf:Description pdfuaid:part="1">
  const raw: string = xmp?.getRaw() ?? "";
  return raw.match(new RegExp(`\\b${name}=["']([^"']*)["']`, "i"))?.[1];
}

async function readMetadata(doc: PDFDocumentProxy): Promise<Extracted["metadata"]> {
  const { info, metadata: xmp } = await doc.getMetadata();
  const dictionary = info as { Title?: string; Author?: string; Language?: string };
  const one = (name: string) => [xmpValue(xmp, name)].flat()[0]?.trim() || undefined;

  const title = one("dc:title") ?? dictionary.Title?.trim();
  const creators = [xmpValue(xmp, "dc:creator") ?? []].flat().filter(Boolean);

  const marked = (await doc.getMarkInfo())?.Marked;
  const accessibility: BookAccessibility = xmpValue(xmp, "pdfuaid:part")
    ? { status: "yes", notes: "PDF/UA" }
    : marked
      ? { status: "partial", notes: "PDF etiquetado, sem PDF/UA" }
      : { status: "no" };

  return {
    title: title && !isJunkTitle(title) ? title : undefined,
    authors: creators.length ? creators : splitAuthors(dictionary.Author ?? ""),
    // Only real publication dates. The file's creation date is not one.
    year: yearFrom(one("prism:publicationdate") ?? one("prism:coverdate")),
    publisher: one("dc:publisher"),
    isbn: isbnFrom(one("prism:isbn")),
    language: languageFrom(dictionary.Language ?? one("dc:language")),
    accessibility,
  };
}

async function renderCover(doc: PDFDocumentProxy): Promise<Blob | undefined> {
  if (typeof document === "undefined") return undefined;
  const page = await doc.getPage(1);
  const width = page.getViewport({ scale: 1 }).width;
  const viewport = page.getViewport({ scale: COVER_WIDTH / width });
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(viewport.width);
  canvas.height = Math.round(viewport.height);
  await page.render({ canvas, viewport }).promise;
  return new Promise((resolve) =>
    canvas.toBlob((blob) => resolve(blob ?? undefined), "image/jpeg", 0.85),
  );
}

export async function extractPdf(file: Blob): Promise<Extracted> {
  const pdfjs = await loadPdfjs();
  const task = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
  try {
    const doc = await task.promise;
    const metadata = await readMetadata(doc);
    // A page that fails to draw must not lose the metadata.
    const cover = await renderCover(doc).catch(() => undefined);
    return { metadata, cover };
  } finally {
    await task.destroy();
  }
}
