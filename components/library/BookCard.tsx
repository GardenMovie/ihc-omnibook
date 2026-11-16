import { Check } from "lucide-react";
import { authorLine, type Book } from "@/lib/books";
import { t } from "@/lib/i18n";
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
      aria-label={`${t("book.select", { title: book.title })} ${t("book.by", { author: authorLine(book) })}`}
      onClick={onSelect}
      className={`relative flex h-full w-full flex-col gap-2 rounded-lg border-2 p-1.5 text-left transition-colors duration-150 ${
        selected
          ? "border-primary bg-accent"
          : "border-transparent hover:border-border hover:bg-muted"
      }`}
    >
      <BookCover book={book} className="text-[0.8rem] sm:text-[0.9rem]" />
      {selected && (
        <span className="absolute top-3 right-3 inline-flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Check aria-hidden className="size-4" strokeWidth={3} />
        </span>
      )}
      <span className="px-1 pb-1">
        <span className="block text-lg leading-snug font-semibold">{book.title}</span>
        <span className="block text-base text-muted-foreground">{authorLine(book)}</span>
      </span>
    </button>
  );
}
