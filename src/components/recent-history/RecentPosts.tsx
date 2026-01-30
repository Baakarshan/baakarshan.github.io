import Link from "next/link";
import { format } from "date-fns";

import type { Locale, PostMeta } from "@/lib/posts";

const toBasePath = (locale: Locale) => (locale === "zh" ? "/zh" : "");

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
          href={`${base}/${post.slug.join("/")}`}
          className="block rounded-md border border-[var(--color-border-default)] bg-[var(--color-canvas-subtle)] px-4 py-3 text-sm text-[var(--color-fg-default)] hover:bg-[var(--color-item-hover)]"
        >
          <div className="flex items-center justify-between gap-4">
            <span>{post.title}</span>
            <span className="text-xs text-[var(--color-fg-muted)]">
              {format(new Date(post.date), "MMM dd, yyyy")}
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
