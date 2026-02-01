import type { Metadata } from "next";

import { GiscusComments } from "@/components/comments/GiscusComments";
import { DirectoryTree } from "@/components/layout/DirectoryTree";
import { getContentTree } from "@/lib/posts";
import { siteConfig } from "@/lib/site";

// 目录页 SEO 元信息
export const metadata: Metadata = {
  title: "Directory",
  description: "Full content directory.",
  alternates: {
    canonical: `${siteConfig.siteUrl}/directory/`,
    languages: {
      en: `${siteConfig.siteUrl}/directory/`,
      zh: `${siteConfig.siteUrl}/zh/directory/`,
    },
  },
};

export default function DirectoryPage() {
  // 与侧边栏一致的目录树
  const tree = getContentTree("en");

  return (
    <div className="mx-auto max-w-[820px] space-y-6">
      <header>
        <h1 className="text-lg font-semibold text-[var(--color-fg-default)]">
          Directory
        </h1>
        <p className="mt-2 text-sm text-[var(--color-fg-muted)]">
          Full knowledge tree, aligned with the sidebar ordering.
        </p>
      </header>

      <DirectoryTree nodes={tree} locale="en" />

      <GiscusComments locale="en" />
    </div>
  );
}
