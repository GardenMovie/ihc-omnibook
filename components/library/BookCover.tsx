"use client";

import type { Book } from "@/lib/books";
import { useCoverUrl } from "@/lib/hooks";

// Background gradient and text color for books without a cover image.
const PALETTE = [
  ["#7a1020", "#12080c", "#ffffff"],
  ["#0f5a24", "#062b12", "#ffffff"],
  ["#e6dcb8", "#c9bb8a", "#3b3320"],
  ["#16228a", "#0b1250", "#ffffff"],
  ["#1c1c1f", "#050505", "#f2f2f2"],
  ["#0b6b5b", "#0b3d37", "#ffffff"],
  ["#f1e4d4", "#d98a5a", "#3a2416"],
  ["#1a1aff", "#7d2bd6", "#ffffff"],
];

/** The same book always gets the same color. */
const colorsOf = (id: string) =>
  PALETTE[[...id].reduce((sum, c) => sum + c.charCodeAt(0), 0) % PALETTE.length];

/**
 * The cover from the file, or a generated one. Decorative: the title and
 * author are always in real text next to it, so it is hidden from screen
 * readers.
 */
export function BookCover({
  book,
  className = "",
}: {
  book: Book;
  className?: string;
}) {
  const url = useCoverUrl(book.coverKey);
  const frame = `relative aspect-[5/7] w-full overflow-hidden rounded-[var(--radius)] shadow-[0_2px_8px_rgb(0_0_0/0.25)] ${className}`;

  if (url) {
    return (
      <div aria-hidden="true" className={frame}>
        {/* eslint-disable-next-line @next/next/no-img-element -- a local blob URL */}
        <img src={url} alt="" className="size-full object-cover" />
      </div>
    );
  }

  const [from, to, text] = colorsOf(book.id);
  return (
    <div
      aria-hidden="true"
      className={`flex flex-col justify-between p-[8%] ${frame}`}
      style={{ background: `linear-gradient(160deg, ${from}, ${to})`, color: text }}
    >
      <span className="line-clamp-1 text-[0.7em] font-semibold uppercase tracking-[0.18em] opacity-90">
        {book.authors[0]}
      </span>
      <span className="line-clamp-5 font-serif text-[1.35em] leading-tight font-semibold break-words">
        {book.title}
      </span>
      <span className="text-[0.65em] uppercase tracking-widest opacity-80">
        {book.format}
      </span>
    </div>
  );
}
