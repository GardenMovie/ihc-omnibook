"use client";

import * as Tooltip from "@radix-ui/react-tooltip";
import type { ButtonHTMLAttributes, Ref } from "react";

/** Square icon button. Always has an accessible name and a tooltip (STYLE 4). */
export function IconButton({
  label,
  pressed,
  variant = "outline",
  className = "",
  ref,
  children,
  ...props
}: Omit<ButtonHTMLAttributes<HTMLButtonElement>, "aria-label"> & {
  label: string;
  /** "ghost" has no visible outline until hovered; for quiet toolbar actions. */
  variant?: "outline" | "ghost";
  /** For toggles: shows filled when on, and sets aria-pressed. */
  pressed?: boolean;
  ref?: Ref<HTMLButtonElement>;
}) {
  const ghost = variant === "ghost";
  // Same 2px border in both so the size never changes (STYLE 4).
  const shape = ghost
    ? "rounded-full border-transparent"
    : "rounded-md border-primary";
  const state =
    pressed === undefined
      ? ghost
        ? "bg-transparent text-foreground hover:bg-accent"
        : "bg-background text-primary hover:bg-accent"
      : pressed
        ? "bg-primary text-primary-foreground"
        : ghost
          ? "bg-transparent text-foreground hover:bg-accent"
          : "bg-background text-primary hover:bg-accent";

  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <button
          ref={ref}
          type="button"
          aria-label={label}
          aria-pressed={pressed}
          className={`inline-flex size-12 shrink-0 items-center justify-center border-2 text-lg font-semibold transition-colors duration-150 disabled:opacity-50 disabled:pointer-events-none ${shape} ${state} ${className}`}
          {...props}
        >
          {children}
        </button>
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content
          sideOffset={6}
          className="z-50 rounded-md bg-foreground px-3 py-1.5 text-base text-background"
        >
          {label}
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}
