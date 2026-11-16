"use client";

import type { RefObject } from "react";
import { t, type MessageKey } from "@/lib/i18n";
import { FONT_SCALES, THEMES, type Settings, type Theme } from "@/lib/settings";
import { AppModal } from "@/components/ui/app-modal";
import { OptionGroup } from "@/components/ui/option-group";

const themeLabel = (theme: Theme) =>
  t((theme === "dark" ? "theme.dark.name" : `theme.${theme}`) as MessageKey);

export function SettingsModal({
  open,
  onOpenChange,
  settings,
  onChange,
  returnFocusRef,
}: {
  returnFocusRef: RefObject<HTMLElement | null>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: Settings;
  onChange: (patch: Partial<Settings>) => void;
}) {
  return (
    <AppModal
      open={open}
      onOpenChange={onOpenChange}
      title={t("settings.title")}
      description={t("settings.description")}
      maxWidth="40rem"
      returnFocusRef={returnFocusRef}
    >
      <div className="flex flex-col gap-8">
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
          legend={t("settings.theme")}
          value={settings.theme}
          options={THEMES.map((theme) => ({ value: theme, label: themeLabel(theme) }))}
          onChange={(theme) => onChange({ theme })}
          columns={2}
        />
      </div>
    </AppModal>
  );
}
