import { Pencil } from "lucide-react";
import {
  accessibilityBadgeText,
  accessibilityText,
  languageLabel,
  type Book,
} from "@/lib/books";
import { t } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { AccessibilityBadge } from "./AccessibilityBadge";
import { BookCover } from "./BookCover";

function Chips({ items }: { items: string[] }) {
  if (items.length === 0) return <>{t("panel.none")}</>;
  return (
    <ul className="flex flex-wrap gap-2.5">
      {items.map((item) => (
        <li
          key={item}
          className="rounded-full bg-accent px-3.5 py-1.5 text-base font-medium text-accent-foreground"
        >
          {item}
        </li>
      ))}
    </ul>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-base text-muted-foreground">{label}</dt>
      <dd className="text-lg">{children}</dd>
    </div>
  );
}

export function MetadataPanel({
  book,
  onUnavailable,
}: {
  book: Book | undefined;
  onUnavailable: () => void;
}) {
  return (
    <aside
      aria-label={t("panel.label")}
      className="flex flex-col gap-6 rounded-xl bg-background p-6 shadow-[0_1px_4px_rgb(0_0_0/0.12)] lg:sticky lg:top-6 lg:max-h-[calc(100dvh-3rem-var(--nav-h))] lg:overflow-y-auto"
    >
      {!book ? (
        <p className="py-10 text-center text-lg text-muted-foreground">{t("panel.empty")}</p>
      ) : (
        <>
          <div className="mx-auto w-full max-w-52 text-[0.9rem]">
            <BookCover book={book} />
          </div>

          <div className="flex items-start justify-between gap-4">
            <h2 className="text-[1.625rem] leading-tight font-semibold">{book.title}</h2>
            <IconButton label={t("panel.edit")} onClick={onUnavailable}>
              <Pencil aria-hidden className="size-5" />
            </IconButton>
          </div>

          <dl className="flex flex-col gap-4">
            <Field label={t(book.authors.length > 1 ? "panel.authors" : "panel.author")}>
              {book.authors.join(", ")}
            </Field>
            <Field label={t("panel.year")}>{book.year ?? t("panel.none")}</Field>
            <Field label={t("panel.areas")}>
              <Chips items={book.areas} />
            </Field>
            <Field label={t("panel.topics")}>
              <Chips items={book.topics} />
            </Field>
            <Field label={t("panel.language")}>{languageLabel(book.language)}</Field>
            {book.accessibility && (
              <Field label={t("panel.accessibility")}>
                {book.accessibility.status === "no" ? (
                  accessibilityText(book.accessibility)
                ) : (
                  <span className="flex flex-col items-start gap-1.5">
                    <AccessibilityBadge accessibility={book.accessibility} withTooltip={false} />
                    {/* Standard names are already on the pill; show longer notes */}
                    {book.accessibility.notes &&
                      accessibilityBadgeText(book.accessibility) !== book.accessibility.notes && (
                        <span className="text-base text-muted-foreground">
                          {book.accessibility.notes}
                        </span>
                      )}
                  </span>
                )}
              </Field>
            )}
          </dl>

          {/* Stays visible when the details scroll (long notes, large text) */}
          <div className="sticky bottom-0 -mb-6 flex flex-wrap gap-4 bg-background pt-2 pb-6">
            <Button className="flex-1" onClick={onUnavailable}>
              {t("panel.open")}
            </Button>
            <Button variant="secondary" className="flex-1" onClick={onUnavailable}>
              {t("panel.exportRef")}
            </Button>
          </div>
        </>
      )}
    </aside>
  );
}
