"use client";

/** exportarReferencia (docs/MODALS.md 5): preview, copy and download. */
import { useState, type RefObject } from "react";
import { AppModal } from "@/components/ui/app-modal";
import { Button } from "@/components/ui/button";
import { OptionGroup } from "@/components/ui/option-group";
import { authorLine, type Book } from "@/lib/books";
import { saveFile } from "@/lib/download";
import { bookFileName } from "@/lib/files/filename";
import { t } from "@/lib/i18n";
import { toAbnt, toAbntHtml, toAbntParts } from "@/lib/refs/abnt";
import { toBibtex } from "@/lib/refs/bibtex";
import { missingFields, type RefFormat } from "@/lib/refs/missing";

const preview = "rounded-lg border border-border p-6 text-lg leading-normal break-words";

async function copy(book: Book, format: RefFormat) {
  if (format === "bibtex") return navigator.clipboard.writeText(toBibtex(book));
  const text = toAbnt(book);
  // Without ClipboardItem only the bold title is lost.
  if (typeof ClipboardItem === "undefined") return navigator.clipboard.writeText(text);
  await navigator.clipboard.write([
    new ClipboardItem({
      "text/plain": new Blob([text], { type: "text/plain" }),
      "text/html": new Blob([toAbntHtml(book)], { type: "text/html" }),
    }),
  ]);
}

function downloadBib(book: Book) {
  const name = bookFileName(book).replace(/\.[^.]+$/, ".bib");
  saveFile(new Blob([toBibtex(book)], { type: "application/x-bibtex" }), name);
}

export function ExportRefModal({
  book,
  returnFocusRef,
  onClose,
  onEdit,
}: {
  /** The live record, so the preview follows edits. undefined = closed */
  book: Book | undefined;
  returnFocusRef: RefObject<HTMLElement | null>;
  onClose: () => void;
  onEdit: () => void;
}) {
  const [format, setFormat] = useState<RefFormat>("bibtex");
  const [result, setResult] = useState<"copied" | "failed">();

  const [previous, setPrevious] = useState(book?.id);
  if (book?.id !== previous) {
    setPrevious(book?.id);
    setResult(undefined);
  }

  const missing = book ? missingFields(book, format) : [];

  return (
    <AppModal
      open={book !== undefined}
      onOpenChange={(open) => !open && onClose()}
      title={t("panel.exportRef")}
      description={book && [book.title, authorLine(book)].filter(Boolean).join(" · ")}
      returnFocusRef={returnFocusRef}
      cancelLabel={t("modal.closeButton")}
      confirmLabel={t("export.copy")}
      onConfirm={() => {
        if (!book) return;
        setResult(undefined);
        copy(book, format).then(
          () => setResult("copied"),
          (cause) => {
            console.error(cause);
            setResult("failed");
          },
        );
      }}
    >
      {book && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <OptionGroup<RefFormat>
              legend={t("export.format")}
              value={format}
              options={[
                { value: "bibtex", label: "BibTeX" },
                { value: "abnt", label: "ABNT" },
              ]}
              onChange={(value) => {
                setFormat(value);
                setResult(undefined);
              }}
              columns={2}
            />
            {format === "bibtex" && (
              <Button variant="secondary" onClick={() => downloadBib(book)}>
                {t("export.download")}
              </Button>
            )}
          </div>

          {/* Focusable, so the text can be reached and selected by keyboard. */}
          {format === "bibtex" ? (
            <pre
              tabIndex={0}
              role="region"
              aria-label={t("export.previewBibtex")}
              className={`${preview} bg-[var(--code-bg)] font-mono whitespace-pre-wrap text-[var(--code-fg)] select-all`}
            >
              {toBibtex(book).trimEnd()}
            </pre>
          ) : (
            <div
              tabIndex={0}
              role="region"
              aria-label={t("export.previewAbnt")}
              className={`${preview} bg-muted select-all`}
            >
              {toAbntParts(book).map((part, i) =>
                part.bold ? <strong key={i}>{part.text}</strong> : <span key={i}>{part.text}</span>,
              )}
            </div>
          )}

          {missing.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-accent px-4 py-3 text-base font-medium text-accent-foreground [[data-theme=high-contrast]_&]:border-2 [[data-theme=high-contrast]_&]:border-foreground">
              <p>
                {t("export.missing", {
                  fields: missing.map((field) => t(`field.${field}` as "field.title")).join(", "),
                })}
              </p>
              <Button variant="secondary" onClick={onEdit}>
                {t("panel.edit")}
              </Button>
            </div>
          )}

          <p className="text-base text-muted-foreground">{t("export.note")}</p>

          {/* Always present, so the result is announced. */}
          <p role="status" className="text-center text-lg font-semibold">
            {result === "copied" && t("export.copied")}
            {result === "failed" && <span className="text-destructive">{t("export.copyError")}</span>}
          </p>
        </div>
      )}
    </AppModal>
  );
}
