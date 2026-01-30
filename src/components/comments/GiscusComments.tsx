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
        mapping={siteConfig.giscus.mapping as any}
        reactionsEnabled="1"
        emitMetadata="0"
        inputPosition="top"
        theme={resolvedTheme === "dark" ? "dark_dimmed" : "light"}
        lang={locale === "zh" ? "zh-CN" : "en"}
        loading="lazy"
      />
    </div>
  );
};
