"use client";

/** addLivroDetalhes: review one draft before it joins the library. */
import { useEffect, useId, useRef, useState } from "react";
import { BookCover } from "@/components/library/BookCover";
import { languageLabel, type Book } from "@/lib/books";
import { listTerms } from "@/lib/db/books";
import type { BookMetadata } from "@/lib/db/types";
import { titleFromFileName } from "@/lib/extract/common";
import { t } from "@/lib/i18n";
import { AuthorsField, ChipField, TextField, inputClass, labelClass } from "./fields";

const LANGUAGES = ["pt-BR", "pt", "en", "en-US", "en-GB", "es", "fr", "de", "it"];

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
  // Initial values only: the parent remounts this form for each book.
  const [title, setTitle] = useState(book.title);
  const [authors, setAuthors] = useState(book.authors);
  const [year, setYear] = useState(book.year ? String(book.year) : "");
  const [language, setLanguage] = useState(book.language ?? "");
  const [areas, setAreas] = useState<{ values: string[]; pending: string | null }>({
    values: book.areas,
    pending: null,
  });
  const [topics, setTopics] = useState<{ values: string[]; pending: string | null }>({
    values: book.topics,
    pending: null,
  });
  const [publisher, setPublisher] = useState(book.publisher ?? "");
  const [place, setPlace] = useState(book.place ?? "");
  const [edition, setEdition] = useState(book.edition ?? "");
  const [isbn, setIsbn] = useState(book.isbn ?? "");
  const [errors, setErrors] = useState<{ title?: string; year?: string }>({});
  const [terms, setTerms] = useState<{ areas: string[]; topics: string[] }>({
    areas: [],
    topics: [],
  });
  const titleInput = useRef<HTMLInputElement>(null);
  const yearInput = useRef<HTMLInputElement>(null);
  const languageId = useId();

  useEffect(() => {
    titleInput.current?.focus();
    listTerms().then(setTerms, console.error);
  }, []);

  const languages =
    !language || LANGUAGES.includes(language) ? LANGUAGES : [language, ...LANGUAGES];

  // Say "filled automatically" only if there is more than the file name.
  const filled =
    book.title !== titleFromFileName(book.fileName) ||
    [book.authors, book.areas, book.topics].some((list) => list.length > 0) ||
    [book.year, book.language, book.publisher, book.place, book.edition, book.isbn].some(Boolean);
  const banner = unreadable ? "details.unreadable" : filled ? "details.banner" : undefined;

  function submit() {
    const found = {
      title: title.trim() ? undefined : t("details.titleRequired"),
      year: !year.trim() || /^[1-9]\d{0,3}$/.test(year.trim()) ? undefined : t("details.yearInvalid"),
    };
    setErrors(found);
    if (found.title) return titleInput.current?.focus();
    if (found.year) return yearInput.current?.focus();
    onSubmit({
      title,
      authors,
      year: year.trim() ? Number(year) : undefined,
      language: language || undefined,
      areas: [...areas.values, areas.pending ?? ""],
      topics: [...topics.values, topics.pending ?? ""],
      publisher,
      place,
      edition,
      isbn,
    });
  }

  return (
    <form
      id={formId}
      noValidate
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
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

        <div className="flex min-w-0 flex-col gap-4">
          <TextField
            ref={titleInput}
            label={t("field.title")}
            required
            error={errors.title}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <AuthorsField values={authors} onChange={setAuthors} />
          <div className="grid grid-cols-[repeat(auto-fit,minmax(11rem,1fr))] gap-4">
            <TextField
              ref={yearInput}
              label={t("field.year")}
              inputMode="numeric"
              error={errors.year}
              value={year}
              onChange={(e) => setYear(e.target.value)}
            />
            <div className="min-w-0">
              <label htmlFor={languageId} className={labelClass}>
                {t("field.language")}
              </label>
              <select
                id={languageId}
                className={inputClass}
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
              >
                <option value="">{t("panel.none")}</option>
                {languages.map((code) => (
                  <option key={code} value={code}>
                    {languageLabel(code)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      <ChipField
        label={t("field.areas")}
        addLabel={t("field.addArea")}
        values={areas.values}
        pending={areas.pending}
        suggestions={terms.areas}
        onChange={(values, pending) => setAreas({ values, pending })}
      />
      <ChipField
        label={t("field.topics")}
        addLabel={t("field.addTopic")}
        values={topics.values}
        pending={topics.pending}
        suggestions={terms.topics}
        onChange={(values, pending) => setTopics({ values, pending })}
      />

      <details>
        <summary className="min-h-11 cursor-pointer py-2 text-lg font-medium">
          {t("details.more")}
        </summary>
        <p className="mb-3 text-base text-muted-foreground">{t("details.moreHint")}</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label={t("field.publisher")}
            value={publisher}
            onChange={(e) => setPublisher(e.target.value)}
          />
          <TextField
            label={t("field.place")}
            value={place}
            onChange={(e) => setPlace(e.target.value)}
          />
          <TextField
            label={t("field.edition")}
            value={edition}
            onChange={(e) => setEdition(e.target.value)}
          />
          <TextField label={t("field.isbn")} value={isbn} onChange={(e) => setIsbn(e.target.value)} />
        </div>
      </details>
    </form>
  );
}
