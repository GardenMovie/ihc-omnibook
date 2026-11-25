/** Hands a file to the browser's downloads. */
export function saveFile(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  Object.assign(document.createElement("a"), { href: url, download: fileName }).click();
  // The download has to start before the URL goes away.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
