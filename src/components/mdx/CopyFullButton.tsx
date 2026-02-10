"use client";

import { useMemo, useState } from "react";
import { unified } from "unified";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkMdx from "remark-mdx";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import rehypeStringify from "rehype-stringify";
import { visit } from "unist-util-visit";

import { useTheme } from "@/components/theme/ThemeProvider";
import { renderMermaidSvg } from "./mermaid-runtime";
import { svgToPngDataUrl, type MermaidImage } from "./mermaid-export";

type MermaidBlock = {
  start: number;
  end: number;
  code: string;
};

type CopyStatus = "idle" | "copying" | "success" | "error";

// 从 MDX 中抽取 Mermaid 代码块位置（用于原文替换）
const collectMermaidBlocks = (content: string) => {
  const tree = unified().use(remarkParse).use(remarkMdx).parse(content);
  const blocks: MermaidBlock[] = [];

  visit(tree, "code", (node: any) => {
    const lang = typeof node.lang === "string" ? node.lang.toLowerCase() : "";
    if (lang !== "mermaid") return;
    const start = node.position?.start?.offset;
    const end = node.position?.end?.offset;
    if (typeof start !== "number" || typeof end !== "number") return;
    blocks.push({ start, end, code: String(node.value ?? "") });
  });

  return blocks.sort((a, b) => a.start - b.start);
};

// Mermaid 渲染为 SVG：复制链路固定字体 + 关闭 htmlLabels
// - htmlLabels 依赖 foreignObject，Resvg 不稳定
const renderMermaidPng = async (
  code: string,
  theme: "light" | "dark",
  index: number
) => {
  const id = `mermaid-copy-${index}-${Math.random().toString(36).slice(2)}`;
  const { svg } = await renderMermaidSvg({ id, code, theme });
  const background = theme === "dark" ? "#0d1117" : "#ffffff";
  return svgToPngDataUrl(svg, background);
};

// 替换原始 Markdown 中的 Mermaid 代码块为 PNG data URL
const replaceMermaidWithImages = (
  content: string,
  blocks: MermaidBlock[],
  images: MermaidImage[]
) => {
  if (blocks.length === 0) return content;
  let result = "";
  let lastIndex = 0;

  blocks.forEach((block, index) => {
    result += content.slice(lastIndex, block.start);
    result += `![](${images[index].dataUrl})`;
    lastIndex = block.end;
  });

  result += content.slice(lastIndex);
  return result;
};

// 在 HTML 粘贴内容中注入图片宽高，避免飞书缩得过小
const injectImageSizeToHtml = (html: string, images: MermaidImage[]) => {
  if (!images.length) return html;
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const map = new Map(images.map((item) => [item.dataUrl, item]));
  doc.querySelectorAll("img").forEach((img) => {
    const src = img.getAttribute("src") ?? "";
    const item = map.get(src);
    if (!item) return;
    img.setAttribute("width", String(item.width));
    img.setAttribute("height", String(item.height));
    img.style.maxWidth = "100%";
    img.style.height = "auto";
  });
  return doc.body.innerHTML;
};

// 将 Markdown 转为 HTML，用于写入 Clipboard 的 text/html
// - 保留 KaTeX/链接等格式
const markdownToHtml = async (markdown: string) => {
  const file = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkMath)
    .use(remarkMdx)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)
    .use(rehypeKatex)
    .use(rehypeStringify, { allowDangerousHtml: true })
    .process(markdown);
  return String(file);
};

// 生成剪贴板 payload：Markdown + HTML（含 Mermaid PNG 替换）
// - Markdown 保持原格式，Mermaid 替换为 PNG
// - HTML 通过 Markdown 渲染后再注入图片尺寸
const buildClipboardPayload = async (
  content: string,
  theme: "light" | "dark"
) => {
  const blocks = collectMermaidBlocks(content);
  const cache = new Map<string, MermaidImage>();
  const images: MermaidImage[] = [];

  for (let index = 0; index < blocks.length; index += 1) {
    const code = blocks[index].code;
    if (cache.has(code)) {
      images.push(cache.get(code)!);
      continue;
    }
    const png = await renderMermaidPng(code, theme, index);
    cache.set(code, png);
    images.push(png);
  }

  const markdown = replaceMermaidWithImages(content, blocks, images);
  const html = injectImageSizeToHtml(await markdownToHtml(markdown), images);
  return { markdown, html };
};

// 写入剪贴板：同时提供 text/plain 与 text/html
// - 飞书更倾向使用 HTML 以保留图片
const writeClipboard = async (markdown: string, html: string) => {
  if (typeof window.ClipboardItem === "undefined") {
    throw new Error("ClipboardItem 不可用");
  }
  await navigator.clipboard.write([
    new ClipboardItem({
      "text/plain": new Blob([markdown], { type: "text/plain" }),
      "text/html": new Blob([html], { type: "text/html" }),
    }),
  ]);
};

export const CopyFullButton = ({ content }: { content: string }) => {
  const { resolvedTheme } = useTheme();
  const [status, setStatus] = useState<CopyStatus>("idle");

  const buttonText = useMemo(() => {
    if (status === "copying") return "复制中...";
    if (status === "success") return "复制成功";
    if (status === "error") return "复制失败";
    return "复制全文";
  }, [status]);

  const handleCopy = async () => {
    if (status === "copying") return;
    setStatus("copying");
    try {
      const { markdown, html } = await buildClipboardPayload(
        content,
        resolvedTheme
      );
      await writeClipboard(markdown, html);
      setStatus("success");
      setTimeout(() => setStatus("idle"), 1800);
    } catch (error) {
      console.error("全文复制失败", error);
      setStatus("error");
      setTimeout(() => setStatus("idle"), 2000);
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      disabled={status === "copying"}
      className="copy-button"
      aria-label="复制全文"
      title={buttonText}
    >
      {buttonText}
    </button>
  );
};
