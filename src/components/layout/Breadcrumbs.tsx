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
  const base = locale === "zh" ? "/zh" : "";
  const homeLabel = locale === "zh" ? "首页" : "Home";
  const homeHref = base ? `${base}/` : "/";

  return (
    <nav className="text-xs text-[var(--color-fg-muted)]" aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-2">
        <li>
          <Link href={homeHref} className="hover:text-[var(--color-fg-default)]">
            {homeLabel}
          </Link>
        </li>
        {segments.map((segment, index) => {
          const href = withTrailingSlash(
            `${base}/${segments.slice(0, index + 1).join("/")}`
          );
          const label = labels?.[index] ?? fallbackLabel(segment);
          return (
            <li key={`${segment}-${index}`} className="flex items-center gap-2">
              <span>/</span>
              <Link
                href={href}
                className="hover:text-[var(--color-fg-default)]"
              >
                {label}
              </Link>
            </li>
          );
        })}
      </ol>
    </nav>
  );
};
