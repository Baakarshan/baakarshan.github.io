import Link from "next/link";
import { ExternalLink } from "lucide-react";

import { CodeBlock } from "./CodeBlock";
import { ZoomImage } from "./ZoomImage";

// MDX 组件映射：统一链接、图片、代码块样式
export const mdxComponents = {
  a: ({ href, children, ...props }: any) => {
    if (!href) {
      return (
        <a {...props} className="text-[var(--color-accent-fg)] underline">
          {children}
        </a>
      );
    }

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

    if (href.startsWith("#")) {
      return (
        <a {...props} href={href} className="text-[var(--color-accent-fg)] underline">
          {children}
        </a>
      );
    }

    return (
      <Link href={href} className="text-[var(--color-accent-fg)] underline">
        {children}
      </Link>
    );
  },
  img: (props: any) => <ZoomImage {...props} />,
  pre: (props: any) => <CodeBlock {...props} />,
  code: (props: any) => (
    <code
      {...props}
      className={`rounded bg-[var(--color-canvas-subtle)] px-1 py-0.5 text-[12px] ${
        props.className ?? ""
      }`}
    />
  ),
};
