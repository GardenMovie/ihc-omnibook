import { t } from "@/lib/i18n";

// Subset of the Book type in SPEC section 7. Files, covers in OPFS and
// metaSource arrive with the storage layer; for now covers are generated.
/**
 * Accessibility of the book file (SPEC section 7). `notes` names the standard
 * the file claims, e.g. "PDF/UA" or "WCAG 2.x AA". Absent for plain text
 * (txt/md), which is inherently accessible and has nothing to declare.
 */
export type A11y = {
  compatible: "yes" | "partial" | "no" | "unknown";
  notes?: string;
};

export type Book = {
  id: string;
  title: string;
  authors: string[];
  year?: number;
  language?: string;
  areas: string[];
  topics: string[];
  format: "pdf" | "epub" | "txt" | "md";
  addedAt: number;
  lastOpenedAt?: number;
  a11y?: A11y;
  cover: { from: string; to: string; text: string };
};

export type SortKey = "recent" | "title" | "author" | "year" | "added";
export const SORT_KEYS: SortKey[] = ["recent", "title", "author", "year", "added"];

const norm = (s: string) =>
  s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

export function matchesQuery(book: Book, query: string): boolean {
  const q = norm(query.trim());
  if (!q) return true;
  const haystack = norm(
    [book.title, ...book.authors, ...book.areas, ...book.topics, book.year ?? ""].join(" "),
  );
  return q.split(/\s+/).every((word) => haystack.includes(word));
}

const surname = (name: string) => name.trim().split(/\s+/).at(-1) ?? name;

export function sortBooks(books: Book[], key: SortKey): Book[] {
  const collator = new Intl.Collator("pt-BR", { sensitivity: "base" });
  const copy = [...books];
  copy.sort((a, b) => {
    switch (key) {
      case "recent":
        return (b.lastOpenedAt ?? 0) - (a.lastOpenedAt ?? 0);
      case "title":
        return collator.compare(a.title, b.title);
      case "author":
        return collator.compare(surname(a.authors[0] ?? ""), surname(b.authors[0] ?? ""));
      case "year":
        return (b.year ?? 0) - (a.year ?? 0);
      case "added":
        return b.addedAt - a.addedAt;
    }
  });
  return copy;
}

export function authorLine(book: Book): string {
  return book.authors.join(", ");
}

/** Compact byline for cards: "A", "Sobrenome e Sobrenome", "A et al." */
export function authorShort(book: Book): string {
  const [first, second] = book.authors;
  if (!first) return "";
  if (book.authors.length === 1) return first;
  if (book.authors.length === 2 && second) return `${surname(first)} e ${surname(second)}`;
  return `${first} et al.`;
}

/** "Compatível (PDF/UA)" */
export function a11yText(a11y: A11y): string {
  const label = t(`a11y.${a11y.compatible}`);
  return a11y.notes ? `${label} (${a11y.notes})` : label;
}

/** Short text shown on the badge itself; null = no badge ("no"). */
export function a11yBadgeText(a11y: A11y): string | null {
  switch (a11y.compatible) {
    case "yes":
      return a11y.notes ?? t("a11y.badge.yes");
    case "partial":
      return t("a11y.badge.partial");
    case "unknown":
      return t("a11y.badge.unknown");
    case "no":
      return null;
  }
}

/** Spoken summary for the card's accessible name; undefined = say nothing. */
export function a11ySummary(book: Book): string | undefined {
  return book.a11y ? `${t("panel.a11y")}: ${a11yText(book.a11y)}.` : undefined;
}

export function languageLabel(code?: string): string {
  if (!code) return t("panel.none");
  try {
    return new Intl.DisplayNames(["pt-BR"], { type: "language" }).of(code) ?? code;
  } catch {
    return code;
  }
}

const DAY = 86_400_000;
const NOW = Date.now();

// PLACEHOLDER DATA: real textbook titles used only to preview the UI.
// Years and metadata are illustrative, not authoritative. Replaced by the
// Dexie-backed library later.
export const PLACEHOLDER_BOOKS: Book[] = [
  {
    id: "calculus",
    title: "Calculus Early Vectors",
    authors: ["James Stewart"],
    year: 2012,
    language: "en-US",
    areas: ["Matemática"],
    topics: ["Cálculo diferencial e integral"],
    format: "pdf",
    addedAt: NOW - 40 * DAY,
    lastOpenedAt: NOW - 1 * DAY,
    a11y: { compatible: "yes", notes: "PDF/UA" },
    cover: { from: "#7a1020", to: "#12080c", text: "#ffffff" },
  },
  {
    id: "intro-linear-algebra",
    title: "Introduction to Linear Algebra",
    authors: ["Gilbert Strang"],
    year: 2003,
    language: "en",
    areas: ["Matemática"],
    topics: ["Álgebra linear", "Matrizes"],
    format: "pdf",
    addedAt: NOW - 35 * DAY,
    lastOpenedAt: NOW - 3 * DAY,
    a11y: { compatible: "partial", notes: "PDF etiquetado, sem PDF/UA" },
    cover: { from: "#0f5a24", to: "#062b12", text: "#ffffff" },
  },
  {
    id: "linear-algebra-applications",
    title: "Linear Algebra and Its Applications",
    authors: ["Gilbert Strang"],
    year: 2006,
    language: "en",
    areas: ["Matemática"],
    topics: ["Álgebra linear", "Aplicações"],
    format: "epub",
    addedAt: NOW - 33 * DAY,
    lastOpenedAt: NOW - 9 * DAY,
    a11y: { compatible: "yes", notes: "WCAG 2.x AA" },
    cover: { from: "#e6dcb8", to: "#c9bb8a", text: "#3b3320" },
  },
  {
    id: "linear-algebra-data",
    title: "Linear Algebra and Learning from Data",
    authors: ["Gilbert Strang"],
    year: 2019,
    language: "en",
    areas: ["Matemática", "Ciência de dados"],
    topics: ["Álgebra linear", "Aprendizado de máquina"],
    format: "pdf",
    addedAt: NOW - 20 * DAY,
    lastOpenedAt: NOW - 2 * DAY,
    a11y: { compatible: "no" },
    cover: { from: "#2f6fa8", to: "#9ec3e0", text: "#ffffff" },
  },
  {
    id: "discrete-math",
    title: "Discrete Mathematics and Its Applications",
    authors: ["Kenneth H. Rosen"],
    year: 2012,
    language: "en",
    areas: ["Matemática", "Computação"],
    topics: ["Matemática discreta", "Teoria dos grafos"],
    format: "pdf",
    addedAt: NOW - 60 * DAY,
    lastOpenedAt: NOW - 30 * DAY,
    a11y: { compatible: "unknown" },
    cover: { from: "#1c1c1f", to: "#050505", text: "#f2f2f2" },
  },
  {
    id: "real-complex-analysis",
    title: "Real and Complex Analysis",
    authors: ["Walter Rudin"],
    year: 1987,
    language: "en",
    areas: ["Matemática"],
    topics: ["Análise real", "Análise complexa"],
    format: "pdf",
    addedAt: NOW - 90 * DAY,
    lastOpenedAt: NOW - 45 * DAY,
    a11y: { compatible: "unknown" },
    cover: { from: "#16261d", to: "#0a120e", text: "#b9c9bd" },
  },
  {
    id: "probability-applications",
    title: "Probability and Its Applications",
    authors: ["William Feller"],
    year: 1971,
    language: "en",
    areas: ["Matemática", "Estatística"],
    topics: ["Probabilidade"],
    format: "pdf",
    addedAt: NOW - 80 * DAY,
    lastOpenedAt: NOW - 12 * DAY,
    a11y: { compatible: "no" },
    cover: { from: "#16228a", to: "#0b1250", text: "#ffffff" },
  },
  {
    id: "probability-theory",
    title: "Probability Theory",
    authors: ["E. T. Jaynes"],
    year: 2003,
    language: "en",
    areas: ["Matemática", "Estatística"],
    topics: ["Probabilidade", "Inferência bayesiana"],
    format: "epub",
    addedAt: NOW - 15 * DAY,
    lastOpenedAt: NOW - 5 * DAY,
    a11y: { compatible: "partial", notes: "Metadados de acessibilidade incompletos" },
    cover: { from: "#1a1aff", to: "#7d2bd6", text: "#ffffff" },
  },
  {
    id: "probability-statistics-engineering",
    title: "Probability and Statistics for Engineering",
    authors: ["Jay L. Devore"],
    year: 2011,
    language: "en",
    areas: ["Estatística", "Engenharia"],
    topics: ["Probabilidade", "Estatística aplicada"],
    format: "pdf",
    addedAt: NOW - 70 * DAY,
    lastOpenedAt: NOW - 20 * DAY,
    a11y: { compatible: "unknown" },
    cover: { from: "#c2152b", to: "#7b0d1a", text: "#ffffff" },
  },
  {
    id: "numerical-analysis",
    title: "Numerical Analysis",
    authors: ["Richard L. Burden", "J. Douglas Faires"],
    year: 2010,
    language: "en",
    areas: ["Matemática", "Computação"],
    topics: ["Cálculo numérico"],
    format: "pdf",
    addedAt: NOW - 55 * DAY,
    lastOpenedAt: NOW - 7 * DAY,
    a11y: { compatible: "yes", notes: "PDF/UA" },
    cover: { from: "#f1e4d4", to: "#d98a5a", text: "#3a2416" },
  },
  {
    id: "metodologia-exemplo",
    title: "Metodologia da Pesquisa (exemplo)",
    authors: ["Autora Exemplo", "Autor Exemplo", "Terceira Autora Exemplo"],
    year: 2021,
    language: "pt-BR",
    areas: ["Metodologia"],
    topics: ["Pesquisa científica", "Escrita acadêmica"],
    format: "epub",
    addedAt: NOW - 4 * DAY,
    lastOpenedAt: NOW - 4 * DAY,
    a11y: { compatible: "yes", notes: "WCAG 2.x AA" },
    cover: { from: "#0b6b5b", to: "#0b3d37", text: "#ffffff" },
  },
  {
    id: "notas-calculo-exemplo",
    title: "Notas de Aula de Cálculo (exemplo)",
    authors: ["Prof. Exemplo"],
    language: "pt-BR",
    areas: ["Matemática"],
    topics: ["Cálculo diferencial e integral"],
    format: "md",
    addedAt: NOW - 1 * DAY,
    cover: { from: "#b45309", to: "#7a3606", text: "#ffffff" },
  },
];
