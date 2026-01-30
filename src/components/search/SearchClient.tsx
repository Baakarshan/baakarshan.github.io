"use client";

import { useEffect, useMemo, useState } from "react";
import Fuse from "fuse.js";
import { useSearchParams } from "next/navigation";

import type { Locale } from "@/lib/posts";

type SearchItem = {
  title: string;
  description: string;
  slug: string;
  tags: string[];
  date: string;
  snippet: string;
};

// 转义正则特殊字符，避免高亮时异常
const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// 简易高亮：把查询词用 <mark> 包裹
const highlight = (text: string, query: string) => {
  if (!query) return text;
  const safe = escapeRegExp(query);
  const parts = text.split(new RegExp(`(${safe})`, "ig"));
  const lower = query.toLowerCase();

  return parts.map((part, index) =>
    part.toLowerCase() === lower ? (
      <mark
        key={`${part}-${index}`}
        className="rounded bg-[var(--color-item-hover)] px-1 text-[var(--color-fg-default)]"
      >
        {part}
      </mark>
    ) : (
      part
    )
  );
};

export const SearchClient = ({ locale }: { locale: Locale }) => {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<SearchItem[]>([]);
  const searchParams = useSearchParams();

  // 加载对应语言的搜索索引
  useEffect(() => {
    let cancelled = false;
    const localeKey = locale === "zh" ? "zh" : "en";
    const manifestUrl = `/search-index-${localeKey}-manifest.json`;
    const fallbackUrl = `/search-index-${localeKey}.json`;

    const loadFromUrl = async (url: string) => {
      const res = await fetch(url);
      if (!res.ok) throw new Error("search-index fetch failed");
      return res.json();
    };

    const loadIndex = async () => {
      try {
        const manifest = await loadFromUrl(manifestUrl);
        if (manifest?.type === "single" && manifest.file) {
          const data = await loadFromUrl(manifest.file);
          if (!cancelled) setItems(Array.isArray(data) ? data : []);
          return;
        }
        if (manifest?.type === "sharded" && Array.isArray(manifest.shards)) {
          const files = manifest.shards
            .map((shard: { file?: string }) => shard.file)
            .filter(Boolean);
          const chunks = await Promise.all(
            files.map((file: string) => loadFromUrl(file))
          );
          const merged = chunks.flat();
          if (!cancelled) setItems(merged);
          return;
        }
      } catch {
        // 忽略，回退到旧版单文件索引
      }

      try {
        const data = await loadFromUrl(fallbackUrl);
        if (!cancelled) setItems(Array.isArray(data) ? data : []);
      } catch {
        if (!cancelled) setItems([]);
      }
    };

    loadIndex();
    return () => {
      cancelled = true;
    };
  }, [locale]);

  // 读取 URL 查询参数，支持标签点击带入搜索词
  useEffect(() => {
    const q = searchParams.get("q") ?? "";
    if (q) setQuery(q);
  }, [searchParams]);

  // Fuse.js 初始化：标题权重最高
  const fuse = useMemo(
    () =>
      new Fuse(items, {
        includeScore: true,
        threshold: 0.35,
        keys: [
          { name: "title", weight: 0.5 },
          { name: "description", weight: 0.3 },
          { name: "snippet", weight: 0.2 },
        ],
      }),
    [items]
  );

  // 结果计算：无查询词时不显示任何结果
  const results = useMemo(() => {
    if (!query.trim()) return [];
    return fuse.search(query).map((result) => result.item);
  }, [fuse, query]);

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-[var(--color-border-default)] bg-[var(--color-canvas-subtle)] p-6">
        <div className="text-sm font-semibold text-[var(--color-fg-default)]">
          {locale === "zh" ? "全站搜索" : "Global Search"}
        </div>
        <p className="mt-2 text-xs text-[var(--color-fg-muted)]">
          {locale === "zh"
            ? "仅搜索当前语言的内容，实时过滤本地索引。"
            : "Search within the current language index in real time."}
        </p>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={locale === "zh" ? "输入关键词..." : "Type keywords..."}
          className="mt-4 w-full rounded-md border border-[var(--color-border-default)] bg-[var(--color-input-bg)] px-3 py-2 text-sm text-[var(--color-fg-default)] outline-none focus:border-[var(--color-accent-fg)] focus:ring-1 focus:ring-[var(--color-accent-fg)]"
        />
      </div>

      <div className="space-y-3">
        {query.trim() && results.length === 0 ? (
          <div className="rounded-md border border-dashed border-[var(--color-border-default)] bg-[var(--color-canvas-subtle)] p-6 text-sm text-[var(--color-fg-muted)]">
            {locale === "zh"
              ? "没有找到结果，尝试更短或更具体的关键词。"
              : "No results. Try shorter or more specific keywords."}
          </div>
        ) : null}

        {results.map((item) => (
          <a
            key={item.slug}
            href={item.slug}
            className="block rounded-md border border-[var(--color-border-default)] bg-[var(--color-canvas-subtle)] p-4 hover:bg-[var(--color-item-hover)]"
          >
            <div className="text-sm font-semibold text-[var(--color-fg-default)]">
              {highlight(item.title, query)}
            </div>
            <p className="mt-1 text-xs text-[var(--color-fg-muted)]">
              {highlight(item.description ?? "", query)}
            </p>
            <p className="mt-2 text-xs text-[var(--color-fg-muted)]">
              {highlight(item.snippet ?? "", query)}
            </p>
          </a>
        ))}
      </div>
    </div>
  );
};
