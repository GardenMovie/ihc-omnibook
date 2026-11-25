"use client";

/** The "Atalhos" tab of the settings: the list of shortcuts, and changing them. */
import { useState } from "react";
import { t } from "@/lib/i18n";
import type { Settings } from "@/lib/settings";
import { ACTIONS, binding, keyFromEvent, keyLabel, type Action } from "@/lib/shortcuts";
import { Button } from "@/components/ui/button";

const actionLabel = (action: Action) => t(`shortcuts.action.${action}`);

export function ShortcutSettings({
  settings,
  onChange,
}: {
  settings: Settings;
  onChange: (patch: Partial<Settings>) => void;
}) {
  const [recording, setRecording] = useState<Action>();
  const [message, setMessage] = useState("");

  function start(action: Action) {
    setRecording(action);
    setMessage(t("shortcuts.press", { action: actionLabel(action) }));
  }

  function stop(text = "") {
    setRecording(undefined);
    setMessage(text);
  }

  function record(action: Action, event: React.KeyboardEvent) {
    // Tab moves on as usual, which ends the recording.
    if (event.key === "Tab" || ["Shift", "Control", "Alt", "AltGraph", "Meta"].includes(event.key)) {
      return;
    }
    event.preventDefault();
    if (event.key === "Escape") return stop(t("shortcuts.cancelled"));

    const key = keyFromEvent(event.nativeEvent);
    if (!key) return setMessage(t("shortcuts.invalid"));
    const other = ACTIONS.find((a) => a !== action && binding(settings.shortcuts, a) === key);
    if (other) {
      return setMessage(t("shortcuts.taken", { key: keyLabel(key), action: actionLabel(other) }));
    }
    onChange({ shortcuts: { ...settings.shortcuts, [action]: key } });
    stop(t("shortcuts.changed", { key: keyLabel(key), action: actionLabel(action) }));
  }

  return (
    <div className="flex flex-col gap-4">
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
          const off = !settings.singleKeys && key.length === 1;
          return (
            <li key={action} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2">
              <span className="min-w-0 flex-1 text-lg">{actionLabel(action)}</span>
              <kbd className="rounded-md border border-border px-2.5 font-sans text-lg">
                {keyLabel(key)}
              </kbd>
              {off && <span className="text-base text-muted-foreground">{t("shortcuts.off")}</span>}
              <Button
                variant="secondary"
                className="px-4!"
                data-own-escape={recording === action ? "" : undefined}
                onClick={(e) => {
                  // Not every browser focuses a clicked button.
                  e.currentTarget.focus();
                  start(action);
                }}
                onKeyDown={(e) => recording === action && record(action, e)}
                onBlur={() => recording === action && stop()}
              >
                {recording === action ? t("shortcuts.waiting") : t("shortcuts.change")}
                <span className="sr-only">
                  {" "}
                  {t("shortcuts.of", { action: actionLabel(action) })}
                </span>
              </Button>
            </li>
          );
        })}
      </ul>

      {/* Always present, so changes are announced. */}
      <p role="status" className="min-h-7 text-lg font-medium">
        {message}
      </p>
      <p className="text-base text-muted-foreground">{t("shortcuts.fixed")}</p>
      <div>
        <Button
          variant="secondary"
          onClick={() => {
            onChange({ shortcuts: {}, singleKeys: true });
            stop(t("shortcuts.restored"));
          }}
        >
          {t("shortcuts.restore")}
        </Button>
      </div>
    </div>
  );
}
