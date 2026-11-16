"use client";

import * as DM from "@radix-ui/react-dropdown-menu";
import { Check } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";

export const Menu = DM.Root;
export const MenuTrigger = DM.Trigger;
export const MenuRadioGroup = DM.RadioGroup;
export const MenuLabel = ({ children }: { children: ReactNode }) => (
  <DM.Label className="px-3 py-2 text-base font-semibold text-muted-foreground">
    {children}
  </DM.Label>
);
export const MenuSeparator = () => <DM.Separator className="my-1 h-px bg-border" />;

export function MenuContent({ className = "", ...props }: ComponentProps<typeof DM.Content>) {
  return (
    <DM.Portal>
      <DM.Content
        sideOffset={6}
        align="end"
        collisionPadding={12}
        className={`z-50 min-w-56 rounded-lg border-2 border-input bg-popover p-1.5 text-lg text-popover-foreground shadow-[0_12px_40px_rgb(0_0_0/0.25)] ${className}`}
        {...props}
      />
    </DM.Portal>
  );
}

const itemClass =
  "flex min-h-11 cursor-pointer items-center gap-3 rounded-md px-3 py-2 outline-none data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground";

export function MenuItem({ children, ...props }: ComponentProps<typeof DM.Item>) {
  return (
    <DM.Item className={itemClass} {...props}>
      {children}
    </DM.Item>
  );
}

/** Radio item: the selected option shows a check icon, not just a color. */
export function MenuRadioItem({
  value,
  children,
}: {
  value: string;
  children: ReactNode;
}) {
  return (
    <DM.RadioItem value={value} className={itemClass}>
      <span className="inline-flex size-5 shrink-0 items-center justify-center">
        <DM.ItemIndicator>
          <Check aria-hidden className="size-5" />
        </DM.ItemIndicator>
      </span>
      {children}
    </DM.RadioItem>
  );
}
