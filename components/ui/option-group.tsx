import { Check } from "lucide-react";
import { useId } from "react";

/**
 * Group of mutually exclusive choices built on native radio inputs, so arrow
 * keys, labels and screen-reader semantics come for free. The chosen option
 * shows a check icon and a filled background, never color alone (STYLE rule 2).
 */
export function OptionGroup<T extends string>({
  legend,
  value,
  options,
  onChange,
  columns = 3,
}: {
  legend: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  columns?: 1 | 2 | 3;
}) {
  const name = useId();
  const cols = { 1: "grid-cols-1", 2: "grid-cols-1 sm:grid-cols-2", 3: "grid-cols-3" }[columns];

  return (
    <fieldset className="min-w-0">
      <legend className="mb-3 text-xl font-semibold">{legend}</legend>
      <div className={`grid gap-3 ${cols}`}>
        {options.map((option) => {
          const checked = option.value === value;
          return (
            <label
              key={option.value}
              className={`relative flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-md border-2 px-4 py-2 text-lg font-medium transition-colors duration-150 has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring ${
                checked
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-primary bg-background text-primary hover:bg-accent"
              }`}
            >
              <input
                type="radio"
                name={name}
                value={option.value}
                checked={checked}
                onChange={() => onChange(option.value)}
                className="sr-only"
              />
              {checked && <Check aria-hidden className="size-5 shrink-0" strokeWidth={3} />}
              {option.label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
