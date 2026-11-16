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
};

/** The three text sizes offered in settings: 100%, 150%, 200%. */
export const FONT_SCALES = [1, 1.5, 2];
export const SETTINGS_KEY = "omnibook-settings";

export const DEFAULT_SETTINGS: Settings = { theme: "system", fontScale: 1 };

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

// Browser storage can be blocked or empty: always fall back to defaults.
export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<Settings>;
    return {
      theme: THEMES.includes(parsed.theme as Theme)
        ? (parsed.theme as Theme)
        : DEFAULT_SETTINGS.theme,
      fontScale:
        typeof parsed.fontScale === "number"
          ? snapFontScale(parsed.fontScale)
          : DEFAULT_SETTINGS.fontScale,
    };
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
}

/**
 * Inline script run before first paint so the saved theme and text size are
 * applied without a flash. Keep in sync with applySettings above.
 */
export const BOOT_SCRIPT = `(function(){try{var s=JSON.parse(localStorage.getItem("${SETTINGS_KEY}")||"{}");var t=s.theme||"system";if(t==="system"){t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}var r=document.documentElement;r.dataset.theme=t;var f=Number(s.fontScale);if(f>=1&&f<=2){r.style.setProperty("--font-scale",String(f<1.25?1:f<1.75?1.5:2))}}catch(e){}})();`;
