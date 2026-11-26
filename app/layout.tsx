import type { Metadata } from "next";
import "@fontsource-variable/inter"; // bundled locally: no CDN (SPEC 9.1)
// Downloaded by the browser only when the reader chooses it.
import "@fontsource/opendyslexic/400.css";
import "@fontsource/opendyslexic/700.css";
import "./globals.css";
import { t } from "@/lib/i18n";
import { BOOT_SCRIPT } from "@/lib/settings";

export const metadata: Metadata = {
  title: t("app.name"),
  description: t("app.description"),
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" data-theme="light" className="antialiased" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: BOOT_SCRIPT }} />
      </head>
      <body className="flex min-h-dvh flex-col">{children}</body>
    </html>
  );
}
