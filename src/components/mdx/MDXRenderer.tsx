import { MDXRemote } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypePrettyCode from "rehype-pretty-code";

import { mdxComponents } from "./components";
import { remarkMermaid } from "./remark-mermaid";

// Shiki 主题配置（与 Copilot Dark 对齐）
const prettyCodeOptions = {
  theme: "github-dark-dimmed",
  keepBackground: true,
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
