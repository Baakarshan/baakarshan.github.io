import Link from "next/link";

import type { ContentTreeNode, Locale } from "@/lib/posts";

// 目录树渲染：用于 /directory 与目录页
const toBasePath = (locale: Locale) => (locale === "zh" ? "/zh" : "");

// 统一添加尾斜杠，避免静态导出时的路径不一致
const withTrailingSlash = (value: string) =>
  value === "/" ? "/" : value.endsWith("/") ? value : `${value}/`;

// 计算目录节点对应的 URL
const toNodeHref = (locale: Locale, slug: string[]) => {
  const base = toBasePath(locale);
  if (slug.length === 0) return base ? `${base}/` : "/";
  return withTrailingSlash(`${base}/${slug.join("/")}`);
};

const renderNodes = (
  nodes: ContentTreeNode[],
  locale: Locale,
  depth = 0
) => {
  return (
    <ul className="tree">
      {nodes.map((node) => {
        // 目录与文章都使用统一的 trailingSlash 形式
        const href = toNodeHref(locale, node.slug);
        const levelClass =
          depth === 0 ? "" : depth === 1 ? "level-1" : "level-2";
        if (node.type === "folder") {
          return (
            <li key={`${node.slug.join("/")}-${depth}`}>
              <Link
                href={href}
                className={`tree-item ${levelClass}`}
              >
                <span className="label">{node.displayName}</span>
              </Link>
              {/* 文件夹下继续渲染子节点 */}
              <div>
                {renderNodes(node.children ?? [], locale, depth + 1)}
              </div>
            </li>
          );
        }

        // 文件节点：仅显示标题，不展示子级
        return (
          <li key={`${node.slug.join("/")}-${depth}`}>
            <Link
              href={href}
              className={`tree-item ${levelClass}`}
            >
              <span className="label">{node.displayName}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
};

export const DirectoryTree = ({
  nodes,
  locale,
}: {
  nodes: ContentTreeNode[];
  locale: Locale;
}) => {
  return <div className="tree-scroll">{renderNodes(nodes, locale)}</div>;
};
