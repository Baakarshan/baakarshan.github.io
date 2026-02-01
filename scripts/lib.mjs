import fs from "fs";
import path from "path";
import matter from "gray-matter";
import {
  stripExtension,
  toSlugSegment,
  getFrontmatterSlugSegment,
  normalizeDate,
  normalizeSlugSegments,
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
export { stripExtension, toSlugSegment, normalizeDate, normalizeSlugSegments };

// 计算文章的最终 slug（支持 frontmatter 覆盖）
// - 仅覆盖最后一段，避免跨目录
const getPostSlugSegments = (filePath, localeRoot, data) => {
  const segments = toSlugSegmentsFromPath(filePath, localeRoot);
  const override = getFrontmatterSlugSegment(data);
  if (override) {
    segments[segments.length - 1] = override;
  }
  return normalizeSlugSegments(segments);
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
