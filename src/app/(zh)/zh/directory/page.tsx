import type { Metadata } from "next";

import { GiscusComments } from "@/components/comments/GiscusComments";
import { DirectoryTree } from "@/components/layout/DirectoryTree";
import { getContentTree } from "@/lib/posts";
import { siteConfig } from "@/lib/site";

// 中文目录页 SEO 元信息
export const metadata: Metadata = {
  title: "目录",
  description: "完整知识目录。",
  alternates: {
    canonical: `${siteConfig.siteUrl}/zh/directory/`,
    languages: {
      en: `${siteConfig.siteUrl}/directory/`,
      zh: `${siteConfig.siteUrl}/zh/directory/`,
    },
  },
};

export default function ZhDirectoryPage() {
  // 与侧边栏一致的目录树
  const tree = getContentTree("zh");

  return (
    <div className="mx-auto max-w-[820px] space-y-6">
      <header>
        <h1 className="text-lg font-semibold text-[var(--color-fg-default)]">
          目录
        </h1>
        <p className="mt-2 text-sm text-[var(--color-fg-muted)]">
          与侧边栏一致的完整目录结构。
        </p>
      </header>

      <DirectoryTree nodes={tree} locale="zh" />

      <GiscusComments locale="zh" />
    </div>
  );
}
