"use client";

import Link from "next/link";
import type { Ref, RefObject } from "react";
import { BookOpen, Plus, Settings as SettingsIcon } from "lucide-react";
import { t } from "@/lib/i18n";
import type { FilterKind } from "@/lib/search";
import { ariaKeys, type Shortcuts } from "@/lib/shortcuts";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { KeyHint, ShortcutTooltip } from "@/components/ui/shortcut";
import { SearchBox } from "./SearchBox";

export function Navbar({
  query,
  onQueryChange,
  terms,
  onOpenSettings,
  settingsButtonRef,
  onAdd,
  addButtonRef,
  searchRef,
  shortcuts,
}: {
  searchRef: RefObject<HTMLInputElement | null>;
  shortcuts: Shortcuts;
  onAdd: () => void;
  addButtonRef: Ref<HTMLButtonElement>;
  settingsButtonRef: Ref<HTMLButtonElement>;
  query: string;
  onQueryChange: (q: string) => void;
  terms: Record<FilterKind, string[]>;
  onOpenSettings: () => void;
}) {
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

      <SearchBox
        query={query}
        onQueryChange={onQueryChange}
        terms={terms}
        inputRef={searchRef}
        shortcut={shortcuts.search}
      />

      <div className="ml-auto flex items-center gap-3 lg:justify-self-end">
        <ShortcutTooltip shortcut={shortcuts.add}>
          <Button
            ref={addButtonRef}
            className="rounded-full! px-5!"
            aria-keyshortcuts={ariaKeys(shortcuts.add)}
            onClick={onAdd}
          >
            <Plus aria-hidden className="size-5" strokeWidth={2.5} />
            {t("add.button")}
            <KeyHint shortcut={shortcuts.add} />
          </Button>
        </ShortcutTooltip>
        {/* Replaces the Figma account avatar (there are no accounts, SPEC 6) and
            the text size / contrast / dark buttons: all live in this modal now. */}
        <IconButton
          ref={settingsButtonRef}
          label={t("settings.menu")}
          shortcut={shortcuts.settings}
          onClick={onOpenSettings}
        >
          <SettingsIcon aria-hidden className="size-6" />
        </IconButton>
      </div>
    </header>
  );
}
