import fs from "fs";
import path from "path";
import matter from "gray-matter";
import {
  stripExtension,
  toSlugSegment,
  getFrontmatterSlugSegment,
  normalizeDate,
} from "../src/lib/content-utils.mjs";

// 构建脚本共用的工具函数（只在构建期执行）
// - 被 build-search / generate-rss / generate-sitemap / validate-content 复用
// - 保持与 src/lib/posts.ts 的 slug 规则一致

// 根目录约定
// - process.cwd() 指向仓库根目录
export const CONTENT_ROOT = path.join(process.cwd(), "content");
export const PUBLIC_ROOT = path.join(process.cwd(), "public");

// 基础命名清洗：仅去扩展名（保留数字前缀）
// - slug 与路由保持一致，不再剥离数字前缀
export { stripExtension, toSlugSegment, normalizeDate };

// 计算文章的最终 slug（支持目录级与文章级覆盖）
const getPostSlugSegments = (filePath, localeRoot, data, dirIndexMap) => {
  return buildSlugSegmentsFromPath(filePath, localeRoot, data, dirIndexMap);
};

// 读取目录并返回 Dirent
// - 与 fs.readdirSync 的 withFileTypes 保持一致
export const listDir = (dir) => fs.readdirSync(dir, { withFileTypes: true });

export const isMdxFile = (name) => name.toLowerCase().endsWith(".mdx");

// 递归收集所有 MDX 文件
// - 构建期全量扫描可接受
export const getAllMdxFiles = (dir, files = []) => {
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

// 读取文件并解析 frontmatter
// - 返回 { data, content }，供搜索/校验使用
export const readPost = (filePath) => {
  const raw = fs.readFileSync(filePath, "utf8");
  const { data, content } = matter(raw);
  return { data, content };
};

// 构建“目录同名 MDX”索引表：
// - key 为目录路径（相对 localeRoot，使用 / 连接）
// - value 包含 slug 覆盖、标题与 priority
const buildDirectoryIndexMap = (localeRoot) => {
  const map = new Map();
  const files = getAllMdxFiles(localeRoot);

  for (const filePath of files) {
    const relative = path.relative(localeRoot, filePath);
    const segments = relative.split(path.sep);
    if (segments.length < 2) continue;

    const fileSegment = toSlugSegment(segments[segments.length - 1]);
    const parentSegment = segments[segments.length - 2];
    // 仅处理“目录同名 MDX”作为目录页
    if (fileSegment !== parentSegment) continue;

    const { data } = readPost(filePath);
    if (data.draft) continue;

    const dirKey = segments.slice(0, -1).join("/");
    const title = typeof data.title === "string" ? data.title.trim() : "";
    map.set(dirKey, {
      slugOverride: getFrontmatterSlugSegment(data),
      title,
      priority: Number.isFinite(Number(data.priority))
        ? Number(data.priority)
        : Number.POSITIVE_INFINITY,
    });
  }

  return map;
};

// 生成文章 slug：支持目录级 slug 覆盖
// - 目录同名 MDX：使用目录 slug（可被 frontmatter 覆盖）
// - 普通文章：目录段先应用覆盖，再处理自身 slug 覆盖
const buildSlugSegmentsFromPath = (filePath, localeRoot, data, dirIndexMap) => {
  const relative = path.relative(localeRoot, filePath);
  const rawSegments = relative.split(path.sep);
  const fileSegment = toSlugSegment(rawSegments[rawSegments.length - 1]);
  const dirSegments = rawSegments.slice(0, -1);

  const resolvedSegments = [];
  const dirKeySegments = [];

  dirSegments.forEach((segment) => {
    dirKeySegments.push(segment);
    const key = dirKeySegments.join("/");
    const override = dirIndexMap.get(key)?.slugOverride;
    resolvedSegments.push(override ?? segment);
  });

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

// 将文件路径转换为 slug 段
// - 保留目录层级结构
export const toSlugSegmentsFromPath = (filePath, localeRoot) => {
  const relative = path.relative(localeRoot, filePath);
  return relative.split(path.sep).map(toSlugSegment);
};

// 获取文章列表（支持是否包含 draft）
// - includeDraft: true 时校验脚本会校验草稿内容
export const getAllPosts = (locale, { includeDraft = false } = {}) => {
  const localeRoot = path.join(CONTENT_ROOT, locale);
  const files = getAllMdxFiles(localeRoot);
  const posts = [];
  const dirIndexMap = buildDirectoryIndexMap(localeRoot);

  for (const filePath of files) {
    const { data, content } = readPost(filePath);
    if (data.draft && !includeDraft) continue;

    posts.push({
      filePath,
      content,
      data,
      slug: getPostSlugSegments(filePath, localeRoot, data, dirIndexMap),
      locale,
    });
  }

  return posts;
};

// 收集所有目录 slug（用于校验冲突）
// - 仅包含实际可达的目录（含子内容或存在目录页）
export const getAllFolderEntries = (locale) => {
  const localeRoot = path.join(CONTENT_ROOT, locale);
  const dirIndexMap = buildDirectoryIndexMap(localeRoot);
  const entries = [];

  const walk = (currentDir, parentDirSegments, parentSlugSegments) => {
    const dirEntries = listDir(currentDir);
    let hasContent = false;

    // 当前目录内是否有非草稿文章
    dirEntries.forEach((entry) => {
      if (!entry.isFile() || !isMdxFile(entry.name)) return;
      const filePath = path.join(currentDir, entry.name);
      const { data } = readPost(filePath);
      if (!data.draft) {
        hasContent = true;
      }
    });

    // 递归处理子目录
    dirEntries.forEach((entry) => {
      if (!entry.isDirectory()) return;
      const nextDirSegments = [...parentDirSegments, entry.name];
      const dirKey = nextDirSegments.join("/");
      const indexInfo = dirIndexMap.get(dirKey);
      const slugSegment = indexInfo?.slugOverride ?? entry.name;
      const nextSlugSegments = [...parentSlugSegments, slugSegment];
      const childHasContent = walk(
        path.join(currentDir, entry.name),
        nextDirSegments,
        nextSlugSegments
      );

      const hasIndex = Boolean(indexInfo);
      if (childHasContent || hasIndex) {
        entries.push({ slug: nextSlugSegments, hasIndex });
      }
      if (childHasContent) {
        hasContent = true;
      }
    });

    return hasContent;
  };

  walk(localeRoot, [], []);
  return entries;
};

// 将 slug 段拼接成 URL（符合 trailingSlash 规则）
// - 与 Next.js trailingSlash 配置一致
export const toUrl = (locale, slug) => {
  const base = locale === "zh" ? "/zh" : "";
  if (!slug.length) return base || "/";
  return `${base}/${slug.join("/")}/`;
};

// 简易去 Markdown（用于搜索索引与摘要）
// - 只做最基础的去标记处理，避免引入重型解析器
export const stripMarkdown = (value) => {
  return value
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^>\s?/gm, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};
