import type { Metadata } from "next";

import { GiscusComments } from "@/components/comments/GiscusComments";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "Resume",
  description: "Professional resume.",
  alternates: {
    canonical: `${siteConfig.siteUrl}/resume/`,
    languages: {
      en: `${siteConfig.siteUrl}/resume/`,
      zh: `${siteConfig.siteUrl}/zh/resume/`,
    },
  },
};

export default function ResumePage() {
  return (
    <div className="mx-auto max-w-[820px] space-y-8">
      <header>
        <h1 className="text-lg font-semibold text-[var(--color-fg-default)]">
          Resume
        </h1>
        <p className="mt-2 text-sm text-[var(--color-fg-muted)]">
          A compact overview tailored for engineering collaborators.
        </p>
      </header>

      <section className="grid grid-cols-12 gap-6">
        <div className="col-span-5 rounded-md border border-[var(--color-border-default)] bg-[var(--color-canvas-subtle)] p-4">
          <h2 className="text-sm font-semibold text-[var(--color-fg-default)]">
            Profile
          </h2>
          <p className="mt-2 text-xs leading-5 text-[var(--color-fg-muted)]">
            Product-focused engineer building knowledge tooling, collaboration
            systems, and UI frameworks for technical teams.
          </p>
          <div className="mt-4 text-xs text-[var(--color-fg-muted)]">
            <div>Location: Remote</div>
            <div>Email: hello@baakarshan.dev</div>
            <div>GitHub: baakarshan</div>
          </div>
        </div>

        <div className="col-span-7 rounded-md border border-[var(--color-border-default)] bg-[var(--color-canvas-subtle)] p-4">
          <h2 className="text-sm font-semibold text-[var(--color-fg-default)]">
            Skills
          </h2>
          <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-[var(--color-fg-muted)]">
            <div>System Design</div>
            <div>Design Systems</div>
            <div>Next.js / React</div>
            <div>TypeScript</div>
            <div>Search & Indexing</div>
            <div>MDX Pipelines</div>
            <div>Performance Tuning</div>
            <div>Content Ops</div>
          </div>
        </div>
      </section>

      <section className="rounded-md border border-[var(--color-border-default)] bg-[var(--color-canvas-subtle)] p-4">
        <h2 className="text-sm font-semibold text-[var(--color-fg-default)]">
          Experience
        </h2>
        <div className="mt-3 space-y-4 text-xs text-[var(--color-fg-muted)]">
          <div>
            <div className="text-[var(--color-fg-default)]">Staff Engineer</div>
            <div>Knowledge tooling, AI workflows, and content systems.</div>
          </div>
          <div>
            <div className="text-[var(--color-fg-default)]">Product Engineer</div>
            <div>Developer platforms, design systems, and analytics.</div>
          </div>
        </div>
      </section>

      <section className="rounded-md border border-[var(--color-border-default)] bg-[var(--color-canvas-subtle)] p-4">
        <h2 className="text-sm font-semibold text-[var(--color-fg-default)]">
          Education
        </h2>
        <p className="mt-2 text-xs text-[var(--color-fg-muted)]">
          B.S. in Computer Science
        </p>
      </section>

      <GiscusComments locale="en" />
    </div>
  );
}
