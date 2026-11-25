/** Splitting author names, shared by sorting, filenames and references. */

// Kinship words are part of the surname: "João Silva Neto" -> "Silva Neto".
const SUFFIXES = /^(filho|filha|neto|neta|junior|júnior|sobrinho|jr\.?|sr\.?|ii|iii|iv)$/i;

export type PersonName = { family: string; given: string };

const PARTICLES = /^(de|da|do|das|dos|e|del|von|van)$/;

/**
 * "LOUISA MAY ALCOTT" -> "Louisa May Alcott". Names with any small letter are
 * left as written, and so is a single word, which may be an acronym.
 */
export function fixCaps(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length < 2 || /\p{Ll}/u.test(name)) return name;
  return words
    .map((word, i) => {
      if (/^(II|III|IV),?$/.test(word)) return word;
      const lower = word.toLocaleLowerCase("pt-BR");
      if (i > 0 && PARTICLES.test(lower)) return lower;
      // After a hyphen, dot or apostrophe too: "J.R.R.", "O'Brien".
      return lower.replace(/(?<![\p{L}\p{M}])\p{L}/gu, (c) => c.toLocaleUpperCase("pt-BR"));
    })
    .join(" ");
}

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
