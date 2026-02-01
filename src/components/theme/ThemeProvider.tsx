"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

type ThemeMode = "system" | "light" | "dark";
type ResolvedTheme = "light" | "dark";

type ThemeContextValue = {
  mode: ThemeMode;
  resolvedTheme: ResolvedTheme;
  setMode: (mode: ThemeMode) => void;
  toggle: () => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);
const THEME_KEY = "theme-preference";

// 获取系统主题偏好（在非浏览器环境下回退为 dark）
const getSystemTheme = (): ResolvedTheme => {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
};

// 安全读取本地存储的主题模式，失败则回退 system
const readStoredMode = (): ThemeMode => {
  if (typeof window === "undefined") return "system";
  try {
    const stored = localStorage.getItem(THEME_KEY);
    return stored === "light" || stored === "dark" ? stored : "system";
  } catch {
    return "system";
  }
};

// 应用主题到 html 根节点
const applyTheme = (theme: ResolvedTheme) => {
  const root = document.documentElement;
  root.classList.remove("theme-dark", "theme-light");
  root.classList.add(theme === "dark" ? "theme-dark" : "theme-light");
  root.dataset.theme = theme;
};

// 主题 Provider：支持 system/手动切换，并持久化到 localStorage
export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  // 初始状态尽量与首屏脚本一致，减少主题闪烁与水合差异
  const [mode, setMode] = useState<ThemeMode>(() => readStoredMode());
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() => {
    const initialMode = readStoredMode();
    return initialMode === "system" ? getSystemTheme() : initialMode;
  });

  // 主题变化：写入本地或跟随系统
  useEffect(() => {
    if (mode !== "system") {
      // 手动模式：持久化并直接应用
      localStorage.setItem(THEME_KEY, mode);
      setResolvedTheme(mode);
      applyTheme(mode);
      return;
    }

    // system 模式：移除本地偏好并监听系统主题变化
    localStorage.removeItem(THEME_KEY);
    const update = () => {
      const system = getSystemTheme();
      setResolvedTheme(system);
      applyTheme(system);
    };

    update();
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [mode]);

  // 一键切换：在 light/dark 之间切换（忽略 system）
  const toggle = () => {
    setMode(resolvedTheme === "dark" ? "light" : "dark");
  };

  const value = useMemo(
    () => ({ mode, resolvedTheme, setMode, toggle }),
    [mode, resolvedTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
};
