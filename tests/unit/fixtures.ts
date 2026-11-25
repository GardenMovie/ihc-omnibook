/** Tiny real PDF and EPUB files built in memory. */
import JSZip from "jszip";

export function makePdf(options: { info?: string; xmp?: string } = {}): Blob {
  const objects = [
    `<< /Type /Catalog /Pages 2 0 R ${options.xmp ? "/Metadata 5 0 R" : ""} >>`,
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 280] >>",
    `<< ${options.info ?? ""} >>`,
  ];
  if (options.xmp) {
    const xml = `<x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF>${options.xmp}</rdf:RDF></x:xmpmeta>`;
    objects.push(
      `<< /Type /Metadata /Subtype /XML /Length ${xml.length} >>\nstream\n${xml}\nendstream`,
    );
  }
  let pdf = "%PDF-1.7\n";
  const offsets = objects.map((body, i) => {
    const offset = pdf.length;
    pdf += `${i + 1} 0 obj\n${body}\nendobj\n`;
    return offset;
  });
  const start = pdf.length;
  const entries = offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("");
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${entries}`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R /Info 4 0 R >>\nstartxref\n${start}\n%%EOF`;
  return new Blob([pdf], { type: "application/pdf" });
}

export async function makeEpub(metadata: string, manifest = ""): Promise<Blob> {
  const zip = new JSZip();
  zip.file("mimetype", "application/epub+zip");
  zip.file(
    "META-INF/container.xml",
    `<?xml version="1.0"?><container><rootfiles><rootfile full-path="OEBPS/content.opf"/></rootfiles></container>`,
  );
  zip.file(
    "OEBPS/content.opf",
    `<?xml version="1.0"?><package xmlns="http://www.idpf.org/2007/opf"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/">${metadata}</metadata><manifest>${manifest}</manifest></package>`,
  );
  zip.file("OEBPS/images/cover.png", new Uint8Array([137, 80, 78, 71]));
  return new Blob([await zip.generateAsync({ type: "arraybuffer" })]);
}
