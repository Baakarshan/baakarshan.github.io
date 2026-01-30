import fs from "fs";
import path from "path";

import { getAllPosts, normalizeDate, toUrl, PUBLIC_ROOT } from "./lib.mjs";

// 站点地址：优先环境变量，默认 GitHub Pages
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  process.env.SITE_URL ??
  "https://baakarshan.github.io";

// 静态页面路由（与 App Router 页面保持一致）
const staticRoutes = [
  "/",
  "/directory",
  "/search",
  "/resume",
  "/zh",
  "/zh/directory",
  "/zh/search",
  "/zh/resume",
];

// 统一带 / 的 URL（与 Next trailingSlash 配置一致）
const withTrailingSlash = (route) => (route === "/" ? "/" : `${route}/`);

const urls = [];

staticRoutes.forEach((route) => {
  urls.push({
    loc: new URL(withTrailingSlash(route), SITE_URL).toString(),
  });
});

// 文章路由（含更新时间）
const postsEn = getAllPosts("en");
const postsZh = getAllPosts("zh");

postsEn.forEach(({ slug, data }) => {
  urls.push({
    loc: new URL(toUrl("en", slug), SITE_URL).toString(),
    lastmod: normalizeDate(data.date),
  });
});

postsZh.forEach(({ slug, data }) => {
  urls.push({
    loc: new URL(toUrl("zh", slug), SITE_URL).toString(),
    lastmod: normalizeDate(data.date),
  });
});

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
  .map((entry) => {
    return `  <url>\n    <loc>${entry.loc}</loc>${
      entry.lastmod ? `\n    <lastmod>${entry.lastmod}</lastmod>` : ""
    }\n  </url>`;
  })
  .join("\n")}\n</urlset>\n`;

if (!fs.existsSync(PUBLIC_ROOT)) {
  fs.mkdirSync(PUBLIC_ROOT, { recursive: true });
}

const outputPath = path.join(PUBLIC_ROOT, "sitemap.xml");
fs.writeFileSync(outputPath, sitemap, "utf8");
console.log(`Sitemap generated: ${outputPath}`);
