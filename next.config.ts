import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    if (process.env.NODE_ENV === "development") {
      return [];
    }
    // CSP 纵深防御（规格 R1-D / 决策 D8）：
    // - Next.js hydration 依赖内联脚本，故 script-src 需 'unsafe-inline'；
    //   default-src 'self' 仍限制外部来源，connect-src 限制 API 调用域。
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value:
              "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' https://api.deepseek.com; font-src 'self'",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
