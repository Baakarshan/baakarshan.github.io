import Link from "next/link";

import { LanguageAwareNotFound } from "@/components/layout/LanguageAwareNotFound";

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
