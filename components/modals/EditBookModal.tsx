"use client";

/** editarMetadados (docs/MODALS.md 4): edit or delete one book. */
import { useState, type RefObject } from "react";
import { BookCover } from "@/components/library/BookCover";
import { AppModal } from "@/components/ui/app-modal";
import { Button } from "@/components/ui/button";
import { updateBook } from "@/lib/db/books";
import type { Book, BookMetadata } from "@/lib/db/types";
import { t } from "@/lib/i18n";
import { MainFields, ReferenceFields, TermFields, useBookForm } from "./book-form";

const FORM_ID = "book-edit";
const danger = "border-destructive! text-destructive!";

export function EditBookModal({
  book,
  returnFocusRef,
  onClose,
  onSaved,
  onDelete,
}: {
  /** undefined = closed */
  book: Book | undefined;
  returnFocusRef: RefObject<HTMLElement | null>;
  onClose: () => void;
  onSaved: (book: Book) => void;
  /** Deletes the book and closes; throws if it could not be deleted. */
  onDelete: (book: Book) => Promise<void>;
}) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Start clean on each opening.
  const [previous, setPrevious] = useState(book?.id);
  if (book?.id !== previous) {
    setPrevious(book?.id);
    setConfirming(false);
    setBusy(false);
    setError("");
  }

  async function run(action: () => Promise<void>, failure: string) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (cause) {
      console.error(cause);
      setError(failure);
    } finally {
      setBusy(false);
    }
  }

  const save = (id: string, values: BookMetadata) =>
    run(async () => onSaved(await updateBook(id, values)), t("details.saveError"));

  const footer = confirming ? (
    <>
      {/* The safe choice gets the focus. */}
      <Button key="keep" autoFocus variant="secondary" onClick={() => setConfirming(false)}>
        {t("modal.cancel")}
      </Button>
      <Button
        key="delete"
        variant="secondary"
        className={danger}
        disabled={busy}
        onClick={() => book && void run(() => onDelete(book), t("edit.deleteError"))}
      >
        {t("edit.delete")}
      </Button>
    </>
  ) : (
    <>
      <Button
        key="ask"
        variant="secondary"
        className={`mr-auto ${danger}`}
        disabled={busy}
        onClick={() => {
          setError("");
          setConfirming(true);
        }}
      >
        {t("edit.delete")}
      </Button>
      <Button key="cancel" variant="secondary" onClick={onClose}>
        {t("modal.cancel")}
      </Button>
      <Button key="save" type="submit" form={FORM_ID} disabled={busy}>
        {t("edit.save")}
      </Button>
    </>
  );

  return (
    <AppModal
      open={book !== undefined}
      // While confirming, Escape goes back to the form, keeping what was typed.
      onOpenChange={(open) => {
        if (open) return;
        if (confirming) setConfirming(false);
        else onClose();
      }}
      title={t("panel.edit")}
      returnFocusRef={returnFocusRef}
      dismissOnOutside={false}
      footer={footer}
    >
      {error && (
        <p role="alert" className="mb-3 text-lg font-medium text-destructive">
          {error}
        </p>
      )}
      {book && confirming && (
        <p role="alert" className="text-lg break-words">
          {t("edit.deleteQuestion", { title: book.title })}
        </p>
      )}
      {book && (
        <div hidden={confirming}>
          <EditForm key={book.id} book={book} onSubmit={(values) => void save(book.id, values)} />
        </div>
      )}
    </AppModal>
  );
}

function EditForm({ book, onSubmit }: { book: Book; onSubmit: (values: BookMetadata) => void }) {
  const form = useBookForm(book, onSubmit);
  const heading = "text-xl font-semibold";
  const hint = "text-base text-muted-foreground";

  return (
    <form id={FORM_ID} noValidate className="flex flex-col gap-6" onSubmit={form.submit}>
      <section aria-labelledby={`${FORM_ID}-data`} className="flex flex-col gap-4">
        <div>
          <h3 id={`${FORM_ID}-data`} className={heading}>
            {t("edit.data")}
          </h3>
          <p className={hint}>{t("edit.dataHint")}</p>
        </div>
        <div className="grid gap-6 sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)]">
          <div className="mx-auto w-40 sm:w-full">
            <BookCover book={book} />
          </div>
          <MainFields {...form.main} />
        </div>
        <ReferenceFields {...form.reference} />
      </section>

      <section
        aria-labelledby={`${FORM_ID}-organization`}
        className="flex flex-col gap-4 border-t border-border pt-5"
      >
        <div>
          <h3 id={`${FORM_ID}-organization`} className={heading}>
            {t("edit.organization")}
          </h3>
          <p className={hint}>{t("edit.organizationHint")}</p>
        </div>
        <TermFields {...form.terms} />
      </section>
    </form>
  );
}
