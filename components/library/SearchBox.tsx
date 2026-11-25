"use client";

/**
 * The search field. Colors the "@área:", "@tópico:" and "@arquivo:" filters and
 * suggests their values (an ARIA combobox: arrows to choose, Enter to accept).
 */
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { Search, X } from "lucide-react";
import { plural, t } from "@/lib/i18n";
import {
  applySuggestion,
  parseQuery,
  suggest,
  type FilterKind,
  type Suggestion,
} from "@/lib/search";
import { ariaKeys, keyLabel } from "@/lib/shortcuts";
import { KeyHint } from "@/components/ui/shortcut";

// Never by color alone: the highlighted text itself says which filter it is.
const highlight: Record<FilterKind, string> = {
  area: "rounded-sm bg-(--tag-area) shadow-[inset_0_-2px_0_var(--tag-area-line)]",
  topic: "rounded-sm bg-(--tag-topic) shadow-[inset_0_-2px_0_var(--tag-topic-line)]",
  file: "rounded-sm bg-(--tag-file) shadow-[inset_0_-2px_0_var(--tag-file-line)]",
};

/** The query again, invisible, painting a background behind each filter. */
function Highlights({ query }: { query: string }) {
  const parts: React.ReactNode[] = [];
  let done = 0;
  for (const token of parseQuery(query)) {
    if (token.kind === "text") continue;
    parts.push(
      query.slice(done, token.start),
      <mark key={token.start} data-filter={token.kind} className={`text-transparent ${highlight[token.kind]}`}>
        {query.slice(token.start, token.end)}
      </mark>,
    );
    done = token.end;
  }
  parts.push(query.slice(done));
  return parts;
}

export function SearchBox({
  query,
  onQueryChange,
  terms,
  inputRef,
  shortcut,
}: {
  inputRef: RefObject<HTMLInputElement | null>;
  /** The key that focuses this field, if there is one. */
  shortcut?: string;
  query: string;
  onQueryChange: (query: string) => void;
  /** Areas and topics in use, and the file types, for suggestions. */
  terms: Record<FilterKind, string[]>;
}) {
  const highlightsRef = useRef<HTMLDivElement>(null);
  const id = useId();
  const [caret, setCaret] = useState(0);
  const [focused, setFocused] = useState(false);
  // Escape hides the list until the text changes.
  const [dismissed, setDismissed] = useState(false);
  const [active, setActive] = useState(0);
  const nextCaret = useRef<number>(undefined);

  const suggestions = focused && !dismissed ? suggest(query, caret, terms) : undefined;
  const items = suggestions?.items ?? [];
  const current = Math.min(active, items.length - 1);
  const optionId = (index: number) => `${id}-option-${index}`;

  /** Keeps the colors under the text when a long query scrolls. */
  const syncScroll = useCallback(() => {
    requestAnimationFrame(() => {
      const input = inputRef.current;
      if (input && highlightsRef.current) {
        highlightsRef.current.style.transform = `translateX(${-input.scrollLeft}px)`;
      }
    });
  }, [inputRef]);

  function readCaret() {
    setCaret(inputRef.current?.selectionStart ?? 0);
    syncScroll();
  }

  useLayoutEffect(() => {
    if (nextCaret.current !== undefined) {
      inputRef.current?.setSelectionRange(nextCaret.current, nextCaret.current);
      nextCaret.current = undefined;
    }
    syncScroll();
  }, [query, inputRef, syncScroll]);

  useEffect(() => {
    if (current >= 0) {
      document.getElementById(`${id}-option-${current}`)?.scrollIntoView({ block: "nearest" });
    }
  }, [current, id]);

  function choose(item: Suggestion) {
    if (!suggestions) return;
    const next = applySuggestion(query, suggestions, item);
    nextCaret.current = next.caret;
    setCaret(next.caret);
    setActive(0);
    onQueryChange(next.query);
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (!items.length) return;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActive((current + step + items.length) % items.length);
    } else if (event.key === "Enter") {
      choose(items[current]);
    } else if (event.key === "Escape") {
      setDismissed(true);
    } else {
      return;
    }
    // Escape would otherwise also clear a search field.
    event.preventDefault();
  }

  return (
    <div role="search" className="flex min-w-64 flex-1 items-center">
      <div className="relative flex-1 rounded-full bg-muted transition-colors focus-within:bg-background hover:bg-accent/60 focus-within:hover:bg-background">
        <label htmlFor={id} className="sr-only">
          {t("search.label")}
        </label>
        <Search
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground"
        />
        {/* Same box and font as the input's text, so the colors line up. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-[calc(3.5rem+1.5px)] left-[calc(3rem+1.5px)] flex items-center overflow-hidden text-lg"
        >
          <div ref={highlightsRef} className="whitespace-pre text-transparent">
            <Highlights query={query} />
          </div>
        </div>
        <input
          ref={inputRef}
          id={id}
          type="search"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={items.length > 0}
          aria-controls={`${id}-list`}
          aria-activedescendant={items.length ? optionId(current) : undefined}
          aria-describedby={`${id}-hint`}
          aria-keyshortcuts={ariaKeys(shortcut)}
          title={shortcut && t("shortcuts.hint", { key: keyLabel(shortcut) })}
          value={query}
          onChange={(e) => {
            onQueryChange(e.target.value);
            setCaret(e.target.selectionStart ?? e.target.value.length);
            setDismissed(false);
            setActive(0);
          }}
          onKeyDown={onKeyDown}
          onKeyUp={readCaret}
          onClick={readCaret}
          onSelect={readCaret}
          onScroll={syncScroll}
          onFocus={() => {
            setFocused(true);
            readCaret();
          }}
          onBlur={() => {
            setFocused(false);
            syncScroll();
          }}
          placeholder={t("search.placeholder")}
          autoComplete="off"
          spellCheck={false}
          // A combination such as "Ctrl + K" needs more room than one key.
          className={`relative min-h-12 w-full appearance-none rounded-full border-[1.5px] border-input bg-transparent py-2 pl-12 text-lg text-foreground placeholder:text-muted-foreground focus-visible:border-primary [&::-webkit-search-cancel-button]:hidden ${
            !query && shortcut && shortcut.length > 1 ? "pr-40" : "pr-14"
          }`}
        />
        <p id={`${id}-hint`} className="sr-only">
          {t("search.hint")}
        </p>
        <p role="status" className="sr-only">
          {items.length > 0 &&
            plural(items.length, { one: "search.suggestions.one", other: "search.suggestions.other" })}
        </p>
        <ul
          id={`${id}-list`}
          role="listbox"
          aria-label={t("search.suggestions")}
          hidden={!items.length}
          className="absolute inset-x-4 top-full z-30 mt-1 max-h-[min(20rem,50dvh)] overflow-y-auto rounded-lg border-2 border-border bg-background p-1 shadow-[0_12px_40px_rgb(0_0_0/0.25)]"
        >
          {items.map((item, index) => (
            <li
              key={item.insert}
              id={optionId(index)}
              role="option"
              aria-selected={index === current}
              // Keep the focus (and the caret) in the field.
              onMouseDown={(e) => e.preventDefault()}
              onMouseMove={() => setActive(index)}
              onClick={() => choose(item)}
              className={`flex min-h-11 cursor-pointer flex-wrap items-center gap-x-3 rounded-md px-3 text-lg ${
                index === current ? "bg-primary text-primary-foreground" : ""
              }`}
            >
              {item.type === "keyword" ? (
                <>
                  <span className={`px-1 text-foreground ${highlight[item.kind]}`}>{item.insert}</span>
                  <span className="text-base">{t(`search.filter.${item.kind}`)}</span>
                </>
              ) : (
                item.term
              )}
            </li>
          ))}
        </ul>
        {!query && (
          <KeyHint
            shortcut={shortcut}
            className="absolute top-1/2 right-4 -translate-y-1/2 bg-background text-muted-foreground"
          />
        )}
        {query && (
          <button
            type="button"
            aria-label={t("search.clear")}
            onClick={() => {
              onQueryChange("");
              setCaret(0);
              inputRef.current?.focus();
            }}
            className="absolute top-1/2 right-1.5 inline-flex size-10 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
          >
            <X aria-hidden className="size-5" />
          </button>
        )}
      </div>
    </div>
  );
}
