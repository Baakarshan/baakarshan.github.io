import fs from "fs";
import path from "path";

import { CONTENT_ROOT, PUBLIC_ROOT, getAllPosts, toSlugSegmentsFromPath } from "./lib.mjs";

// 基础校验规则（与 PRD 的 Frontmatter 规范对齐）
const REQUIRED_FIELDS = ["title", "description", "date", "tags"];
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
// 中文站 slug 仅允许 ASCII（小写字母/数字/连字符）
const SLUG_SEGMENT_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const errors = [];

const locales = ["en", "zh"];

// 校验图片路径（仅处理站内相对路径）
const validateImagePath = (imagePath, filePath) => {
  if (!imagePath.startsWith("/")) return;
  if (imagePath.startsWith("http")) return;

  const absolute = path.join(PUBLIC_ROOT, imagePath.replace(/^\//, ""));
  if (!fs.existsSync(absolute)) {
    errors.push(`图片不存在: ${imagePath} (${filePath})`);
  }
};

locales.forEach((locale) => {
  const localeRoot = path.join(CONTENT_ROOT, locale);
  const posts = getAllPosts(locale, { includeDraft: true });
  const slugSet = new Set();

  posts.forEach(({ data, content, slug, filePath }) => {
    // 必填字段检查
    REQUIRED_FIELDS.forEach((field) => {
      if (!data[field]) {
        errors.push(`缺少字段 ${field}: ${filePath}`);
      }
    });

    const normalizedDate =
      data.date instanceof Date
        ? data.date.toISOString().slice(0, 10)
        : String(data.date ?? "");

    // 日期格式校验
    if (normalizedDate && !DATE_REGEX.test(normalizedDate)) {
      errors.push(`日期格式错误(YYYY-MM-DD): ${filePath}`);
    }

    // tags 必须是数组
    if (data.tags && !Array.isArray(data.tags)) {
      errors.push(`tags 必须是数组: ${filePath}`);
    }

    // slug 规则校验（可选字段）
    if (data.slug !== undefined) {
      if (typeof data.slug !== "string" || !data.slug.trim()) {
        errors.push(`slug 必须是非空字符串: ${filePath}`);
      } else {
        const slugValue = data.slug.trim();
        if (slugValue.includes("/")) {
          errors.push(`slug 不允许包含 /: ${filePath}`);
        }
        if (locale === "zh" && !SLUG_SEGMENT_REGEX.test(slugValue)) {
          errors.push(`slug 只能包含小写字母、数字和连字符: ${filePath}`);
        }
      }
    }

    const pathSegments = toSlugSegmentsFromPath(filePath, localeRoot);
    // 目录页规则：目录内同名 MDX 作为目录页，slug 不能与目录名冲突
    if (pathSegments.length >= 2) {
      const parentSegment = pathSegments[pathSegments.length - 2];
      const fileSegment = pathSegments[pathSegments.length - 1];
      if (parentSegment === fileSegment && typeof data.slug === "string") {
        const slugValue = data.slug.trim();
        if (slugValue && slugValue !== fileSegment) {
          errors.push(`目录同名文章的 slug 必须与目录名一致: ${filePath}`);
        }
      }
    }

    // 非草稿内容进行 slug 冲突检测
    if (!data.draft) {
      const slugKey = `${locale}/${slug.join("/")}`;
      if (slugSet.has(slugKey)) {
        errors.push(`slug 冲突: ${slugKey}`);
      }
      slugSet.add(slugKey);
    }

    // 封面图检查
    if (data.cover) {
      validateImagePath(String(data.cover), filePath);
    }

    // 正文图片检查（Markdown 图片语法）
    const imageMatches = content.match(/!\[[^\]]*\]\(([^)]+)\)/g) || [];
    imageMatches.forEach((match) => {
      const result = match.match(/!\[[^\]]*\]\(([^)]+)\)/);
      if (!result) return;
      validateImagePath(result[1], filePath);
    });
  });
});

if (!fs.existsSync(CONTENT_ROOT)) {
  errors.push(`content 目录不存在: ${CONTENT_ROOT}`);
}

if (errors.length) {
  console.error("内容校验失败:\n" + errors.join("\n"));
  process.exit(1);
}

console.log("内容校验通过");
