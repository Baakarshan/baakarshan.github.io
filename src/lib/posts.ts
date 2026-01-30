import fs from "fs";
import path from "path";
import matter from "gray-matter";
import GithubSlugger from "github-slugger";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkMdx from "remark-mdx";
import { visit } from "unist-util-visit";

// 文章与目录树的核心数据读取逻辑（构建期/服务端执行）

export type Locale = "en" | "zh";

export type PostFrontmatter = {
  title: string;
  description: string;
  date: string;
  tags: string[];
  draft?: boolean;
  cover?: string;
  series?: string;
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
  children?: ContentTreeNode[];
};

// content 根目录
const contentRoot = path.join(process.cwd(), "content");

// 去除数字前缀与扩展名，保证排序和展示一致
const stripNumericPrefix = (name: string) => name.replace(/^\d+[-_ ]*/, "");
const stripExtension = (name: string) => name.replace(/\.mdx?$/i, "");
const toSlugSegment = (name: string) => stripNumericPrefix(stripExtension(name));
const toDisplayName = (name: string) => stripNumericPrefix(stripExtension(name));
// frontmatter slug 覆盖（仅允许单段，不允许包含 /）
const getFrontmatterSlugSegment = (data: Record<string, unknown>) => {
  const raw = typeof data.slug === "string" ? data.slug.trim() : "";
  if (!raw) return null;
  if (raw.includes("/")) return null;
  return raw;
};

// 提取排序用的数字前缀（无前缀则排在最后）
const parseLeadingNumber = (name: string) => {
  const match = name.match(/^(\d+)/);
  return match ? Number(match[1]) : Number.POSITIVE_INFINITY;
};

// 目录树与侧边栏排序规则：优先数字前缀，其次按展示名排序
const sortByPrefix = (a: string, b: string) => {
  const numA = parseLeadingNumber(a);
  const numB = parseLeadingNumber(b);
  if (numA !== numB) {
    return numA - numB;
  }
  return toDisplayName(a).localeCompare(toDisplayName(b), "en", {
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

// 将文件路径转换为 slug 段数组（保留目录层级）
const toSlugSegmentsFromPath = (filePath: string, localeRoot: string) => {
  const relative = path.relative(localeRoot, filePath);
  return relative.split(path.sep).map(toSlugSegment);
};

// 提取标题文本（用于生成目录 TOC）
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
const extractToc = (content: string): TocItem[] => {
  const tree = unified().use(remarkParse).use(remarkMdx).parse(content);
  const slugger = new GithubSlugger();
  const items: TocItem[] = [];

  visit(tree, "heading", (node: any) => {
    if (node.depth > 3) return;
    const value = extractHeadingText(node).trim();
    if (!value) return;
    items.push({
      depth: node.depth,
      value,
      slug: slugger.slug(value),
    });
  });

  return items;
};

// 统一日期格式（YYYY-MM-DD）
const normalizeDate = (value: unknown) => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  return String(value ?? "");
};

// 目录页规则：目录内同名 MDX 作为目录页 => slug 末段与父段相同则去重
const normalizeSlugSegments = (segments: string[]) => {
  if (segments.length >= 2) {
    const last = segments[segments.length - 1];
    const prev = segments[segments.length - 2];
    if (last === prev) {
      return segments.slice(0, -1);
    }
  }
  return segments;
};

// 计算文章最终 slug（支持 frontmatter slug 覆盖）
const getPostSlugSegments = (
  filePath: string,
  localeRoot: string,
  data: Record<string, unknown>
) => {
  const segments = toSlugSegmentsFromPath(filePath, localeRoot);
  const override = getFrontmatterSlugSegment(data);
  if (override) {
    segments[segments.length - 1] = override;
  }
  return normalizeSlugSegments(segments);
};

// 将 slug 解析回文件路径（用于动态路由解析）
const resolveSlugToFile = (localeRoot: string, slugSegments: string[]) => {
  const target = normalizeSlugSegments(slugSegments).join("/");
  const files = getAllMdxFiles(localeRoot);

  for (const filePath of files) {
    const { data } = readPostFile(filePath);
    if (data.draft) continue;
    const candidate = getPostSlugSegments(filePath, localeRoot, data).join("/");
    if (candidate === target) {
      return filePath;
    }
  }

  throw new Error(`未找到文章: ${slugSegments.join("/")}`);
};

// 获取语言下的全部文章元数据（用于列表、搜索与索引）
export const getAllPosts = (locale: Locale): PostMeta[] => {
  const localeRoot = getLocaleRoot(locale);
  const files = getAllMdxFiles(localeRoot);
  const posts: PostMeta[] = [];

  for (const filePath of files) {
    const { data } = readPostFile(filePath);
    if (data.draft) {
      continue;
    }

    const slug = getPostSlugSegments(filePath, localeRoot, data);

    posts.push({
      title: String(data.title ?? ""),
      description: String(data.description ?? ""),
      date: normalizeDate(data.date),
      tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
      draft: Boolean(data.draft),
      cover: data.cover ? String(data.cover) : undefined,
      series: data.series ? String(data.series) : undefined,
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
  const normalized = normalizeSlugSegments(slugSegments);
  const filePath = resolveSlugToFile(localeRoot, normalized);
  const { data, content } = readPostFile(filePath);

  return {
    title: String(data.title ?? ""),
    description: String(data.description ?? ""),
    date: normalizeDate(data.date),
    tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
    draft: Boolean(data.draft),
    cover: data.cover ? String(data.cover) : undefined,
    series: data.series ? String(data.series) : undefined,
    slug: normalized,
    locale,
    content,
    toc: extractToc(content),
  };
};

// 判断目录内是否存在“同名 MDX 目录页”
// - 仅检查当前目录的直接文件（不向下递归）
// - frontmatter slug 覆盖会影响匹配结果
const hasDirectoryIndexPage = (
  dirPath: string,
  localeRoot: string,
  dirSlug: string[]
) => {
  const entries = listDir(dirPath).filter(
    (entry) => entry.isFile() && isMdxFile(entry.name)
  );

  for (const entry of entries) {
    const filePath = path.join(dirPath, entry.name);
    const { data } = readPostFile(filePath);
    if (data.draft) continue;
    const slug = getPostSlugSegments(filePath, localeRoot, data);
    if (slug.join("/") === dirSlug.join("/")) {
      return true;
    }
  }

  return false;
};

// 构建目录树：文件夹节点可指向目录页，文件节点指向文章页
const buildTree = (
  currentDir: string,
  parentSegments: string[],
  locale: Locale,
  localeRoot: string
): ContentTreeNode[] => {
  const entries = listDir(currentDir)
    .filter((entry) => entry.isDirectory() || (entry.isFile() && isMdxFile(entry.name)))
    .sort((a, b) => {
      if (a.isDirectory() && !b.isDirectory()) return -1;
      if (!a.isDirectory() && b.isDirectory()) return 1;
      return sortByPrefix(a.name, b.name);
    });

  const nodes: ContentTreeNode[] = [];

  for (const entry of entries) {
    const fullPath = path.join(currentDir, entry.name);

    if (entry.isDirectory()) {
      const displayName = toDisplayName(entry.name);
      const slugSegment = toSlugSegment(entry.name);
      const nextSegments = [...parentSegments, slugSegment];
      const children = buildTree(fullPath, nextSegments, locale, localeRoot);
      const hasIndexPage = hasDirectoryIndexPage(
        fullPath,
        localeRoot,
        nextSegments
      );
      // 目录没有子内容且没有目录页时，才从树中剔除
      if (children.length === 0 && !hasIndexPage) {
        continue;
      }

      nodes.push({
        type: "folder",
        name: entry.name,
        displayName,
        slug: nextSegments,
        children,
      });
    } else {
      const { data } = readPostFile(fullPath);
      if (data.draft) {
        continue;
      }

      const title =
        typeof data.title === "string" ? data.title.trim() : "";
      const displayName = title || toDisplayName(entry.name);
      const slugSegment = getFrontmatterSlugSegment(data) ?? toSlugSegment(entry.name);
      const nextSegments = [...parentSegments, slugSegment];

      if (
        parentSegments.length > 0 &&
        slugSegment === parentSegments[parentSegments.length - 1]
      ) {
        continue;
      }

      // 文章节点：展示使用 title（若无则回退到文件名），路由使用 slug
      nodes.push({
        type: "file",
        name: entry.name,
        displayName,
        slug: nextSegments,
      });
    }
  }

  return nodes;
};

// 对外提供的目录树入口
export const getContentTree = (locale: Locale) => {
  const localeRoot = getLocaleRoot(locale);
  return buildTree(localeRoot, [], locale, localeRoot);
};

// 收集所有目录 slug（用于生成目录页静态路由）
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

// 仅当 slug 对应目录节点时返回
export const getFolderNodeBySlug = (locale: Locale, slugSegments: string[]) => {
  const node = getNodeBySlug(locale, slugSegments);
  if (node && node.type === "folder") {
    return node;
  }
  return null;
};
