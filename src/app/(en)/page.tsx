import type { Metadata } from "next";
import Link from "next/link";

import { GiscusComments } from "@/components/comments/GiscusComments";
import { RecentPosts } from "@/components/recent-history/RecentPosts";
import { getAllPosts } from "@/lib/posts";
import { siteConfig } from "@/lib/site";

// 首页 SEO 元信息
export const metadata: Metadata = {
  title: "Home",
  description: siteConfig.description,
  alternates: {
    canonical: `${siteConfig.siteUrl}/`,
    languages: {
      en: `${siteConfig.siteUrl}/`,
      zh: `${siteConfig.siteUrl}/zh/`,
    },
  },
};

export default function Home() {
  // 取最近 5 篇文章用于首页展示
  const posts = getAllPosts("en").slice(0, 5);
  // 最新一篇用于 Quick Actions
  const latest = posts[0];

  return (
    <div className="mx-auto max-w-[820px] space-y-8">
      <section className="rounded-lg border border-[var(--color-border-default)] bg-[var(--color-canvas-subtle)] p-5">
        {/* About Me：模拟 System Prompt 风格 */}
        <div className="text-xs text-[var(--color-fg-muted)]">&gt; System: About Me</div>
        <p className="mt-3 text-sm leading-6 text-[var(--color-fg-default)]">
          I build developer tooling, document systems, and knowledge workflows.
          This space is my Copilot-style knowledge base—quiet, dense, and built
          for deep reading.
        </p>
      </section>

      <section className="rounded-lg border border-[var(--color-border-default)] bg-[var(--color-canvas-subtle)] p-5">
        {/* Quick Actions：模拟 Copilot 建议指令 */}
        <div className="text-xs text-[var(--color-fg-muted)]">&gt; Quick Actions</div>
        <div className="mt-4 flex flex-wrap gap-3 text-xs">
          <Link
            href="/directory/"
            className="rounded-full border border-[var(--color-border-default)] bg-[var(--color-canvas-default)] px-3.5 py-1.5 text-[var(--color-fg-default)] hover:bg-[var(--color-item-hover)]"
          >
            &gt; Browse knowledge tree
          </Link>
          <Link
            href="/search/"
            className="rounded-full border border-[var(--color-border-default)] bg-[var(--color-canvas-default)] px-3.5 py-1.5 text-[var(--color-fg-default)] hover:bg-[var(--color-item-hover)]"
          >
            &gt; Search recent ideas
          </Link>
          {latest ? (
            <Link
              href={`/${latest.slug.join("/")}/`}
              className="rounded-full border border-[var(--color-border-default)] bg-[var(--color-canvas-default)] px-3.5 py-1.5 text-[var(--color-fg-default)] hover:bg-[var(--color-item-hover)]"
            >
              &gt; View latest post
            </Link>
          ) : null}
        </div>
      </section>

      <section className="space-y-4">
        <div className="text-sm font-semibold text-[var(--color-fg-default)]">
          Recent Posts
        </div>
        <RecentPosts posts={posts} locale="en" />
      </section>

      {/* 首页独立评论区 */}
      <GiscusComments locale="en" />
    </div>
  );
}
