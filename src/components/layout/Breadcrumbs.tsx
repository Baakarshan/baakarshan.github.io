import Link from "next/link";

import type { Locale } from "@/lib/posts";

// 面包屑：优先显示传入的 labels，缺失时回退到解码后的 slug
const fallbackLabel = (segment: string) => decodeURIComponent(segment);

// 统一添加尾斜杠（静态导出避免 404）
const withTrailingSlash = (value: string) =>
  value === "/" ? "/" : value.endsWith("/") ? value : `${value}/`;

export const Breadcrumbs = ({
  locale,
  segments,
  labels,
}: {
  locale: Locale;
  segments: string[];
  labels?: string[];
}) => {
  // 语言前缀：中文站点统一带 /zh
  const base = locale === "zh" ? "/zh" : "";
  // 首页文案与链接保持与语言一致
  const homeLabel = locale === "zh" ? "首页" : "Home";
  const homeHref = base ? `${base}/` : "/";

  return (
    <nav className="meta" aria-label="Breadcrumb">
      <ol className="breadcrumbs">
        <li>
          <Link href={homeHref}>{homeLabel}</Link>
        </li>
        {segments.map((segment, index) => {
          // 逐段拼接路径，确保每一层级都可点击回退
          const href = withTrailingSlash(
            `${base}/${segments.slice(0, index + 1).join("/")}`
          );
          // 优先使用目录树/文章提供的显示名，缺失时回退到 slug
          const label = labels?.[index] ?? fallbackLabel(segment);
          return (
            <li key={`${segment}-${index}`}>
              <span>/</span>
              <Link href={href}>{label}</Link>
            </li>
          );
        })}
      </ol>
    </nav>
  );
};
