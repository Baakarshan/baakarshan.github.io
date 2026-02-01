"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "./ThemeProvider";

// 主题切换按钮：在 light/dark 之间切换（不切换 system）
export const ThemeToggle = () => {
  const { resolvedTheme, toggle } = useTheme();
  const [mounted, setMounted] = useState(false);

  // 避免 SSR 与客户端主题不一致导致水合报错：仅在挂载后渲染按钮内容
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <button
        type="button"
        aria-label="主题切换"
        title="主题切换"
        className="inline-flex items-center gap-2 rounded-md border border-[var(--color-border-default)] bg-[var(--color-canvas-subtle)] px-3 py-1.5 text-xs text-[var(--color-fg-default)]"
      >
        <span>主题切换</span>
      </button>
    );
  }

  const label = resolvedTheme === "dark" ? "切换到亮色" : "切换到暗色";

  return (
    <button
      type="button"
      onClick={toggle}
      className="inline-flex items-center gap-2 rounded-md border border-[var(--color-border-default)] bg-[var(--color-canvas-subtle)] px-3 py-1.5 text-xs text-[var(--color-fg-default)] hover:bg-[var(--color-item-hover)]"
      aria-label={label}
      title={label}
    >
      {resolvedTheme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
      <span>{label}</span>
    </button>
  );
};
