import type { Metadata } from "next";

import "./globals.css";
import "katex/dist/katex.min.css";

import { Analytics } from "@/components/layout/Analytics";
import { LanguageSync } from "@/components/layout/LanguageSync";
import { ThemeInitScript } from "@/components/theme/ThemeInitScript";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { siteConfig } from "@/lib/site";

// 根布局：唯一允许渲染 html/body 的位置（解决嵌套 html/body 报错）
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
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-[var(--color-canvas-default)] text-[var(--color-fg-default)] antialiased">
        {/* 首屏主题初始化，避免深浅色闪烁 */}
        <ThemeInitScript />
        <ThemeProvider>
          {/* 客户端根据路径同步 html lang */}
          <LanguageSync />
          {children}
          <Analytics />
        </ThemeProvider>
      </body>
    </html>
  );
}
