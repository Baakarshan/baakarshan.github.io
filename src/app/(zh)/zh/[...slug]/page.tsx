import { format } from "date-fns";
import { notFound } from "next/navigation";

import { GiscusComments } from "@/components/comments/GiscusComments";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { DirectoryTree } from "@/components/layout/DirectoryTree";
import { MDXRenderer } from "@/components/mdx/MDXRenderer";
import { TocCard } from "@/components/mdx/TocCard";
import {
  getAllFolderSlugs,
  getAllPostSlugs,
  getFolderNodeBySlug,
  getPostBySlug,
} from "@/lib/posts";
import { siteConfig } from "@/lib/site";

const enPostSlugSet = new Set(
  getAllPostSlugs("en").map((slug) => slug.join("/"))
);
const enFolderSlugSet = new Set(
  getAllFolderSlugs("en").map((slug) => slug.join("/"))
);
const hasEnSlug = (slugSegments: string[]) => {
  const key = slugSegments.join("/");
  return enPostSlugSet.has(key) || enFolderSlugSet.has(key);
};
const buildAlternates = (slugSegments: string[]) => {
  if (!hasEnSlug(slugSegments)) return null;
  return {
    en: `${siteConfig.siteUrl}/${slugSegments.join("/")}/`,
    zh: `${siteConfig.siteUrl}/zh/${slugSegments.join("/")}/`,
  };
};

export const generateStaticParams = async () => {
  const postSlugs = getAllPostSlugs("zh");
  const folderSlugs = getAllFolderSlugs("zh");
  const map = new Map<string, string[]>();
  [...postSlugs, ...folderSlugs].forEach((slug) => {
    map.set(slug.join("/"), slug);
  });
  return Array.from(map.values()).map((slug) => ({ slug }));
};

export const dynamicParams = false;

export const generateMetadata = async ({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) => {
  const resolved = await params;
  const slugSegments = Array.isArray(resolved.slug)
    ? resolved.slug
    : resolved.slug
    ? [resolved.slug]
    : [];
  if (slugSegments.length === 0) {
    return {
      title: siteConfig.name,
      description: siteConfig.description,
    };
  }

  let post;
  try {
    post = getPostBySlug("zh", slugSegments);
  } catch {
    post = null;
  }

  if (post) {
    const canonical = `${siteConfig.siteUrl}/zh/${slugSegments.join("/")}/`;
    const languages = buildAlternates(slugSegments);
    return {
      title: post.title,
      description: post.description,
      openGraph: {
        title: post.title,
        description: post.description,
        images: [post.cover ?? "/og-default.png"],
      },
      alternates: {
        canonical,
        ...(languages ? { languages } : {}),
      },
    };
  }

  const folderNode = getFolderNodeBySlug("zh", slugSegments);
  if (folderNode) {
    const canonical = `${siteConfig.siteUrl}/zh/${slugSegments.join("/")}/`;
    const languages = buildAlternates(slugSegments);
    return {
      title: `${folderNode.displayName} · 目录`,
      description: `${folderNode.displayName} 目录概览。`,
      alternates: {
        canonical,
        ...(languages ? { languages } : {}),
      },
    };
  }

  return {
    title: "未找到",
    robots: {
      index: false,
      follow: false,
    },
  };
};

export default async function ZhArticlePage({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const resolved = await params;
  const slugSegments = Array.isArray(resolved.slug)
    ? resolved.slug
    : resolved.slug
    ? [resolved.slug]
    : [];
  if (slugSegments.length === 0) {
    notFound();
  }

  let post;
  try {
    post = getPostBySlug("zh", slugSegments);
  } catch {
    post = null;
  }

  if (!post) {
    const folderNode = getFolderNodeBySlug("zh", slugSegments);
    if (!folderNode) {
      notFound();
    }
    return (
      <div className="mx-auto max-w-[820px] space-y-6">
        <Breadcrumbs locale="zh" segments={slugSegments} />
        <header>
          <h1 className="text-lg font-semibold text-[var(--color-fg-default)]">
            {folderNode.displayName}
          </h1>
          <p className="mt-2 text-sm text-[var(--color-fg-muted)]">
            目录概览与子内容列表。
          </p>
        </header>
        <DirectoryTree nodes={folderNode.children ?? []} locale="zh" />
      </div>
    );
  }

  const url = `${siteConfig.siteUrl}/zh/${slugSegments.join("/")}/`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    datePublished: post.date,
    author: {
      "@type": "Person",
      name: "Baakarshan",
    },
    description: post.description,
    keywords: post.tags.join(", "),
    url,
  };

  return (
    <article className="mx-auto max-w-[820px]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="space-y-4">
        <Breadcrumbs locale="zh" segments={slugSegments} />
        <h1 className="text-2xl font-semibold text-[var(--color-fg-default)]">
          {post.title}
        </h1>
        <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--color-fg-muted)]">
          <span>{format(new Date(post.date), "MMM dd, yyyy")}</span>
          <span>·</span>
          <div className="flex flex-wrap items-center gap-2">
            {post.tags.map((tag) => (
              <a
                key={tag}
                href={`/zh/search?q=${encodeURIComponent(tag)}`}
                className="rounded-full border border-[var(--color-border-default)] px-2 py-0.5 text-[10px] hover:bg-[var(--color-item-hover)]"
              >
                {tag}
              </a>
            ))}
          </div>
        </div>
      </div>

      <TocCard items={post.toc} />

      <div className="mdx">
        <MDXRenderer source={post.content} />
      </div>

      <GiscusComments locale="zh" />
    </article>
  );
}
