import Link from "next/link";
import { format } from "date-fns";

import type { Locale, PostMeta } from "@/lib/posts";
import { parseYmdToLocalDate } from "@/lib/date";

// 根据语言返回基础路由前缀（中文站点使用 /zh）
const toBasePath = (locale: Locale) => (locale === "zh" ? "/zh" : "");

// 统一添加尾斜杠，避免静态导出下的路径歧义
const withTrailingSlash = (value: string) =>
  value === "/" ? "/" : value.endsWith("/") ? value : `${value}/`;

// 首页最近文章列表
export const RecentPosts = ({
  posts,
  locale,
}: {
  posts: PostMeta[];
  locale: Locale;
}) => {
  const base = toBasePath(locale);

  return (
    <div className="space-y-3">
      {posts.map((post) => (
        <Link
          key={post.slug.join("/")}
          href={withTrailingSlash(`${base}/${post.slug.join("/")}`)}
          className="block rounded-md border border-[var(--color-border-default)] bg-[var(--color-canvas-subtle)] px-3.5 py-2.5 text-sm text-[var(--color-fg-default)] hover:bg-[var(--color-item-hover)]"
        >
          <div className="flex items-center justify-between gap-4">
            <span>{post.title}</span>
            <span className="text-xs text-[var(--color-fg-muted)]">
              {/* 用本地日期构造，避免时区导致日期回退 */}
              {format(parseYmdToLocalDate(post.date), "MMM dd, yyyy")}
            </span>
          </div>
          <p className="mt-1 text-xs text-[var(--color-fg-muted)]">
            {post.description}
          </p>
        </Link>
      ))}
    </div>
  );
};
