"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import * as Tooltip from "@radix-ui/react-tooltip";
import { X } from "lucide-react";
import { filterBooks, sortBooks, type SortKey } from "@/lib/books";
import { deleteBook, markOpened, purgeDeleted, restoreBook } from "@/lib/db/books";
import type { Book } from "@/lib/db/types";
import { saveFile } from "@/lib/download";
import { useBooks, useDrafts } from "@/lib/hooks";
import { plural, t } from "@/lib/i18n";
import { getBookFile } from "@/lib/library";
import { FILE_TYPES, uniqueTerms } from "@/lib/search";
import { activeShortcuts, ACTIONS, isTyping, keyFromEvent, type Action } from "@/lib/shortcuts";
import {
  applySettings,
  DEFAULT_SETTINGS,
  loadSettings,
  saveSettings,
  type Settings,
} from "@/lib/settings";
import { AddBookModal, type AddMode } from "@/components/modals/AddBookModal";
import { EditBookModal } from "@/components/modals/EditBookModal";
import { ExportRefModal } from "@/components/modals/ExportRefModal";
import { TourModal } from "@/components/modals/TourModal";
import { canRead, ReaderModal } from "@/components/reader/ReaderModal";
import { AppModal } from "@/components/ui/app-modal";
import { Button } from "@/components/ui/button";
import { BookCard } from "./BookCard";
import { MetadataPanel } from "./MetadataPanel";
import { Navbar } from "./Navbar";
import { SettingsModal, type SettingsTab } from "./SettingsModal";
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
  // The modal about one book. `fromExport`: go back to the reference after editing.
  const [bookModal, setBookModal] = useState<{
    kind: "edit" | "export";
    id: string;
    fromExport?: boolean;
  }>();
  const bookOpenerRef = useRef<HTMLElement | null>(null);
  // The book being read.
  const [readingId, setReadingId] = useState<string>();
  const readerOpenerRef = useRef<HTMLElement | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<SettingsTab>("appearance");
  const settingsButtonRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [tourOpen, setTourOpen] = useState(false);
  const tourOpenerRef = useRef<HTMLElement | null>(null);
  // Until then the defaults would offer the walkthrough to everyone.
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  // Saved settings are already applied to the page before first paint
  // (BOOT_SCRIPT in layout); this just syncs the controls with them.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSettings(loadSettings());
    setSettingsLoaded(true);
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

  // The "@" filters are part of the query itself (see matchesQuery).
  const visible = useMemo(
    () => sortBooks(filterBooks(books ?? [], { query }), sort),
    [books, query, sort],
  );

  // What the search box suggests after each "@" filter.
  const terms = useMemo(
    () => ({
      area: uniqueTerms((books ?? []).flatMap((b) => b.areas)),
      topic: uniqueTerms((books ?? []).flatMap((b) => b.topics)),
      file: FILE_TYPES,
    }),
    [books],
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

  // The reader has its own history entry, so the browser's Back button closes it.
  useEffect(() => {
    const onPop = () => setReadingId(undefined);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // One address per PDF while the app is open: revoking it would break
  // reloading or saving in the tab that shows it.
  const pdfUrls = useRef(new Map<string, string>());

  /** Shows a PDF in a new tab, with the browser's own viewer. */
  function openPdf(book: Book) {
    setNotice(undefined);
    // Now, during the click or key press: later it would be blocked as a pop-up.
    const tab = window.open("", "_blank");
    if (!tab) return setNotice({ text: t("pdf.blocked") });
    tab.opener = null;
    setSelectedId(book.id);
    const known = pdfUrls.current.get(book.id);
    const url = known
      ? Promise.resolve(known)
      : // getBookFile types the file as PDF, so its content cannot run as a page.
        getBookFile(book.id).then((file) => {
          const created = URL.createObjectURL(file);
          pdfUrls.current.set(book.id, created);
          return created;
        });
    url.then(
      (address) => {
        tab.location.replace(address);
        markOpened(book.id).catch(console.error);
      },
      (cause) => {
        console.error(cause);
        tab.close();
        setNotice({ text: t("reader.error") });
      },
    );
  }

  function openBook(book: Book, opener: HTMLElement) {
    if (book.format === "pdf") return openPdf(book);
    if (!canRead(book.format)) return unavailable();
    readerOpenerRef.current = opener;
    setNotice(undefined);
    // "Acesso recente" may reorder the list: keep showing this book.
    setSelectedId(book.id);
    setReadingId(book.id);
    window.history.pushState({ reader: true }, "");
    markOpened(book.id).catch(console.error);
  }

  function closeReader() {
    setReadingId(undefined);
    if (window.history.state?.reader) window.history.back();
  }

  function download(book: Book) {
    setNotice(undefined);
    getBookFile(book.id).then(
      (file) => saveFile(file, file.name),
      (cause) => {
        console.error(cause);
        setNotice({ text: t("panel.downloadError") });
      },
    );
  }

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

  // The live record; once the book is gone, its modal closes.
  const modalBook = books?.find((b) => b.id === bookModal?.id);

  function openBookModal(kind: "edit" | "export", book: Book, opener: HTMLElement) {
    bookOpenerRef.current = opener;
    setNotice(undefined);
    // Keep showing this book, even if editing it changes the order of the list.
    setSelectedId(book.id);
    setBookModal({ kind, id: book.id });
  }

  function closeEdit() {
    setBookModal((open) => (open?.fromExport ? { kind: "export", id: open.id } : undefined));
  }

  /** Brings back a deleted or discarded book, from the notice. */
  function undoDelete(book: Book) {
    restoreBook(book.id).then(
      () => {
        setSelectedId(book.id);
        setNotice({ text: t("details.restored", { title: book.title }) });
      },
      () => setNotice({ text: t("details.saveError") }),
    );
  }

  async function removeBook(book: Book) {
    // The button that opened the modal may disappear with the book.
    const opener = bookOpenerRef.current;
    bookOpenerRef.current = addButtonRef.current;
    try {
      await deleteBook(book.id);
    } catch (cause) {
      bookOpenerRef.current = opener;
      throw cause;
    }
    setBookModal(undefined);
    setNotice({ text: t("edit.deleted", { title: book.title }), undo: () => undoDelete(book) });
  }

  function openSettings(tab: SettingsTab) {
    setSettingsTab(tab);
    setSettingsOpen(true);
  }

  function openTour(opener: HTMLElement | null) {
    tourOpenerRef.current = opener;
    setNotice(undefined);
    setSettingsOpen(false);
    updateSettings({ tourSeen: true });
    setTourOpen(true);
  }

  const shortcuts = activeShortcuts(settings.shortcuts, settings.singleKeys);

  /** False when there is nothing to act on. */
  function runShortcut(action: Action): boolean {
    // A modal about one book gives the focus back to where the user was.
    const here = document.activeElement as HTMLElement;
    if (action === "search") searchRef.current?.focus();
    else if (action === "add") openAdd("upload", addButtonRef.current);
    else if (action === "settings") openSettings("appearance");
    else if (action === "help") openSettings("shortcuts");
    else if (!selected) return false;
    else if (action === "download") download(selected);
    else if (action === "open") openBook(selected, here);
    else openBookModal(action, selected, here);
    return true;
  }

  // No dependency list: the handler must see the current book and settings.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.defaultPrevented || event.repeat || event.isComposing) return;
      if (isTyping(event.target) || document.querySelector("[role=dialog]")) return;
      const key = keyFromEvent(event);
      const action = key && ACTIONS.find((a) => shortcuts[a] === key);
      // Otherwise the key would also be typed into the field that gets focus.
      if (action && runShortcut(action)) event.preventDefault();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

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
          terms={terms}
          onOpenSettings={() => openSettings("appearance")}
          settingsButtonRef={settingsButtonRef}
          searchRef={searchRef}
          shortcuts={shortcuts}
          onAdd={() => openAdd("upload", addButtonRef.current)}
          addButtonRef={addButtonRef}
        />
        {/* Closing it in any way counts as "not now". */}
        <AppModal
          open={settingsLoaded && !settings.tourSeen}
          onOpenChange={() => updateSettings({ tourSeen: true })}
          dismissOnOutside={false}
          title={t("tour.offerTitle")}
          maxWidth="32rem"
          compact
          returnFocusRef={addButtonRef}
          footer={
            <>
              <Button variant="secondary" onClick={() => updateSettings({ tourSeen: true })}>
                {t("tour.dismiss")}
              </Button>
              <Button data-autofocus onClick={() => openTour(addButtonRef.current)}>
                {t("tour.start")}
              </Button>
            </>
          }
        >
          <p className="text-lg">{t("tour.offer")}</p>
        </AppModal>
        <TourModal
          open={tourOpen}
          onOpenChange={setTourOpen}
          settings={settings}
          onChange={updateSettings}
          returnFocusRef={tourOpenerRef}
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
              undo: () => undoDelete(book),
            });
            finishAdd();
          }}
        />
        <EditBookModal
          book={bookModal?.kind === "edit" ? modalBook : undefined}
          returnFocusRef={bookOpenerRef}
          onClose={closeEdit}
          onSaved={(book) => {
            setNotice({ text: t("edit.saved", { title: book.title }) });
            closeEdit();
          }}
          onDelete={removeBook}
        />
        <ExportRefModal
          book={bookModal?.kind === "export" ? modalBook : undefined}
          returnFocusRef={bookOpenerRef}
          onClose={() => setBookModal(undefined)}
          onEdit={() =>
            setBookModal((open) => open && { kind: "edit", id: open.id, fromExport: true })
          }
        />
        <ReaderModal
          book={books?.find((b) => b.id === readingId)}
          returnFocusRef={readerOpenerRef}
          onClose={closeReader}
        />
        <SettingsModal
          returnFocusRef={settingsButtonRef}
          open={settingsOpen}
          initialTab={settingsTab}
          onOpenChange={setSettingsOpen}
          settings={settings}
          onChange={updateSettings}
          onStartTour={() => openTour(settingsButtonRef.current)}
          onDeletedAll={() => {
            // Their storage is gone already; only the page has to catch up.
            // No walkthrough offer on top of this; the next visit makes it.
            setSettings({ ...DEFAULT_SETTINGS, tourSeen: true });
            applySettings(DEFAULT_SETTINGS);
            setQuery("");
            setSelectedId(undefined);
            setSettingsOpen(false);
            setNotice({ text: t("data.deleted") });
          }}
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

          <MetadataPanel
            book={selected}
            shortcuts={shortcuts}
            onEdit={(book, opener) => openBookModal("edit", book, opener)}
            onExport={(book, opener) => openBookModal("export", book, opener)}
            onDownload={download}
            onOpen={openBook}
          />
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
