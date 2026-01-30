import fs from "fs";
import path from "path";
import matter from "gray-matter";

// 构建脚本共用的工具函数（只在构建期执行）

// 根目录约定
export const CONTENT_ROOT = path.join(process.cwd(), "content");
export const PUBLIC_ROOT = path.join(process.cwd(), "public");

// 基础命名清洗：去数字前缀、去扩展名
export const stripNumericPrefix = (name) => name.replace(/^\d+[-_ ]*/, "");
export const stripExtension = (name) => name.replace(/\.mdx?$/i, "");
// slug 段规则：保留连字符，去掉数字前缀
export const toSlugSegment = (name) => stripNumericPrefix(stripExtension(name));
// frontmatter slug 覆盖（仅允许单段）
const getFrontmatterSlugSegment = (data) => {
  const raw = typeof data?.slug === "string" ? data.slug.trim() : "";
  if (!raw) return null;
  if (raw.includes("/")) return null;
  return raw;
};

// 计算文章的最终 slug（支持 frontmatter 覆盖）
const getPostSlugSegments = (filePath, localeRoot, data) => {
  const segments = toSlugSegmentsFromPath(filePath, localeRoot);
  const override = getFrontmatterSlugSegment(data);
  if (override) {
    segments[segments.length - 1] = override;
  }
  return normalizeSlugSegments(segments);
};

// 读取目录并返回 Dirent
export const listDir = (dir) => fs.readdirSync(dir, { withFileTypes: true });

export const isMdxFile = (name) => name.toLowerCase().endsWith(".mdx");

// 递归收集所有 MDX 文件
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
export const readPost = (filePath) => {
  const raw = fs.readFileSync(filePath, "utf8");
  const { data, content } = matter(raw);
  return { data, content };
};

// 统一日期格式
export const normalizeDate = (value) => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  return String(value ?? "");
};

// 将文件路径转换为 slug 段
export const toSlugSegmentsFromPath = (filePath, localeRoot) => {
  const relative = path.relative(localeRoot, filePath);
  return relative.split(path.sep).map(toSlugSegment);
};

// 目录页规则：目录内同名 MDX 作为目录页
export const normalizeSlugSegments = (segments) => {
  if (segments.length >= 2) {
    const last = segments[segments.length - 1];
    const prev = segments[segments.length - 2];
    if (last === prev) {
      return segments.slice(0, -1);
    }
  }
  return segments;
};

// 获取文章列表（支持是否包含 draft）
export const getAllPosts = (locale, { includeDraft = false } = {}) => {
  const localeRoot = path.join(CONTENT_ROOT, locale);
  const files = getAllMdxFiles(localeRoot);
  const posts = [];

  for (const filePath of files) {
    const { data, content } = readPost(filePath);
    if (data.draft && !includeDraft) continue;

    posts.push({
      filePath,
      content,
      data,
      slug: getPostSlugSegments(filePath, localeRoot, data),
      locale,
    });
  }

  return posts;
};

// 将 slug 段拼接成 URL（符合 trailingSlash 规则）
export const toUrl = (locale, slug) => {
  const base = locale === "zh" ? "/zh" : "";
  if (!slug.length) return base || "/";
  return `${base}/${slug.join("/")}/`;
};

// 简易去 Markdown（用于搜索索引与摘要）
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
