import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    if (process.env.NODE_ENV === "development") {
      return [];
    }
    // CSP 纵深防御（规格 R1-D / 决策 D8）：
    // - Next.js hydration 依赖内联脚本，故 script-src 需 'unsafe-inline'；
    //   default-src 'self' 仍限制外部来源，connect-src 限制 API 调用域。
    // - frame-ancestors 'none' / base-uri / form-action 为 2026-09-16 补全的纵深防御项。
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value:
              "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' https://api.deepseek.com; font-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
          },
          // 禁止浏览器按内容嗅探 MIME 类型（防把非脚本当脚本执行）
          { key: "X-Content-Type-Options", value: "nosniff" },
          // 防点击劫持；现代替代为上方 CSP frame-ancestors，两者并存兼容旧浏览器
          { key: "X-Frame-Options", value: "DENY" },
          // 跨站跳转时不泄漏完整 URL（仅发送来源域）
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // 关闭 DNS 预取，减少不必要的第三方域名解析
          { key: "X-DNS-Prefetch-Control", value: "off" },
          // 本应用不需要这些能力，显式关闭
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
