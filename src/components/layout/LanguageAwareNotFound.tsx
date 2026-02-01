"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// 根据路径判断语言（用于 404 自适应）
const getLangFromPath = (pathname: string) =>
  pathname.startsWith("/zh") ? "zh" : "en";

type NotFoundCopy = {
  title: string;
  description: string;
  actionLabel: string;
  homeHref: string;
};

type LanguageAwareNotFoundProps = {
  defaultLang: "en" | "zh";
  // 允许调用方按需覆盖文案；未传入时使用默认文案
  title?: string;
  description?: string;
  actionLabel?: string;
  homeHref?: string;
};

const zhCopy: NotFoundCopy = {
  title: "404 — 页面不存在",
  description: "模型猜测了一个不存在的路径，让我们返回首页。",
  actionLabel: "返回首页",
  homeHref: "/zh/",
};

const enCopy: NotFoundCopy = {
  title: "404 — Page Not Found",
  description: "The model guessed a path that does not exist. Let&apos;s head back.",
  actionLabel: "Return Home",
  homeHref: "/",
};

export const LanguageAwareNotFound = ({
  defaultLang,
  title,
  description,
  actionLabel,
  homeHref,
}: LanguageAwareNotFoundProps) => {
  const pathname = usePathname() ?? "";
  const lang = pathname ? getLangFromPath(pathname) : defaultLang;
  const copy = lang === "zh" ? zhCopy : enCopy;

  // 允许调用方传入自定义文案，否则使用默认文案
  const finalTitle = title ?? copy.title;
  const finalDescription = description ?? copy.description;
  const finalActionLabel = actionLabel ?? copy.actionLabel;
  const finalHomeHref = homeHref ?? copy.homeHref;

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-[820px] flex-col items-center justify-center gap-6 text-center">
      <div className="rounded-lg border border-[var(--color-border-default)] bg-[var(--color-canvas-subtle)] px-6 py-8">
        <div className="text-xs text-[var(--color-fg-muted)]">AI Hallucination</div>
        <h1 className="mt-2 text-2xl font-semibold text-[var(--color-fg-default)]">
          {finalTitle}
        </h1>
        <p className="mt-2 text-sm text-[var(--color-fg-muted)]">
          {finalDescription}
        </p>
      </div>
      <Link
        href={finalHomeHref}
        className="rounded-md border border-[var(--color-border-default)] bg-[var(--color-canvas-subtle)] px-4 py-2 text-xs text-[var(--color-fg-default)] hover:bg-[var(--color-item-hover)]"
      >
        {finalActionLabel}
      </Link>
    </div>
  );
};
