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

// 获取系统主题偏好
const getSystemTheme = (): ResolvedTheme =>
  window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";

// 应用主题到 html 根节点
const applyTheme = (theme: ResolvedTheme) => {
  const root = document.documentElement;
  root.classList.remove("theme-dark", "theme-light");
  root.classList.add(theme === "dark" ? "theme-dark" : "theme-light");
  root.dataset.theme = theme;
};

// 主题 Provider：支持 system/手动切换，并持久化到 localStorage
export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [mode, setMode] = useState<ThemeMode>("system");
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>("dark");

  // 初始化：读取本地存储，应用初始主题
  useEffect(() => {
    const stored = localStorage.getItem(THEME_KEY);
    const initialMode: ThemeMode =
      stored === "light" || stored === "dark" ? stored : "system";
    const system = getSystemTheme();
    const initialResolved = initialMode === "system" ? system : initialMode;

    setMode(initialMode);
    setResolvedTheme(initialResolved);
    applyTheme(initialResolved);
  }, []);

  // 主题变化：写入本地或跟随系统
  useEffect(() => {
    if (mode !== "system") {
      localStorage.setItem(THEME_KEY, mode);
      setResolvedTheme(mode);
      applyTheme(mode);
      return;
    }

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
