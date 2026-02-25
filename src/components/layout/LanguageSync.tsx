"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

// 根据路径同步 html lang（用于多语言 SEO）
// - /zh 开头视为中文
// - 其余路径视为英文
export const LanguageSync = () => {
  const pathname = usePathname() ?? "/";

  useEffect(() => {
    const lang = pathname.startsWith("/zh") ? "zh" : "en";
    // 直接修改 html.lang，确保爬虫/无 JS 时也保持正确语义
    document.documentElement.lang = lang;
  }, [pathname]);

  return null;
};
