"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

// 根据路径同步 html lang（用于多语言 SEO）
// - /en 开头视为英文
// - 其余路径视为中文
export const LanguageSync = () => {
  const pathname = usePathname() ?? "/";

  useEffect(() => {
    const lang = /^\/en(\/|$)/.test(pathname) ? "en" : "zh";
    // 直接修改 html.lang，确保爬虫/无 JS 时也保持正确语义
    document.documentElement.lang = lang;
  }, [pathname]);

  return null;
};
