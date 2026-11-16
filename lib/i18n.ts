import messages from "@/messages/pt-BR.json";

export type MessageKey = keyof typeof messages;

/** Minimal i18n: pt-BR only for now, shaped so another locale can be added. */
export function t(key: MessageKey, vars?: Record<string, string | number>): string {
  let text: string = messages[key];
  if (vars) {
    for (const [name, value] of Object.entries(vars)) {
      text = text.replaceAll(`{${name}}`, String(value));
    }
  }
  return text;
}

export function plural(
  n: number,
  keys: { one: MessageKey; other: MessageKey },
): string {
  return t(n === 1 ? keys.one : keys.other, { n });
}
