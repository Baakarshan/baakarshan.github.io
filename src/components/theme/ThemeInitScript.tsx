// 首屏主题初始化脚本：
// - 读取 localStorage 中用户手动选择的主题
// - 若无手动选择则跟随系统主题
// - 在 React 水合前提前写入 html.class，避免首屏闪烁
const THEME_KEY = "theme-preference";

const themeInitScript = `
(() => {
  try {
    const stored = localStorage.getItem("${THEME_KEY}");
    const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const resolved =
      stored === "light" || stored === "dark"
        ? stored
        : systemDark
        ? "dark"
        : "light";

    const root = document.documentElement;
    root.classList.remove("theme-dark", "theme-light");
    root.classList.add(resolved === "dark" ? "theme-dark" : "theme-light");
    root.dataset.theme = resolved;
  } catch {}
})();
`.trim();

export const ThemeInitScript = () => (
  <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
);
