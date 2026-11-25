"use client";

/** addLivroUpload: choose, drop or paste files, then see what happened to each. */
import { CircleAlert, CircleCheck, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { BookCover } from "@/components/library/BookCover";
import { Button } from "@/components/ui/button";
import { plural, t } from "@/lib/i18n";
import type { AddResult } from "@/lib/library";

export type Item = { fileName: string; result: AddResult };
export type Progress = { done: number; total: number };

function describe({ result }: Item): { text: string; problem: boolean } {
  switch (result.status) {
    case "added":
      return result.unreadable
        ? { text: t("upload.unreadable"), problem: true }
        : { text: t("upload.ready"), problem: false };
    case "duplicate":
      return result.book.status === "draft"
        ? { text: t("upload.pending"), problem: false }
        : { text: t("upload.duplicate"), problem: true };
    case "unsupported":
      return { text: t("upload.unsupported"), problem: true };
    case "failed":
      return {
        text: t(result.reason === "storage-full" ? "upload.full" : "upload.failed"),
        problem: true,
      };
  }
}

export function UploadStep({
  items,
  progress,
  autoFill,
  onAutoFillChange,
  onFiles,
  onShowBook,
}: {
  items: Item[];
  /** Set while files are being read. */
  progress: Progress | null;
  autoFill: boolean;
  onAutoFillChange: (value: boolean) => void;
  onFiles: (files: File[]) => void;
  onShowBook: (id: string) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const busy = progress !== null;

  // Paste works anywhere in this step. A file dropped outside the zone must
  // not make the browser leave the app to open it.
  useEffect(() => {
    function onPaste(event: ClipboardEvent) {
      const files = [...(event.clipboardData?.files ?? [])];
      if (!files.length) return;
      event.preventDefault();
      onFiles(files);
    }
    function keepPage(event: DragEvent) {
      if (event.dataTransfer?.types.includes("Files")) event.preventDefault();
    }
    document.addEventListener("paste", onPaste);
    window.addEventListener("dragover", keepPage);
    window.addEventListener("drop", keepPage);
    return () => {
      document.removeEventListener("paste", onPaste);
      window.removeEventListener("dragover", keepPage);
      window.removeEventListener("drop", keepPage);
    };
  }, [onFiles]);

  const status = progress
    ? t("upload.progress", {
        n: Math.min(progress.done + 1, progress.total),
        total: progress.total,
      })
    : items.length
      ? plural(items.length, { one: "upload.done.one", other: "upload.done.other" })
      : "";

  return (
    <div className="flex flex-col gap-4">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) setOver(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          onFiles([...e.dataTransfer.files]);
        }}
        className={`flex flex-col items-center gap-3 rounded-[0.875rem] border-2 border-dashed px-6 text-center ${
          items.length ? "py-5" : "py-10"
        } ${over ? "border-primary bg-accent" : "border-input bg-muted"}`}
      >
        {!items.length && <Upload aria-hidden className="size-20" strokeWidth={1.75} />}
        <p className={items.length ? "text-lg" : "text-[1.625rem] leading-tight font-medium"}>
          {t(over ? "upload.dropNow" : "upload.drop")}
        </p>
        <p className="text-lg text-muted-foreground">{t("upload.or")}</p>
        <Button data-autofocus disabled={busy} onClick={() => input.current?.click()}>
          {t("upload.choose")}
        </Button>
        <input
          ref={input}
          data-testid="file-input"
          type="file"
          multiple
          accept=".pdf,.epub,.txt,.md,.markdown"
          className="hidden"
          onChange={(e) => {
            onFiles([...(e.target.files ?? [])]);
            e.target.value = "";
          }}
        />
        <p className="text-base text-muted-foreground">{t("upload.hint")}</p>
      </div>

      <label className="flex min-h-11 cursor-pointer items-center gap-3 text-base">
        <input
          type="checkbox"
          className="size-6 shrink-0 accent-[var(--primary)]"
          checked={autoFill}
          disabled={busy}
          onChange={(e) => onAutoFillChange(e.target.checked)}
        />
        {t("upload.autoFill")}
      </label>

      <p role="status" className="text-lg font-medium">
        {status}
      </p>

      {items.length > 0 && (
        <ul className="flex flex-col gap-3">
          {items.map((item, i) => {
            const { text, problem } = describe(item);
            const Icon = problem ? CircleAlert : CircleCheck;
            const { result } = item;
            return (
              <li key={i} className="flex items-center gap-4 rounded-lg border border-border p-3">
                <div className="w-16 shrink-0 text-[0.4rem]">
                  {"book" in result && <BookCover book={result.book} />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-lg font-medium break-words">{item.fileName}</p>
                  <p
                    className={`flex items-start gap-1.5 text-base ${problem ? "text-destructive" : ""}`}
                  >
                    <Icon aria-hidden className="mt-0.5 size-5 shrink-0" />
                    {text}
                  </p>
                </div>
                {result.status === "duplicate" && result.book.status === "ready" && (
                  <Button variant="secondary" onClick={() => onShowBook(result.book.id)}>
                    {t("upload.show")}
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
