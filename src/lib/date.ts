// 日期处理工具：
// - 解决 "YYYY-MM-DD" 被按 UTC 解析导致的日期回退问题
// - 保证在任意时区下，展示日期与内容日期一致
// - 若格式不合法则回退到原生 Date 解析
export const parseYmdToLocalDate = (value: string) => {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return new Date(value);
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return new Date(value);
  }

  // 使用本地年月日构造 Date，避免 UTC 时区偏移导致日期错误
  return new Date(year, month - 1, day);
};
