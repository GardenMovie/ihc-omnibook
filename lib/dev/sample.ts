/**
 * Development only. Real textbook titles used to preview the UI; years and
 * metadata are illustrative, and each "file" is a small stand-in.
 */
import { createBook, getBook } from "@/lib/db/books";
import type { BookAccessibility, BookFormat } from "@/lib/db/types";

const DAY = 86_400_000;

type Sample = {
  id: string;
  title: string;
  authors: string[];
  year?: number;
  language: string;
  areas: string[];
  topics: string[];
  format: BookFormat;
  /** Days ago */
  added: number;
  opened?: number;
  accessibility?: BookAccessibility;
};

const pdfUa: BookAccessibility = { status: "yes", notes: "PDF/UA" };
const epub11: BookAccessibility = { status: "yes", notes: "EPUB 1.1 (W3C)" };
const none: BookAccessibility = { status: "no" };
const unknown: BookAccessibility = { status: "unknown" };

// prettier-ignore
const SAMPLES: Sample[] = [
  { id: "calculus", title: "Calculus Early Vectors", authors: ["James Stewart"], year: 2012, language: "en-US", areas: ["Matemática"], topics: ["Cálculo diferencial e integral"], format: "pdf", added: 40, opened: 1, accessibility: pdfUa },
  { id: "intro-linear-algebra", title: "Introduction to Linear Algebra", authors: ["Gilbert Strang"], year: 2003, language: "en", areas: ["Matemática"], topics: ["Álgebra linear", "Matrizes"], format: "pdf", added: 35, opened: 3, accessibility: { status: "partial", notes: "PDF etiquetado, sem PDF/UA" } },
  { id: "linear-algebra-applications", title: "Linear Algebra and Its Applications", authors: ["Gilbert Strang"], year: 2006, language: "en", areas: ["Matemática"], topics: ["Álgebra linear", "Aplicações"], format: "epub", added: 33, opened: 9, accessibility: epub11 },
  { id: "linear-algebra-data", title: "Linear Algebra and Learning from Data", authors: ["Gilbert Strang"], year: 2019, language: "en", areas: ["Matemática", "Ciência de dados"], topics: ["Álgebra linear", "Aprendizado de máquina"], format: "pdf", added: 20, opened: 2, accessibility: none },
  { id: "discrete-math", title: "Discrete Mathematics and Its Applications", authors: ["Kenneth H. Rosen"], year: 2012, language: "en", areas: ["Matemática", "Computação"], topics: ["Matemática discreta", "Teoria dos grafos"], format: "pdf", added: 60, opened: 30, accessibility: unknown },
  { id: "real-complex-analysis", title: "Real and Complex Analysis", authors: ["Walter Rudin"], year: 1987, language: "en", areas: ["Matemática"], topics: ["Análise real", "Análise complexa"], format: "pdf", added: 90, opened: 45, accessibility: unknown },
  { id: "probability-applications", title: "Probability and Its Applications", authors: ["William Feller"], year: 1971, language: "en", areas: ["Matemática", "Estatística"], topics: ["Probabilidade"], format: "pdf", added: 80, opened: 12, accessibility: none },
  { id: "probability-theory", title: "Probability Theory", authors: ["E. T. Jaynes"], year: 2003, language: "en", areas: ["Matemática", "Estatística"], topics: ["Probabilidade", "Inferência bayesiana"], format: "epub", added: 15, opened: 5, accessibility: { status: "partial", notes: "Metadados de acessibilidade incompletos" } },
  { id: "probability-statistics-engineering", title: "Probability and Statistics for Engineering", authors: ["Jay L. Devore"], year: 2011, language: "en", areas: ["Estatística", "Engenharia"], topics: ["Probabilidade", "Estatística aplicada"], format: "pdf", added: 70, opened: 20, accessibility: unknown },
  { id: "numerical-analysis", title: "Numerical Analysis", authors: ["Richard L. Burden", "J. Douglas Faires"], year: 2010, language: "en", areas: ["Matemática", "Computação"], topics: ["Cálculo numérico"], format: "pdf", added: 55, opened: 7, accessibility: pdfUa },
  { id: "metodologia-exemplo", title: "Metodologia da Pesquisa (exemplo)", authors: ["Autora Exemplo", "Autor Exemplo", "Terceira Autora Exemplo"], year: 2021, language: "pt-BR", areas: ["Metodologia"], topics: ["Pesquisa científica", "Escrita acadêmica"], format: "epub", added: 4, opened: 4, accessibility: epub11 },
  { id: "notas-calculo-exemplo", title: "Notas de Aula de Cálculo (exemplo)", authors: ["Prof. Exemplo"], language: "pt-BR", areas: ["Matemática"], topics: ["Cálculo diferencial e integral"], format: "md", added: 1 },
];

export async function loadSamples(): Promise<void> {
  const now = Date.now();
  for (const { id, format, added, opened, ...metadata } of SAMPLES) {
    if (await getBook(id)) continue;
    await createBook(
      {
        file: new Blob([`Arquivo de exemplo: ${metadata.title}`]),
        fileName: `${id}.${format}`,
        format,
        metadata,
      },
      {
        id,
        status: "ready",
        addedAt: now - added * DAY,
        lastOpenedAt: opened === undefined ? undefined : now - opened * DAY,
      },
    );
  }
}
