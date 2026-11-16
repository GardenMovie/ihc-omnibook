import * as Tooltip from "@radix-ui/react-tooltip";
import { Check } from "lucide-react";
import { a11yBadgeText, a11yText, type A11y } from "@/lib/books";

/**
 * Accessibility pill with short text. Meaning is in the shape AND the words,
 * never color alone:
 *   yes      solid pill, check + the standard ("PDF/UA", "WCAG 2.x AA")
 *   partial  dashed outline, check + "Parcial"
 *   unknown  dotted outline, "?" + "Não verificado"
 *   no       nothing is drawn (the card's accessible name still says so)
 * Decorative for assistive tech (aria-hidden): the card's accessible name and
 * the details panel carry the same information as text.
 */
export function A11yBadge({
  a11y,
  withTooltip = true,
}: {
  a11y: A11y | undefined;
  withTooltip?: boolean;
}) {
  const text = a11y ? a11yBadgeText(a11y) : null;
  if (!a11y || !text) return null;

  const shape = {
    yes: "border-primary bg-primary text-primary-foreground",
    partial: "border-dashed border-primary bg-background text-primary",
    unknown: "border-dotted border-input bg-background text-muted-foreground",
    no: "",
  }[a11y.compatible];

  const badge = (
    <span
      aria-hidden="true"
      className={`inline-flex min-h-7 max-w-full items-center gap-1.5 rounded-full border-2 px-2.5 py-0.5 text-base leading-tight font-semibold ${shape}`}
    >
      {a11y.compatible === "unknown" ? (
        <span className="font-bold">?</span>
      ) : (
        <Check aria-hidden className="size-4 shrink-0" strokeWidth={3} />
      )}
      <span className="min-w-0">{text}</span>
    </span>
  );

  if (!withTooltip) return badge;

  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>{badge}</Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content
          sideOffset={6}
          className="z-50 max-w-72 rounded-md bg-foreground px-3 py-1.5 text-base text-background"
        >
          {a11yText(a11y)}
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}
