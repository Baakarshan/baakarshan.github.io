"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "./ThemeProvider";

export const ThemeToggle = () => {
  const { resolvedTheme, toggle } = useTheme();
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
