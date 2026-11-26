"use client";

import { useRef, useState } from "react";
import { t } from "@/lib/i18n";
import { AppModal } from "@/components/ui/app-modal";

/**
 * Placeholder for the VLibras widget. It loads nothing from the network: it only
 * says that the translation is not built.
 *
 * public/vlibras-access.svg is the widget's own access button, unchanged, from
 * github.com/spbgovbr-vlibras/vlibras-portal v7.12.3 (LGPL-3.0).
 */
export function VLibrasBadge() {
  const [open, setOpen] = useState(false);
  const badgeRef = useRef<HTMLButtonElement>(null);
  return (
    <aside aria-label={t("vlibras.name")}>
      <button
        ref={badgeRef}
        type="button"
        aria-label={t("vlibras.name")}
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
        className="fixed top-48 right-0 z-30 size-14 rounded-lg shadow-[0_2px_8px_rgb(0_0_0/0.3)] lg:top-20"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- a small local SVG */}
        <img src="/vlibras-access.svg" alt="" width={40} height={40} className="size-full" />
      </button>
      <AppModal
        open={open}
        onOpenChange={setOpen}
        title={t("vlibras.name")}
        maxWidth="28rem"
        compact
        returnFocusRef={badgeRef}
      >
        {/* Focus starts on the text, not on the X and its tooltip. */}
        <p tabIndex={-1} data-autofocus className="text-lg outline-none">
          {t("vlibras.notBuilt")}
        </p>
      </AppModal>
    </aside>
  );
}
