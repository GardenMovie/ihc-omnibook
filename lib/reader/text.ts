/** Preparing TXT and Markdown files for the reader. */

/** UTF-8 or UTF-16; anything else is taken as Windows-1252, common in older TXT files. */
export async function decodeText(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const decode = (encoding: string) => new TextDecoder(encoding, { fatal: true }).decode(bytes);
  if (bytes[0] === 0xff && bytes[1] === 0xfe) return decode("utf-16le");
  if (bytes[0] === 0xfe && bytes[1] === 0xff) return decode("utf-16be");
  try {
    return decode("utf-8");
  } catch {
    return new TextDecoder("windows-1252").decode(bytes);
  }
}

/** Lines at least this long were probably broken by the file's fixed width. */
const WRAPPED = 55;

/**
 * Paragraphs are separated by blank lines. Prose with a fixed line width (as in
 * Project Gutenberg) is joined, so it reflows with the text size; verse, lists
 * and indented text keep their line breaks.
 */
export function paragraphs(text: string): string[] {
  return text
    .replace(/\r\n?/g, "\n")
    .split(/\n[ \t]*\n/)
    .map((block) => block.replace(/^\n+|\s+$/g, ""))
    .filter(Boolean)
    .map((block) => {
      const lines = block.split("\n");
      const prose =
        lines.length > 1 &&
        lines.slice(0, -1).every((line) => line.trimEnd().length >= WRAPPED) &&
        lines.slice(1).every((line) => !/^\s/.test(line));
      return prose ? lines.map((line) => line.trim()).join(" ") : block;
    });
}

/** The YAML header some Markdown files start with is data, not text to read. */
export const stripFrontMatter = (markdown: string) =>
  markdown.replace(/^---\r?\n[\s\S]*?\r?\n---[ \t]*(\r?\n|$)/, "");

/** How far down a scrolling area is, from 0 to 1. */
export function scrollFraction(box: {
  scrollTop: number;
  scrollHeight: number;
  clientHeight: number;
}): number {
  const room = box.scrollHeight - box.clientHeight;
  return room > 0 ? Math.min(1, Math.max(0, box.scrollTop / room)) : 0;
}
