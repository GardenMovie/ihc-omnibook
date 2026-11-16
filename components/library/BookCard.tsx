import { accessibilitySummary, authorLine, authorShort, type Book } from "@/lib/books";
import { t } from "@/lib/i18n";
import { AccessibilityBadge } from "./AccessibilityBadge";
import { BookCover } from "./BookCover";

export function BookCard({
  book,
  selected,
  onSelect,
}: {
  book: Book;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={[
        t("book.select", { title: book.title }),
        t("book.by", { author: authorLine(book) }) + ".",
        accessibilitySummary(book),
      ]
        .filter(Boolean)
        .join(" ")}
      onClick={onSelect}
      className={`relative flex h-full w-full flex-col gap-2 rounded-lg border-2 p-1.5 text-left transition-colors duration-150 ${
        selected
          ? "border-primary bg-accent"
          : "border-transparent hover:border-border hover:bg-muted"
      }`}
    >
      <BookCover book={book} className="text-[0.8rem] sm:text-[0.9rem]" />
      <span className="px-1 pb-1">
        {/* Fixed-size slots (in line units, so they scale with text size) keep
            every card the same height; full text lives in the details panel. */}
        <span className="line-clamp-2 min-h-[2lh] text-lg leading-snug font-semibold">
          {book.title}
        </span>
        <span className="line-clamp-1 text-base text-muted-foreground">{authorShort(book)}</span>
        <span className="mt-2 flex min-h-8 items-start">
          <AccessibilityBadge accessibility={book.accessibility} />
        </span>
      </span>
    </button>
  );
}
