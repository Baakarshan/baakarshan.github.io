import Script from "next/script";

const token = process.env.NEXT_PUBLIC_CF_ANALYTICS_TOKEN;

// Cloudflare Web Analytics（无 Cookie）
export const Analytics = () => {
  if (!token) return null;

  return (
    <Script
      src="https://static.cloudflareinsights.com/beacon.min.js"
      data-cf-beacon={`{"token":"${token}"}`}
      defer
    />
  );
};
