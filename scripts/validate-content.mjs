import fs from "fs";
import path from "path";

import { CONTENT_ROOT, PUBLIC_ROOT, getAllPosts, toSlugSegmentsFromPath } from "./lib.mjs";

// 基础校验规则（与 PRD 的 Frontmatter 规范对齐）
// - 任何校验失败会阻断构建
const REQUIRED_FIELDS = ["title", "description", "date"];
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
// 中文站 slug 仅允许 ASCII（小写字母/数字/连字符）
const SLUG_SEGMENT_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const errors = [];

const locales = ["en", "zh"];

// 校验图片路径（仅处理站内相对路径）
// - 忽略外链与非 / 开头的相对路径
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
  // 用于检测非草稿内容的 slug 冲突
  const slugSet = new Set();

  posts.forEach(({ data, content, slug, filePath }) => {
    // 必填字段检查：缺失即报错
    REQUIRED_FIELDS.forEach((field) => {
      if (!data[field]) {
        errors.push(`缺少字段 ${field}: ${filePath}`);
      }
    });

    const normalizedDate =
      data.date instanceof Date
        ? data.date.toISOString().slice(0, 10)
        : String(data.date ?? "");

    // 日期格式校验（YYYY-MM-DD）
    if (normalizedDate && !DATE_REGEX.test(normalizedDate)) {
      errors.push(`日期格式错误(YYYY-MM-DD): ${filePath}`);
    }

    // priority 若存在，必须是可解析的数字
    // - 非数字会导致排序不可预测
    if (data.priority !== undefined) {
      const priorityValue = Number(data.priority);
      if (!Number.isFinite(priorityValue)) {
        errors.push(`priority 必须是数字: ${filePath}`);
      }
    }

    // allowCopy 若存在，必须是布尔值
    if (data.allowCopy !== undefined && typeof data.allowCopy !== "boolean") {
      errors.push(`allowCopy 必须是布尔值: ${filePath}`);
    }

    // slug 规则校验（可选字段）
    // - 仅允许单段，禁止包含 /
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
    // - 草稿不参与路由与索引
    if (!data.draft) {
      const slugKey = `${locale}/${slug.join("/")}`;
      if (slugSet.has(slugKey)) {
        errors.push(`slug 冲突: ${slugKey}`);
      }
      slugSet.add(slugKey);
    }

    // 封面图检查（frontmatter cover）
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
