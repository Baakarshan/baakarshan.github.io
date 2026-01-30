import Link from "next/link";

import type { Locale } from "@/lib/posts";

// 面包屑：根据 slug 段拼接路径
const formatSegment = (segment: string, locale: Locale) => {
  const decoded = decodeURIComponent(segment);
  if (locale === "zh") return decoded;
  return decoded
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

export const Breadcrumbs = ({
  locale,
  segments,
}: {
  locale: Locale;
  segments: string[];
}) => {
  const base = locale === "zh" ? "/zh" : "";
  const homeLabel = locale === "zh" ? "首页" : "Home";

  return (
    <nav className="text-xs text-[var(--color-fg-muted)]" aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-2">
        <li>
          <Link href={base || "/"} className="hover:text-[var(--color-fg-default)]">
            {homeLabel}
          </Link>
        </li>
        {segments.map((segment, index) => {
          const href = `${base}/${segments.slice(0, index + 1).join("/")}`;
          return (
            <li key={`${segment}-${index}`} className="flex items-center gap-2">
              <span>/</span>
              <Link
                href={href}
                className="hover:text-[var(--color-fg-default)]"
              >
                {/* 英文把 - 转为单词空格展示，中文保持原样 */}
                {formatSegment(segment, locale)}
              </Link>
            </li>
          );
        })}
      </ol>
    </nav>
  );
};
