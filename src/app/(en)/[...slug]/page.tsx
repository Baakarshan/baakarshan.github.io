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

// 预先生成中文站 slug 集合，用于构建 alternates
// - 只在构建期执行，避免运行时重复扫描文件系统
const zhPostSlugSet = new Set(
  getAllPostSlugs("zh").map((slug) => slug.join("/"))
);
const zhFolderSlugSet = new Set(
  getAllFolderSlugs("zh").map((slug) => slug.join("/"))
);
const hasZhSlug = (slugSegments: string[]) => {
  // 通过 slug 集合判断中文站是否存在对应路径
  const key = slugSegments.join("/");
  return zhPostSlugSet.has(key) || zhFolderSlugSet.has(key);
};
const buildAlternates = (slugSegments: string[]) => {
  // 仅当中文站存在对应路径时才输出 alternates
  if (!hasZhSlug(slugSegments)) return null;
  return {
    en: `${siteConfig.siteUrl}/${slugSegments.join("/")}/`,
    zh: `${siteConfig.siteUrl}/zh/${slugSegments.join("/")}/`,
  };
};

export const generateStaticParams = async () => {
  // 文章页 + 目录页统一进入静态路由
  // - 使用 Map 去重，避免同一路径重复生成
  const postSlugs = getAllPostSlugs("en");
  const folderSlugs = getAllFolderSlugs("en");
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
    post = getPostBySlug("en", slugSegments);
  } catch {
    post = null;
  }

  if (post) {
    const canonical = `${siteConfig.siteUrl}/${slugSegments.join("/")}/`;
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
  // - 目录页只输出基本 metadata，不输出 OpenGraph 的封面替换
  const folderNode = getFolderNodeBySlug("en", slugSegments);
  if (folderNode) {
    const canonical = `${siteConfig.siteUrl}/${slugSegments.join("/")}/`;
    const languages = buildAlternates(slugSegments);
    return {
      title: `${folderNode.displayName} · Directory`,
      description: `Folder overview for ${folderNode.displayName}.`,
      alternates: {
        canonical,
        ...(languages ? { languages } : {}),
      },
    };
  }

  return {
    title: "Not Found",
    robots: {
      index: false,
      follow: false,
    },
  };
};

export default async function ArticlePage({
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
  const breadcrumbLabels = getBreadcrumbLabels("en", slugSegments);

  let post;
  try {
    post = getPostBySlug("en", slugSegments);
  } catch {
    post = null;
  }

  if (!post) {
    // 当非文章时尝试渲染目录页
    // - 目录页只展示目录结构，不渲染 MDX 正文
    const folderNode = getFolderNodeBySlug("en", slugSegments);
    if (!folderNode) {
      notFound();
    }
    return (
      <div>
        <PageTopbar title={folderNode.displayName} />
        <Breadcrumbs
          locale="en"
          segments={slugSegments}
          labels={breadcrumbLabels}
        />
        <header>
          <h1>{folderNode.displayName}</h1>
          <p className="subtitle">Folder overview and child entries.</p>
        </header>
        <DirectoryTree nodes={folderNode.children ?? []} locale="en" />
      </div>
    );
  }

  // 结构化数据：用于 SEO 的 Article Schema
  const url = `${siteConfig.siteUrl}/${slugSegments.join("/")}/`;
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
              locale="en"
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

          <GiscusComments locale="en" />
        </div>
      </div>
    </article>
  );
}
