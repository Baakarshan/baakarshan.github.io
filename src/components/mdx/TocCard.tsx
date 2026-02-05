"use client";

import { useEffect, useState } from "react";

import type { TocItem } from "@/lib/posts";

// 文内目录卡片：支持折叠/展开
export const TocCard = ({ items }: { items: TocItem[] }) => {
  const TOC_ENABLED_KEY = "toc-enabled";
  const TOC_EVENT_NAME = "toc-enabled-change";
  const [enabled, setEnabled] = useState(false);
  const [open, setOpen] = useState(true);

  useEffect(() => {
    const readEnabled = () => {
      try {
        return localStorage.getItem(TOC_ENABLED_KEY) === "true";
      } catch {
        return false;
      }
    };
    setEnabled(readEnabled());

    const handleCustom = () => {
      setEnabled(readEnabled());
    };
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== TOC_ENABLED_KEY) return;
      setEnabled(event.newValue === "true");
    };

    window.addEventListener(TOC_EVENT_NAME, handleCustom as EventListener);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener(TOC_EVENT_NAME, handleCustom as EventListener);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  // 无目录时不渲染，避免占位
  if (items.length === 0) return null;

  if (!enabled) return null;

  return (
    <section className="toc">
      <div className="toc-header">
        <span>目录</span>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="toc-toggle"
          aria-label={open ? "收起目录" : "展开目录"}
          title={open ? "收起目录" : "展开目录"}
        >
          {open ? (
            <svg aria-hidden="true" viewBox="0 0 16 16" fill="none">
              <path
                d="M4 10l4-4 4 4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : (
            <svg aria-hidden="true" viewBox="0 0 16 16" fill="none">
              <path
                d="M4 6l4 4 4-4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </button>
      </div>
      {open ? (
        <div className="toc-body">
          <ul>
            {items.map((item) => (
              <li
                key={item.slug}
                style={{ paddingLeft: `${Math.min(item.depth - 1, 2) * 12}px` }}
              >
                {/* 深度限制在 3 层，避免目录过长影响阅读 */}
                <a
                  href={`#${item.slug}`}
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
