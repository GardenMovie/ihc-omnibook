/** Splitting author names, shared by sorting, filenames and references. */

// Kinship words are part of the surname: "João Silva Neto" -> "Silva Neto".
const SUFFIXES = /^(filho|filha|neto|neta|junior|júnior|sobrinho|jr\.?|sr\.?|ii|iii|iv)$/i;

export type PersonName = { family: string; given: string };

/**
 * "Last, First" is taken as written. A trailing comma ("Universidade Federal
 * do ABC,") keeps an institution's name whole.
 */
export function parseName(name: string): PersonName {
  const clean = name.trim().replace(/\s+/g, " ");
  const comma = clean.indexOf(",");
  if (comma >= 0) {
    return { family: clean.slice(0, comma).trim(), given: clean.slice(comma + 1).trim() };
  }
  const words = clean.split(" ");
  const take = words.length > 2 && SUFFIXES.test(words.at(-1)!) ? 2 : 1;
  return { family: words.slice(-take).join(" "), given: words.slice(0, -take).join(" ") };
}

export const surname = (name: string) => parseName(name).family;
