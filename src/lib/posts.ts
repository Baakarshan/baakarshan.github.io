import fs from "fs";
import path from "path";
import matter from "gray-matter";
import GithubSlugger from "github-slugger";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkMdx from "remark-mdx";
import { visit } from "unist-util-visit";
import {
  getFrontmatterSlugSegment,
  normalizeDate,
  stripExtension,
  toSlugSegment,
} from "./content-utils.mjs";

// 文章与目录树的核心数据读取逻辑（构建期/服务端执行）
// - 统一负责：slug 解析、目录树构建、文章元信息抽取、TOC 生成
// - 所有计算发生在构建期，满足“零动态”要求

export type Locale = "en" | "zh";

export type PostFrontmatter = {
  title: string;
  description: string;
  date: string;
  // 排序优先级：数字越小越靠前（未填写视为 Infinity）
  priority?: number;
  draft?: boolean;
  cover?: string;
  series?: string;
  // 是否允许复制全文（默认 false）
  allowCopy?: boolean;
};

export type PostMeta = PostFrontmatter & {
  slug: string[];
  locale: Locale;
};

export type TocItem = {
  depth: number;
  value: string;
  slug: string;
};

export type PostData = PostMeta & {
  content: string;
  toc: TocItem[];
};

export type ContentTreeNode = {
  type: "folder" | "file";
  name: string;
  displayName: string;
  slug: string[];
  // 用于目录树排序的优先级（数字越小越靠前）
  priority?: number;
  children?: ContentTreeNode[];
};

// content 根目录
const contentRoot = path.join(process.cwd(), "content");

// 展示名：title 缺失时回退到文件名（仅去扩展名）
const toDisplayName = (name: string) => stripExtension(name);

// 解析 frontmatter priority：非数值时回退为 Infinity
// - 支持 number 或可转为 number 的字符串
// - 任何非法值都视为最低优先级（Infinity）
const parsePriority = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return Number.POSITIVE_INFINITY;
};

type DirectoryIndexInfo = {
  slugOverride: string | null;
  title: string;
  priority: number;
};

// 目录树排序规则：
// 1) priority 数字越小越靠前（未填写视为 Infinity）
// 2) priority 相同或缺失时，按展示名字母序排序
// 3) 兜底使用 slug 保证排序稳定（避免同名导致排序抖动）
//
// 设计说明：
// - displayName 可能来自目录页 title 或文件名，因此排序基于“展示文本”
// - localeCompare 使用中文/英文区域配置，保证中英文排序语义一致且稳定
const compareNodes = (a: ContentTreeNode, b: ContentTreeNode, locale: Locale) => {
  const aPriority = a.priority ?? Number.POSITIVE_INFINITY;
  const bPriority = b.priority ?? Number.POSITIVE_INFINITY;
  if (aPriority !== bPriority) return aPriority - bPriority;
  const sortLocale = locale === "zh" ? "zh" : "en";
  const byName = a.displayName.localeCompare(b.displayName, sortLocale, {
    sensitivity: "base",
    numeric: true,
  });
  if (byName !== 0) return byName;
  // 兜底：使用 slug 保证排序稳定
  return a.slug.join("/").localeCompare(b.slug.join("/"), sortLocale, {
    sensitivity: "base",
    numeric: true,
  });
};

// 语言根目录（content/en 或 content/zh）
const getLocaleRoot = (locale: Locale) => path.join(contentRoot, locale);

const isMdxFile = (name: string) => name.toLowerCase().endsWith(".mdx");

const listDir = (dir: string) => fs.readdirSync(dir, { withFileTypes: true });

// 递归收集所有 MDX 文件（用于生成索引与静态路由）
const getAllMdxFiles = (dir: string, files: string[] = []) => {
  for (const entry of listDir(dir)) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      getAllMdxFiles(fullPath, files);
    } else if (entry.isFile() && isMdxFile(entry.name)) {
      files.push(fullPath);
    }
  }
  return files;
};

// 读取 MDX 内容并解析 frontmatter
const readPostFile = (filePath: string) => {
  const raw = fs.readFileSync(filePath, "utf8");
  const { data, content } = matter(raw);
  return { data, content };
};

// 构建“目录同名 MDX”索引表：
// - key 为目录路径（相对 localeRoot，使用 / 连接）
// - value 包含 slug 覆盖、标题与 priority
//
// 用途说明：
// - 目录页（同名 MDX）可作为目录节点的显示名与排序来源
// - 目录级 slug 覆盖会影响其下所有子路径
const buildDirectoryIndexMap = (localeRoot: string) => {
  const map = new Map<string, DirectoryIndexInfo>();
  const files = getAllMdxFiles(localeRoot);

  for (const filePath of files) {
    const relative = path.relative(localeRoot, filePath);
    const segments = relative.split(path.sep);
    if (segments.length < 2) continue;

    const fileSegment = toSlugSegment(segments[segments.length - 1]);
    const parentSegment = segments[segments.length - 2];
    // 仅处理“目录同名 MDX”作为目录页
    if (fileSegment !== parentSegment) continue;

    const { data } = readPostFile(filePath);
    if (data.draft) continue;

    const dirKey = segments.slice(0, -1).join("/");
    const title = typeof data.title === "string" ? data.title.trim() : "";
    map.set(dirKey, {
      slugOverride: getFrontmatterSlugSegment(data),
      title,
      priority: parsePriority(data.priority),
    });
  }

  return map;
};

// 生成文章 slug：支持目录级 slug 覆盖
// - 目录同名 MDX：使用目录 slug（可被 frontmatter 覆盖）
// - 普通文章：目录段先应用覆盖，再处理自身 slug 覆盖
//
// 关键点：
// - slug 仅去扩展名，不剥离数字前缀
// - 目录级覆盖优先于文章级覆盖（保证路径层级一致）
const buildSlugSegmentsFromPath = (
  filePath: string,
  localeRoot: string,
  data: Record<string, unknown>,
  dirIndexMap: Map<string, DirectoryIndexInfo>
) => {
  const relative = path.relative(localeRoot, filePath);
  const rawSegments = relative.split(path.sep);
  const fileSegment = toSlugSegment(rawSegments[rawSegments.length - 1]);
  const dirSegments = rawSegments.slice(0, -1);

  const resolvedSegments: string[] = [];
  const dirKeySegments: string[] = [];

  // 逐级拼接目录段，应用目录级 slug 覆盖
  dirSegments.forEach((segment) => {
    dirKeySegments.push(segment);
    const key = dirKeySegments.join("/");
    const override = dirIndexMap.get(key)?.slugOverride;
    resolvedSegments.push(override ?? segment);
  });

  // 目录同名 MDX：不再追加文件段，直接复用目录 slug
  const isIndex =
    dirSegments.length > 0 &&
    fileSegment === dirSegments[dirSegments.length - 1];
  if (isIndex) {
    return resolvedSegments;
  }

  const override = getFrontmatterSlugSegment(data);
  resolvedSegments.push(override ?? fileSegment);
  return resolvedSegments;
};

// 提取标题文本（用于生成目录 TOC）
// - 递归处理 MDX AST 节点，兼容嵌套与行内代码
const extractHeadingText = (node: any): string => {
  if (!node) return "";
  if (node.type === "text" || node.type === "inlineCode") {
    return String(node.value ?? "");
  }
  if (Array.isArray(node.children)) {
    return node.children.map(extractHeadingText).join("");
  }
  return "";
};

// 解析 Markdown/MDX，提取 h1~h3 作为目录
// - 目录深度限制为 3 层，避免 TOC 过长
// - 使用 github-slugger 保证重复标题时生成稳定锚点
const extractToc = (content: string): TocItem[] => {
  const tree = unified().use(remarkParse).use(remarkMdx).parse(content);
  const slugger = new GithubSlugger();
  const items: TocItem[] = [];

  visit(tree, "heading", (node: any) => {
    if (node.depth > 3) return;
    const value = extractHeadingText(node).trim();
    if (!value) return;
    // 同一标题可能重复，使用 github-slugger 保证唯一锚点
    items.push({
      depth: node.depth,
      value,
      slug: slugger.slug(value),
    });
  });

  return items;
};

// 计算文章最终 slug（支持目录级与文章级覆盖）
const getPostSlugSegments = (
  filePath: string,
  localeRoot: string,
  data: Record<string, unknown>,
  dirIndexMap: Map<string, DirectoryIndexInfo>
) => {
  return buildSlugSegmentsFromPath(filePath, localeRoot, data, dirIndexMap);
};

// 将 slug 解析回文件路径（用于动态路由解析）
// - 遍历所有 mdx 文件（构建期可接受）
// - 忽略 draft
// - 同时考虑 frontmatter slug 覆盖规则
//
// 性能说明：
// - 该函数仅在构建/服务端调用，避免在客户端执行
const resolveSlugToFile = (localeRoot: string, slugSegments: string[]) => {
  const target = slugSegments.join("/");
  const files = getAllMdxFiles(localeRoot);
  const dirIndexMap = buildDirectoryIndexMap(localeRoot);

  for (const filePath of files) {
    const { data } = readPostFile(filePath);
    if (data.draft) continue;
    const candidate = getPostSlugSegments(
      filePath,
      localeRoot,
      data,
      dirIndexMap
    ).join("/");
    if (candidate === target) {
      return filePath;
    }
  }

  throw new Error(`未找到文章: ${slugSegments.join("/")}`);
};

// 获取语言下的全部文章元数据（用于列表、搜索与索引）
// - 自动过滤 draft
// - 统一日期格式
// - 结果按日期倒序排列
//
// 注意：allowCopy 默认为 false，仅当 frontmatter 为 true 时启用
export const getAllPosts = (locale: Locale): PostMeta[] => {
  const localeRoot = getLocaleRoot(locale);
  const files = getAllMdxFiles(localeRoot);
  const posts: PostMeta[] = [];
  const dirIndexMap = buildDirectoryIndexMap(localeRoot);

  for (const filePath of files) {
    const { data } = readPostFile(filePath);
    if (data.draft) {
      continue;
    }

    const slug = getPostSlugSegments(filePath, localeRoot, data, dirIndexMap);

    posts.push({
      title: String(data.title ?? ""),
      description: String(data.description ?? ""),
      date: normalizeDate(data.date),
      draft: Boolean(data.draft),
      cover: data.cover ? String(data.cover) : undefined,
      series: data.series ? String(data.series) : undefined,
      allowCopy: Boolean(data.allowCopy),
      slug,
      locale,
    });
  }

  posts.sort((a, b) => {
    const aTime = new Date(a.date).getTime();
    const bTime = new Date(b.date).getTime();
    return bTime - aTime;
  });

  return posts;
};

export const getAllPostSlugs = (locale: Locale) =>
  getAllPosts(locale).map((post) => post.slug);

// 根据 slug 获取完整文章内容与 TOC
export const getPostBySlug = (locale: Locale, slugSegments: string[]): PostData => {
  const localeRoot = getLocaleRoot(locale);
  const filePath = resolveSlugToFile(localeRoot, slugSegments);
  const { data, content } = readPostFile(filePath);

  return {
    title: String(data.title ?? ""),
    description: String(data.description ?? ""),
    date: normalizeDate(data.date),
    draft: Boolean(data.draft),
    cover: data.cover ? String(data.cover) : undefined,
    series: data.series ? String(data.series) : undefined,
    allowCopy: Boolean(data.allowCopy),
    slug: slugSegments,
    locale,
    content,
    toc: extractToc(content),
  };
};

// 构建目录树：文件夹节点可指向目录页，文件节点指向文章页
// - 文件夹节点 priority 来源于目录页 frontmatter（若无则 Infinity）
// - 文件节点 priority 来源于自身 frontmatter
// - 文件夹与文件使用同一排序规则（priority + 字母序）
//
// 结构约定：
// - 目录节点 displayName 可来自目录页 title；否则回退目录名
// - 目录同名 MDX 仅作为目录页入口，不在文件列表重复展示
const buildTree = (
  currentDir: string,
  parentDirSegments: string[],
  parentSlugSegments: string[],
  locale: Locale,
  localeRoot: string,
  dirIndexMap: Map<string, DirectoryIndexInfo>
): ContentTreeNode[] => {
  const entries = listDir(currentDir).filter(
    (entry) => entry.isDirectory() || (entry.isFile() && isMdxFile(entry.name))
  );

  const nodes: ContentTreeNode[] = [];

  for (const entry of entries) {
    const fullPath = path.join(currentDir, entry.name);

    if (entry.isDirectory()) {
      // 目录节点：默认使用目录名；若存在目录页 title 则覆盖显示名
      // - 目录级 slug 覆盖影响该目录及其子路径
      const nextDirSegments = [...parentDirSegments, entry.name];
      const dirKey = nextDirSegments.join("/");
      const indexInfo = dirIndexMap.get(dirKey);
      const displayName =
        indexInfo?.title?.trim() ? indexInfo.title.trim() : entry.name;
      const slugSegment = indexInfo?.slugOverride ?? entry.name;
      const nextSlugSegments = [...parentSlugSegments, slugSegment];
      const children = buildTree(
        fullPath,
        nextDirSegments,
        nextSlugSegments,
        locale,
        localeRoot,
        dirIndexMap
      );
      // 目录存在同名 MDX 时视为“目录页”
      const hasIndexPage = Boolean(indexInfo);
      // 目录没有子内容且没有目录页时，才从树中剔除
      if (children.length === 0 && !hasIndexPage) {
        continue;
      }

      nodes.push({
        type: "folder",
        name: entry.name,
        displayName,
        slug: nextSlugSegments,
        // 若存在同名目录页则使用其 priority，否则视为 Infinity
        priority: indexInfo?.priority ?? Number.POSITIVE_INFINITY,
        children,
      });
    } else {
      const { data } = readPostFile(fullPath);
      if (data.draft) {
        continue;
      }

      // 文件节点：优先显示 frontmatter title
      const title =
        typeof data.title === "string" ? data.title.trim() : "";
      const displayName = title || toDisplayName(entry.name);
      const fileSegment = toSlugSegment(entry.name);
      // 目录同名文章用于目录页展示，避免在列表中重复出现
      const isIndex =
        parentDirSegments.length > 0 &&
        fileSegment === parentDirSegments[parentDirSegments.length - 1];
      if (isIndex) {
        // 目录同名文章用于目录页展示，避免在列表中重复出现
        continue;
      }

      const slugSegment = getFrontmatterSlugSegment(data) ?? fileSegment;
      const nextSegments = [...parentSlugSegments, slugSegment];

      // 文章节点：展示使用 title（若无则回退到文件名），路由使用 slug
      nodes.push({
        type: "file",
        name: entry.name,
        displayName,
        slug: nextSegments,
        priority: parsePriority(data.priority),
      });
    }
  }

  // 统一排序：priority 数字越小越靠前，其次按显示名排序
  // - 文件夹与文件共用同一排序规则
  return nodes.sort((a, b) => compareNodes(a, b, locale));
};

// 对外提供的目录树入口
// - Sidebar / Directory 页面统一依赖该树，确保一致性
export const getContentTree = (locale: Locale) => {
  const localeRoot = getLocaleRoot(locale);
  const dirIndexMap = buildDirectoryIndexMap(localeRoot);
  return buildTree(localeRoot, [], [], locale, localeRoot, dirIndexMap);
};

// 收集所有目录 slug（用于生成目录页静态路由）
// - 包含所有可达目录节点
export const getAllFolderSlugs = (locale: Locale) => {
  const tree = getContentTree(locale);
  const folders: string[][] = [];

  const walk = (nodes: ContentTreeNode[]) => {
    nodes.forEach((node) => {
      if (node.type === "folder") {
        folders.push(node.slug);
        if (node.children) {
          walk(node.children);
        }
      }
    });
  };

  walk(tree);
  return folders;
};

// 根据 slug 找到树中的节点（文件或目录）
// - 返回 null 表示该路径不存在或不可达
export const getNodeBySlug = (
  locale: Locale,
  slugSegments: string[]
): ContentTreeNode | null => {
  const tree = getContentTree(locale);
  let currentNodes = tree;
  let current: ContentTreeNode | null = null;

  for (let index = 0; index < slugSegments.length; index += 1) {
    const key = slugSegments.slice(0, index + 1).join("/");
    const next = currentNodes.find((node) => node.slug.join("/") === key);
    if (!next) return null;
    current = next;
    currentNodes = next.children ?? [];
  }

  return current;
};

// 生成面包屑显示名称列表（与目录树 displayName 对齐）
// - 若节点未找到，回退为解码后的 slug 段
// - 仅影响展示文本，不改变路由
export const getBreadcrumbLabels = (
  locale: Locale,
  slugSegments: string[]
) => {
  const tree = getContentTree(locale);
  const labels: string[] = [];
  let currentNodes = tree;
  let currentPath: string[] = [];

  slugSegments.forEach((segment) => {
    currentPath = [...currentPath, segment];
    const key = currentPath.join("/");
    const node = currentNodes.find((item) => item.slug.join("/") === key);
    if (!node) {
      labels.push(decodeURIComponent(segment));
      currentNodes = [];
      return;
    }
    labels.push(node.displayName);
    currentNodes = node.children ?? [];
  });

  return labels;
};

// 仅当 slug 对应目录节点时返回
// - 用于目录页渲染与 metadata 生成
export const getFolderNodeBySlug = (locale: Locale, slugSegments: string[]) => {
  const node = getNodeBySlug(locale, slugSegments);
  if (node && node.type === "folder") {
    return node;
  }
  return null;
};
