import { LanguageAwareNotFound } from "@/components/layout/LanguageAwareNotFound";

// 根级 404：用于静态导出生成 404.html（确保自定义 404 生效）
// - 依赖 LanguageAwareNotFound 根据路径自动切换中英文文案与返回链接
// - 仅在 pathname 缺失时回退英文
export default function NotFound() {
  return <LanguageAwareNotFound defaultLang="en" />;
}
