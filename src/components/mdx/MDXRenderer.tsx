import { MDXRemote } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypePrettyCode from "rehype-pretty-code";

import { mdxComponents } from "./components";
import { remarkMermaid } from "./remark-mermaid";

// Shiki 主题配置（与 Copilot 风格对齐）
// - 深色使用 github-dark-dimmed
// - 浅色使用 github-light
// - 关闭背景，让 CSS 统一控制代码块底色
const prettyCodeOptions = {
  theme: {
    dark: "one-dark-pro",
    light: "one-light",
  },
  keepBackground: false,
};

// 统一 MDX 渲染入口：Markdown + GFM + KaTeX + 代码高亮
export const MDXRenderer = ({ source }: { source: string }) => {
  return (
    <MDXRemote
      source={source}
      options={{
        mdxOptions: {
          // remark：处理 Markdown 语法扩展
          remarkPlugins: [remarkGfm, remarkMath, remarkMermaid],
          rehypePlugins: [
            // rehype：处理 HTML AST 与插件链
            rehypeSlug,
            rehypeAutolinkHeadings,
            [rehypePrettyCode, prettyCodeOptions],
            rehypeKatex,
          ],
        },
      }}
      components={mdxComponents}
    />
  );
};
