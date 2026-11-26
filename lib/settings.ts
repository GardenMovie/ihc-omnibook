import { ACTIONS, type Shortcuts } from "@/lib/shortcuts";

export type Theme =
  | "system"
  | "light"
  | "dark"
  | "high-contrast"
  | "protanopia"
  | "deuteranopia"
  | "tritanopia";

export type Settings = {
  theme: Theme;
  /** 0.85 to 2.0, default 1 (SPEC section 7) */
  fontScale: number;
  /** Shows the text in OpenDyslexic. */
  dyslexiaFont: boolean;
  shortcuts: Shortcuts;
  /** False turns off the shortcuts that are a single character. */
  singleKeys: boolean;
  /** The walkthrough was opened or declined, so it is not offered again. */
  tourSeen: boolean;
};

/** The three text sizes offered in settings: 100%, 150%, 200%. */
export const FONT_SCALES = [1, 1.5, 2];
export const SETTINGS_KEY = "omnibook-settings";

export const DEFAULT_SETTINGS: Settings = {
  theme: "system",
  fontScale: 1,
  dyslexiaFont: false,
  shortcuts: {},
  singleKeys: true,
  tourSeen: false,
};

function readShortcuts(saved: unknown): Shortcuts {
  const found: Shortcuts = {};
  for (const action of ACTIONS) {
    const key = (saved as Shortcuts | undefined)?.[action];
    if (typeof key === "string" && key) found[action] = key;
  }
  return found;
}

export const THEMES: Theme[] = [
  "system",
  "light",
  "dark",
  "high-contrast",
  "protanopia",
  "deuteranopia",
  "tritanopia",
];

/** Snap any saved value (e.g. from an older version) to the nearest option. */
export function snapFontScale(value: number): number {
  return FONT_SCALES.reduce((best, s) =>
    Math.abs(s - value) < Math.abs(best - value) ? s : best,
  );
}

/** Saved or imported settings may be old or edited: unknown values are dropped. */
export function readSettings(saved: unknown): Settings {
  const parsed = (saved ?? {}) as Partial<Settings>;
  return {
    theme: THEMES.includes(parsed.theme as Theme)
      ? (parsed.theme as Theme)
      : DEFAULT_SETTINGS.theme,
    fontScale:
      typeof parsed.fontScale === "number"
        ? snapFontScale(parsed.fontScale)
        : DEFAULT_SETTINGS.fontScale,
    dyslexiaFont: parsed.dyslexiaFont === true,
    shortcuts: readShortcuts(parsed.shortcuts),
    singleKeys: parsed.singleKeys !== false,
    tourSeen: parsed.tourSeen === true,
  };
}

// Browser storage can be blocked or empty: always fall back to defaults.
export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? readSettings(JSON.parse(raw)) : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: Settings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Nothing to do: the setting still applies for this visit.
  }
}

export function applySettings(settings: Settings): void {
  const root = document.documentElement;
  const resolved =
    settings.theme === "system"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : settings.theme;
  root.dataset.theme = resolved;
  root.style.setProperty("--font-scale", String(settings.fontScale));
  root.dataset.font = settings.dyslexiaFont ? "dyslexic" : "default";
}

/**
 * Inline script run before first paint so the saved theme, text size and font
 * are applied without a flash. Keep in sync with applySettings above.
 */
export const BOOT_SCRIPT = `(function(){try{var s=JSON.parse(localStorage.getItem("${SETTINGS_KEY}")||"{}");var t=s.theme||"system";if(t==="system"){t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}var r=document.documentElement;r.dataset.theme=t;if(s.dyslexiaFont===true){r.dataset.font="dyslexic"}var f=Number(s.fontScale);if(f>=1&&f<=2){r.style.setProperty("--font-scale",String(f<1.25?1:f<1.75?1.5:2))}}catch(e){}})();`;
