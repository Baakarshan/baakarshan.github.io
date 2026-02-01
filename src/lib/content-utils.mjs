// 内容解析的通用工具（构建脚本 + 运行时复用）
// - 保持 ESM 格式，兼容 Node scripts 与 Next/TS 导入

// 去除扩展名（保留数字前缀）
export const stripExtension = (name) => name.replace(/\.mdx?$/i, "");

// slug 段规则：仅去扩展名
export const toSlugSegment = (name) => stripExtension(name);

// frontmatter slug 覆盖（仅允许单段，不允许包含 /）
export const getFrontmatterSlugSegment = (data) => {
  const raw = typeof data?.slug === "string" ? data.slug.trim() : "";
  if (!raw) return null;
  if (raw.includes("/")) return null;
  return raw;
};

// 目录页规则：目录内同名 MDX 作为目录页 => slug 末段与父段相同则去重
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

// 统一日期格式（YYYY-MM-DD）
export const normalizeDate = (value) => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  return String(value ?? "");
};
