"use client";

import { useState } from "react";

import type { TocItem } from "@/lib/posts";

// 文内目录卡片：支持折叠/展开
export const TocCard = ({ items }: { items: TocItem[] }) => {
  const [open, setOpen] = useState(true);

  // 无目录时不渲染，避免占位
  if (items.length === 0) return null;

  return (
    <section className="my-6 rounded-md border border-[var(--color-border-default)] bg-[var(--color-canvas-subtle)]">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-4 py-2 text-sm font-semibold text-[var(--color-fg-default)]"
      >
        <span>目录</span>
        <span className="text-xs text-[var(--color-fg-muted)]">
          {open ? "收起" : "展开"}
        </span>
      </button>
      {open ? (
        <div className="border-t border-[var(--color-border-default)] px-4 py-3">
          <ul className="space-y-2 text-xs text-[var(--color-fg-muted)]">
            {items.map((item) => (
              <li
                key={item.slug}
                style={{ paddingLeft: `${Math.min(item.depth - 1, 2) * 12}px` }}
              >
                {/* 深度限制在 3 层，避免目录过长影响阅读 */}
                <a
                  href={`#${item.slug}`}
                  className="hover:text-[var(--color-fg-default)]"
                >
                  {item.value}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
};
