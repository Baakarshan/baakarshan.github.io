import Script from "next/script";

const token = process.env.NEXT_PUBLIC_CF_ANALYTICS_TOKEN;

// Cloudflare Web Analytics（无 Cookie）
export const Analytics = () => {
  // 未配置 token 时不渲染脚本，保持零追踪
  if (!token) return null;

  return (
    <Script
      src="https://static.cloudflareinsights.com/beacon.min.js"
      // token 通过 data-cf-beacon 传入，避免硬编码到脚本 URL
      data-cf-beacon={`{"token":"${token}"}`}
      // defer 确保不阻塞首屏渲染
      defer
    />
  );
};
