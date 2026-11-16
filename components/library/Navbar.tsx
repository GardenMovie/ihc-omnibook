"use client";

import Link from "next/link";
import { useEffect, useRef, type Ref } from "react";
import {
  BookOpen,
  ChevronDown,
  Search,
  Settings as SettingsIcon,
  X,
} from "lucide-react";
import { t } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import {
  Menu,
  MenuContent,
  MenuItem,
  MenuLabel,
  MenuRadioGroup,
  MenuRadioItem,
  MenuTrigger,
} from "@/components/ui/menu";

const ALL_AREAS = "__all__";

export function Navbar({
  query,
  onQueryChange,
  areas,
  area,
  onAreaChange,
  onOpenSettings,
  settingsButtonRef,
  onUnavailable,
}: {
  settingsButtonRef: Ref<HTMLButtonElement>;
  query: string;
  onQueryChange: (q: string) => void;
  areas: string[];
  area: string;
  onAreaChange: (a: string) => void;
  onOpenSettings: () => void;
  onUnavailable: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  // "/" focuses the search box (STYLE 6), unless the user is already typing.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "/" || e.ctrlKey || e.metaKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)) {
        return;
      }
      e.preventDefault();
      inputRef.current?.focus();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <header className="flex min-h-[var(--nav-h)] flex-wrap items-center gap-x-6 gap-y-3 bg-background px-4 py-3 shadow-[0_1px_6px_rgb(0_0_0/0.15)] sm:px-10">
      <Link
        href="/"
        className="inline-flex min-h-12 items-center gap-3 rounded-md pr-2 text-xl font-medium"
      >
        <BookOpen aria-hidden className="size-7 text-primary" />
        {t("nav.home")}
      </Link>

      <div role="search" className="flex min-w-64 flex-1 items-center gap-3 sm:max-w-3xl">
        <div className="relative flex-1">
          <label htmlFor="library-search" className="sr-only">
            {t("search.label")}
          </label>
          <Search
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-muted-foreground"
          />
          <input
            ref={inputRef}
            id="library-search"
            type="search"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder={t("search.placeholder")}
            autoComplete="off"
            className="min-h-12 w-full rounded-[0.8rem] border-[1.5px] border-input bg-muted py-2 pr-11 pl-11 text-lg text-foreground placeholder:text-muted-foreground focus-visible:border-primary [&::-webkit-search-cancel-button]:hidden"
          />
          {query && (
            <button
              type="button"
              aria-label={t("search.clear")}
              onClick={() => {
                onQueryChange("");
                inputRef.current?.focus();
              }}
              className="absolute top-1/2 right-1.5 inline-flex size-10 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
            >
              <X aria-hidden className="size-5" />
            </button>
          )}
        </div>

        <Menu>
          <MenuTrigger asChild>
            <IconButton
              label={t("filter.label")}
              className={area ? "bg-accent" : ""}
            >
              <ChevronDown aria-hidden className="size-6" />
            </IconButton>
          </MenuTrigger>
          <MenuContent align="start">
            <MenuLabel>{t("filter.label")}</MenuLabel>
            <MenuRadioGroup
              value={area || ALL_AREAS}
              onValueChange={(v) => onAreaChange(v === ALL_AREAS ? "" : v)}
            >
              <MenuRadioItem value={ALL_AREAS}>{t("filter.all")}</MenuRadioItem>
              {areas.map((a) => (
                <MenuRadioItem key={a} value={a}>
                  {a}
                </MenuRadioItem>
              ))}
            </MenuRadioGroup>
          </MenuContent>
        </Menu>
      </div>

      {/* Split button: main action + a menu of other ways to add (STYLE 4) */}
      <div className="flex gap-0.5">
        <Button className="rounded-r-none" onClick={onUnavailable}>
          {t("add.button")}
        </Button>
        <Menu>
          <MenuTrigger asChild>
            <Button
              aria-label={t("add.more")}
              className="min-w-12 rounded-l-none px-0"
            >
              <ChevronDown aria-hidden className="size-5" />
            </Button>
          </MenuTrigger>
          <MenuContent>
            <MenuItem onSelect={onUnavailable}>{t("add.book")}</MenuItem>
            <MenuItem onSelect={onUnavailable}>{t("add.import")}</MenuItem>
          </MenuContent>
        </Menu>
      </div>

      {/* Replaces the Figma account avatar (there are no accounts, SPEC 6) and
          the text size / contrast / dark buttons: all live in this modal now. */}
      <div className="ml-auto">
        <IconButton
          ref={settingsButtonRef}
          label={t("settings.menu")}
          onClick={onOpenSettings}
        >
          <SettingsIcon aria-hidden className="size-6" />
        </IconButton>
      </div>
    </header>
  );
}
