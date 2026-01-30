import type { Metadata } from "next";
import { Suspense } from "react";

import { SearchClient } from "@/components/search/SearchClient";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "Search",
  description: "Search the knowledge base.",
  alternates: {
    canonical: `${siteConfig.siteUrl}/search/`,
    languages: {
      en: `${siteConfig.siteUrl}/search/`,
      zh: `${siteConfig.siteUrl}/zh/search/`,
    },
  },
};

export default function SearchPage() {
  return (
    <div className="mx-auto max-w-[820px] space-y-6">
      <header>
        <h1 className="text-lg font-semibold text-[var(--color-fg-default)]">
          Search
        </h1>
        <p className="mt-2 text-sm text-[var(--color-fg-muted)]">
          Find articles by title, description, or body snippets.
        </p>
      </header>

      <Suspense
        fallback={
          <div className="rounded-md border border-[var(--color-border-default)] bg-[var(--color-canvas-subtle)] p-4 text-xs text-[var(--color-fg-muted)]">
            Loading search...
          </div>
        }
      >
        <SearchClient locale="en" />
      </Suspense>
    </div>
  );
}
