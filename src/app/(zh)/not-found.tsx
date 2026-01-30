import Link from "next/link";

import { LanguageAwareNotFound } from "@/components/layout/LanguageAwareNotFound";

// 中文站 404：根据路径判断语言，确保静态 404 也能正确显示
export default function NotFound() {
  return (
    <LanguageAwareNotFound
      defaultLang="zh"
      homeHref="/zh/"
      title="404 — 页面不存在"
      description="模型猜测了一个不存在的路径，让我们返回首页。"
      actionLabel="返回首页"
    />
  );
}
