"use client";

/**
 * How a control shows its shortcut: the key on it, and a line on hover or focus.
 * Screen readers get `aria-keyshortcuts` on the control instead of the key cap.
 */
import * as Tooltip from "@radix-ui/react-tooltip";
import type { ReactNode } from "react";
import { t } from "@/lib/i18n";
import { keyLabel } from "@/lib/shortcuts";

export const tooltipClass = "z-50 rounded-md bg-foreground px-3 py-1.5 text-base text-background";

/** The key cap. Takes the color of the text around it. */
export function KeyHint({ shortcut, className = "" }: { shortcut?: string; className?: string }) {
  if (!shortcut) return null;
  return (
    <kbd
      aria-hidden
      className={`pointer-events-none inline-block min-w-6 rounded border border-current px-1 text-center font-sans text-sm leading-snug font-medium whitespace-nowrap ${className}`}
    >
      {keyLabel(shortcut)}
    </kbd>
  );
}

/** For buttons with a visible label; IconButton has its own tooltip. */
export function ShortcutTooltip({ shortcut, children }: { shortcut?: string; children: ReactNode }) {
  // The button stays in the same place in the tree with or without a shortcut.
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
      {shortcut && (
        <Tooltip.Portal>
          <Tooltip.Content sideOffset={6} className={tooltipClass}>
            {t("shortcuts.hint", { key: keyLabel(shortcut) })}
          </Tooltip.Content>
        </Tooltip.Portal>
      )}
    </Tooltip.Root>
  );
}
