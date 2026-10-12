import fs from "fs";
import path from "path";

import { PUBLIC_ROOT, getAllPosts, toUrl } from "./lib.mjs";

// 相对图片路径以文章 URL 为基准；静态导出时将资源放到对应路由下。
let copied = 0;
for (const locale of ["zh", "en"]) {
  for (const { content, filePath, slug } of getAllPosts(locale)) {
    const assets = new Set(
      Array.from(content.matchAll(/!\[[^\]]*\]\((assets\/[^)]+)\)/g),
        (match) => match[1])
    );
    for (const asset of assets) {
      const source = path.resolve(path.dirname(filePath), asset);
      const assetRoot = path.resolve(path.dirname(filePath), "assets") + path.sep;
      if (!source.startsWith(assetRoot) || !fs.statSync(source).isFile()) {
        throw new Error(`文章资源路径无效: ${asset} (${filePath})`);
      }
      const route = toUrl(locale, slug).replace(/^\//, "");
      const destination = path.join(PUBLIC_ROOT, route, asset);
      fs.mkdirSync(path.dirname(destination), { recursive: true });
      fs.copyFileSync(source, destination);
      copied++;
    }
  }
}

console.log(`文章资源已复制: ${copied} 个`);
