"use client";

/** Reading a book inside the app. For now TXT and Markdown only. */
import { memo, useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { saveReadPosition } from "@/lib/db/books";
import type { Book, BookFormat } from "@/lib/db/types";
import { fileStore } from "@/lib/files/store";
import { t } from "@/lib/i18n";
import { decodeText, paragraphs, scrollFraction } from "@/lib/reader/text";
import { AppModal } from "@/components/ui/app-modal";
import { Button } from "@/components/ui/button";
import { MarkdownContent } from "./MarkdownContent";

export const canRead = (format: BookFormat) => format === "txt" || format === "md";

const PlainContent = memo(function PlainContent({ text }: { text: string }) {
  return (
    <div className="flex flex-col gap-4">
      {paragraphs(text).map((paragraph, index) => (
        <p key={index} className="whitespace-pre-wrap">
          {paragraph}
        </p>
      ))}
    </div>
  );
});

type Heading = { level: number; text: string; element: HTMLElement };

/** Mounted once per opened book. */
function Reader({ book, onClose }: { book: Book; onClose: () => void }) {
  const [text, setText] = useState<string>();
  const [failed, setFailed] = useState(false);
  const [headings, setHeadings] = useState<Heading[]>([]);
  const [contentsOpen, setContentsOpen] = useState(false);
  const [progress, setProgress] = useState<number>();
  const scroller = useRef<HTMLDivElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const contentsButton = useRef<HTMLButtonElement>(null);
  // Where the user is, until it is saved.
  const unsaved = useRef<number | undefined>(undefined);
  const timer = useRef<number | undefined>(undefined);
  // Saving updates the book: only the position at opening time is restored.
  const startAt = useRef(book.readPosition ?? 0);
  const { id, fileKey } = book;

  useEffect(() => {
    let cancelled = false;
    fileStore
      .get(fileKey)
      .then((blob) => {
        if (!blob) throw new Error(`No file for book ${id}`);
        return decodeText(blob);
      })
      .then(
        (found) => {
          if (!cancelled) setText(found);
        },
        (error) => {
          console.error(error);
          if (!cancelled) setFailed(true);
        },
      );
    return () => {
      cancelled = true;
    };
  }, [id, fileKey]);

  // Once the text is on the page: return to the saved place and list the headings.
  useLayoutEffect(() => {
    const box = scroller.current;
    if (text === undefined || !box) return;
    box.scrollTop = startAt.current * (box.scrollHeight - box.clientHeight);
    setProgress(box.scrollHeight > box.clientHeight ? scrollFraction(box) : undefined);
    if (book.format === "md") {
      setHeadings(
        [...(body.current?.querySelectorAll<HTMLElement>("h1, h2, h3") ?? [])]
          .filter((el) => !el.classList.contains("sr-only"))
          .map((element) => ({
            level: Number(element.tagName[1]),
            text: element.textContent ?? "",
            element,
          })),
      );
    }
  }, [text, book.format]);

  function save() {
    window.clearTimeout(timer.current);
    const position = unsaved.current;
    unsaved.current = undefined;
    if (position !== undefined) saveReadPosition(id, position).catch(console.error);
  }

  // Closing the reader or the tab must not lose the last scroll.
  useEffect(() => {
    window.addEventListener("pagehide", save);
    return () => {
      window.removeEventListener("pagehide", save);
      save();
    };
    // `save` only reads refs and the id, which does not change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onScroll() {
    const box = scroller.current;
    if (!box || text === undefined) return;
    const position = scrollFraction(box);
    unsaved.current = position;
    setProgress(position);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(save, 500);
  }

  function goTo(heading: Heading) {
    setContentsOpen(false);
    heading.element.tabIndex = -1;
    heading.element.focus({ preventScroll: true });
    heading.element.scrollIntoView({ block: "start" });
  }

  const top = Math.min(...headings.map((h) => h.level));

  return (
    <div className="flex h-full flex-col gap-3">
      {/* One row for everything, to leave the height to the text. */}
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={onClose}>{t("reader.back")}</Button>
        {headings.length > 1 && (
          <Button
            ref={contentsButton}
            variant="secondary"
            aria-expanded={contentsOpen}
            onClick={() => setContentsOpen((open) => !open)}
          >
            {t("reader.contents")}
          </Button>
        )}
        <p className="ml-auto text-base text-muted-foreground">
          {progress !== undefined && t("reader.progress", { n: Math.round(progress * 100) })}
        </p>
      </div>

      {contentsOpen && (
        <nav
          aria-label={t("reader.contents")}
          data-own-escape
          onKeyDown={(e) => {
            if (e.key !== "Escape") return;
            setContentsOpen(false);
            contentsButton.current?.focus();
          }}
          className="max-h-[40%] shrink-0 overflow-y-auto rounded-lg border-2 border-input p-2"
        >
          <ul>
            {headings.map((heading, index) => (
              <li key={index} style={{ paddingLeft: `${(heading.level - top) * 1.25}rem` }}>
                <button
                  type="button"
                  onClick={() => goTo(heading)}
                  className="min-h-11 w-full rounded-md px-3 py-1 text-left text-lg hover:bg-accent"
                >
                  {heading.text}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      )}

      {/* Focused on open, so arrows, Page Down and space scroll at once. */}
      <div
        ref={scroller}
        data-autofocus
        tabIndex={0}
        role="region"
        aria-label={t("reader.text")}
        aria-busy={text === undefined && !failed}
        onScroll={onScroll}
        className="min-h-0 flex-1 overflow-y-auto rounded-lg border border-border px-4 py-6"
      >
        {failed ? (
          <p role="alert" className="text-center text-lg">
            {t("reader.error")}
          </p>
        ) : text === undefined ? (
          <p className="text-center text-lg">{t("reader.loading")}</p>
        ) : (
          <div
            ref={body}
            data-reader-text
            // So screen readers pronounce the text in its own language.
            lang={book.language}
            className="mx-auto max-w-[70ch] text-lg leading-relaxed break-words [&>div>:first-child]:mt-0"
          >
            {book.format === "md" ? <MarkdownContent text={text} /> : <PlainContent text={text} />}
          </div>
        )}
      </div>
    </div>
  );
}

export function ReaderModal({
  book,
  onClose,
  returnFocusRef,
}: {
  /** Undefined = closed. */
  book: Book | undefined;
  onClose: () => void;
  returnFocusRef: RefObject<HTMLElement | null>;
}) {
  return (
    <AppModal
      open={!!book}
      onOpenChange={(open) => !open && onClose()}
      title={book?.title ?? ""}
      fullScreen
      returnFocusRef={returnFocusRef}
      // The way back is in the reader's own toolbar.
      footer={false}
    >
      {book && <Reader key={book.id} book={book} onClose={onClose} />}
    </AppModal>
  );
}
