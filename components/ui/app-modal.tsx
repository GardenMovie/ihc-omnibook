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
  height,
  returnFocusRef,
  footer,
  dismissOnOutside = true,
  compact = false,
  fullScreen = false,
}: {
  /** Fills the whole window, for reading. */
  fullScreen?: boolean;
  /** For a line or two of text: the content takes only the room it needs. */
  compact?: boolean;
  /** Replaces the default buttons, for modals with other actions. */
  footer?: ReactNode;
  /** False for forms, so a stray click does not throw away what was typed. */
  dismissOnOutside?: boolean;
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
  /** Fixed height, for content that changes size; never taller than the screen. */
  height?: string;
  /** The element that opened the modal; it gets focus back on close. */
  returnFocusRef?: RefObject<HTMLElement | null>;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        {/* Same layer as the content, so a modal opened over another covers it. */}
        <Dialog.Overlay className="fixed inset-0 z-50 bg-[var(--overlay)]" />
        <Dialog.Content
          // No description: say so explicitly so Radix does not warn.
          {...(description ? {} : { "aria-describedby": undefined })}
          style={fullScreen ? undefined : { maxWidth, height }}
          // Give focus back to whatever opened the modal (STYLE 4).
          onCloseAutoFocus={(event) => {
            const other = document.querySelector("[role=dialog]");
            const opener = returnFocusRef?.current;
            // Another modal took this one's place: the focus is already there.
            if (document.activeElement?.closest("[role=dialog]")) {
              event.preventDefault();
            } else if (opener?.isConnected && (!other || opener.closest("[role=dialog]"))) {
              // Also back into a modal that stayed open underneath.
              event.preventDefault();
              opener.focus();
            } else if (other) {
              event.preventDefault();
            }
          }}
          onInteractOutside={(event) => {
            if (!dismissOnOutside) event.preventDefault();
          }}
          // Fields that use Escape themselves keep the modal open.
          onEscapeKeyDown={(event) => {
            if ((event.target as HTMLElement).closest("[data-own-escape]")) {
              event.preventDefault();
            }
          }}
          // Start on the first field, not the close button (whose tooltip
          // would pop up on open). Falls back to Radix's default.
          onOpenAutoFocus={(event) => {
            const content = event.currentTarget as HTMLElement;
            const first =
              content.querySelector<HTMLElement>("[data-autofocus]") ??
              content.querySelector<HTMLElement>(
                "[data-modal-body] input:checked, [data-modal-body] input:not([type=file]), [data-modal-body] textarea, [data-modal-body] select",
              );
            if (first) {
              event.preventDefault();
              first.focus();
            }
          }}
          className={`fixed z-50 flex flex-col overflow-y-auto bg-background text-foreground ${
            fullScreen
              ? "inset-0 gap-3 p-4"
              : "top-1/2 left-1/2 max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 gap-5 rounded-xl border-2 border-border p-6 shadow-[0_12px_40px_rgb(0_0_0/0.25)]"
          }`}
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

          {/* The minimum keeps the content usable at large text sizes: below it,
              the whole dialog scrolls instead. */}
          <div
            data-modal-body
            className={`-mx-1 flex-1 px-1 py-1 ${
              compact ? "" : "min-h-[min(14rem,40dvh)] overflow-y-auto"
            }`}
          >
            {children}
          </div>

          {/* `footer={false}`: no row at all. */}
          <div className="flex flex-wrap justify-end gap-4 empty:hidden">
            {footer ?? (
              <>
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
              </>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
