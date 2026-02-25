import { LanguageAwareNotFound } from "@/components/layout/LanguageAwareNotFound";

// 英文 404 页面：AI Hallucination 主题
export default function NotFound() {
  return (
    <LanguageAwareNotFound
      defaultLang="en"
      homeHref="/"
      title="404 — Page Not Found"
      description="The model guessed a path that does not exist. Let&apos;s head back."
      actionLabel="Return Home"
    />
  );
}
