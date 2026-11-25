import { describe, expect, it } from "vitest";
import { decodeText, paragraphs, scrollFraction, stripFrontMatter } from "@/lib/reader/text";

describe("reader text", () => {
  it("joins prose wrapped at a fixed width, but keeps verse and indented lines", () => {
    const long = "Uma noite destas, vindo da cidade para o Engenho Novo,";
    expect(paragraphs(`${long} encontrei\r\nno trem.\r\n\r\n\r\nFim.`)).toEqual([
      `${long} encontrei no trem.`,
      "Fim.",
    ]);
    expect(paragraphs("Batatinha quando nasce\nespalha a rama")).toEqual([
      "Batatinha quando nasce\nespalha a rama",
    ]);
    expect(paragraphs(`${long}\n    recuado`)).toEqual([`${long}\n    recuado`]);
  });

  it("reads UTF-8 and older Windows-1252 files", async () => {
    expect(await decodeText(new Blob(["﻿ação"]))).toBe("ação");
    expect(await decodeText(new Blob([new Uint8Array([0x61, 0xe7, 0xe3, 0x6f])]))).toBe("ação");
  });

  it("hides front matter only at the start", () => {
    expect(stripFrontMatter("---\ntitle: X\n---\n# X")).toBe("# X");
    expect(stripFrontMatter("# X\n\n---\n\ny\n\n---\n")).toBe("# X\n\n---\n\ny\n\n---\n");
  });

  it("measures the reading position", () => {
    expect(scrollFraction({ scrollTop: 50, scrollHeight: 300, clientHeight: 200 })).toBe(0.5);
    expect(scrollFraction({ scrollTop: 0, scrollHeight: 100, clientHeight: 200 })).toBe(0);
  });
});
