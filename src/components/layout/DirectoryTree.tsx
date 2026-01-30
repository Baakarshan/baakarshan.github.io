import Link from "next/link";

import type { ContentTreeNode, Locale } from "@/lib/posts";

// 目录树渲染：用于 /directory 与目录页
const toBasePath = (locale: Locale) => (locale === "zh" ? "/zh" : "");

const renderNodes = (
  nodes: ContentTreeNode[],
  locale: Locale,
  depth = 0
) => {
  return (
    <ul className="space-y-2">
      {nodes.map((node) => {
        const href = `${toBasePath(locale)}/${node.slug.join("/")}`;
        if (node.type === "folder") {
          return (
            <li key={`${node.slug.join("/")}-${depth}`}>
              <Link
                href={href}
                className="text-xs font-semibold text-[var(--color-fg-default)] hover:text-[var(--color-accent-fg)]"
                style={{ paddingLeft: depth * 12 }}
              >
                {node.displayName}
              </Link>
              {/* 文件夹下继续渲染子节点，视觉上用左边线表现层级 */}
              <div className="mt-2 ml-2 border-l border-[var(--color-border-default)] pl-3">
                {renderNodes(node.children ?? [], locale, depth + 1)}
              </div>
            </li>
          );
        }

        return (
          <li key={`${node.slug.join("/")}-${depth}`}>
            <Link
              href={href}
              className="text-xs text-[var(--color-fg-muted)] hover:text-[var(--color-fg-default)]"
              style={{ paddingLeft: depth * 12 }}
            >
              {node.displayName}
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
  return <div className="mt-4">{renderNodes(nodes, locale)}</div>;
};
