import type { Extracted } from "./common";

/** Markdown: the first heading is the title. Plain text has no metadata. */
export async function extractText(file: Blob, format: "txt" | "md"): Promise<Extracted> {
  if (format === "txt") return { metadata: {} };
  const start = (await file.slice(0, 64 * 1024).text())
    .replace(/^﻿/, "")
    .replace(/^---\r?\n[\s\S]*?\r?\n---/, "") // front matter
    .replace(/^(```|~~~)[\s\S]*?^\1/gm, ""); // "#" inside code is not a heading
  const heading =
    start.match(/^ {0,3}#{1,6}[ \t]+(.+?)(?:[ \t]+#+)?[ \t]*$/m)?.[1] ??
    start.match(/^[ \t]*(\S.*?)[ \t]*\r?\n=+[ \t]*$/m)?.[1];
  const title = heading?.replace(/[*_`]|\[|\]\([^)]*\)/g, "").trim();
  return { metadata: title ? { title } : {} };
}
