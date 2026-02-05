import Link from "next/link";
import { ExternalLink } from "lucide-react";

import { CodeBlock } from "./CodeBlock";
import { MermaidBlock } from "./MermaidBlock";
import { ZoomImage } from "./ZoomImage";

// MDX 组件映射：统一链接、图片、代码块样式
export const mdxComponents = {
  a: ({ href, children, ...props }: any) => {
    // 未提供 href 时仍渲染为强调文本
    if (!href) {
      return (
        <a {...props} className="text-[var(--color-accent-fg)] underline">
          {children}
        </a>
      );
    }

    // 外链：新标签页打开，并附带箭头图标
    const isExternal = /^https?:\/\//.test(href) || href.startsWith("mailto:");
    if (isExternal) {
      return (
        <a
          {...props}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[var(--color-accent-fg)] underline"
        >
          {children}
          <ExternalLink size={12} />
        </a>
      );
    }

    // 站内锚点：保留同页跳转行为
    if (href.startsWith("#")) {
      return (
        <a {...props} href={href} className="text-[var(--color-accent-fg)] underline">
          {children}
        </a>
      );
    }

    // 站内链接：使用 Next.js Link
    return (
      <Link href={href} className="text-[var(--color-accent-fg)] underline">
        {children}
      </Link>
    );
  },
  // 图片：支持点击放大
  img: (props: any) => <ZoomImage {...props} />,
  // 代码块：统一高亮 + 复制按钮
  pre: (props: any) => <CodeBlock {...props} />,
  // Mermaid：直接渲染图表，避免走代码高亮链路
  Mermaid: ({ code }: { code?: string }) => (
    <MermaidBlock code={typeof code === "string" ? code : ""} />
  ),
  // 行内 code 样式改由全局 CSS 处理，避免影响代码块的水合一致性
};
