"use client";

import { useMemo, useState } from "react";
import { Resvg, initWasm } from "@resvg/resvg-wasm";
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

type MermaidBlock = {
  start: number;
  end: number;
  code: string;
};

type CopyStatus = "idle" | "copying" | "success" | "error";

type MermaidImage = {
  dataUrl: string;
  width: number;
  height: number;
};

const RESVG_WASM_URL = new URL(
  "@resvg/resvg-wasm/index_bg.wasm",
  import.meta.url
);
// Resvg 初始化只能执行一次：开发模式下模块热更新会重复加载
// - 使用全局缓存保证 initWasm 只调用一次
// - 遇到 “Already initialized” 时直接标记为已就绪
const RESVG_READY_KEY = "__resvgReadyPromise";
const RESVG_READY_FLAG = "__resvgReady";
const ensureResvgReady = () => {
  const globalScope = globalThis as typeof globalThis & {
    [RESVG_READY_KEY]?: Promise<void>;
    [RESVG_READY_FLAG]?: boolean;
  };
  // Turbopack 热更新会重建模块，使用全局状态避免重复 initWasm
  if (globalScope[RESVG_READY_FLAG]) {
    return Promise.resolve();
  }
  if (!globalScope[RESVG_READY_KEY]) {
    globalScope[RESVG_READY_KEY] = initWasm(fetch(RESVG_WASM_URL)).then(() => {
      globalScope[RESVG_READY_FLAG] = true;
    });
  }
  return globalScope[RESVG_READY_KEY]!.catch((error) => {
    // 已初始化时直接标记成功，避免阻断复制流程
    if (String(error).includes("Already initialized")) {
      globalScope[RESVG_READY_FLAG] = true;
      return;
    }
    throw error;
  });
};

// Resvg 运行时需要显式注入字体，保证中文/英文都能正常渲染
// - 这里优先加载 Noto Sans SC（覆盖完整中文）
const FONT_URLS = ["/fonts/NotoSansSC-Regular.ttf"];
// 字体 buffer 加载结果缓存：避免多次 fetch 同一字体
let fontBuffersPromise: Promise<Uint8Array[]> | null = null;
const loadFontBuffers = async () => {
  if (fontBuffersPromise) return fontBuffersPromise;
  fontBuffersPromise = (async () => {
    const buffers: Uint8Array[] = [];
    for (const url of FONT_URLS) {
      try {
        const response = await fetch(url);
        if (!response.ok) continue;
        buffers.push(new Uint8Array(await response.arrayBuffer()));
      } catch {
        // 忽略单个字体加载失败，继续尝试其他候选
      }
    }
    return buffers;
  })();
  return fontBuffersPromise;
};

// Uint8Array -> Base64（用于 PNG data URL）
// - 分块避免大数组导致调用栈溢出
const uint8ToBase64 = (bytes: Uint8Array) => {
  let binary = "";
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return btoa(binary);
};

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

const CROP_PADDING = 8;

// 解析 Mermaid 输出的 SVG 尺寸
// - 优先 width/height，其次 viewBox
// - 兜底给一个可用尺寸，避免零尺寸渲染
const getSvgSize = (svg: string) => {
  const widthMatch = svg.match(/width="([0-9.]+)"/i);
  const heightMatch = svg.match(/height="([0-9.]+)"/i);
  if (widthMatch && heightMatch) {
    return {
      width: Number(widthMatch[1]),
      height: Number(heightMatch[1]),
    };
  }
  const viewBoxMatch = svg.match(/viewBox="([0-9.\s-]+)"/i);
  if (viewBoxMatch) {
    const parts = viewBoxMatch[1].trim().split(/\s+/).map(Number);
    if (parts.length === 4 && parts.every((value) => Number.isFinite(value))) {
      return { width: parts[2], height: parts[3] };
    }
  }
  return { width: 800, height: 600 };
};

// 确保 SVG 基本命名空间存在，避免解析失败
const ensureSvgNamespace = (svg: string) => {
  const match = svg.match(/^<svg\b([^>]*)>/i);
  if (!match) return svg;
  let attrs = match[1];
  if (!/\bxmlns=/.test(attrs)) {
    attrs += ' xmlns="http://www.w3.org/2000/svg"';
  }
  if (!/\bxmlns:xlink=/.test(attrs)) {
    attrs += ' xmlns:xlink="http://www.w3.org/1999/xlink"';
  }
  const updated = `<svg${attrs}>`;
  return svg.replace(/^<svg\b[^>]*>/i, updated);
};

const cropSvgToBBox = (svg: string) => {
  if (typeof document === "undefined") return svg;
  const withNamespace = ensureSvgNamespace(svg);
  const wrapper = document.createElement("div");
  wrapper.style.position = "fixed";
  wrapper.style.left = "-99999px";
  wrapper.style.top = "-99999px";
  wrapper.style.width = "0";
  wrapper.style.height = "0";
  wrapper.style.overflow = "hidden";
  wrapper.style.visibility = "hidden";
  wrapper.style.pointerEvents = "none";
  wrapper.innerHTML = withNamespace;

  document.body.appendChild(wrapper);
  const svgEl = wrapper.querySelector("svg");
  if (!svgEl) {
    wrapper.remove();
    return withNamespace;
  }

  try {
    const bbox = svgEl.getBBox();
    if (!Number.isFinite(bbox.width) || !Number.isFinite(bbox.height)) {
      return withNamespace;
    }
    if (bbox.width === 0 || bbox.height === 0) {
      return withNamespace;
    }

    const pad = CROP_PADDING;
    const x = bbox.x - pad;
    const y = bbox.y - pad;
    const width = bbox.width + pad * 2;
    const height = bbox.height + pad * 2;

    svgEl.setAttribute("viewBox", `${x} ${y} ${width} ${height}`);
    svgEl.setAttribute("width", String(width));
    svgEl.setAttribute("height", String(height));

    const serializer = new XMLSerializer();
    return serializer.serializeToString(svgEl);
  } catch {
    return withNamespace;
  } finally {
    wrapper.remove();
  }
};

// 标准化 SVG：补齐命名空间 + 固定宽高
// - Resvg 需要明确的尺寸来稳定输出
const normalizeSvg = (svg: string) => {
  const withNamespace = ensureSvgNamespace(svg);
  const parser = new DOMParser();
  const doc = parser.parseFromString(withNamespace, "image/svg+xml");
  const svgEl = doc.querySelector("svg");
  if (!svgEl) return withNamespace;
  const size = getSvgSize(withNamespace);
  svgEl.setAttribute("width", String(size.width));
  svgEl.setAttribute("height", String(size.height));
  const serializer = new XMLSerializer();
  return serializer.serializeToString(svgEl);
};

// PNG 输出策略：最小宽度 + 高 DPI，确保清晰度
const MIN_PNG_WIDTH = 3000;
const RESVG_DPI = 300;

// 使用 Resvg/WASM 把 SVG 高质量渲染为 PNG
// - fitTo: width 保证输出宽度一致
// - dpi: 提升清晰度
// - font: 注入字体保证中文/英文显示
const svgToPngDataUrl = async (
  svg: string,
  background: string | null
): Promise<MermaidImage> => {
  const cropped = cropSvgToBBox(svg);
  const normalized = normalizeSvg(cropped);
  const size = getSvgSize(normalized);
  const displayWidth = Math.max(size.width, MIN_PNG_WIDTH);
  const displayHeight = Math.round((displayWidth * size.height) / size.width);

  await ensureResvgReady();
  const fontBuffers = await loadFontBuffers();
  const options = {
    fitTo: { mode: "width" as const, value: Math.round(displayWidth) },
    background: background ?? undefined,
    dpi: RESVG_DPI,
    ...(fontBuffers.length
      ? {
          font: {
            fontBuffers,
            defaultFontFamily: "Noto Sans SC",
            sansSerifFamily: "Noto Sans SC",
          },
        }
      : {}),
  };
  const resvg = new Resvg(normalized, options);
  const rendered = resvg.render();
  const pngBuffer = rendered.asPng();
  const dataUrl = `data:image/png;base64,${uint8ToBase64(pngBuffer)}`;
  rendered.free();
  resvg.free();
  return {
    dataUrl,
    width: Math.round(displayWidth),
    height: Math.round(displayHeight),
  };
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
