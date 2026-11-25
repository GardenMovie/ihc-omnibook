"use client";

/**
 * Adding books, in two steps (docs/MODALS.md 2 and 3). Files are saved as
 * drafts as soon as they are read, so closing this never loses one.
 */
import { useCallback, useRef, useState, type RefObject } from "react";
import { AppModal } from "@/components/ui/app-modal";
import { Button } from "@/components/ui/button";
import { confirmDraft, deleteBook, restoreBook } from "@/lib/db/books";
import type { Book, BookMetadata } from "@/lib/db/types";
import { t } from "@/lib/i18n";
import { addFile } from "@/lib/library";
import { DetailsStep } from "./DetailsStep";
import { UploadStep, type Item, type Progress } from "./UploadStep";

export type AddMode = "upload" | "review";

const FORM_ID = "book-details";

export function AddBookModal({
  mode,
  drafts,
  returnFocusRef,
  onModeChange,
  onShowBook,
  onAdded,
  onDiscardedLast,
}: {
  /** null = closed */
  mode: AddMode | null;
  /** Books waiting for review, oldest first. */
  drafts: Book[];
  returnFocusRef: RefObject<HTMLElement | null>;
  onModeChange: (mode: AddMode | null) => void;
  /** Select a book that is already in the library. */
  onShowBook: (id: string) => void;
  /** The last book of the queue was added. */
  onAdded: (book: Book) => void;
  /** The last book of the queue was discarded. */
  onDiscardedLast: (book: Book) => void;
}) {
  const [items, setItems] = useState<Item[]>([]);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [autoFill, setAutoFill] = useState(true);
  const [unreadable, setUnreadable] = useState<ReadonlySet<string>>(new Set());
  const [reviewed, setReviewed] = useState(0);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [discarded, setDiscarded] = useState<Book>();
  const queue = useRef({ files: [] as File[], done: 0, running: false });

  // Start clean on each opening, but keep showing files still being read.
  const [previous, setPrevious] = useState(mode);
  if (mode !== previous) {
    setPrevious(mode);
    if (previous === null) {
      if (!progress) setItems([]);
      setReviewed(0);
      setSaving(false);
      setMessage("");
      setError("");
      setDiscarded(undefined);
    }
  }

  const onFiles = useCallback(
    async (files: File[]) => {
      if (!files.length) return;
      // Files dropped or pasted while others are being read join the queue.
      const q = queue.current;
      q.files.push(...files);
      setProgress({ done: q.done, total: q.files.length });
      if (q.running) return;
      q.running = true;
      while (q.done < q.files.length) {
        const file = q.files[q.done];
        const result = await addFile(file, { autoFill });
        q.done += 1;
        setProgress({ done: q.done, total: q.files.length });
        setItems((list) => [...list, { fileName: file.name, result }]);
        if (result.status === "added" && result.unreadable) {
          setUnreadable((ids) => new Set(ids).add(result.book.id));
        }
      }
      queue.current = { files: [], done: 0, running: false };
      setProgress(null);
    },
    [autoFill],
  );

  const draft = drafts[0];

  /** Runs a change to the current draft, reporting failure in the modal. */
  async function change(action: () => Promise<unknown>) {
    setSaving(true);
    setError("");
    try {
      await action();
      return true;
    } catch (cause) {
      console.error(cause);
      setError(t("details.saveError"));
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function add(values: BookMetadata) {
    if (saving) return;
    const last = drafts.length === 1;
    let book: Book | undefined;
    if (!(await change(async () => (book = await confirmDraft(draft.id, values))))) return;
    setDiscarded(undefined);
    setReviewed((n) => n + 1);
    setMessage(t("details.added", { title: book!.title }));
    if (last) onAdded(book!);
  }

  async function discard() {
    const book = draft;
    const last = drafts.length === 1;
    if (!(await change(() => deleteBook(book.id)))) return;
    if (last) return onDiscardedLast(book);
    setDiscarded(book);
    setMessage(t("details.discarded", { title: book.title }));
  }

  async function undo(book: Book) {
    if (!(await change(() => restoreBook(book.id)))) return;
    setDiscarded(undefined);
    setMessage(t("details.restored", { title: book.title }));
  }

  const reviewing = mode === "review";
  const busy = progress !== null;
  const total = reviewed + drafts.length;

  const footer = reviewing ? (
    <>
      <Button
        variant="secondary"
        className="mr-auto border-destructive! text-destructive!"
        disabled={saving || !draft}
        onClick={() => void discard()}
      >
        {t("details.discard")}
      </Button>
      <Button variant="secondary" onClick={() => onModeChange(null)}>
        {t("details.later")}
      </Button>
      <Button type="submit" form={FORM_ID} disabled={saving || !draft}>
        {t("details.confirm")}
      </Button>
    </>
  ) : (
    <>
      <Button variant="secondary" disabled={busy} onClick={() => onModeChange(null)}>
        {t(items.length && drafts.length ? "details.later" : items.length ? "modal.closeButton" : "modal.cancel")}
      </Button>
      <Button disabled={busy || !drafts.length || !items.length} onClick={() => onModeChange("review")}>
        {t("upload.continue")}
      </Button>
    </>
  );

  return (
    <AppModal
      open={mode !== null}
      onOpenChange={(open) => !open && onModeChange(null)}
      title={t("add.title")}
      description={
        reviewing && total > 1
          ? t("details.position", { n: reviewed + 1, total })
          : undefined
      }
      returnFocusRef={returnFocusRef}
      dismissOnOutside={false}
      footer={footer}
    >
      {/* Always present, so changes to them are announced. */}
      <div role="status" className={reviewing && message ? "mb-3 flex flex-wrap items-center gap-3" : "sr-only"}>
        <span>{reviewing ? message : ""}</span>
        {reviewing && discarded && (
          <Button variant="secondary" onClick={() => void undo(discarded)}>
            {t("toast.undo")}
          </Button>
        )}
      </div>
      {error && (
        <p role="alert" className="mb-3 text-lg font-medium text-destructive">
          {error}
        </p>
      )}

      {mode === "upload" && (
        <UploadStep
          items={items}
          progress={progress}
          autoFill={autoFill}
          onAutoFillChange={setAutoFill}
          onFiles={onFiles}
          onShowBook={onShowBook}
        />
      )}
      {reviewing && draft && (
        <DetailsStep
          key={draft.id}
          book={draft}
          formId={FORM_ID}
          unreadable={unreadable.has(draft.id)}
          onSubmit={(values) => void add(values)}
        />
      )}
    </AppModal>
  );
}
