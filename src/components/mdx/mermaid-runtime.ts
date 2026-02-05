import mermaid from "mermaid";

export type MermaidTheme = "dark" | "light";

type MermaidRenderResult = {
  svg: string;
  bindFunctions?: (element: Element) => void;
};

let lastTheme: MermaidTheme | null = null;
let initialized = false;
let renderQueue: Promise<unknown> = Promise.resolve();

const getConfig = (theme: MermaidTheme) => ({
  startOnLoad: false,
  theme: theme === "dark" ? "dark" : "default",
  securityLevel: "strict",
  themeVariables: {
    background: "transparent",
  },
  fontFamily: "Noto Sans SC, sans-serif",
  flowchart: { htmlLabels: false },
  sequence: { htmlLabels: false },
  classDiagram: { htmlLabels: false },
});

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
    ensureInitialized(theme);
    await Promise.resolve(mermaid.parse(code));
    return mermaid.render(id, code);
  });
};
