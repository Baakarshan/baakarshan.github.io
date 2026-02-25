"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { ContentTreeNode, Locale } from "@/lib/posts";
import { useTheme } from "@/components/theme/ThemeProvider";

// LocalStorage key：侧边栏折叠状态与目录展开状态
// - 保证刷新后仍保持用户上次的侧边栏状态
// - 与 TocCard 共享开关事件，保持正文前目录同步
const SIDEBAR_COLLAPSED_KEY = "sidebar-collapsed";
const SIDEBAR_OPEN_KEY = "sidebar-open";
const PROFILE_POPOVER_ONCE_KEY = "profile-popover-open-once";
const TOC_ENABLED_KEY = "toc-enabled";
const CONTENT_WIDTH_OPTIONS = [
  { label: "默认", value: "820px" },
  { label: "较窄", value: "720px" },
  { label: "较宽", value: "960px" },
];
const BLOCK_SHADOW_OPTIONS = [
  { label: "默认", value: "default" },
  { label: "无", value: "none" },
  { label: "稍重", value: "heavy" },
];

// 通过路径判断语言（/zh 开头即中文）
// - 仅依赖路径前缀，不做自动重定向
// - 任何未知路径默认落入英文，避免误判导致跳转
const getLocaleFromPath = (pathname: string) =>
  pathname.startsWith("/zh") ? "zh" : "en";

const toBasePath = (locale: Locale) => (locale === "zh" ? "/zh" : "");

// 统一带尾斜杠的路径（与 trailingSlash: true 一致）
// - 保证静态导出时不会出现无斜杠的 404
const withTrailingSlash = (value: string) =>
  value === "/" ? "/" : value.endsWith("/") ? value : `${value}/`;

// 统一用于 active 判断的路径归一化
// - 仅用于高亮判断，避免因尾斜杠差异导致状态不一致
const normalizePath = (value: string) =>
  value !== "/" && value.endsWith("/") ? value.slice(0, -1) : value;
const safeDecodePath = (value: string) => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};
const toSlugSegments = (value: string) => {
  const decoded = safeDecodePath(value);
  const withoutLocale = decoded.replace(/^\/zh(\/|$)/, "/");
  return withoutLocale.split("/").filter(Boolean);
};
const isSameSlug = (a: string[], b: string[]) =>
  a.length === b.length && a.every((part, index) => part === b[index]);

// 拼接内容页链接（与文件结构一致）
// - 与 buildTree 生成的 slug 保持一致
const buildHref = (locale: Locale, slug: string[]) => {
  const base = toBasePath(locale);
  if (slug.length === 0) return base ? `${base}/` : "/";
  return withTrailingSlash(`${base}/${slug.join("/")}`);
};

// 抽象 localStorage 持久化状态
// - 组件内复用，避免重复读写逻辑
// - 统一走 JSON 序列化，支持 boolean / object
const useLocalStorageState = <T,>(key: string, initialValue: T) => {
  const [value, setValue] = useState<T>(initialValue);

  // 首次挂载：从 localStorage 读取
  // - JSON 解析失败则回退为初始值
  useEffect(() => {
    const stored = localStorage.getItem(key);
    if (!stored) return;
    try {
      setValue(JSON.parse(stored));
    } catch {
      setValue(initialValue);
    }
  }, [key]);

  // 状态变化：写入 localStorage
  // - 保证用户偏好持久化
  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue] as const;
};

type TreeProps = {
  nodes: ContentTreeNode[];
  locale: Locale;
  openMap: Record<string, boolean>;
  setOpenMap: (next: Record<string, boolean>) => void;
  activeSegments: string[];
  collapsed: boolean;
  depth?: number;
};

const SidebarTree = ({
  nodes,
  locale,
  openMap,
  setOpenMap,
  activeSegments,
  collapsed,
  depth = 0,
}: TreeProps) => {
  // 展开/折叠某个目录节点
  // - 以 locale + slug 作为唯一 key
  // - 保证中英文目录树之间状态隔离
  const toggleFolder = (key: string) => {
    setOpenMap({
      ...openMap,
      [key]: !openMap[key],
    });
  };

  return (
    <ul className="tree">
      {nodes.map((node) => {
        // 节点唯一键（用于持久化展开状态）
        // - 结构变化时仍能尽量保持已展开的目录
        const key = `${locale}/${node.slug.join("/")}`;
        const isOpen = openMap[key] ?? true;
        const href = buildHref(locale, node.slug);
        const label = node.displayName;
        const levelClass =
          depth === 0 ? "" : depth === 1 ? "level-1" : "level-2";
        // 当前节点判定：用于高亮当前页面对应的树节点
        const isCurrentNode = isSameSlug(activeSegments, node.slug);
        const hasChildren = (node.children?.length ?? 0) > 0;

        if (node.type === "folder") {
          return (
            <li key={key}>
              <div
                className={`tree-item ${levelClass}${isCurrentNode ? " is-current" : ""}`}
              >
                {hasChildren ? (
                  <button
                    type="button"
                    className={`tree-toggle${isOpen ? " is-open" : ""}`}
                    onClick={() => toggleFolder(key)}
                    aria-expanded={isOpen}
                    aria-label={isOpen ? "收起目录" : "展开目录"}
                  >
                    <span className="tree-toggle-icon" aria-hidden="true" />
                  </button>
                ) : (
                  <span className="tree-toggle-spacer" aria-hidden="true" />
                )}
                <Link href={href} className="tree-link">
                  <span className="label">{label}</span>
                </Link>
              </div>
              {isOpen && !collapsed ? (
                <div>
                  <SidebarTree
                    nodes={node.children ?? []}
                    locale={locale}
                    openMap={openMap}
                    setOpenMap={setOpenMap}
                    activeSegments={activeSegments}
                    collapsed={collapsed}
                    depth={depth + 1}
                  />
                </div>
              ) : null}
            </li>
          );
        }

        return (
          <li key={key}>
            <div
              className={`tree-item ${levelClass}${isCurrentNode ? " is-current" : ""}`}
            >
              <span className="tree-toggle-spacer" aria-hidden="true" />
              <Link href={href} className="tree-link">
                <span className="label">{label}</span>
              </Link>
            </div>
          </li>
        );
      })}
    </ul>
  );
};

export const Sidebar = ({
  trees,
}: {
  trees: Record<Locale, ContentTreeNode[]>;
}) => {
  const pathname = usePathname() ?? "/";
  const router = useRouter();
  const locale = getLocaleFromPath(pathname);
  const activeSegments = toSlugSegments(pathname);
  // 侧边栏折叠状态（持久化）
  const [collapsed, setCollapsed] = useLocalStorageState(
    SIDEBAR_COLLAPSED_KEY,
    false
  );
  // 目录展开状态（持久化）
  const [openMap, setOpenMap] = useLocalStorageState<Record<string, boolean>>(
    SIDEBAR_OPEN_KEY,
    {}
  );
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement | null>(null);
  const { resolvedTheme, toggle } = useTheme();
  const [contentWidthIndex, setContentWidthIndex] = useState(0);
  const [blockShadowIndex, setBlockShadowIndex] = useState(0);
  const [tocEnabled, setTocEnabled] = useLocalStorageState(
    TOC_ENABLED_KEY,
    false
  );
  const [mounted, setMounted] = useState(false);

  const handleLanguageSwitch = () => {
    // 语言切换后自动打开个人菜单（仅一次），方便继续切换主题/宽度等
    const target = locale === "zh" ? "/" : "/zh/";
    localStorage.setItem(PROFILE_POPOVER_ONCE_KEY, "1");
    router.push(target);
  };

  useEffect(() => {
    // 点击外部区域关闭个人菜单
    const handleClickOutside = (event: MouseEvent) => {
      if (!profileRef.current) return;
      if (!profileRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    // 标记已挂载，避免依赖浏览器 API 的逻辑提前执行
    setMounted(true);
  }, []);

  useEffect(() => {
    // 语言切换后自动展开一次个人菜单（只触发一次）
    const shouldOpen = localStorage.getItem(PROFILE_POPOVER_ONCE_KEY) === "1";
    if (!shouldOpen) return;
    setProfileOpen(true);
    localStorage.removeItem(PROFILE_POPOVER_ONCE_KEY);
  }, []);

  useEffect(() => {
    // 正文宽度：通过 CSS 变量控制，避免引入额外 class 切换
    const width = CONTENT_WIDTH_OPTIONS[contentWidthIndex]?.value ?? "820px";
    document.documentElement.style.setProperty("--content-max-width", width);
  }, [contentWidthIndex]);

  useEffect(() => {
    // 代码块/图表阴影：统一通过 CSS 变量控制视觉层级
    const mode = BLOCK_SHADOW_OPTIONS[blockShadowIndex]?.value ?? "default";
    const root = document.documentElement;
    if (mode === "none") {
      root.style.setProperty("--code-block-shadow", "none");
      root.style.setProperty("--mermaid-block-shadow", "none");
      return;
    }
    if (mode === "heavy") {
      root.style.setProperty("--code-block-shadow", "var(--block-shadow-heavy)");
      root.style.setProperty(
        "--mermaid-block-shadow",
        "var(--block-shadow-heavy)"
      );
      return;
    }
    root.style.setProperty(
      "--code-block-shadow",
      "var(--code-block-shadow-default)"
    );
    root.style.setProperty(
      "--mermaid-block-shadow",
      "var(--mermaid-block-shadow-default)"
    );
  }, [blockShadowIndex]);

  const toggleTocEnabled = () => {
    // 与 TocCard 使用同一 key，并通过自定义事件通知实时更新
    const next = !tocEnabled;
    setTocEnabled(next);
    try {
      localStorage.setItem(TOC_ENABLED_KEY, JSON.stringify(next));
    } catch {
      // 忽略存储失败，保持内存态
    }
    window.dispatchEvent(
      new CustomEvent("toc-enabled-change", { detail: next })
    );
  };

  // 进入页面时自动展开当前路径上的目录链路
  // - 仅处理当前语言路径
  // - 保证新页面能看到当前位置的目录上下文
  useEffect(() => {
    const segments = pathname.replace(/^\/zh/, "").split("/").filter(Boolean);
    if (segments.length === 0) return;
    setOpenMap((previous) => {
      const updates: Record<string, boolean> = { ...previous };
      segments.forEach((_, index) => {
        const key = `${locale}/${segments.slice(0, index + 1).join("/")}`;
        updates[key] = true;
      });
      return updates;
    });
  }, [pathname, locale]);

  // 顶部导航（Home/Directory/Search/Resume）
  // - 与路由保持一致，统一追加尾斜杠
  // - 图标采用内联 SVG，避免额外依赖
  const navItems = useMemo(() => {
    const base = toBasePath(locale);
    const homeHref = base ? `${base}/` : "/";
    return [
      {
        href: homeHref,
        label: locale === "zh" ? "首页" : "Home",
        icon: (
          <svg aria-hidden="true" viewBox="0 0 16 16" fill="none">
            <path
              d="M2.5 7.25L8 2.5l5.5 4.75v6.25a.5.5 0 0 1-.5.5H3a.5.5 0 0 1-.5-.5V7.25Z"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinejoin="round"
            />
            <path
              d="M6 14V9.5h4V14"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinejoin="round"
            />
          </svg>
        ),
      },
      {
        href: withTrailingSlash(`${base}/directory`),
        label: locale === "zh" ? "目录" : "Directory",
        icon: (
          <svg aria-hidden="true" viewBox="0 0 16 16" fill="none">
            <path
              d="M2.5 4.5h4l1.5 1.5h5.5a.5.5 0 0 1 .5.5v5.5a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5V5a.5.5 0 0 1 .5-.5Z"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinejoin="round"
            />
          </svg>
        ),
      },
      {
        href: withTrailingSlash(`${base}/search`),
        label: locale === "zh" ? "搜索" : "Search",
        icon: (
          <svg aria-hidden="true" viewBox="0 0 16 16" fill="none">
            <circle cx="7" cy="7" r="3.75" stroke="currentColor" strokeWidth="1.4" />
            <path
              d="M10.5 10.5L13.5 13.5"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
          </svg>
        ),
      },
      {
        href: withTrailingSlash(`${base}/resume`),
        label: locale === "zh" ? "简历" : "Resume",
        icon: (
          <svg aria-hidden="true" viewBox="0 0 16 16" fill="none">
            <path
              d="M4 2.5h6l2.5 2.5V13a.5.5 0 0 1-.5.5H4a.5.5 0 0 1-.5-.5V3a.5.5 0 0 1 .5-.5Z"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinejoin="round"
            />
            <path
              d="M10 2.5V5h2.5"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinejoin="round"
            />
          </svg>
        ),
      },
    ];
  }, [locale]);

  return (
    <aside
      className={`sidebar${collapsed ? " is-collapsed" : ""}`}
    >
      <div className="sidebar-header">
        <a
          className="github-logo"
          href="https://github.com/Baakarshan/baakarshan.github.io"
          target="_blank"
          rel="noreferrer"
          aria-label="GitHub"
        >
          <svg
            aria-hidden="true"
            focusable="false"
            className="octicon octicon-mark-github"
            viewBox="0 0 24 24"
            width="32"
            height="32"
            fill="currentColor"
            display="inline-block"
            overflow="visible"
            style={{ verticalAlign: "text-bottom" }}
          >
            <path d="M12 1C5.923 1 1 5.923 1 12c0 4.867 3.149 8.979 7.521 10.436.55.096.756-.233.756-.522 0-.262-.013-1.128-.013-2.049-2.764.509-3.479-.674-3.699-1.292-.124-.317-.66-1.293-1.127-1.554-.385-.207-.936-.715-.014-.729.866-.014 1.485.797 1.691 1.128.99 1.663 2.571 1.196 3.204.907.096-.715.385-1.196.701-1.471-2.448-.275-5.005-1.224-5.005-5.432 0-1.196.426-2.186 1.128-2.956-.111-.275-.496-1.402.11-2.915 0 0 .921-.288 3.024 1.128a10.193 10.193 0 0 1 2.75-.371c.936 0 1.871.123 2.75.371 2.104-1.43 3.025-1.128 3.025-1.128.605 1.513.221 2.64.111 2.915.701.77 1.127 1.747 1.127 2.956 0 4.222-2.571 5.157-5.019 5.432.399.344.743 1.004.743 2.035 0 1.471-.014 2.654-.014 3.025 0 .289.206.632.756.522C19.851 20.979 23 16.854 23 12c0-6.077-4.922-11-11-11Z"></path>
          </svg>
        </a>
        <div className="brand-title">Baakarshan Home</div>
      </div>

      <div className="sidebar-section">
        {navItems.map((item) => {
          const isActive =
            normalizePath(pathname) === normalizePath(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-item side-item${isActive ? " active" : ""}`}
            >
              <span className="side-icon">{item.icon}</span>
              <span className="side-text">{item.label}</span>
            </Link>
          );
        })}
      </div>

      <div className="divider"></div>
      <div className="section-title">{locale === "zh" ? "知识库目录" : "Knowledge Base"}</div>
      <div className="tree-scroll">
        <SidebarTree
          nodes={trees[locale] ?? []}
          locale={locale}
          openMap={openMap}
          setOpenMap={setOpenMap}
          activeSegments={activeSegments}
          collapsed={collapsed}
          depth={0}
        />
      </div>

      <div className="divider footer-divider"></div>
      <div className="sidebar-footer">
        <button
          className="footer-item side-item collapse-trigger"
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? "展开" : "收起"}
          title={collapsed ? "展开" : "收起"}
        >
          <span className="side-icon">
            <svg className="collapse-icon" aria-hidden="true" focusable="false" viewBox="0 0 16 16" fill="currentColor">
              <path d="m4.177 7.823 2.396-2.396A.25.25 0 0 1 7 5.604v4.792a.25.25 0 0 1-.427.177L4.177 8.177a.25.25 0 0 1 0-.354Z"></path>
              <path d="M0 1.75C0 .784.784 0 1.75 0h12.5C15.216 0 16 .784 16 1.75v12.5A1.75 1.75 0 0 1 14.25 16H1.75A1.75 1.75 0 0 1 0 14.25Zm1.75-.25a.25.25 0 0 0-.25.25v12.5c0 .138.112.25.25.25H9.5v-13Zm12.5 13a.25.25 0 0 0 .25-.25V1.75a.25.25 0 0 0-.25-.25H11v13Z"></path>
            </svg>
            <svg className="expand-icon" aria-hidden="true" focusable="false" viewBox="0 0 16 16" fill="currentColor">
              <path d="m11.823 8.177-2.396 2.396A.25.25 0 0 1 9 10.396V5.604a.25.25 0 0 1 .427-.177l2.396 2.396a.25.25 0 0 1 0 .354Z"></path>
              <path d="M0 1.75C0 .784.784 0 1.75 0h12.5C15.216 0 16 .784 16 1.75v12.5A1.75 1.75 0 0 1 14.25 16H1.75A1.75 1.75 0 0 1 0 14.25Zm1.75-.25a.25.25 0 0 0-.25.25v12.5c0 .138.112.25.25.25H9.5v-13Zm12.5 13a.25.25 0 0 0 .25-.25V1.75a.25.25 0 0 0-.25-.25H11v13Z"></path>
            </svg>
          </span>
          <span className="side-text">收起</span>
        </button>
        <div
          ref={profileRef}
          className={`profile${profileOpen ? " pinned" : ""}`}
        >
          <button
            className="footer-item side-item profile-trigger"
            type="button"
            onClick={() => setProfileOpen((prev) => !prev)}
          >
            <img className="side-avatar" src="/picture.jpg" alt="Baakarshan" />
            <span className="side-text">个人</span>
          </button>
          <div className="profile-popover">
            <div className="profile-card">
              <img className="profile-avatar" src="/picture.jpg" alt="Baakarshan" />
              <div>
                <div className="profile-name">Baakarshan</div>
                <div className="meta">Knowledge Base</div>
              </div>
            </div>
            <div className="profile-actions">
              <button type="button" onClick={handleLanguageSwitch}>
                切换中文 / English
              </button>
              {mounted ? (
                <button type="button" onClick={toggle}>
                  {resolvedTheme === "dark"
                    ? "更改主题（亮色）"
                    : "更改主题（深色）"}
                </button>
              ) : null}
              <button
                type="button"
                onClick={() =>
                  setContentWidthIndex(
                    (prev) => (prev + 1) % CONTENT_WIDTH_OPTIONS.length
                  )
                }
              >
                正文宽度：{CONTENT_WIDTH_OPTIONS[contentWidthIndex].label}
              </button>
              <button
                type="button"
                onClick={() =>
                  setBlockShadowIndex(
                    (prev) => (prev + 1) % BLOCK_SHADOW_OPTIONS.length
                  )
                }
              >
                边框阴影：{BLOCK_SHADOW_OPTIONS[blockShadowIndex].label}
              </button>
              <button type="button" onClick={toggleTocEnabled}>
                正文前目录：{tocEnabled ? "启用" : "不启用"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};
