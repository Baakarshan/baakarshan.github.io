"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { useTheme } from "@/components/theme/ThemeProvider";
import { renderMermaidSvg } from "./mermaid-runtime";
import { MediaLightbox } from "./MediaLightbox";

// Mermaid 渲染组件：根据主题切换 dark/light
export const MermaidBlock = ({ code }: { code: string }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { resolvedTheme } = useTheme();
  const [svgMarkup, setSvgMarkup] = useState("");
  const [open, setOpen] = useState(false);
  // 为每个渲染实例生成唯一 id，避免图表相互覆盖
  const id = useMemo(
    () => `mermaid-${Math.random().toString(36).slice(2)}`,
    []
  );

  useEffect(() => {
    if (!containerRef.current) return;
    let cancelled = false;
    const theme = resolvedTheme === "dark" ? "dark" : "light";

    const render = async () => {
      try {
        const { svg } = await renderMermaidSvg({ id, code, theme });
        if (!containerRef.current || cancelled) return;
        containerRef.current.innerHTML = svg;
        setSvgMarkup(svg);
      } catch (err) {
        console.error("[Mermaid] 渲染失败", err);
        if (containerRef.current && !cancelled) {
          containerRef.current.innerHTML =
            '<div class="text-xs text-[var(--color-fg-muted)]">Mermaid 渲染失败</div>';
        }
      }
    };

    render();
    return () => {
      cancelled = true;
    };
  }, [code, id, resolvedTheme]);

  return (
    <>
      <div
        className="mermaid-block"
        onClick={() => {
          if (svgMarkup) setOpen(true);
        }}
      >
        <div ref={containerRef} />
      </div>
      <MediaLightbox
        open={open}
        onClose={() => setOpen(false)}
        type="svg"
        svg={svgMarkup}
        filename="mermaid"
      />
    </>
  );
};
