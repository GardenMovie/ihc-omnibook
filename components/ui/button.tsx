import type { ButtonHTMLAttributes, Ref } from "react";

type Variant = "primary" | "secondary";

// Both variants carry a 2px border so they are the same height (STYLE 4).
const base =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-md border-2 px-7 py-2 text-lg font-medium transition-colors duration-150 disabled:opacity-50 disabled:pointer-events-none";

const variants: Record<Variant, string> = {
  primary:
    "border-primary bg-primary text-primary-foreground hover:brightness-90 active:brightness-75",
  secondary:
    "border-primary bg-secondary text-secondary-foreground hover:bg-accent active:bg-accent",
};

export function Button({
  variant = "primary",
  className = "",
  ref,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  ref?: Ref<HTMLButtonElement>;
}) {
  return (
    <button
      ref={ref}
      type="button"
      className={`${base} ${variants[variant]} ${className}`}
      {...props}
    />
  );
}
