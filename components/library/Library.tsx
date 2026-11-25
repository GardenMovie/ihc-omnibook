"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import * as Tooltip from "@radix-ui/react-tooltip";
import { X } from "lucide-react";
import { filterBooks, sortBooks, type SortKey } from "@/lib/books";
import { purgeDeleted, restoreBook } from "@/lib/db/books";
import { useBooks, useDrafts } from "@/lib/hooks";
import { plural, t } from "@/lib/i18n";
import {
  applySettings,
  DEFAULT_SETTINGS,
  loadSettings,
  saveSettings,
  type Settings,
} from "@/lib/settings";
import { AddBookModal, type AddMode } from "@/components/modals/AddBookModal";
import { Button } from "@/components/ui/button";
import { BookCard } from "./BookCard";
import { MetadataPanel } from "./MetadataPanel";
import { Navbar } from "./Navbar";
import { SettingsModal } from "./SettingsModal";
import { SortMenu } from "./SortMenu";

const DevTools =
  process.env.NODE_ENV === "development"
    ? dynamic(() => import("@/components/dev/DevTools"), { ssr: false })
    : null;

export function Library() {
  const { data: books, error } = useBooks();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("recent");
  const [selectedId, setSelectedId] = useState<string>();
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [notice, setNotice] = useState<{ text: string; undo?: () => void }>();
  const { data: drafts = [] } = useDrafts();
  const [addMode, setAddMode] = useState<AddMode | null>(null);
  const addButtonRef = useRef<HTMLButtonElement>(null);
  // Whatever opened the add modal gets focus back.
  const addOpenerRef = useRef<HTMLElement | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsButtonRef = useRef<HTMLButtonElement>(null);

  // Saved settings are already applied to the page before first paint
  // (BOOT_SCRIPT in layout); this just syncs the controls with them.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSettings(loadSettings());
  }, []);

  // Free the space of books deleted in earlier sessions.
  useEffect(() => {
    purgeDeleted().catch(console.error);
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

  // Areas and topics are matched by the search box itself (see matchesQuery).
  const visible = useMemo(
    () => sortBooks(filterBooks(books ?? [], { query }), sort),
    [books, query, sort],
  );

  const filtering = query.trim() !== "";
  // Until the user picks one, the first book of the list is selected.
  const selected = books?.find((b) => b.id === selectedId) ?? visible[0];
  const emptyLibrary = books?.length === 0;
  // Shown instead of the list while there is nothing to list.
  const status = error
    ? t("library.error")
    : !books
      ? t("library.loading")
      : emptyLibrary
        ? t("library.noBooks")
        : undefined;
  const countText = !books
    ? ""
    : filtering
    ? visible.length === 0
      ? t("results.none")
      : plural(visible.length, { one: "results.one", other: "results.other" })
    : plural(visible.length, { one: "library.count.one", other: "library.count.other" });

  const unavailable = () => setNotice({ text: t("toast.soon") });

  function openAdd(mode: AddMode, opener: HTMLElement | null) {
    addOpenerRef.current = opener;
    setNotice(undefined);
    setAddMode(mode);
  }

  /** Closes the add modal when the opener may be about to disappear. */
  function finishAdd() {
    addOpenerRef.current = addButtonRef.current;
    setAddMode(null);
  }

  function showBook(id: string) {
    setQuery("");
    setSelectedId(id);
  }

  return (
    <Tooltip.Provider delayDuration={300}>
      <a
        href="#conteudo"
        className="sr-only z-50 rounded-md bg-primary px-4 py-3 text-lg font-medium text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        {t("skip")}
      </a>

      {/* On wide screens the page is exactly one viewport tall. The details
          panel spans the full height of the content area (margin to margin);
          the sort row only takes space in the left column, above the list.
          Both panels scroll inside themselves. */}
      <div className="flex min-h-dvh flex-col lg:h-dvh lg:min-h-0">
        <Navbar
          query={query}
          onQueryChange={setQuery}
          onOpenSettings={() => setSettingsOpen(true)}
          settingsButtonRef={settingsButtonRef}
          onAdd={() => openAdd("upload", addButtonRef.current)}
          addButtonRef={addButtonRef}
        />
        <AddBookModal
          mode={addMode}
          drafts={drafts}
          returnFocusRef={addOpenerRef}
          onModeChange={setAddMode}
          onShowBook={(id) => {
            showBook(id);
            finishAdd();
          }}
          onAdded={(book) => {
            showBook(book.id);
            setNotice({ text: t("details.added", { title: book.title }) });
            finishAdd();
          }}
          onDiscardedLast={(book) => {
            setNotice({
              text: t("details.discarded", { title: book.title }),
              undo: () => {
                restoreBook(book.id).then(
                  () => setNotice({ text: t("details.restored", { title: book.title }) }),
                  () => setNotice({ text: t("details.saveError") }),
                );
              },
            });
            finishAdd();
          }}
        />
        <SettingsModal
          returnFocusRef={settingsButtonRef}
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          settings={settings}
          onChange={updateSettings}
        />

        <div className="grid min-h-0 flex-1 gap-x-4 gap-y-3 px-4 pt-3 pb-4 lg:grid-cols-[minmax(0,2fr)_minmax(22rem,1fr)] lg:grid-rows-[auto_minmax(0,1fr)]">
          {/* Subgrid: the sort row and the list sit in the page grid's two rows. */}
          <main
            id="conteudo"
            tabIndex={-1}
            className="min-w-0 outline-none lg:col-start-1 lg:row-span-2 lg:row-start-1 lg:grid lg:grid-rows-subgrid"
          >
            <div className="mb-3 flex flex-wrap items-center justify-between gap-x-6 lg:mb-0">
              <h1 className="sr-only">{t("library.title")}</h1>
              <SortMenu value={sort} onChange={setSort} />
              {drafts.length > 0 && (
                <Button
                  variant="secondary"
                  onClick={(e) => openAdd("review", e.currentTarget)}
                >
                  {plural(drafts.length, { one: "add.review.one", other: "add.review.other" })}
                </Button>
              )}
              {/* Announced politely whenever the number of books changes */}
              <p role="status" className="text-lg text-muted-foreground">
                {countText}
              </p>
            </div>

            <section
              aria-label={t("library.list")}
              className="rounded-xl bg-background p-4 shadow-[0_1px_4px_rgb(0_0_0/0.12)] lg:min-h-0 lg:overflow-y-auto"
            >
              {status ? (
                <p role={error ? "alert" : undefined} className="py-16 text-center text-lg">
                  {status}
                </p>
              ) : visible.length === 0 ? (
                <div className="flex flex-col items-center gap-5 py-16 text-center">
                  <p className="text-lg">{t("library.empty")}</p>
                  <Button variant="secondary" onClick={() => setQuery("")}>
                    {t("library.clearAll")}
                  </Button>
                </div>
              ) : (
                <ul className="grid grid-cols-[repeat(auto-fill,minmax(10.5rem,1fr))] items-start gap-4">
                  {visible.map((book) => (
                    <li key={book.id}>
                      <BookCard
                        book={book}
                        selected={book.id === selected?.id}
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
      </div>

      {DevTools && <DevTools />}

      {/* The live region stays mounted, or screen readers may miss the text. */}
      <div role="status" className="fixed right-4 bottom-4 left-4 z-50 mx-auto max-w-xl">
        {notice && (
          <div className="flex items-center gap-4 rounded-lg bg-foreground py-3 pr-2 pl-5 text-lg text-background shadow-[0_12px_40px_rgb(0_0_0/0.25)]">
            <span className="min-w-0 flex-1 break-words">{notice.text}</span>
            {notice.undo && (
              <button
                type="button"
                onClick={notice.undo}
                className="min-h-11 rounded-md px-3 font-semibold underline hover:bg-background/20"
              >
                {t("toast.undo")}
              </button>
            )}
            <button
              type="button"
              aria-label={t("toast.close")}
              onClick={() => setNotice(undefined)}
              className="inline-flex size-11 items-center justify-center rounded-md hover:bg-background/20"
            >
              <X aria-hidden className="size-5" />
            </button>
          </div>
        )}
      </div>
    </Tooltip.Provider>
  );
}
