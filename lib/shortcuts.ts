/**
 * Keyboard shortcuts (STYLE 6). WCAG 2.1.4 asks that shortcuts made of a single
 * character can be remapped or turned off: both are offered in the settings.
 */

export const ACTIONS = [
  "search",
  "add",
  "open",
  "edit",
  "export",
  "download",
  "settings",
  "help",
] as const;
export type Action = (typeof ACTIONS)[number];

export const DEFAULT_SHORTCUTS: Record<Action, string> = {
  search: "/",
  add: "a",
  open: "o",
  edit: "e",
  export: "r",
  download: "d",
  settings: ",",
  help: "?",
};

/** What the user changed; everything else keeps its default. */
export type Shortcuts = Partial<Record<Action, string>>;

export const binding = (custom: Shortcuts, action: Action) =>
  custom[action] ?? DEFAULT_SHORTCUTS[action];

const isSingleKey = (key: string) => key.length === 1;

/** The keys that work now: single characters may be switched off. */
export function activeShortcuts(custom: Shortcuts, singleKeys: boolean): Shortcuts {
  return Object.fromEntries(
    ACTIONS.map((action) => [action, binding(custom, action)]).filter(
      ([, key]) => singleKeys || !isSingleKey(key),
    ),
  );
}

type KeyPress = Pick<
  KeyboardEvent,
  "key" | "code" | "ctrlKey" | "altKey" | "metaKey" | "shiftKey" | "getModifierState"
>;

/**
 * "a", "?", "Ctrl+k", "Alt+Shift+e". Undefined for keys that cannot be a
 * shortcut: Enter, Esc, Tab, space and arrows keep their usual job.
 */
export function keyFromEvent(event: KeyPress): string | undefined {
  // AltGr types characters; on Windows it also reports Ctrl and Alt.
  const altGraph = event.getModifierState("AltGraph");
  const ctrl = event.ctrlKey && !altGraph;
  const alt = event.altKey && !altGraph;
  const modified = ctrl || alt || event.metaKey;

  // With Alt, macOS reports another character: go by the physical letter.
  const letter = alt ? /^Key([A-Z])$/.exec(event.code)?.[1] : undefined;
  const key = (letter ?? event.key).toLowerCase();
  if (key.length !== 1 || key === " ") return;
  if (!modified) return key;
  return [
    ctrl && "Ctrl",
    alt && "Alt",
    event.metaKey && "Meta",
    // For other characters, Shift is already part of what was typed.
    event.shiftKey && key !== key.toUpperCase() && "Shift",
    key,
  ]
    .filter(Boolean)
    .join("+");
}

// The key itself may be "+".
const parts = (key: string) => key.split(/\+(?=.)/);

/** For showing on screen: "Ctrl + K". */
export const keyLabel = (key: string) =>
  parts(key)
    .map((part) => (part.length === 1 ? part.toUpperCase() : part))
    .join(" + ");

/** The value of `aria-keyshortcuts`. */
export const ariaKeys = (key: string | undefined) =>
  key &&
  parts(key)
    .map((part) => (part === "Ctrl" ? "Control" : part === "+" ? "Plus" : part))
    .join("+");

/** Keys pressed here belong to the field or menu, not to a shortcut. */
export function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  return Boolean(
    target.closest(
      "textarea, select, [role=menu], [role=listbox], input:not([type=radio], [type=checkbox], [type=button], [type=file])",
    ),
  );
}
