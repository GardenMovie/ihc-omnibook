"use client";

/** Form fields shared by the book modals (STYLE 4: Input, Chip, Chip/Add). */
import { CircleAlert, Plus, X } from "lucide-react";
import { useId, useRef, useState, type InputHTMLAttributes, type ReactNode, type Ref } from "react";
import { cleanList } from "@/lib/db/books";
import { t } from "@/lib/i18n";

export const inputClass =
  "min-h-12 w-full rounded-lg border-[1.5px] border-input bg-background px-3.5 py-2 text-lg text-foreground focus-visible:border-primary aria-invalid:border-destructive";

export const labelClass = "mb-1.5 block text-base font-medium";

export function TextField({
  label,
  error,
  hint,
  ref,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  hint?: ReactNode;
  ref?: Ref<HTMLInputElement>;
}) {
  const id = useId();
  const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(" ");
  return (
    <div className="min-w-0">
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      <input
        ref={ref}
        id={id}
        className={inputClass}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        autoComplete="off"
        {...props}
      />
      {hint && (
        <p id={`${id}-hint`} className="mt-1 text-base text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="mt-1 flex items-center gap-1.5 text-base text-destructive">
          <CircleAlert aria-hidden className="size-5 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}

const textButton =
  "inline-flex min-h-11 items-center gap-1.5 rounded-md px-2 text-base font-medium text-secondary-foreground hover:bg-accent";

/** One input per author, so "Silva, João" is never split at the comma. */
export function AuthorsField({
  values,
  onChange,
}: {
  values: string[];
  onChange: (values: string[]) => void;
}) {
  const id = useId();
  const [added, setAdded] = useState(false);
  const addButton = useRef<HTMLButtonElement>(null);
  const rows = values.length ? values : [""];

  return (
    <fieldset className="min-w-0">
      <legend className={labelClass}>{t("field.authors")}</legend>
      <div className="flex flex-col gap-2">
        {rows.map((author, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              aria-label={t("field.authorNumber", { n: i + 1 })}
              aria-describedby={`${id}-hint`}
              className={inputClass}
              autoComplete="off"
              autoFocus={added && i === rows.length - 1}
              value={author}
              onChange={(e) => onChange(rows.map((a, j) => (j === i ? e.target.value : a)))}
            />
            {rows.length > 1 && (
              <button
                type="button"
                aria-label={t("field.removeAuthor", { name: author || String(i + 1) })}
                className="inline-flex size-11 shrink-0 items-center justify-center rounded-md hover:bg-accent"
                onClick={() => {
                  setAdded(false);
                  onChange(rows.filter((_, j) => j !== i));
                  addButton.current?.focus();
                }}
              >
                <X aria-hidden className="size-5" />
              </button>
            )}
          </div>
        ))}
      </div>
      <p id={`${id}-hint`} className="mt-1 text-base text-muted-foreground">
        {t("field.authorsHint")}
      </p>
      <button
        ref={addButton}
        type="button"
        className={textButton}
        onClick={() => {
          setAdded(true);
          onChange([...rows, ""]);
        }}
      >
        <Plus aria-hidden className="size-5" />
        {t("field.addAuthor")}
      </button>
    </fieldset>
  );
}

/**
 * Chips with an inline "add" input. The text still being typed belongs to the
 * form (`pending`), so saving includes it even without pressing Enter.
 */
export function ChipField({
  label,
  addLabel,
  values,
  pending,
  suggestions,
  onChange,
}: {
  label: string;
  /** Accessible name of the add button and input, e.g. "Adicionar tópico". */
  addLabel: string;
  values: string[];
  /** null = the input is closed. */
  pending: string | null;
  suggestions: string[];
  onChange: (values: string[], pending: string | null) => void;
}) {
  const id = useId();
  const [announcement, setAnnouncement] = useState("");
  const addButton = useRef<HTMLButtonElement>(null);
  const input = useRef<HTMLInputElement>(null);

  function close() {
    onChange(values, null);
    // The button only exists after the next render.
    requestAnimationFrame(() => addButton.current?.focus());
  }

  return (
    <div role="group" aria-labelledby={`${id}-label`}>
      <span id={`${id}-label`} className={labelClass}>
        {label}
      </span>
      <div className="flex flex-wrap items-center gap-2.5">
        {values.map((value) => (
          <span
            key={value}
            className="inline-flex min-h-10 items-center gap-1 rounded-full border border-transparent bg-accent py-1 pr-1.5 pl-3.5 text-base font-medium text-accent-foreground [[data-theme=high-contrast]_&]:border-2 [[data-theme=high-contrast]_&]:border-foreground"
          >
            {value}
            <button
              type="button"
              aria-label={t("field.removeTerm", { name: value })}
              className="inline-flex size-8 items-center justify-center rounded-full hover:bg-background"
              onClick={() => {
                onChange(values.filter((v) => v !== value), pending);
                setAnnouncement(t("field.termRemoved", { name: value }));
                if (pending === null) addButton.current?.focus();
                else input.current?.focus();
              }}
            >
              <X aria-hidden className="size-4" />
            </button>
          </span>
        ))}
        {pending === null ? (
          <button
            ref={addButton}
            type="button"
            aria-label={addLabel}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-full border-[1.5px] border-dashed border-primary px-4 text-base font-medium text-secondary-foreground hover:bg-accent"
            onClick={() => onChange(values, "")}
          >
            <Plus aria-hidden className="size-4" />
            {t("field.add")}
          </button>
        ) : (
          <>
            <input
              ref={input}
              data-own-escape
              autoFocus
              aria-label={addLabel}
              aria-describedby={`${id}-hint`}
              list={`${id}-list`}
              autoComplete="off"
              className={`${inputClass} max-w-xs`}
              value={pending}
              onChange={(e) => onChange(values, e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault(); // add the term, do not send the form
                  const term = pending.trim();
                  if (!term) return close();
                  onChange(cleanList([...values, term]), "");
                  setAnnouncement(t("field.termAdded", { name: term }));
                } else if (e.key === "Escape") {
                  e.preventDefault();
                  close();
                }
              }}
            />
            <datalist id={`${id}-list`}>
              {suggestions.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </>
        )}
      </div>
      {pending !== null && (
        <p id={`${id}-hint`} className="mt-1 text-base text-muted-foreground">
          {t("field.termHint")}
        </p>
      )}
      <p role="status" className="sr-only">
        {announcement}
      </p>
    </div>
  );
}
