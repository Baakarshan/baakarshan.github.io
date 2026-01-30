"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

// 根据路径同步 html lang（用于多语言 SEO）
export const LanguageSync = () => {
  const pathname = usePathname() ?? "/";

  useEffect(() => {
    const lang = pathname.startsWith("/zh") ? "zh" : "en";
    document.documentElement.lang = lang;
  }, [pathname]);

  return null;
};
