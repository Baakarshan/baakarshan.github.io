import { format } from "date-fns";
import { notFound } from "next/navigation";

import { GiscusComments } from "@/components/comments/GiscusComments";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { DirectoryTree } from "@/components/layout/DirectoryTree";
import { PageTopbar } from "@/components/layout/PageTopbar";
import { MDXRenderer } from "@/components/mdx/MDXRenderer";
import { SideToc } from "@/components/mdx/SideToc";
import { TocCard } from "@/components/mdx/TocCard";
import { CopyFullButton } from "@/components/mdx/CopyFullButton";
import {
  getAllFolderSlugs,
  getAllPostSlugs,
  getBreadcrumbLabels,
  getFolderNodeBySlug,
  getPostBySlug,
} from "@/lib/posts";
import { siteConfig } from "@/lib/site";
import { parseYmdToLocalDate } from "@/lib/date";

// 预先生成英文站 slug 集合，用于构建 alternates
// - 构建期生成，避免运行时扫描文件系统
const enPostSlugSet = new Set(
  getAllPostSlugs("en").map((slug) => slug.join("/"))
);
const enFolderSlugSet = new Set(
  getAllFolderSlugs("en").map((slug) => slug.join("/"))
);
const hasEnSlug = (slugSegments: string[]) => {
  // 通过 slug 集合判断英文站是否存在对应路径
  const key = slugSegments.join("/");
  return enPostSlugSet.has(key) || enFolderSlugSet.has(key);
};
const buildAlternates = (slugSegments: string[]) => {
  // 仅当英文站存在对应路径时才输出 alternates
  if (!hasEnSlug(slugSegments)) return null;
  return {
    en: `${siteConfig.siteUrl}/${slugSegments.join("/")}/`,
    zh: `${siteConfig.siteUrl}/zh/${slugSegments.join("/")}/`,
  };
};

export const generateStaticParams = async () => {
  // 文章页 + 目录页统一进入静态路由
  // - 使用 Map 去重，避免同一路径重复生成
  const postSlugs = getAllPostSlugs("zh");
  const folderSlugs = getAllFolderSlugs("zh");
  const map = new Map<string, string[]>();
  [...postSlugs, ...folderSlugs].forEach((slug) => {
    map.set(slug.join("/"), slug);
  });
  // Map 去重，避免同一路径重复输出
  return Array.from(map.values()).map((slug) => ({ slug }));
};

export const dynamicParams = false;

export const generateMetadata = async ({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) => {
  const resolved = await params;
  // 兼容 Next 在边界场景下返回 string 的情况
  const slugSegments = Array.isArray(resolved.slug)
    ? resolved.slug
    : resolved.slug
    ? [resolved.slug]
    : [];
  // 根路径不应出现在此路由，兜底返回站点信息
  if (slugSegments.length === 0) {
    return {
      title: siteConfig.name,
      description: siteConfig.description,
    };
  }

  let post;
  try {
    // 优先按文章解析
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

  // 再尝试按目录页解析
  // - 目录页仅输出基础描述信息
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
  // 统一转为数组，便于后续处理
  const slugSegments = Array.isArray(resolved.slug)
    ? resolved.slug
    : resolved.slug
    ? [resolved.slug]
    : [];
  if (slugSegments.length === 0) {
    notFound();
  }

  // 面包屑显示名来自目录树，避免直接显示 slug
  const breadcrumbLabels = getBreadcrumbLabels("zh", slugSegments);

  let post;
  try {
    post = getPostBySlug("zh", slugSegments);
  } catch {
    post = null;
  }

  if (!post) {
    // 当非文章时尝试渲染目录页
    // - 目录页只展示目录结构，不渲染 MDX 正文
    const folderNode = getFolderNodeBySlug("zh", slugSegments);
    if (!folderNode) {
      notFound();
    }
    return (
      <div>
        <PageTopbar title={folderNode.displayName} />
        <Breadcrumbs
          locale="zh"
          segments={slugSegments}
          labels={breadcrumbLabels}
        />
        <header>
          <h1>{folderNode.displayName}</h1>
          <p className="subtitle">目录概览与子内容列表。</p>
        </header>
        <DirectoryTree nodes={folderNode.children ?? []} locale="zh" />
      </div>
    );
  }

  // 结构化数据：用于 SEO 的 Article Schema
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
    url,
  };

  return (
    <article>
      {/* 结构化数据：增强搜索引擎收录 */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PageTopbar
        title={post.title}
        action={post.allowCopy ? <CopyFullButton content={post.content} /> : null}
      />
      <div className="article-body">
        <SideToc items={post.toc} />
        <div className="article-main">
          <div className="meta-row">
            <Breadcrumbs
              locale="zh"
              segments={slugSegments}
              labels={breadcrumbLabels}
            />
            <div className="meta">
              {/* 使用本地日期构造，避免 UTC 解析导致日期回退 */}
              <span>{format(parseYmdToLocalDate(post.date), "MMM dd, yyyy")}</span>
            </div>
          </div>

          <TocCard items={post.toc} />

          <div className="mdx">
            <MDXRenderer source={post.content} />
          </div>

          <GiscusComments locale="zh" />
        </div>
      </div>
    </article>
  );
}
