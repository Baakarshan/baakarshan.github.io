import fs from "fs";
import path from "path";

import {
  getAllPosts,
  normalizeDate,
  stripMarkdown,
  toUrl,
  PUBLIC_ROOT,
} from "./lib.mjs";

// 站点地址：优先环境变量，默认 GitHub Pages
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  process.env.SITE_URL ??
  "https://baakarshan.github.io";

// XML 转义，避免特殊字符破坏 RSS
const escapeXml = (value) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

// RSS 仅输出最近 20 篇英文文章
const posts = getAllPosts("en")
  .sort(
    (a, b) =>
      new Date(normalizeDate(b.data.date)).getTime() -
      new Date(normalizeDate(a.data.date)).getTime()
  )
  .slice(0, 20);

// 组装 RSS item
const items = posts
  .map(({ data, content, slug }) => {
    const url = new URL(toUrl("en", slug), SITE_URL).toString();
    const description = stripMarkdown(content).slice(0, 240);
    const published = normalizeDate(data.date);
    return `\n    <item>\n      <title>${escapeXml(String(data.title ?? ""))}</title>\n      <link>${url}</link>\n      <guid>${url}</guid>\n      <pubDate>${new Date(published).toUTCString()}</pubDate>\n      <description>${escapeXml(description)}</description>\n    </item>`;
  })
  .join("");

// RSS 2.0 基础结构
const rss = `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0">\n  <channel>\n    <title>Baakarshan's Knowledge Base</title>\n    <link>${SITE_URL}</link>\n    <description>Latest posts from Baakarshan's Knowledge Base</description>\n    <language>en-us</language>${items}\n  </channel>\n</rss>\n`;

if (!fs.existsSync(PUBLIC_ROOT)) {
  fs.mkdirSync(PUBLIC_ROOT, { recursive: true });
}

const outputPath = path.join(PUBLIC_ROOT, "feed.xml");
fs.writeFileSync(outputPath, rss, "utf8");
console.log(`RSS generated: ${outputPath}`);
