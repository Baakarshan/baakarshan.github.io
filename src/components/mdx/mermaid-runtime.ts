import mermaid from "mermaid";

export type MermaidTheme = "dark" | "light";

type MermaidRenderResult = {
  svg: string;
  bindFunctions?: (element: Element) => void;
};

let lastTheme: MermaidTheme | null = null;
let initialized = false;
let renderQueue: Promise<unknown> = Promise.resolve();

// Mermaid 在处理带 subgraph 的 flowchart 时会在内部 structuredClone edge。
// 某些版本会把 d3 curve 函数挂在 edge 上，导致 structuredClone 抛 DataCloneError。
// 这里提供一个“保留函数引用”的安全 clone，并在渲染期间临时打补丁。
const nativeStructuredClone =
  typeof globalThis !== "undefined" ? globalThis.structuredClone : undefined;

const clonePreservingFunctions = (value: any, seen = new Map<any, any>()): any => {
  if (typeof value === "function") return value;
  if (value === null || typeof value !== "object") return value;
  if (seen.has(value)) return seen.get(value);

  const output: Record<string, unknown> = (Array.isArray(value) ? [] : {}) as Record<string, unknown>;
  seen.set(value, output);

  for (const [key, val] of Object.entries(value)) {
    output[key] = clonePreservingFunctions(val, seen);
  }

  return output;
};

const safeStructuredClone = <T,>(value: T): T => {
  if (typeof nativeStructuredClone === "function") {
    try {
      return nativeStructuredClone(value);
    } catch {
      return clonePreservingFunctions(value) as T;
    }
  }
  return clonePreservingFunctions(value) as T;
};

const withSafeStructuredClone = async <T,>(task: () => Promise<T>): Promise<T> => {
  const original = typeof globalThis !== "undefined" ? globalThis.structuredClone : undefined;
  if (typeof original === "function") {
    (globalThis as typeof globalThis & { structuredClone: typeof safeStructuredClone }).structuredClone =
      safeStructuredClone as typeof original;
  }

  try {
    return await task();
  } finally {
    if (typeof original === "function") {
      (globalThis as typeof globalThis & { structuredClone: typeof original }).structuredClone =
        original;
    }
  }
};

// Mermaid code 里常见会写 `&lt;T&gt;` 来避免在 MDX/HTML 场景下被当作标签。
// 在 strict + htmlLabels=false 的组合下，这些实体会以字面量显示出来。
// 这里做一次轻量解码（最多两轮）来兼容 `&amp;lt;` 这类双重转义。
const decodeMermaidEntities = (input: string) => {
  let value = input;
  for (let round = 0; round < 2; round += 1) {
    const next = value
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, "\"")
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, " ");
    if (next === value) break;
    value = next;
  }
  return value;
};

const decodeSvgEntitiesOnce = (input: string) =>
  input
    .replace(/&amp;lt;/g, "&lt;")
    .replace(/&amp;gt;/g, "&gt;")
    .replace(/&amp;quot;/g, "&quot;")
    .replace(/&amp;#39;/g, "&#39;")
    .replace(/&amp;nbsp;/g, "&nbsp;");

const getConfig = (theme: MermaidTheme) => {
  const isDark = theme === "dark";
  const linkColor = isDark ? "#7d8590" : "#57606a";
  const titleColor = isDark ? "#e6edf3" : "#24292f";

  return {
    startOnLoad: false,
    theme: isDark ? "dark" : "default",
    securityLevel: "strict",
    themeVariables: {
      background: "transparent",
      clusterBkg: "transparent",
      clusterBorder: linkColor,
      lineColor: linkColor,
      defaultLinkColor: linkColor,
      arrowheadColor: linkColor,
      titleColor,
    },
    fontFamily: "Noto Sans SC, sans-serif",
    htmlLabels: false,
    flowchart: {
      htmlLabels: false,
      subGraphTitleMargin: { top: 14, bottom: 16 },
      padding: 12,
      nodeSpacing: 30,
      rankSpacing: 30,
    },
  };
};

const ensureInitialized = (theme: MermaidTheme) => {
  if (initialized && lastTheme === theme) return;
  mermaid.initialize(getConfig(theme));
  initialized = true;
  lastTheme = theme;
};

const runSerial = <T,>(task: () => Promise<T>): Promise<T> => {
  const next = renderQueue.then(task, task);
  renderQueue = next.catch(() => {});
  return next;
};

export const renderMermaidSvg = ({
  id,
  code,
  theme,
}: {
  id: string;
  code: string;
  theme: MermaidTheme;
}): Promise<MermaidRenderResult> => {
  return runSerial(async () => {
    return withSafeStructuredClone(async () => {
      ensureInitialized(theme);
      const normalizedCode = decodeMermaidEntities(code);
      await Promise.resolve(mermaid.parse(normalizedCode));
      const result = await mermaid.render(id, normalizedCode);
      return {
        ...result,
        svg: decodeSvgEntitiesOnce(result.svg),
      };
    });
  });
};
