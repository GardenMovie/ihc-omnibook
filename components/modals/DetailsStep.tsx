"use client";

/** addLivroDetalhes: review one draft before it joins the library. */
import { BookCover } from "@/components/library/BookCover";
import type { Book } from "@/lib/books";
import type { BookMetadata } from "@/lib/db/types";
import { titleFromFileName } from "@/lib/extract/common";
import { t } from "@/lib/i18n";
import { MainFields, ReferenceFields, TermFields, useBookForm } from "./book-form";

export function DetailsStep({
  book,
  formId,
  unreadable,
  onSubmit,
}: {
  book: Book;
  /** The submit button lives in the modal footer and points here. */
  formId: string;
  unreadable: boolean;
  onSubmit: (values: BookMetadata) => void;
}) {
  // The parent remounts this form for each book.
  const form = useBookForm(book, onSubmit);

  // Say "filled automatically" only if there is more than the file name.
  const filled =
    book.title !== titleFromFileName(book.fileName) ||
    [book.authors, book.areas, book.topics].some((list) => list.length > 0) ||
    [book.year, book.language, book.publisher, book.place, book.edition, book.isbn].some(Boolean);
  const banner = unreadable ? "details.unreadable" : filled ? "details.banner" : undefined;

  return (
    <form id={formId} noValidate className="flex flex-col gap-5" onSubmit={form.submit}>
      {banner && (
        <p className="rounded-md bg-accent px-4 py-3 text-base font-medium text-accent-foreground [[data-theme=high-contrast]_&]:border-2 [[data-theme=high-contrast]_&]:border-foreground">
          {t(banner)}
        </p>
      )}

      <div className="grid gap-6 sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)]">
        <div className="mx-auto w-40 sm:w-full">
          <BookCover book={book} />
          <p className="mt-2 text-base break-words text-muted-foreground">{book.fileName}</p>
        </div>
        <MainFields {...form.main} />
      </div>

      <TermFields {...form.terms} />

      <div>
        <p className="mb-3 text-base text-muted-foreground">{t("details.moreHint")}</p>
        <ReferenceFields {...form.reference} />
      </div>
    </form>
  );
}
