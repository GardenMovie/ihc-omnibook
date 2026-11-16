"use client";

import { ChevronDown } from "lucide-react";
import { SORT_KEYS, type SortKey } from "@/lib/books";
import { t } from "@/lib/i18n";
import {
  Menu,
  MenuContent,
  MenuRadioGroup,
  MenuRadioItem,
  MenuTrigger,
} from "@/components/ui/menu";

export function SortMenu({
  value,
  onChange,
}: {
  value: SortKey;
  onChange: (key: SortKey) => void;
}) {
  return (
    <Menu>
      <MenuTrigger className="inline-flex min-h-12 items-center gap-2 rounded-md px-3 text-xl hover:bg-accent">
        {t("sort.label")}: <span className="font-semibold">{t(`sort.${value}`)}</span>
        <ChevronDown aria-hidden className="size-5" />
      </MenuTrigger>
      <MenuContent align="start">
        <MenuRadioGroup value={value} onValueChange={(v) => onChange(v as SortKey)}>
          {SORT_KEYS.map((key) => (
            <MenuRadioItem key={key} value={key}>
              {t(`sort.${key}`)}
            </MenuRadioItem>
          ))}
        </MenuRadioGroup>
      </MenuContent>
    </Menu>
  );
}
