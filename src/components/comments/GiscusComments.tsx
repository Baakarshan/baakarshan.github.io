"use client";

import Giscus from "@giscus/react";

import { useTheme } from "@/components/theme/ThemeProvider";
import { siteConfig } from "@/lib/site";
import type { Locale } from "@/lib/posts";

// Giscus 评论区封装：主题与语言随站点切换
export const GiscusComments = ({ locale }: { locale: Locale }) => {
  const { resolvedTheme } = useTheme();

  return (
    <div className="mt-10">
      <Giscus
        repo={siteConfig.giscus.repo as `${string}/${string}`}
        repoId={siteConfig.giscus.repoId}
        category={siteConfig.giscus.category}
        categoryId={siteConfig.giscus.categoryId}
        // mapping 使用 pathname，保证每个页面独立讨论区
        mapping={siteConfig.giscus.mapping as any}
        // 关闭点赞元数据，避免额外噪音
        reactionsEnabled="1"
        emitMetadata="0"
        inputPosition="top"
        // 主题与站点保持一致（dark_dimmed 对齐 Copilot Dark）
        theme={resolvedTheme === "dark" ? "dark_dimmed" : "light"}
        // 语言：中文站为 zh-CN，英文站为 en
        lang={locale === "zh" ? "zh-CN" : "en"}
        loading="lazy"
      />
    </div>
  );
};
