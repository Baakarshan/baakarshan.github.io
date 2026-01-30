import type { Metadata } from "next";

import "../globals.css";
import "katex/dist/katex.min.css";

import { Analytics } from "@/components/layout/Analytics";
import { LanguageSync } from "@/components/layout/LanguageSync";
import { Sidebar } from "@/components/layout/Sidebar";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { getContentTree } from "@/lib/posts";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: {
    default: siteConfig.name,
    template: `%s · ${siteConfig.name}`,
  },
  description: siteConfig.description,
  metadataBase: new URL(siteConfig.siteUrl),
  openGraph: {
    title: siteConfig.name,
    description: siteConfig.description,
    images: ["/og-default.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const treeEn = getContentTree("en");
  const treeZh = getContentTree("zh");

  return (
    <html lang="en">
      <body className="min-h-screen bg-[var(--color-canvas-default)] text-[var(--color-fg-default)] antialiased">
        <ThemeProvider>
          <LanguageSync />
          <div className="app-shell">
            <Sidebar trees={{ en: treeEn, zh: treeZh }} />
            <main className="app-main">{children}</main>
          </div>
          <Analytics />
        </ThemeProvider>
      </body>
    </html>
  );
}
