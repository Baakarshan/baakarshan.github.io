"use client";

import React, { useMemo, useState } from "react";
import { Check, Copy } from "lucide-react";

import { MermaidBlock } from "./MermaidBlock";

// 递归提取文本内容，兼容 rehype-pretty-code 输出的多层节点
// - 避免因为 React 节点嵌套导致复制时丢失内容
const extractTextFromNode = (node: any): string => {
  if (!node) return "";
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractTextFromNode).join("");
  if (node.props?.children) return extractTextFromNode(node.props.children);
  return "";
};

// 优先读取 data-raw，其次回退到 children 文本
// 说明：rehype-pretty-code 会把原始代码放到 data-raw，避免高亮后丢失缩进
// - 在复制按钮中必须保证“原始代码”完整
const extractCodeText = (preProps: any, codeNode: any) => {
  const rawFromPre = preProps?.["data-raw"];
  if (typeof rawFromPre === "string") return rawFromPre;
  const rawFromCode = codeNode?.props?.["data-raw"];
  if (typeof rawFromCode === "string") return rawFromCode;
  return extractTextFromNode(codeNode ?? preProps?.children);
};

// 语言优先级：pre data-language -> code data-language -> className fallback
// 说明：不同 MDX 渲染链路可能把语言信息放在不同节点上
// - 语言用于 header 角标显示与 Mermaid 判断
const extractLanguage = (preProps: any, codeNode: any) => {
  const preLang = preProps?.["data-language"] ?? preProps?.["data-lang"];
  if (typeof preLang === "string") return preLang;
  const codeLang = codeNode?.props?.["data-language"] ?? codeNode?.props?.["data-lang"];
  if (typeof codeLang === "string") return codeLang;
  const className = codeNode?.props?.className ?? preProps?.className ?? "";
  const match = className.match(/language-([a-zA-Z0-9-]+)/);
  return match ? match[1] : "";
};

// 尽量定位真正的 <code> 节点，避免把无关节点拼进代码内容
const pickCodeNode = (children: React.ReactNode) => {
  const nodes = React.Children.toArray(children);
  const candidate = nodes.find((node) => {
    if (!React.isValidElement(node)) return false;
    if (node.type === "code") return true;
    const props = node.props as any;
    return (
      typeof props?.["data-raw"] === "string" ||
      typeof props?.["data-language"] === "string" ||
      typeof props?.["data-lang"] === "string" ||
      (typeof props?.className === "string" &&
        /language-([a-zA-Z0-9-]+)/.test(props.className))
    );
  });
  return candidate ?? children;
};

export const CodeBlock = (props: React.HTMLAttributes<HTMLPreElement>) => {
  // rehype-pretty-code 会把 <pre> 的 children 渲染成 <code> 节点
  // 注意：children 可能是多节点数组，需要优先锁定真正的 code 节点
  const codeElement = pickCodeNode(props.children);

  const codeText = useMemo(
    () => extractCodeText(props, codeElement),
    [props, codeElement]
  );
  const language = useMemo(
    () => extractLanguage(props, codeElement),
    [props, codeElement]
  );

  const [copied, setCopied] = useState(false);

  // Mermaid 代码块交给专用渲染组件（使用 SVG 渲染）
  if (language === "mermaid") {
    return <MermaidBlock code={codeText} />;
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(codeText);
      setCopied(true);
      // 短暂提示复制成功，再自动还原
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // 复制失败时不抛错，保持 UI 轻量
      setCopied(false);
    }
  };

  return (
    <div className="my-4 overflow-hidden rounded-md border border-[var(--color-border-default)] bg-[var(--color-canvas-subtle)]">
      <div className="flex items-center justify-between border-b border-[var(--color-border-default)] px-3 py-2 text-xs text-[var(--color-fg-muted)]">
        <span className="uppercase tracking-wider">
          {language ? language : "code"}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1 rounded-md border border-[var(--color-border-default)] px-2 py-1 text-[10px] text-[var(--color-fg-default)] hover:bg-[var(--color-item-hover)]"
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre
        {...props}
        className={`overflow-x-auto px-3 py-3 text-[13px] leading-[1.6] ${props.className ?? ""}`}
      />
    </div>
  );
};
