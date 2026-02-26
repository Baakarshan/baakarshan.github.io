"use client";

import React, { useMemo, useState } from "react";

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
  const [wrapped, setWrapped] = useState(false);

  const languageColor = useMemo(() => {
    const key = (language ?? "").toLowerCase();
    const colorMap: Record<string, string> = {
      kotlin: "#a97bff",
      kts: "#a97bff",
      java: "#f89820",
      javascript: "#f7df1e",
      js: "#f7df1e",
      typescript: "#3178c6",
      ts: "#3178c6",
      python: "#3776ab",
      py: "#3776ab",
      go: "#00add8",
      golang: "#00add8",
      rust: "#ce412b",
      rs: "#ce412b",
      c: "#a8b9cc",
      cpp: "#00599c",
      "c++": "#00599c",
      cxx: "#00599c",
      hpp: "#00599c",
      cs: "#9b4f96",
      csharp: "#9b4f96",
      swift: "#f05138",
      html: "#e34f26",
      css: "#1572b6",
      scss: "#1572b6",
      less: "#1572b6",
      sql: "#336791",
      shell: "#89e051",
      bash: "#89e051",
      sh: "#89e051",
      zsh: "#89e051",
      json: "#6b7280",
      yaml: "#cb171e",
      yml: "#cb171e",
      markdown: "#8b949e",
      md: "#8b949e",
      mermaid: "#00bfa5",
    };
    return colorMap[key] ?? "";
  }, [language]);

  const displayLanguage = useMemo(() => {
    if (!language) return "Code";
    return language
      .replace(/_/g, "-")
      .split(/[-\s]+/)
      .filter(Boolean)
      .map((segment: string) =>
        segment.length === 0
          ? segment
          : segment[0].toUpperCase() + segment.slice(1)
      )
      .join(" ");
  }, [language]);

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
    <div className={`code-block${wrapped ? " is-wrapped" : ""}`}>
      <div className="code-head">
        <div className="code-lang">
          <span
            className="lang-dot"
            style={languageColor ? { backgroundColor: languageColor } : undefined}
          />
          <span className="lang-name">{displayLanguage}</span>
        </div>
        <div className="code-actions">
          <button
            type="button"
            onClick={() => setWrapped((prev) => !prev)}
            aria-pressed={wrapped}
            aria-label={wrapped ? "取消换行" : "自动换行"}
            title={wrapped ? "取消换行" : "自动换行"}
            className={`icon-button wrap-toggle${wrapped ? " is-active" : ""}`}
          >
            <svg aria-hidden="true" viewBox="0 0 16 16" fill="none">
              <path
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.5"
                d="M1 13h3M1 3h14"
              ></path>
              <path
                fill="currentColor"
                fillRule="evenodd"
                d="M1 7.25a.75.75 0 0 0 0 1.5h11.5a1.75 1.75 0 1 1 0 3.5H9.536v-.464a.679.679 0 0 0-1.086-.543l-1.619 1.214a.68.68 0 0 0 0 1.086l1.619 1.214a.679.679 0 0 0 1.086-.543v-.464H12.5a3.25 3.25 0 0 0 0-6.5z"
                clipRule="evenodd"
              ></path>
            </svg>
          </button>
          <button
            type="button"
            onClick={handleCopy}
            aria-label="复制代码"
            title={copied ? "已复制" : "复制代码"}
            className={`icon-button copy-code${copied ? " copied" : ""}`}
          >
            <svg aria-hidden="true" viewBox="0 0 16 16" fill="currentColor">
              <path d="M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 0 1 0 1.5h-1.5a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-1.5a.75.75 0 0 1 1.5 0v1.5A1.75 1.75 0 0 1 9.25 16h-7.5A1.75 1.75 0 0 1 0 14.25Z"></path>
              <path d="M5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0 1 14.25 11h-7.5A1.75 1.75 0 0 1 5 9.25Zm1.75-.25a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-7.5a.25.25 0 0 0-.25-.25Z"></path>
            </svg>
          </button>
        </div>
      </div>
      <div className="code-body">
        <pre
          {...props}
          className={`${props.className ?? ""}`}
        />
      </div>
    </div>
  );
};
