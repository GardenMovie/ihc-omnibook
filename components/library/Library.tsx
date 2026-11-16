"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as Tooltip from "@radix-ui/react-tooltip";
import { X } from "lucide-react";
import {
  matchesQuery,
  PLACEHOLDER_BOOKS,
  sortBooks,
  type SortKey,
} from "@/lib/books";
import { plural, t } from "@/lib/i18n";
import {
  applySettings,
  DEFAULT_SETTINGS,
  loadSettings,
  saveSettings,
  type Settings,
} from "@/lib/settings";
import { Button } from "@/components/ui/button";
import { BookCard } from "./BookCard";
import { MetadataPanel } from "./MetadataPanel";
import { Navbar } from "./Navbar";
import { SettingsModal } from "./SettingsModal";
import { SortMenu } from "./SortMenu";

export function Library() {
  const [books] = useState(PLACEHOLDER_BOOKS);
  const [query, setQuery] = useState("");
  const [area, setArea] = useState("");
  const [sort, setSort] = useState<SortKey>("recent");
  const [selectedId, setSelectedId] = useState<string | undefined>(books[0]?.id);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [notice, setNotice] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsButtonRef = useRef<HTMLButtonElement>(null);

  // Saved settings are already applied to the page before first paint
  // (BOOT_SCRIPT in layout); this just syncs the controls with them.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSettings(loadSettings());
  }, []);

  // Follow the system theme live while "Automático" is selected.
  useEffect(() => {
    if (settings.theme !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applySettings(settings);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [settings]);

  function updateSettings(patch: Partial<Settings>) {
    const next = { ...settings, ...patch };
    setSettings(next);
    saveSettings(next);
    applySettings(next);
  }

  const areas = useMemo(
    () => [...new Set(books.flatMap((b) => b.areas))].sort((a, b) => a.localeCompare(b, "pt-BR")),
    [books],
  );

  const visible = useMemo(
    () =>
      sortBooks(
        books.filter((b) => matchesQuery(b, query) && (!area || b.areas.includes(area))),
        sort,
      ),
    [books, query, area, sort],
  );

  const filtering = query.trim() !== "" || area !== "";
  const selected = books.find((b) => b.id === selectedId);
  const countText = filtering
    ? visible.length === 0
      ? t("results.none")
      : plural(visible.length, { one: "results.one", other: "results.other" })
    : plural(visible.length, { one: "library.count.one", other: "library.count.other" });

  const unavailable = () => setNotice(t("toast.soon"));

  return (
    <Tooltip.Provider delayDuration={300}>
      <a
        href="#conteudo"
        className="sr-only z-50 rounded-md bg-primary px-4 py-3 text-lg font-medium text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        {t("skip")}
      </a>

      <Navbar
        query={query}
        onQueryChange={setQuery}
        areas={areas}
        area={area}
        onAreaChange={setArea}
        onOpenSettings={() => setSettingsOpen(true)}
        settingsButtonRef={settingsButtonRef}
        onUnavailable={unavailable}
      />
      <SettingsModal
        returnFocusRef={settingsButtonRef}
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        settings={settings}
        onChange={updateSettings}
      />

      <div className="grid flex-1 items-start gap-6 p-4 sm:p-6 lg:grid-cols-[minmax(0,2fr)_minmax(22rem,1fr)]">
        <main id="conteudo" tabIndex={-1} className="min-w-0 outline-none">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-x-6">
            <h1 className="sr-only">{t("library.title")}</h1>
            <SortMenu value={sort} onChange={setSort} />
            {/* Announced politely whenever the number of books changes */}
            <p role="status" className="text-lg text-muted-foreground">
              {countText}
            </p>
          </div>

          <section
            aria-label={t("library.list")}
            className="rounded-xl bg-background p-4 shadow-[0_1px_4px_rgb(0_0_0/0.12)]"
          >
            {visible.length === 0 ? (
              <div className="flex flex-col items-center gap-5 py-16 text-center">
                <p className="text-lg">{t("library.empty")}</p>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setQuery("");
                    setArea("");
                  }}
                >
                  {t("library.clearAll")}
                </Button>
              </div>
            ) : (
              <ul className="grid grid-cols-[repeat(auto-fill,minmax(10.5rem,1fr))] items-start gap-4">
                {visible.map((book) => (
                  <li key={book.id}>
                    <BookCard
                      book={book}
                      selected={book.id === selectedId}
                      onSelect={() => setSelectedId(book.id)}
                    />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </main>

        <MetadataPanel book={selected} onUnavailable={unavailable} />
      </div>

      {notice && (
        <div
          role="status"
          className="fixed right-4 bottom-4 left-4 z-50 mx-auto flex max-w-xl items-center gap-4 rounded-lg bg-foreground py-3 pr-2 pl-5 text-lg text-background shadow-[0_12px_40px_rgb(0_0_0/0.25)]"
        >
          <span className="flex-1">{notice}</span>
          <button
            type="button"
            aria-label={t("toast.close")}
            onClick={() => setNotice("")}
            className="inline-flex size-11 items-center justify-center rounded-md hover:bg-background/20"
          >
            <X aria-hidden className="size-5" />
          </button>
        </div>
      )}
    </Tooltip.Provider>
  );
}
