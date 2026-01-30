import fs from "fs";
import path from "path";

import {
  getAllPosts,
  normalizeDate,
  stripMarkdown,
  toUrl,
  PUBLIC_ROOT,
} from "./lib.mjs";

const MAX_INDEX_BYTES = 500 * 1024;

// 生成搜索索引：按语言读取文章并输出 JSON
const buildEntries = (locale) => {
  const posts = getAllPosts(locale);
  return posts.map(({ data, content, slug }) => {
    // 摘要仅截取前 200 字，控制索引体积
    const snippet = stripMarkdown(content).slice(0, 200);
    return {
      shardKey: slug[0] ?? "root",
      item: {
        title: String(data.title ?? ""),
        description: String(data.description ?? ""),
        tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
        date: normalizeDate(data.date),
        slug: toUrl(locale, slug),
        snippet,
      },
    };
  });
};

// 确保 public 目录存在
const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

const writeJson = (filePath, data) => {
  fs.writeFileSync(filePath, JSON.stringify(data), "utf8");
};

const buildShardFileName = (locale, shardKey) =>
  `search-index-${locale}-${encodeURIComponent(shardKey)}.json`;

// 写入单语言索引文件
const writeIndex = (locale) => {
  const entries = buildEntries(locale);
  const index = entries.map((entry) => entry.item);
  ensureDir(PUBLIC_ROOT);
  const outputPath = path.join(PUBLIC_ROOT, `search-index-${locale}.json`);
  const manifestPath = path.join(
    PUBLIC_ROOT,
    `search-index-${locale}-manifest.json`
  );
  const indexJson = JSON.stringify(index);
  const indexBytes = Buffer.byteLength(indexJson, "utf8");

  if (indexBytes <= MAX_INDEX_BYTES) {
    writeJson(outputPath, index);
    writeJson(manifestPath, {
      type: "single",
      file: `/${path.basename(outputPath)}`,
      total: index.length,
      maxBytes: MAX_INDEX_BYTES,
    });
    console.log(`Search index generated: ${outputPath}`);
    return;
  }

  const shards = new Map();
  entries.forEach((entry) => {
    const key = entry.shardKey;
    if (!shards.has(key)) shards.set(key, []);
    shards.get(key).push(entry.item);
  });

  const shardList = [];
  shards.forEach((items, key) => {
    const fileName = buildShardFileName(locale, key);
    const shardPath = path.join(PUBLIC_ROOT, fileName);
    writeJson(shardPath, items);
    shardList.push({
      key,
      file: `/${fileName}`,
      count: items.length,
    });
  });

  writeJson(manifestPath, {
    type: "sharded",
    shards: shardList,
    total: index.length,
    maxBytes: MAX_INDEX_BYTES,
  });
  console.log(`Search index sharded: ${manifestPath}`);
};

writeIndex("en");
writeIndex("zh");
