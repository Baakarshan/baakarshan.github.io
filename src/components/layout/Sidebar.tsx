"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  BookText,
  ChevronDown,
  ChevronRight,
  FolderClosed,
  Github,
  Home,
  Search,
  User,
} from "lucide-react";

import { ContentTreeNode, Locale } from "@/lib/posts";
import { siteConfig } from "@/lib/site";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

// LocalStorage key：侧边栏折叠状态与目录展开状态
// - 保证刷新后仍保持用户上次的侧边栏状态
const SIDEBAR_COLLAPSED_KEY = "sidebar-collapsed";
const SIDEBAR_OPEN_KEY = "sidebar-open";

// 通过路径判断语言（/zh 开头即中文）
// - 仅依赖路径前缀，不做自动重定向
const getLocaleFromPath = (pathname: string) =>
  pathname.startsWith("/zh") ? "zh" : "en";

const toBasePath = (locale: Locale) => (locale === "zh" ? "/zh" : "");

// 统一带尾斜杠的路径（与 trailingSlash: true 一致）
const withTrailingSlash = (value: string) =>
  value === "/" ? "/" : value.endsWith("/") ? value : `${value}/`;

// 统一用于 active 判断的路径归一化
const normalizePath = (value: string) =>
  value !== "/" && value.endsWith("/") ? value.slice(0, -1) : value;

// 拼接内容页链接（与文件结构一致）
// - 与 buildTree 生成的 slug 保持一致
const buildHref = (locale: Locale, slug: string[]) => {
  const base = toBasePath(locale);
  if (slug.length === 0) return base ? `${base}/` : "/";
  return withTrailingSlash(`${base}/${slug.join("/")}`);
};

// 抽象 localStorage 持久化状态
// - 组件内复用，避免重复读写逻辑
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
  activePath: string;
  collapsed: boolean;
};

const SidebarTree = ({
  nodes,
  locale,
  openMap,
  setOpenMap,
  activePath,
  collapsed,
}: TreeProps) => {
  // 展开/折叠某个目录节点
  // - 以 locale + slug 作为唯一 key
  const toggleFolder = (key: string) => {
    setOpenMap({
      ...openMap,
      [key]: !openMap[key],
    });
  };

  return (
    <ul className="space-y-1">
      {nodes.map((node) => {
        // 节点唯一键（用于持久化展开状态）
        const key = `${locale}/${node.slug.join("/")}`;
        const isOpen = openMap[key] ?? true;
        const href = buildHref(locale, node.slug);
        const isActive =
          normalizePath(activePath) === normalizePath(href);
        const label = node.displayName;

        if (node.type === "folder") {
          return (
            <li key={key}>
              <div
                className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-[var(--color-fg-muted)] hover:bg-[var(--color-item-hover)] ${
                  collapsed ? "justify-center" : "justify-between"
                }`}
              >
                <Link
                  href={href}
                  className={`flex items-center gap-2 ${
                    collapsed ? "justify-center" : ""
                  }`}
                  title={node.displayName}
                >
                  <FolderClosed size={14} />
                  {!collapsed && <span className="truncate">{label}</span>}
                </Link>
                {!collapsed && (
                  <button
                    type="button"
                    onClick={() => toggleFolder(key)}
                    className="ml-auto text-[var(--color-fg-muted)] hover:text-[var(--color-fg-default)]"
                    aria-expanded={isOpen}
                    aria-label="Toggle folder"
                  >
                    {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </button>
                )}
              </div>
              {isOpen && !collapsed ? (
                <div className="ml-3 border-l border-[var(--color-border-default)] pl-2">
                  <SidebarTree
                    nodes={node.children ?? []}
                    locale={locale}
                    openMap={openMap}
                    setOpenMap={setOpenMap}
                    activePath={activePath}
                    collapsed={collapsed}
                  />
                </div>
              ) : null}
            </li>
          );
        }

        return (
          <li key={key}>
            <Link
              href={href}
              className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-xs ${
                isActive
                  ? "bg-[var(--color-item-hover)] text-[var(--color-fg-default)]"
                  : "text-[var(--color-fg-muted)] hover:bg-[var(--color-item-hover)]"
              } ${collapsed ? "justify-center" : ""}`}
              title={node.displayName}
            >
              <BookText size={14} />
              {!collapsed && <span className="truncate">{label}</span>}
            </Link>
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
  const locale = getLocaleFromPath(pathname);
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

  // 进入页面时自动展开当前路径上的目录链路
  // - 仅处理当前语言路径
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
  const navItems = useMemo(() => {
    const base = toBasePath(locale);
    const homeHref = base ? `${base}/` : "/";
    return [
      { href: homeHref, label: locale === "zh" ? "首页" : "Home", icon: Home },
      {
        href: withTrailingSlash(`${base}/directory`),
        label: locale === "zh" ? "目录" : "Directory",
        icon: BookText,
      },
      {
        href: withTrailingSlash(`${base}/search`),
        label: locale === "zh" ? "搜索" : "Search",
        icon: Search,
      },
      {
        href: withTrailingSlash(`${base}/resume`),
        label: locale === "zh" ? "简历" : "Resume",
        icon: User,
      },
    ];
  }, [locale]);

  return (
    <aside
      className={`flex h-screen flex-col border-r border-[var(--color-border-default)] bg-[var(--color-canvas-inset)] px-3 py-4 transition-all ${
        collapsed ? "w-[72px]" : "w-[280px]"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className={`flex items-center gap-2 ${collapsed ? "justify-center" : ""}`}>
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[var(--color-canvas-subtle)] text-xs font-semibold">
            <Github size={16} />
          </div>
          {!collapsed && (
            <div>
              <div className="text-xs font-semibold text-[var(--color-fg-default)]">
                {siteConfig.name}
              </div>
              <div className="text-[10px] text-[var(--color-fg-muted)]">
                Copilot-style knowledge base
              </div>
            </div>
          )}
        </div>
        {!collapsed && <ThemeToggle />}
      </div>

      <button
        type="button"
        className={`mt-4 flex items-center gap-2 rounded-md border border-[var(--color-border-default)] bg-[var(--color-canvas-subtle)] px-2 py-1.5 text-xs text-[var(--color-fg-default)] hover:bg-[var(--color-item-hover)] ${
          collapsed ? "justify-center" : ""
        }`}
      >
        {/* 仅做视觉占位，不绑定实际新建行为 */}
        {!collapsed && <span>New Chat</span>}
        {collapsed && <span>+</span>}
      </button>

      <div className="mt-4 space-y-1">
        {navItems.map((item) => {
          const isActive =
            normalizePath(pathname) === normalizePath(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-xs ${
                isActive
                  ? "bg-[var(--color-item-hover)] text-[var(--color-fg-default)]"
                  : "text-[var(--color-fg-muted)] hover:bg-[var(--color-item-hover)]"
              } ${collapsed ? "justify-center" : ""}`}
            >
              <Icon size={14} />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </div>

      {!collapsed && (
        <div className="mt-6 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-fg-muted)]">
          {locale === "zh" ? "知识库" : "Knowledge Base"}
        </div>
      )}

      <div className="mt-2 flex-1 overflow-y-auto pr-1">
        {/* 语言对应的目录树 */}
        <SidebarTree
          nodes={trees[locale] ?? []}
          locale={locale}
          openMap={openMap}
          setOpenMap={setOpenMap}
          activePath={pathname}
          collapsed={collapsed}
        />
      </div>

      <div className="mt-4 flex items-center gap-2 rounded-md border border-[var(--color-border-default)] bg-[var(--color-canvas-subtle)] px-2 py-2 text-xs text-[var(--color-fg-muted)]">
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--color-item-hover)] text-[10px]">
          BK
        </div>
        {!collapsed && (
          <div>
            <div className="text-[11px] text-[var(--color-fg-default)]">Baakarshan</div>
            <div className="text-[10px] text-[var(--color-fg-muted)]">Engineer</div>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        className={`mt-3 flex items-center gap-2 rounded-md border border-[var(--color-border-default)] bg-[var(--color-canvas-subtle)] px-2 py-1 text-xs text-[var(--color-fg-default)] hover:bg-[var(--color-item-hover)] ${
          collapsed ? "justify-center" : ""
        }`}
      >
        {collapsed ? "+" : "收起侧边栏"}
      </button>
    </aside>
  );
};
