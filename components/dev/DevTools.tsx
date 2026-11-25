"use client";

/**
 * Development only (never in the production build): fills the library until
 * the add-book modal exists. English on purpose, it is not part of the product.
 */
import { useRef, useState } from "react";
import { confirmDraft } from "@/lib/db/books";
import { loadSamples } from "@/lib/dev/sample";
import { exportLibrary, importLibrary } from "@/lib/files/backup";
import { addFiles, deleteEverything } from "@/lib/library";

const button = "min-h-11 rounded-md border-2 border-input px-3 hover:bg-accent";

export default function DevTools() {
  const input = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState("");

  async function add(files: File[]) {
    const results = await addFiles(files);
    for (const result of results) {
      if (result.status === "added") await confirmDraft(result.book.id);
    }
    setMessage(results.map((r) => r.status).join(", "));
  }

  async function download() {
    const { blob, fileName } = await exportLibrary();
    const url = URL.createObjectURL(blob);
    const link = Object.assign(document.createElement("a"), { href: url, download: fileName });
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }

  async function restore(zip: File) {
    const { added, merged, skipped } = await importLibrary(zip);
    setMessage(`added ${added}, merged ${merged}, skipped ${skipped}`);
  }

  return (
    <details className="fixed bottom-2 left-2 z-40 rounded-lg border-2 border-dashed border-input bg-background p-2 text-base">
      <summary className="cursor-pointer px-1">Dev tools</summary>
      <div className="mt-2 flex flex-col gap-2">
        <button type="button" className={button} onClick={() => input.current?.click()}>
          Add files (skips review)
        </button>
        <input
          ref={input}
          data-testid="dev-add"
          type="file"
          multiple
          accept=".pdf,.epub,.txt,.md,.markdown"
          className="hidden"
          onChange={(e) => {
            void add([...(e.target.files ?? [])]);
            e.target.value = "";
          }}
        />
        <button type="button" className={button} onClick={() => void loadSamples()}>
          Load sample books
        </button>
        <button type="button" className={button} onClick={() => void download()}>
          Export backup
        </button>
        <label className="flex flex-col">
          Import backup
          <input
            data-testid="dev-import"
            type="file"
            accept=".zip"
            onChange={(e) => {
              const zip = e.target.files?.[0];
              if (zip) void restore(zip);
              e.target.value = "";
            }}
          />
        </label>
        <button
          type="button"
          className={button}
          onClick={() => {
            if (confirm("Delete every book and setting?")) void deleteEverything();
          }}
        >
          Delete everything
        </button>
        <p role="status">{message}</p>
      </div>
    </details>
  );
}
