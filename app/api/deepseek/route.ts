import { NextRequest, NextResponse } from "next/server";
import {
  chatCompletion,
  NeedApiKeyError,
  resolveApiKey,
} from "@/lib/server/deepseek";
import { getRateLimiter } from "@/lib/server/rate-limit";

// 非流式接口（Y2 将删除）；已薄化为共享模块，无模块级 setInterval（R4）

export async function POST(request: NextRequest) {
  try {
    const { prompt, userApiKey } = await request.json();

    if (!prompt) {
      return NextResponse.json({ error: "缺少prompt参数" }, { status: 400 });
    }

    let resolved;
    try {
      resolved = resolveApiKey(userApiKey);
    } catch (error) {
      if (error instanceof NeedApiKeyError) {
        return NextResponse.json(
          {
            error: "API密钥未配置",
            message: error.message,
            needApiKey: true,
          },
          { status: 400 },
        );
      }
      throw error;
    }

    // IP 限流（仅生产；惰性清理在 rate-limit 模块内，R4）
    if (resolved.usingSystemKey && process.env.NODE_ENV !== "development") {
      const clientIP =
        request.headers.get("x-forwarded-for") ||
        request.headers.get("x-real-ip") ||
        "unknown";
      const rl = await getRateLimiter().consume(`system_${clientIP}`);
      if (!rl.allowed) {
        return NextResponse.json(
          {
            error: "调用次数已达上限",
            message:
              "使用系统API密钥每3小时限制5次调用，请稍后再试或使用您自己的API密钥",
            needApiKey: true,
          },
          { status: 429 },
        );
      }
    }

    const response = await chatCompletion({ prompt, apiKey: resolved.apiKey });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("DeepSeek API错误:", response.status, errorText);
      return NextResponse.json(
        { error: "AI服务暂时不可用" },
        { status: 500 },
      );
    }

    const data = await response.json();
    return NextResponse.json({
      ...data,
      meta: {
        usingSystemKey: resolved.usingSystemKey,
        remainingCalls: null,
      },
    });
  } catch (error) {
    console.error("API路由错误:", error);
    return NextResponse.json(
      { error: "服务器内部错误" },
      { status: 500 },
    );
  }
}
