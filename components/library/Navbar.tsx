"use client";

import Link from "next/link";
import { useEffect, useRef, type Ref } from "react";
import { BookOpen, Plus, Search, Settings as SettingsIcon, X } from "lucide-react";
import { t } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";

export function Navbar({
  query,
  onQueryChange,
  onOpenSettings,
  settingsButtonRef,
  onAdd,
  addButtonRef,
}: {
  onAdd: () => void;
  addButtonRef: Ref<HTMLButtonElement>;
  settingsButtonRef: Ref<HTMLButtonElement>;
  query: string;
  onQueryChange: (q: string) => void;
  onOpenSettings: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  // "/" focuses the search box (STYLE 6), unless the user is already typing.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "/" || e.ctrlKey || e.metaKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)) {
        return;
      }
      e.preventDefault();
      inputRef.current?.focus();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    // Wide screens: logo | search centered on the bar | actions. The two outer
    // columns are equal (1fr) so the search box sits in the true middle.
    <header className="flex min-h-[var(--nav-h)] flex-wrap items-center gap-x-6 gap-y-2 border-b border-border bg-background px-4 py-1.5 lg:grid lg:grid-cols-[1fr_minmax(0,44rem)_1fr]">
      <Link
        href="/"
        className="inline-flex min-h-12 items-center gap-2.5 justify-self-start rounded-lg pr-2 text-xl font-semibold tracking-tight"
      >
        <span className="inline-flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <BookOpen aria-hidden className="size-6" />
        </span>
        {t("nav.home")}
      </Link>

      <div role="search" className="flex min-w-64 flex-1 items-center">
        <div className="relative flex-1">
          <label htmlFor="library-search" className="sr-only">
            {t("search.label")}
          </label>
          <Search
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground"
          />
          <input
            ref={inputRef}
            id="library-search"
            type="search"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder={t("search.placeholder")}
            autoComplete="off"
            className="min-h-12 w-full rounded-full border-[1.5px] border-input bg-muted py-2 pr-14 pl-12 text-lg text-foreground transition-colors placeholder:text-muted-foreground hover:bg-accent/60 focus-visible:border-primary focus-visible:bg-background [&::-webkit-search-cancel-button]:hidden"
          />
          {!query && (
            // Shortcut hint; the shortcut itself is announced by the field's label
            <kbd
              aria-hidden
              className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 rounded-md border border-border bg-background px-2 text-base leading-snug text-muted-foreground"
            >
              /
            </kbd>
          )}
          {query && (
            <button
              type="button"
              aria-label={t("search.clear")}
              onClick={() => {
                onQueryChange("");
                inputRef.current?.focus();
              }}
              className="absolute top-1/2 right-1.5 inline-flex size-10 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
            >
              <X aria-hidden className="size-5" />
            </button>
          )}
        </div>
      </div>

      <div className="ml-auto flex items-center gap-3 lg:justify-self-end">
        <Button ref={addButtonRef} className="rounded-full! px-5!" onClick={onAdd}>
          <Plus aria-hidden className="size-5" strokeWidth={2.5} />
          {t("add.button")}
        </Button>
        {/* Replaces the Figma account avatar (there are no accounts, SPEC 6) and
            the text size / contrast / dark buttons: all live in this modal now. */}
        <IconButton
          ref={settingsButtonRef}
          label={t("settings.menu")}
          onClick={onOpenSettings}
        >
          <SettingsIcon aria-hidden className="size-6" />
        </IconButton>
      </div>
    </header>
  );
}
