/** Reads the EPUB package document (OPF): metadata, cover and accessibility. */
import JSZip from "jszip";
import type { BookAccessibility } from "@/lib/db/types";
import { isbnFrom, languageFrom, yearFrom, type Extracted } from "./common";

const parseXml = (text: string) =>
  new DOMParser().parseFromString(text.replace(/^﻿/, ""), "application/xml");

/** All elements with this local name, whatever the namespace prefix. */
const elements = (doc: Document, name: string) =>
  Array.from(doc.getElementsByTagName("*")).filter(
    (el) => el.nodeName.split(":").pop() === name,
  );

const text = (el: Element | undefined) => el?.textContent?.trim() || undefined;

/** Resolves a manifest href against the folder of the OPF. */
function resolve(base: string, href: string): string {
  const parts = base.split("/").slice(0, -1);
  for (const part of decodeURIComponent(href).split("/")) {
    if (part === "..") parts.pop();
    else if (part && part !== ".") parts.push(part);
  }
  return parts.join("/");
}

function accessibilityOf(doc: Document): BookAccessibility {
  const metas = elements(doc, "meta");
  const values = (property: string) =>
    metas
      .filter((m) => (m.getAttribute("property") ?? m.getAttribute("name")) === property)
      .map((m) => m.getAttribute("content") ?? text(m) ?? "");
  const conforms = [
    ...values("dcterms:conformsTo"),
    ...elements(doc, "link")
      .filter((l) => l.getAttribute("rel") === "dcterms:conformsTo")
      .map((l) => l.getAttribute("href") ?? ""),
  ].join(" ");

  // "EPUB Accessibility 1.1 - WCAG 2.1 Level AA" or the 1.0 profile URL.
  if (/EPUB Accessibility 1\.1|epub-a11y-11/i.test(conforms)) {
    return { status: "yes", notes: "EPUB 1.1 (W3C)" };
  }
  if (/idpf\.org\/epub\/a11y|EPUB Accessibility 1\.0/i.test(conforms)) {
    return { status: "yes", notes: "EPUB 1.0 (W3C)" };
  }
  // Describes its features but claims no standard.
  const features = values("schema:accessibilityFeature").filter(
    (f) => f && f !== "none" && f !== "unknown",
  );
  return features.length ? { status: "partial" } : { status: "unknown" };
}

export async function extractEpub(file: Blob): Promise<Extracted> {
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const read = async (path: string) => {
    const entry = zip.file(path);
    if (!entry) throw new Error(`Missing in EPUB: ${path}`);
    return entry.async("string");
  };

  const container = parseXml(await read("META-INF/container.xml"));
  const opfPath = elements(container, "rootfile")[0]?.getAttribute("full-path");
  if (!opfPath) throw new Error("EPUB without a package document");
  const opf = parseXml(await read(opfPath));

  const dates = elements(opf, "date");
  const published = dates.find((d) => d.getAttribute("opf:event") === "publication");
  // EPUB 2 may list creation or modification dates; those are not publication.
  const date = published ?? dates.find((d) => !d.getAttribute("opf:event"));

  const creators = elements(opf, "creator");
  const roles = new Map(
    elements(opf, "meta")
      .filter((m) => m.getAttribute("property") === "role")
      .map((m) => [m.getAttribute("refines")?.slice(1), text(m)]),
  );
  const authors = creators
    .filter((c) => {
      const role = c.getAttribute("opf:role") ?? roles.get(c.getAttribute("id") ?? "");
      return !role || role === "aut";
    })
    .flatMap((c) => text(c) ?? []);

  const metadata = {
    title: text(elements(opf, "title")[0]),
    authors,
    year: yearFrom(text(date)),
    publisher: text(elements(opf, "publisher")[0]),
    language: languageFrom(text(elements(opf, "language")[0])),
    isbn: elements(opf, "identifier")
      .map((el) => isbnFrom(text(el)))
      .find(Boolean),
    accessibility: accessibilityOf(opf),
  };

  const items = elements(opf, "item");
  const coverId = elements(opf, "meta")
    .find((m) => m.getAttribute("name") === "cover")
    ?.getAttribute("content");
  const item =
    items.find((i) => i.getAttribute("properties")?.split(/\s+/).includes("cover-image")) ??
    items.find((i) => i.getAttribute("id") === coverId);
  const href = item?.getAttribute("href");
  const type = item?.getAttribute("media-type");
  let cover: Blob | undefined;
  if (href && type?.startsWith("image/")) {
    const bytes = await zip.file(resolve(opfPath, href))?.async("arraybuffer");
    if (bytes) cover = new Blob([bytes], { type });
  }

  return { metadata, cover };
}
