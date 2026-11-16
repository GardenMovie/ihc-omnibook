import type { Book } from "@/lib/books";

/**
 * Generated placeholder cover. Real covers (EPUB / first PDF page) will come
 * from OPFS later. Decorative: the title and author are always in real text
 * next to it, so it is hidden from screen readers.
 */
export function BookCover({
  book,
  className = "",
}: {
  book: Book;
  className?: string;
}) {
  const { from, to, text } = book.cover;
  return (
    <div
      aria-hidden="true"
      className={`relative flex aspect-[5/7] w-full flex-col justify-between overflow-hidden rounded-[var(--radius)] p-[8%] shadow-[0_2px_8px_rgb(0_0_0/0.25)] ${className}`}
      style={{ background: `linear-gradient(160deg, ${from}, ${to})`, color: text }}
    >
      <span className="line-clamp-1 text-[0.7em] font-semibold uppercase tracking-[0.18em] opacity-90">
        {book.authors[0]}
      </span>
      <span className="font-serif text-[1.35em] leading-tight font-semibold">
        {book.title}
      </span>
      <span className="text-[0.65em] uppercase tracking-widest opacity-80">
        {book.format}
      </span>
    </div>
  );
}
