import { describe, expect, it } from "vitest";
import { extract } from "@/lib/extract";
import { splitAuthors } from "@/lib/extract/pdf";
import { makeEpub, makePdf } from "./fixtures";

describe("EPUB", () => {
  it("reads metadata, cover and the accessibility claim", async () => {
    const file = await makeEpub(
      `<dc:title>Um Livro</dc:title>
       <dc:creator>Ana Souza</dc:creator>
       <dc:creator id="t">Tradutor Um</dc:creator>
       <meta refines="#t" property="role">trl</meta>
       <dc:date>2020-05-01</dc:date>
       <dc:publisher>Editora</dc:publisher>
       <dc:language>pt_BR</dc:language>
       <dc:identifier>urn:isbn:978-85-333-0227-3</dc:identifier>
       <meta property="dcterms:conformsTo">EPUB Accessibility 1.1 - WCAG 2.1 Level AA</meta>`,
      `<item id="c" href="images/cover.png" media-type="image/png" properties="cover-image"/>`,
    );
    const { metadata, cover, failed } = await extract(file, "x.epub", "epub");
    expect(failed).toBe(false);
    expect(metadata).toMatchObject({
      title: "Um Livro",
      authors: ["Ana Souza"],
      year: 2020,
      publisher: "Editora",
      language: "pt-BR",
      isbn: "9788533302273",
      accessibility: { status: "yes", notes: "EPUB 1.1 (W3C)" },
    });
    expect(cover?.type).toBe("image/png");
  });
});

describe("PDF", () => {
  it("does not take the creation date as the year", async () => {
    const file = makePdf({
      info: "/Title (Real Title) /Author (Ana Souza; Beto Lima) /CreationDate (D:20240101000000)",
    });
    const { metadata, failed } = await extract(file, "x.pdf", "pdf");
    expect(failed).toBe(false);
    expect(metadata).toMatchObject({ title: "Real Title", authors: ["Ana Souza", "Beto Lima"] });
    expect(metadata.year).toBeUndefined();
    expect(metadata.accessibility).toEqual({ status: "no" });
  });

  it("reads XMP publication date and PDF/UA, as elements or attributes", async () => {
    const file = makePdf({
      info: "/Title (Microsoft Word - draft.docx)",
      xmp: `<rdf:Description pdfuaid:part="1"></rdf:Description>
            <rdf:Description><prism:publicationDate>2019-02-01</prism:publicationDate></rdf:Description>`,
    });
    const { metadata } = await extract(file, "minha_tese.pdf", "pdf");
    expect(metadata).toMatchObject({
      title: "minha tese",
      year: 2019,
      accessibility: { status: "yes", notes: "PDF/UA" },
    });
  });

  it("tells a list of authors from 'Last, First'", () => {
    expect(splitAuthors("Souza, Ana")).toEqual(["Souza, Ana"]);
    expect(splitAuthors("Ana Souza, Beto Lima")).toEqual(["Ana Souza", "Beto Lima"]);
  });
});

describe("text and damaged files", () => {
  it("uses the first Markdown heading, skipping code", async () => {
    const file = new Blob(["```sh\n# not this\n```\n\n# Notas de **Cálculo**\n"]);
    expect((await extract(file, "a.md", "md")).metadata.title).toBe("Notas de Cálculo");
  });

  it("falls back to the filename and never throws", async () => {
    expect((await extract(new Blob(["x"]), "lista.txt", "txt")).metadata.title).toBe("lista");
    const broken = await extract(new Blob(["junk"]), "quebrado.epub", "epub");
    expect(broken.failed).toBe(true);
    expect(broken.metadata.title).toBe("quebrado");
    expect(broken.metadata.accessibility).toBeUndefined();
  });
});
