"use client";

import React, { useMemo, useState } from "react";
import { Check, Copy } from "lucide-react";

import { MermaidBlock } from "./MermaidBlock";

// 递归提取文本内容，兼容 rehype-pretty-code 输出的多层节点
const extractTextFromNode = (node: any): string => {
  if (!node) return "";
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractTextFromNode).join("");
  if (node.props?.children) return extractTextFromNode(node.props.children);
  return "";
};

// 优先读取 data-raw，其次回退到 children 文本
const extractCodeText = (preProps: any, codeNode: any) => {
  const rawFromPre = preProps?.["data-raw"];
  if (typeof rawFromPre === "string") return rawFromPre;
  const rawFromCode = codeNode?.props?.["data-raw"];
  if (typeof rawFromCode === "string") return rawFromCode;
  return extractTextFromNode(codeNode ?? preProps?.children);
};

// 语言优先级：pre data-language -> code data-language -> className fallback
const extractLanguage = (preProps: any, codeNode: any) => {
  const preLang = preProps?.["data-language"] ?? preProps?.["data-lang"];
  if (typeof preLang === "string") return preLang;
  const codeLang = codeNode?.props?.["data-language"] ?? codeNode?.props?.["data-lang"];
  if (typeof codeLang === "string") return codeLang;
  const className = codeNode?.props?.className ?? preProps?.className ?? "";
  const match = className.match(/language-([a-zA-Z0-9-]+)/);
  return match ? match[1] : "";
};

export const CodeBlock = (props: React.HTMLAttributes<HTMLPreElement>) => {
  // rehype-pretty-code 会把 <pre> 的 children 渲染成 <code> 节点
  const codeElement = Array.isArray(props.children)
    ? props.children[0]
    : props.children;

  const codeText = useMemo(
    () => extractCodeText(props, codeElement),
    [props, codeElement]
  );
  const language = useMemo(
    () => extractLanguage(props, codeElement),
    [props, codeElement]
  );

  const [copied, setCopied] = useState(false);

  // Mermaid 代码块交给专用渲染组件
  if (language === "mermaid") {
    return <MermaidBlock code={codeText} />;
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(codeText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
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
