import type { Metadata } from "next";
import Link from "next/link";

import { GiscusComments } from "@/components/comments/GiscusComments";
import { RecentPosts } from "@/components/recent-history/RecentPosts";
import { getAllPosts } from "@/lib/posts";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "首页",
  description: siteConfig.description,
  alternates: {
    canonical: `${siteConfig.siteUrl}/zh/`,
    languages: {
      en: `${siteConfig.siteUrl}/`,
      zh: `${siteConfig.siteUrl}/zh/`,
    },
  },
};

export default function ZhHome() {
  const posts = getAllPosts("zh").slice(0, 5);
  const latest = posts[0];

  return (
    <div className="mx-auto max-w-[820px] space-y-10">
      <section className="rounded-lg border border-[var(--color-border-default)] bg-[var(--color-canvas-subtle)] p-6">
        <div className="text-xs text-[var(--color-fg-muted)]">&gt; System: 关于我</div>
        <p className="mt-3 text-sm leading-6 text-[var(--color-fg-default)]">
          这里是我的 Copilot 风格知识库，用于沉淀工程实践、系统设计与阅读笔记。
        </p>
      </section>

      <section className="rounded-lg border border-[var(--color-border-default)] bg-[var(--color-canvas-subtle)] p-6">
        <div className="text-xs text-[var(--color-fg-muted)]">&gt; 快捷入口</div>
        <div className="mt-4 flex flex-wrap gap-3 text-xs">
          <Link
            href="/zh/directory"
            className="rounded-full border border-[var(--color-border-default)] bg-[var(--color-canvas-default)] px-4 py-2 text-[var(--color-fg-default)] hover:bg-[var(--color-item-hover)]"
          >
            &gt; 浏览目录
          </Link>
          <Link
            href="/zh/search"
            className="rounded-full border border-[var(--color-border-default)] bg-[var(--color-canvas-default)] px-4 py-2 text-[var(--color-fg-default)] hover:bg-[var(--color-item-hover)]"
          >
            &gt; 搜索笔记
          </Link>
          {latest ? (
            <Link
              href={`/zh/${latest.slug.join("/")}`}
              className="rounded-full border border-[var(--color-border-default)] bg-[var(--color-canvas-default)] px-4 py-2 text-[var(--color-fg-default)] hover:bg-[var(--color-item-hover)]"
            >
              &gt; 最新文章
            </Link>
          ) : null}
        </div>
      </section>

      <section className="space-y-4">
        <div className="text-sm font-semibold text-[var(--color-fg-default)]">
          最近更新
        </div>
        <RecentPosts posts={posts} locale="zh" />
      </section>

      <GiscusComments locale="zh" />
    </div>
  );
}
