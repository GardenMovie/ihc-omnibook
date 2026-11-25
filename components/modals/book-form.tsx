"use client";

/**
 * The metadata form shared by "addLivroDetalhes" and "editarMetadados": its
 * state, validation and groups of fields. Each screen arranges the groups.
 */
import { useEffect, useId, useRef, useState } from "react";
import { languageLabel, type Book } from "@/lib/books";
import { listTerms } from "@/lib/db/books";
import type { BookMetadata } from "@/lib/db/types";
import { t } from "@/lib/i18n";
import { AuthorsField, ChipField, TextField, inputClass, labelClass } from "./fields";

const LANGUAGES = ["pt-BR", "pt", "en", "en-US", "en-GB", "es", "fr", "de", "it"];

/** Initial values only: remount (with a `key`) to load another book. */
export function useBookForm(book: Book, onSubmit: (values: BookMetadata) => void) {
  const [title, setTitle] = useState(book.title);
  const [authors, setAuthors] = useState(book.authors);
  const [year, setYear] = useState(book.year ? String(book.year) : "");
  const [language, setLanguage] = useState(book.language ?? "");
  const [areas, setAreas] = useState<Terms>({ values: book.areas, pending: null });
  const [topics, setTopics] = useState<Terms>({ values: book.topics, pending: null });
  const [publisher, setPublisher] = useState(book.publisher ?? "");
  const [place, setPlace] = useState(book.place ?? "");
  const [edition, setEdition] = useState(book.edition ?? "");
  const [isbn, setIsbn] = useState(book.isbn ?? "");
  const [errors, setErrors] = useState<{ title?: string; year?: string }>({});
  const titleInput = useRef<HTMLInputElement>(null);
  const yearInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    titleInput.current?.focus();
  }, []);

  function submit(event: { preventDefault: () => void }) {
    event.preventDefault();
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

  return {
    main: {
      title,
      setTitle,
      titleInput,
      authors,
      setAuthors,
      year,
      setYear,
      yearInput,
      language,
      setLanguage,
      errors,
    },
    reference: { publisher, setPublisher, place, setPlace, edition, setEdition, isbn, setIsbn },
    terms: { areas, setAreas, topics, setTopics },
    submit,
  };
}

type Terms = { values: string[]; pending: string | null };
type Form = ReturnType<typeof useBookForm>;

/** Título, Autor, Ano, Idioma. */
export function MainFields({
  title,
  setTitle,
  titleInput,
  authors,
  setAuthors,
  year,
  setYear,
  yearInput,
  language,
  setLanguage,
  errors,
}: Form["main"]) {
  const languageId = useId();
  const languages =
    !language || LANGUAGES.includes(language) ? LANGUAGES : [language, ...LANGUAGES];

  return (
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
  );
}

/** Editora, Local, Edição, ISBN: what references need besides the main ones. */
export function ReferenceFields({
  publisher,
  setPublisher,
  place,
  setPlace,
  edition,
  setEdition,
  isbn,
  setIsbn,
}: Form["reference"]) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <TextField
        label={t("field.publisher")}
        value={publisher}
        onChange={(e) => setPublisher(e.target.value)}
      />
      <TextField label={t("field.place")} value={place} onChange={(e) => setPlace(e.target.value)} />
      <TextField
        label={t("field.edition")}
        value={edition}
        onChange={(e) => setEdition(e.target.value)}
      />
      <TextField label={t("field.isbn")} value={isbn} onChange={(e) => setIsbn(e.target.value)} />
    </div>
  );
}

/** Área and Tópicos, suggesting values already in use. */
export function TermFields({ areas, setAreas, topics, setTopics }: Form["terms"]) {
  const [used, setUsed] = useState<{ areas: string[]; topics: string[] }>({
    areas: [],
    topics: [],
  });

  useEffect(() => {
    listTerms().then(setUsed, console.error);
  }, []);

  return (
    <>
      <ChipField
        label={t("field.areas")}
        addLabel={t("field.addArea")}
        values={areas.values}
        pending={areas.pending}
        suggestions={used.areas}
        onChange={(values, pending) => setAreas({ values, pending })}
      />
      <ChipField
        label={t("field.topics")}
        addLabel={t("field.addTopic")}
        values={topics.values}
        pending={topics.pending}
        suggestions={used.topics}
        onChange={(values, pending) => setTopics({ values, pending })}
      />
    </>
  );
}
