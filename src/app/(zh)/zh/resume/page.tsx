import type { Metadata } from "next";

import { GiscusComments } from "@/components/comments/GiscusComments";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "简历",
  description: "个人简历。",
  alternates: {
    canonical: `${siteConfig.siteUrl}/zh/resume/`,
    languages: {
      en: `${siteConfig.siteUrl}/resume/`,
      zh: `${siteConfig.siteUrl}/zh/resume/`,
    },
  },
};

export default function ZhResumePage() {
  return (
    <div className="mx-auto max-w-[820px] space-y-8">
      <header>
        <h1 className="text-lg font-semibold text-[var(--color-fg-default)]">
          简历
        </h1>
        <p className="mt-2 text-sm text-[var(--color-fg-muted)]">
          面向技术协作的简洁版概览。
        </p>
      </header>

      <section className="grid grid-cols-12 gap-6">
        <div className="col-span-5 rounded-md border border-[var(--color-border-default)] bg-[var(--color-canvas-subtle)] p-4">
          <h2 className="text-sm font-semibold text-[var(--color-fg-default)]">
            个人摘要
          </h2>
          <p className="mt-2 text-xs leading-5 text-[var(--color-fg-muted)]">
            专注知识系统、工程效率与产品设计的开发者。
          </p>
          <div className="mt-4 text-xs text-[var(--color-fg-muted)]">
            <div>地点：Remote</div>
            <div>邮箱：hello@baakarshan.dev</div>
            <div>GitHub：baakarshan</div>
          </div>
        </div>

        <div className="col-span-7 rounded-md border border-[var(--color-border-default)] bg-[var(--color-canvas-subtle)] p-4">
          <h2 className="text-sm font-semibold text-[var(--color-fg-default)]">
            技能
          </h2>
          <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-[var(--color-fg-muted)]">
            <div>系统设计</div>
            <div>设计系统</div>
            <div>Next.js / React</div>
            <div>TypeScript</div>
            <div>搜索索引</div>
            <div>MDX 管线</div>
            <div>性能优化</div>
            <div>内容运营</div>
          </div>
        </div>
      </section>

      <section className="rounded-md border border-[var(--color-border-default)] bg-[var(--color-canvas-subtle)] p-4">
        <h2 className="text-sm font-semibold text-[var(--color-fg-default)]">
          经验
        </h2>
        <div className="mt-3 space-y-4 text-xs text-[var(--color-fg-muted)]">
          <div>
            <div className="text-[var(--color-fg-default)]">Staff Engineer</div>
            <div>知识工具、AI 工作流与内容系统。</div>
          </div>
          <div>
            <div className="text-[var(--color-fg-default)]">Product Engineer</div>
            <div>开发者平台、设计系统与数据分析。</div>
          </div>
        </div>
      </section>

      <section className="rounded-md border border-[var(--color-border-default)] bg-[var(--color-canvas-subtle)] p-4">
        <h2 className="text-sm font-semibold text-[var(--color-fg-default)]">
          教育
        </h2>
        <p className="mt-2 text-xs text-[var(--color-fg-muted)]">
          计算机科学学士
        </p>
      </section>

      <GiscusComments locale="zh" />
    </div>
  );
}
