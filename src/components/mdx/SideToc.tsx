"use client";

import { useEffect, useMemo, useState } from "react";

import type { TocItem } from "@/lib/posts";

// 目录深度上限：与 PRD 保持一致（H1-H3）
const MAX_DEPTH = 3;

// 正文左侧目录：仅显示 H1-H3，当前章节高亮
// - 采用 IntersectionObserver，避免滚动监听导致性能下降
export const SideToc = ({ items }: { items: TocItem[] }) => {
  const filtered = useMemo(
    () => items.filter((item) => item.depth <= MAX_DEPTH),
    [items]
  );
  const [activeId, setActiveId] = useState(filtered[0]?.slug ?? "");
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    // 初始化：默认选中首个标题，保证目录有“当前状态”
    if (filtered.length === 0) return;
    setActiveId(filtered[0]?.slug ?? "");
    const elements = filtered
      .map((item) => document.getElementById(item.slug))
      .filter(Boolean) as HTMLElement[];
    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      {
        // rootMargin 下移观察窗口，使当前标题更符合阅读区域
        rootMargin: "0px 0px -70% 0px",
        threshold: [0, 1],
      }
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [filtered]);

  // 无目录时不渲染，避免占位
  if (filtered.length === 0) return null;

  return (
    <aside className={`side-toc${collapsed ? " is-collapsed" : ""}`}>
      <div className="side-toc-header">
        <button
          type="button"
          className="side-toc-toggle"
          onClick={() => setCollapsed((prev) => !prev)}
          aria-label={collapsed ? "Expand directory" : "Collapse directory"}
          title={collapsed ? "Expand directory" : "Collapse directory"}
        >
          {collapsed ? (
            <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path
                d="M3 4.5h10M3 8h10M3 11.5h10"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          ) : (
            <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path
                d="M7.5 4.5L4 8l3.5 3.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M13 4.5L9.5 8 13 11.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </button>
      </div>
      <ul className="side-toc-list">
        {filtered.map((item) => (
          <li key={item.slug} className="side-toc-item">
            <a
              href={`#${item.slug}`}
              className={`side-toc-link${activeId === item.slug ? " is-active" : ""}`}
              style={{ paddingLeft: `${Math.min(item.depth - 1, 2) * 12}px` }}
              onClick={() => setActiveId(item.slug)}
            >
              {item.value}
            </a>
          </li>
        ))}
      </ul>
    </aside>
  );
};
