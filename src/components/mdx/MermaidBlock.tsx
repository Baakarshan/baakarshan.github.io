"use client";

import { useEffect, useMemo, useRef } from "react";
import mermaid from "mermaid";

import { useTheme } from "@/components/theme/ThemeProvider";

// Mermaid 渲染组件：根据主题切换 dark/light
export const MermaidBlock = ({ code }: { code: string }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { resolvedTheme } = useTheme();
  const id = useMemo(
    () => `mermaid-${Math.random().toString(36).slice(2)}`,
    []
  );

  useEffect(() => {
    if (!containerRef.current) return;

    // 每次渲染都显式初始化，确保主题切换后正确应用
    mermaid.initialize({
      startOnLoad: false,
      theme: resolvedTheme === "dark" ? "dark" : "default",
    });

    mermaid
      .render(id, code)
      .then(({ svg }) => {
        if (containerRef.current) {
          containerRef.current.innerHTML = svg;
        }
      })
      .catch(() => {
        if (containerRef.current) {
          containerRef.current.innerHTML =
            '<div class="text-xs text-[var(--color-fg-muted)]">Mermaid 渲染失败</div>';
        }
      });
  }, [code, id, resolvedTheme]);

  return (
    <div className="my-4 rounded-md border border-[var(--color-border-default)] bg-[var(--color-canvas-subtle)] p-3">
      <div ref={containerRef} />
    </div>
  );
};
