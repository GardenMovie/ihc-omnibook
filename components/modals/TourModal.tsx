"use client";

/** The short walkthrough, offered on the first visit and from the settings. */
import { useState, type RefObject } from "react";
import { t, type MessageKey } from "@/lib/i18n";
import type { Settings } from "@/lib/settings";
import { ACTIONS, binding, keyLabel } from "@/lib/shortcuts";
import { AppModal } from "@/components/ui/app-modal";
import { Button } from "@/components/ui/button";

export const TOUR_STEPS = [
  "welcome",
  "add",
  "find",
  "reference",
  "shortcuts",
  "export",
  "delete",
] as const;

export function TourModal({
  open,
  onOpenChange,
  settings,
  onChange,
  returnFocusRef,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: Settings;
  onChange: (patch: Partial<Settings>) => void;
  returnFocusRef: RefObject<HTMLElement | null>;
}) {
  const [index, setIndex] = useState(0);

  // Start from the beginning on each opening.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    setIndex(0);
  }

  const step = TOUR_STEPS[index];
  const first = index === 0;
  const last = index === TOUR_STEPS.length - 1;

  return (
    <AppModal
      open={open}
      onOpenChange={onOpenChange}
      dismissOnOutside={false}
      title={t("tour.title")}
      maxWidth="40rem"
      // The same height on every step, so the buttons stay in place.
      height="40rem"
      returnFocusRef={returnFocusRef}
      footer={
        <>
          {/* aria-disabled keeps the focus on it when the first step is reached. */}
          <Button
            variant="secondary"
            aria-disabled={first}
            className="aria-disabled:opacity-50"
            onClick={() => !first && setIndex(index - 1)}
          >
            {t("tour.back")}
          </Button>
          <Button onClick={() => (last ? onOpenChange(false) : setIndex(index + 1))}>
            {t(last ? "tour.finish" : "tour.next")}
          </Button>
        </>
      }
    >
      {/* Focused on opening, so the first step is read out. */}
      <div data-autofocus tabIndex={-1} className="flex flex-col gap-3">
        {/* Announced when the step changes; the controls stay outside. */}
        <div aria-live="polite" aria-atomic="true" className="flex flex-col gap-3">
          <p className="text-base text-muted-foreground">
            {t("tour.position", { n: index + 1, total: TOUR_STEPS.length })}
          </p>
          <h3 className="text-xl font-semibold">{t(`tour.${step}.title` as MessageKey)}</h3>
          <p className="text-lg">{t(`tour.${step}.text` as MessageKey)}</p>
        </div>

        {step === "shortcuts" && (
          <>
            {/* Above the list, so it is in view without scrolling. */}
            <label className="flex min-h-11 cursor-pointer items-start gap-3 text-lg">
              <input
                type="checkbox"
                className="mt-1 size-6 shrink-0 accent-[var(--primary)]"
                checked={settings.singleKeys}
                onChange={(e) => onChange({ singleKeys: e.target.checked })}
              />
              <span>
                {t("shortcuts.singleKeys")}
                <span className="block text-base text-muted-foreground">
                  {t("shortcuts.singleKeysHint")}
                </span>
              </span>
            </label>
            <ul className="flex flex-col divide-y divide-border border-y border-border">
              {ACTIONS.map((action) => {
                const key = binding(settings.shortcuts, action);
                return (
                  <li key={action} className="flex flex-wrap items-center gap-x-4 py-2">
                    <span className="min-w-0 flex-1 text-lg">
                      {t(`shortcuts.action.${action}`)}
                    </span>
                    {!settings.singleKeys && key.length === 1 && (
                      <span className="text-base text-muted-foreground">{t("shortcuts.off")}</span>
                    )}
                    <kbd className="rounded-md border border-border px-2.5 font-sans text-lg">
                      {keyLabel(key)}
                    </kbd>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
    </AppModal>
  );
}
