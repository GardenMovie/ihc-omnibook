/**
 * Markdown from a file the user added, so untrusted: raw HTML is ignored
 * (react-markdown's default) and nothing is ever loaded from the network.
 */
import { createElement, memo, type MouseEvent } from "react";
import Markdown, { type Components, type ExtraProps } from "react-markdown";
import remarkGfm from "remark-gfm";
import { t } from "@/lib/i18n";
import { stripFrontMatter } from "@/lib/reader/text";

const slug = (text: string) =>
  text
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s_-]/gu, "")
    .replace(/\s/g, "-");

/** Links inside the file ("#section"): scroll there without touching the URL. */
function jump(event: MouseEvent<HTMLAnchorElement>, href: string) {
  event.preventDefault();
  const body = event.currentTarget.closest("[data-reader-text]");
  if (!body) return;
  const wanted = decodeURIComponent(href.slice(1));
  const target =
    [...body.querySelectorAll<HTMLElement>("[id]")].find((el) => el.id === wanted) ??
    [...body.querySelectorAll<HTMLElement>("h1, h2, h3, h4, h5, h6")].find(
      (el) => slug(el.textContent ?? "") === wanted,
    );
  if (!target) return;
  target.tabIndex = -1;
  target.focus();
}

/** The element's attributes, without the syntax tree node react-markdown adds. */
function attributes<P extends ExtraProps>(props: P): Omit<P, "node"> {
  const copy = { ...props };
  delete copy.node;
  return copy;
}

/** A plain element with the app's look; keeps classes the Markdown set. */
const styled = (tag: string, look: string, extra: { tabIndex?: number } = {}) =>
  function Styled(props: ExtraProps & { className?: string }) {
    const className = [look, props.className].filter(Boolean).join(" ");
    return createElement(tag, { ...extra, ...attributes(props), className });
  };

const components: Components = {
  h1: styled("h1", "mt-8 text-[1.625rem] font-semibold"),
  h2: styled("h2", "mt-8 text-2xl font-semibold"),
  h3: styled("h3", "mt-6 text-xl font-semibold"),
  h4: styled("h4", "mt-4 font-semibold"),
  h5: styled("h5", "mt-4 font-semibold"),
  h6: styled("h6", "mt-4 font-semibold"),
  ul: styled("ul", "list-disc pl-8"),
  ol: styled("ol", "list-decimal pl-8"),
  blockquote: styled("blockquote", "border-l-4 border-input pl-4"),
  hr: styled("hr", "my-4 border-input"),
  code: styled("code", "rounded bg-muted px-1 font-mono"),
  // Wide code and tables scroll on their own, also with the keyboard.
  pre: styled(
    "pre",
    "overflow-x-auto rounded-lg border border-border bg-muted p-4 font-mono text-base [&_code]:bg-transparent [&_code]:p-0",
    { tabIndex: 0 },
  ),
  table: (props) => (
    <div tabIndex={0} className="overflow-x-auto">
      <table
        className="border-collapse [&_td]:border [&_td]:border-input [&_td]:px-3 [&_td]:py-1.5 [&_th]:border [&_th]:border-input [&_th]:px-3 [&_th]:py-1.5"
        {...attributes(props)}
      />
    </div>
  ),
  // Never fetched: the app makes no network calls (SPEC 3.1).
  img: ({ alt }) => (
    <span className="text-muted-foreground">
      [{alt ? t("reader.image", { alt }) : t("reader.imageNoText")}]
    </span>
  ),
  a: (all) => {
    const { href, children, ...props } = attributes(all);
    const look = "text-primary underline";
    if (href?.startsWith("#")) {
      return (
        <a {...props} href={href} className={look} onClick={(e) => jump(e, href)}>
          {children}
        </a>
      );
    }
    // Opened only if the user follows it, and away from the library.
    if (href && /^(https?:|mailto:)/i.test(href)) {
      return (
        <a {...props} href={href} className={look} target="_blank" rel="noopener noreferrer">
          {children}
          <span className="sr-only"> {t("reader.newTab")}</span>
        </a>
      );
    }
    // Other files of the author's folder are not in the library.
    return <>{children}</>;
  },
};

export const MarkdownContent = memo(function MarkdownContent({ text }: { text: string }) {
  return (
    <div className="flex flex-col gap-4">
      <Markdown remarkPlugins={[remarkGfm]} components={components}>
        {stripFrontMatter(text)}
      </Markdown>
    </div>
  );
});
