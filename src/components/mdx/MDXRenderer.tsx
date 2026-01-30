import { MDXRemote } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypePrettyCode from "rehype-pretty-code";

import { mdxComponents } from "./components";

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
          remarkPlugins: [remarkGfm, remarkMath],
          rehypePlugins: [
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
