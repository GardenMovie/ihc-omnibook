"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ReactNode, RefObject } from "react";
import { t } from "@/lib/i18n";
import { Button } from "./button";
import { IconButton } from "./icon-button";

/**
 * The one modal every dialog in the app is built on (STYLE 4):
 * header (title + close), scrolling content, right-aligned footer.
 * Radix Dialog traps focus, restores it to the trigger, closes on Escape
 * and labels the dialog with its title.
 */
export function AppModal({
  open,
  onOpenChange,
  title,
  description,
  children,
  cancelLabel,
  confirmLabel,
  onConfirm,
  maxWidth = "910px",
  returnFocusRef,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  /** Secondary button, closes the modal. Omit when there is nothing to cancel. */
  cancelLabel?: string;
  /** Primary button. Defaults to a plain "Fechar" that closes the modal. */
  confirmLabel?: string;
  onConfirm?: () => void;
  maxWidth?: string;
  /** The element that opened the modal; it gets focus back on close. */
  returnFocusRef?: RefObject<HTMLElement | null>;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-[var(--overlay)]" />
        <Dialog.Content
          // No description: say so explicitly so Radix does not warn.
          {...(description ? {} : { "aria-describedby": undefined })}
          style={{ maxWidth }}
          // Give focus back to whatever opened the modal (STYLE 4).
          onCloseAutoFocus={(event) => {
            if (returnFocusRef?.current) {
              event.preventDefault();
              returnFocusRef.current.focus();
            }
          }}
          // Start on the first field, not the close button (whose tooltip
          // would pop up on open). Falls back to Radix's default.
          onOpenAutoFocus={(event) => {
            const first = (event.currentTarget as HTMLElement).querySelector<HTMLElement>(
              "[data-modal-body] input:checked, [data-modal-body] input, [data-modal-body] textarea, [data-modal-body] select",
            );
            if (first) {
              event.preventDefault();
              first.focus();
            }
          }}
          className="fixed top-1/2 left-1/2 z-50 flex max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col gap-5 rounded-xl border-2 border-border bg-background p-6 text-foreground shadow-[0_12px_40px_rgb(0_0_0/0.25)]"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="text-[1.625rem] leading-tight font-semibold">
                {title}
              </Dialog.Title>
              {description && (
                <Dialog.Description className="mt-1 text-base text-muted-foreground">
                  {description}
                </Dialog.Description>
              )}
            </div>
            <Dialog.Close asChild>
              <IconButton label={t("modal.close")}>
                <X aria-hidden className="size-6" />
              </IconButton>
            </Dialog.Close>
          </div>

          <div data-modal-body className="-mx-1 min-h-0 flex-1 overflow-y-auto px-1 py-1">{children}</div>

          <div className="flex justify-end gap-4">
            {cancelLabel && (
              <Dialog.Close asChild>
                <Button variant="secondary">{cancelLabel}</Button>
              </Dialog.Close>
            )}
            {onConfirm ? (
              <Button onClick={onConfirm}>{confirmLabel ?? t("modal.closeButton")}</Button>
            ) : (
              <Dialog.Close asChild>
                <Button>{confirmLabel ?? t("modal.closeButton")}</Button>
              </Dialog.Close>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
