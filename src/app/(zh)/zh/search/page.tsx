import type { Metadata } from "next";
import { Suspense } from "react";

import { SearchClient } from "@/components/search/SearchClient";
import { siteConfig } from "@/lib/site";

// 中文搜索页 SEO 元信息
export const metadata: Metadata = {
  title: "搜索",
  description: "搜索知识库。",
  alternates: {
    canonical: `${siteConfig.siteUrl}/zh/search/`,
    languages: {
      en: `${siteConfig.siteUrl}/search/`,
      zh: `${siteConfig.siteUrl}/zh/search/`,
    },
  },
};

export default function ZhSearchPage() {
  return (
    <div className="mx-auto max-w-[820px] space-y-6">
      <header>
        <h1 className="text-lg font-semibold text-[var(--color-fg-default)]">
          搜索
        </h1>
        <p className="mt-2 text-sm text-[var(--color-fg-muted)]">
          按标题、描述或正文摘要查找笔记。
        </p>
      </header>

      <Suspense
        // 搜索索引读取为客户端逻辑，使用 Suspense 兜底
        fallback={
          <div className="rounded-md border border-[var(--color-border-default)] bg-[var(--color-canvas-subtle)] p-4 text-xs text-[var(--color-fg-muted)]">
            正在加载搜索...
          </div>
        }
      >
        <SearchClient locale="zh" />
      </Suspense>
    </div>
  );
}
