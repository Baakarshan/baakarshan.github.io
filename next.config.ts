import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  // React Compiler：构建期优化（不影响运行时）
  reactCompiler: true,
  // 生产环境使用静态导出，开发环境保留 Next Server 便于调试
  output: isProd ? "export" : undefined,
  // 生成路径统一带尾斜杠，避免 GitHub Pages 刷新 404
  trailingSlash: true,
  images: {
    // 禁用 Next.js 图片优化，符合“原图直出”的约束
    unoptimized: true,
  },
};

export default nextConfig;
