"use client";

import { useRef, useState, type RefObject } from "react";
import { Download, Trash2, Upload } from "lucide-react";
import { saveFile } from "@/lib/download";
import { exportLibrary, importLibrary, type ImportResult } from "@/lib/files/backup";
import { plural, t, type MessageKey } from "@/lib/i18n";
import { deleteEverything } from "@/lib/library";
import { FONT_SCALES, readSettings, THEMES, type Settings, type Theme } from "@/lib/settings";
import { AppModal } from "@/components/ui/app-modal";
import { Button } from "@/components/ui/button";
import { OptionGroup } from "@/components/ui/option-group";
import { KeyHint } from "@/components/ui/shortcut";
import { activeShortcuts, ariaKeys } from "@/lib/shortcuts";
import { ShortcutSettings } from "./ShortcutSettings";

const themeLabel = (theme: Theme) =>
  t((theme === "dark" ? "theme.dark.name" : `theme.${theme}`) as MessageKey);

const TABS = ["appearance", "shortcuts", "data"] as const;
export type SettingsTab = (typeof TABS)[number];

const danger = "border-destructive! text-destructive!";

function importSummary({ added, merged, skipped, unlisted }: ImportResult): string {
  // Files without saved data went through the normal add flow.
  const count = (status: string) => unlisted.filter((r) => r.status === status).length;
  const parts = [
    { n: added, one: "data.added.one", other: "data.added.other" },
    { n: merged + count("duplicate"), one: "data.merged.one", other: "data.merged.other" },
    { n: count("added"), one: "data.drafts.one", other: "data.drafts.other" },
    {
      n: skipped + count("failed") + count("unsupported"),
      one: "data.skipped.one",
      other: "data.skipped.other",
    },
  ] as const;
  return (
    parts
      .filter((part) => part.n > 0)
      .map((part) => plural(part.n, part))
      .join(" ") || t("data.nothingFound")
  );
}

/** The settings of a backup, if they would change anything here. */
function differentSettings(saved: unknown, current: Settings): Settings | undefined {
  if (!saved) return;
  const found = readSettings(saved);
  const look = (s: Settings) =>
    JSON.stringify([s.theme, s.fontScale, s.dyslexiaFont, s.singleKeys, readSettings(s).shortcuts]);
  return look(found) === look(current) ? undefined : found;
}

export function SettingsModal({
  open,
  onOpenChange,
  settings,
  onChange,
  onDeletedAll,
  onStartTour,
  returnFocusRef,
  initialTab = "appearance",
}: {
  returnFocusRef: RefObject<HTMLElement | null>;
  initialTab?: SettingsTab;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: Settings;
  onChange: (patch: Partial<Settings>) => void;
  /** Every book and setting has just been deleted. */
  onDeletedAll: () => void;
  onStartTour: () => void;
}) {
  const [tab, setTab] = useState<SettingsTab>(initialTab);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ text: MessageKey; failed?: boolean }>();
  const deleteRef = useRef<HTMLButtonElement>(null);
  const importRef = useRef<HTMLButtonElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [imported, setImported] = useState<{ text: string; settings?: Settings }>();

  // Start clean on each opening.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    setTab(initialTab);
    setConfirming(false);
    setResult(undefined);
    setImported(undefined);
  }

  async function run(action: () => Promise<void>, failure: MessageKey) {
    if (busy) return;
    setBusy(true);
    setResult(undefined);
    try {
      await action();
    } catch (cause) {
      console.error(cause);
      setResult({ text: failure, failed: true });
    } finally {
      setBusy(false);
    }
  }

  const exportAll = () =>
    run(async () => {
      const { blob, fileName } = await exportLibrary({ settings });
      saveFile(blob, fileName);
      setResult({ text: "data.exported" });
    }, "data.exportError");

  const importBackup = (zip: File) =>
    run(async () => {
      setImported({ text: t("data.importing") });
      try {
        const found = await importLibrary(zip);
        setImported({
          text: importSummary(found),
          settings: differentSettings(found.settings, settings),
        });
      } catch (cause) {
        setImported(undefined);
        throw cause;
      }
    }, "data.importError");

  /** Only when asked: they replace the ones in use here. */
  function applyBackupSettings(found: Settings) {
    const { theme, fontScale, dyslexiaFont, shortcuts, singleKeys } = found;
    onChange({ theme, fontScale, dyslexiaFont, shortcuts, singleKeys });
    setImported({ text: t("data.settingsApplied") });
    // The button just used is gone.
    importRef.current?.focus();
  }

  const deleteAll = () =>
    run(async () => {
      await deleteEverything();
      onDeletedAll();
    }, "data.deleteError");

  function keep() {
    setConfirming(false);
    // The button that asked is visible again.
    requestAnimationFrame(() => deleteRef.current?.focus());
  }

  /** Arrow keys move between tabs, as in any tab list. */
  function onTabKey(event: React.KeyboardEvent<HTMLButtonElement>) {
    const step = { ArrowLeft: -1, ArrowRight: 1 }[event.key];
    if (!step) return;
    event.preventDefault();
    const next = TABS[(TABS.indexOf(tab) + step + TABS.length) % TABS.length];
    setTab(next);
    document.getElementById(`settings-tab-${next}`)?.focus();
  }

  const heading = "text-xl font-semibold";
  const hint = "mb-3 text-base text-muted-foreground";

  return (
    <AppModal
      open={open}
      // While confirming, Escape goes back instead of closing.
      onOpenChange={(next) => {
        if (!next && confirming) keep();
        else onOpenChange(next);
      }}
      title={t("settings.title")}
      // The same header and height on every tab, so nothing jumps between them.
      description={t("settings.description")}
      maxWidth="40rem"
      height="46rem"
      returnFocusRef={returnFocusRef}
      footer={
        confirming ? (
          <>
            {/* The safe choice gets the focus. */}
            <Button key="keep" autoFocus variant="secondary" onClick={keep}>
              {t("modal.cancel")}
            </Button>
            <Button
              key="delete"
              variant="secondary"
              className={danger}
              disabled={busy}
              onClick={() => void deleteAll()}
            >
              {t("data.deleteConfirm")}
            </Button>
          </>
        ) : (
          <Button onClick={() => onOpenChange(false)}>{t("modal.closeButton")}</Button>
        )
      }
    >
      {confirming && (
        <p role="alert" className="text-lg">
          {t("data.deleteQuestion")}
        </p>
      )}
      {result?.failed && (
        <p role="alert" className="mb-3 text-lg font-medium text-destructive">
          {t(result.text)}
        </p>
      )}

      <div hidden={confirming}>
        <div role="tablist" aria-label={t("settings.title")} className="mb-5 flex flex-wrap gap-2 border-b border-border">
          {TABS.map((name) => (
            <button
              key={name}
              type="button"
              role="tab"
              id={`settings-tab-${name}`}
              aria-selected={tab === name}
              aria-controls={`settings-panel-${name}`}
              aria-keyshortcuts={
                name === "shortcuts"
                  ? ariaKeys(activeShortcuts(settings.shortcuts, settings.singleKeys).help)
                  : undefined
              }
              // Opened on another tab, the fields of the first one are hidden.
              data-autofocus={tab === name && name !== "appearance" ? "" : undefined}
              tabIndex={tab === name ? 0 : -1}
              onClick={() => setTab(name)}
              onKeyDown={onTabKey}
              // Underline and weight mark the choice, not color alone.
              className={`min-h-12 border-b-4 px-4 text-lg ${
                tab === name
                  ? "border-primary font-semibold text-foreground"
                  : "border-transparent text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              }`}
            >
              {t(`settings.tab.${name}`)}
              {name === "shortcuts" && (
                <KeyHint shortcut={activeShortcuts(settings.shortcuts, settings.singleKeys).help} className="ml-2" />
              )}
            </button>
          ))}
        </div>

        <div
          role="tabpanel"
          id="settings-panel-appearance"
          aria-labelledby="settings-tab-appearance"
          hidden={tab !== "appearance"}
        >
          <div className="flex flex-col gap-6">
            <OptionGroup
              legend={t("settings.fontSize")}
              value={String(settings.fontScale)}
              options={FONT_SCALES.map((scale) => ({
                value: String(scale),
                label: `${Math.round(scale * 100)}%`,
              }))}
              onChange={(v) => onChange({ fontScale: Number(v) })}
            />
            <OptionGroup
              legend={t("settings.font")}
              value={settings.dyslexiaFont ? "dyslexic" : "default"}
              options={[
                { value: "default", label: t("settings.font.default") },
                { value: "dyslexic", label: t("settings.font.dyslexic") },
              ]}
              onChange={(v) => onChange({ dyslexiaFont: v === "dyslexic" })}
            />
            <OptionGroup
              legend={t("settings.theme")}
              value={settings.theme}
              options={THEMES.map((theme) => ({ value: theme, label: themeLabel(theme) }))}
              onChange={(theme) => onChange({ theme })}
              columns={2}
            />
            <Button variant="secondary" className="self-start" onClick={onStartTour}>
              {t("tour.start")}
            </Button>
          </div>
        </div>

        <div
          role="tabpanel"
          id="settings-panel-shortcuts"
          aria-labelledby="settings-tab-shortcuts"
          hidden={tab !== "shortcuts"}
        >
          {/* Mounted only while shown, so old messages do not linger. */}
          {tab === "shortcuts" && <ShortcutSettings settings={settings} onChange={onChange} />}
        </div>

        <div
          role="tabpanel"
          id="settings-panel-data"
          aria-labelledby="settings-tab-data"
          hidden={tab !== "data"}
        >
          <div className="flex flex-col gap-6">
            <section aria-labelledby="data-export" className="flex flex-col items-start">
              <h3 id="data-export" className={heading}>
                {t("data.export")}
              </h3>
              <p className={hint}>{t("data.exportHint")}</p>
              <Button disabled={busy} onClick={() => void exportAll()}>
                <Download aria-hidden className="size-5" />
                {t("data.exportButton")}
              </Button>
              {/* Always present, so the result is announced. */}
              <p role="status" className="mt-2 text-lg font-medium">
                {result && !result.failed && t(result.text)}
              </p>
            </section>
            <section
              aria-labelledby="data-import"
              className="flex flex-col items-start border-t border-border pt-5"
            >
              <h3 id="data-import" className={heading}>
                {t("data.import")}
              </h3>
              <p className={hint}>{t("data.importHint")}</p>
              <input
                ref={fileRef}
                type="file"
                accept=".zip,application/zip"
                data-testid="import-input"
                hidden
                onChange={(e) => {
                  const zip = e.target.files?.[0];
                  // So the same file can be chosen again.
                  e.target.value = "";
                  if (zip) void importBackup(zip);
                }}
              />
              {/* Not disabled while busy, which would drop the focus. */}
              <Button
                ref={importRef}
                aria-disabled={busy}
                onClick={() => {
                  if (!busy) fileRef.current?.click();
                }}
              >
                <Upload aria-hidden className="size-5" />
                {t("data.importButton")}
              </Button>
              <p role="status" className="mt-2 text-lg font-medium">
                {imported?.text}
              </p>
              {imported?.settings && (
                <div className="mt-2 flex flex-col items-start gap-2">
                  <p className="text-lg">{t("data.settingsFound")}</p>
                  <Button variant="secondary" onClick={() => applyBackupSettings(imported.settings!)}>
                    {t("data.useSettings")}
                  </Button>
                </div>
              )}
            </section>
            <section
              aria-labelledby="data-delete"
              className="flex flex-col items-start border-t border-border pt-5"
            >
              <h3 id="data-delete" className={heading}>
                {t("data.delete")}
              </h3>
              <p className={hint}>{t("data.deleteHint")}</p>
              <Button
                ref={deleteRef}
                variant="secondary"
                className={danger}
                disabled={busy}
                onClick={() => {
                  setResult(undefined);
                  setConfirming(true);
                }}
              >
                <Trash2 aria-hidden className="size-5" />
                {t("data.delete")}
              </Button>
            </section>
          </div>
        </div>
      </div>
    </AppModal>
  );
}
