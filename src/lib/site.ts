export const siteConfig = {
  // 站点名称（用于标题与侧边栏）
  name: "Baakarshan's Knowledge Base",
  // 全站描述（用于 SEO 与 OG）
  description: "Baakarshan's Knowledge Base — a Copilot-style personal knowledge system.",
  // 部署域名：允许通过环境变量覆盖
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "https://baakarshan.github.io",
  giscus: {
    // Giscus 绑定配置（与 PRD 保持一致）
    repo: "Baakarshan/baakarshan.github.io",
    repoId: "R_kgDORD5tOg",
    category: "Announcements",
    categoryId: "DIC_kwDORD5tOs4C1lpL",
    mapping: "pathname",
  },
};
