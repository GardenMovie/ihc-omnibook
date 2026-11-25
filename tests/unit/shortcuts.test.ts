import { describe, expect, it } from "vitest";
import { activeShortcuts, ariaKeys, keyFromEvent, keyLabel } from "@/lib/shortcuts";

const press = (key: string, extra: Partial<KeyboardEvent> = {}) =>
  keyFromEvent({
    key,
    code: "",
    ctrlKey: false,
    altKey: false,
    metaKey: false,
    shiftKey: false,
    getModifierState: () => false,
    ...extra,
  });

describe("shortcuts", () => {
  it("names single keys and combinations", () => {
    expect(press("A", { shiftKey: true })).toBe("a");
    expect(press("?", { shiftKey: true })).toBe("?");
    expect(press("K", { ctrlKey: true, shiftKey: true })).toBe("Ctrl+Shift+k");
    expect(press("å", { altKey: true, code: "KeyA" })).toBe("Alt+a");
    // AltGr only types the character.
    expect(press("/", { ctrlKey: true, altKey: true, getModifierState: () => true })).toBe("/");
    for (const key of ["Enter", "Escape", "Tab", " ", "ArrowDown", "Shift", "Dead"]) {
      expect(press(key)).toBeUndefined();
    }
  });

  it("can turn off the single keys, keeping combinations", () => {
    expect(activeShortcuts({}, true).search).toBe("/");
    expect(activeShortcuts({ add: "Ctrl+k" }, false)).toEqual({ add: "Ctrl+k" });
  });

  it("writes keys for the screen and for screen readers", () => {
    expect(keyLabel("Ctrl++")).toBe("Ctrl + +");
    expect(ariaKeys("Ctrl+Shift+k")).toBe("Control+Shift+k");
    expect(ariaKeys(undefined)).toBeUndefined();
  });
});
