import { NextRequest } from "next/server";
import {
  chatCompletion,
  NeedApiKeyError,
  resolveApiKey,
} from "@/lib/server/deepseek";
import { getRateLimiter } from "@/lib/server/rate-limit";
import { getTrialGuard } from "@/lib/server/trial";
import { getQuotaGuard } from "@/lib/server/quota";

export async function POST(request: NextRequest) {
  try {
    const { prompt, userApiKey } = await request.json();

    if (!prompt) {
      return new Response("缺少prompt参数", { status: 400 });
    }

    // 密钥解析：优先用户 key，否则系统 key（未配置时抛 NeedApiKeyError）
    let resolved;
    try {
      resolved = resolveApiKey(userApiKey);
    } catch (error) {
      if (error instanceof NeedApiKeyError) {
        return new Response(
          JSON.stringify({
            error: "API密钥未配置",
            message: error.message,
            needApiKey: true,
          }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        );
      }
      throw error;
    }

    const usingSystemKey = resolved.usingSystemKey;
    let trialUsed = false;

    if (usingSystemKey) {
      // 免费试用控制：每设备（deviceId）1 次
      const deviceId = request.headers.get("x-device-id");
      if (!deviceId) {
        return new Response(
          JSON.stringify({
            error: "缺少设备标识",
            message: "无法识别设备，请刷新页面重试",
            needApiKey: false,
          }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        );
      }

      // 每日熔断配额检查：开关开启且已达阈值 → 熔断（不消耗）
      const quota = getQuotaGuard();
      const quotaStatus = await quota.getStatus();
      if (quotaStatus.enabled && quotaStatus.count >= quotaStatus.limit) {
        return new Response(
          JSON.stringify({
            error: "quota_exhausted",
            message:
              "系统免费额度已达每日上限，请输入你自己的 DeepSeek API Key 继续",
            needApiKey: true,
          }),
          { status: 429, headers: { "Content-Type": "application/json" } },
        );
      }

      const trial = getTrialGuard();
      const trialResult = await trial.check(deviceId);
      trialUsed = trialResult.trialUsed;
      if (!trialResult.allowed) {
        return new Response(
          JSON.stringify({
            error: "trial_used",
            message: "免费试用已用完，请输入你的 DeepSeek API Key 继续",
            needApiKey: true,
          }),
          { status: 429, headers: { "Content-Type": "application/json" } },
        );
      }

      // IP 维度限流（仅生产；开发环境不限，便于调试）
      if (process.env.NODE_ENV !== "development") {
        const clientIP =
          request.headers.get("x-forwarded-for") ||
          request.headers.get("x-real-ip") ||
          "unknown";
        const limiter = getRateLimiter();
        const rl = await limiter.consume(`system_${clientIP}`);
        if (!rl.allowed) {
          return new Response(
            JSON.stringify({
              error: "调用次数已达上限",
              message:
                "使用系统API密钥每3小时限制5次调用，请稍后再试或使用您自己的API密钥",
              needApiKey: true,
            }),
            { status: 429, headers: { "Content-Type": "application/json" } },
          );
        }
      }
    }

    // 调用 DeepSeek（流式）
    const response = await chatCompletion({
      prompt,
      apiKey: resolved.apiKey,
      stream: true,
    });

    if (!response.ok) {
      // 上游错误：不标记试用，用户可重试
      const errorText = await response.text();
      console.error("DeepSeek API错误:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "AI服务暂时不可用" }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }

    // 成功开始转发前：标记试用 + 配额计数（仅系统 key 路径）
    if (usingSystemKey) {
      const deviceId = request.headers.get("x-device-id")!;
      await getTrialGuard().markUsed(deviceId);
      trialUsed = true;
      await getQuotaGuard().increment();
    }

    // 构建 SSE 转发流（meta → content* → complete）
    const readable = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        const enqueue = (payload: string) =>
          controller.enqueue(encoder.encode(payload));
        try {
          const metaData = {
            type: "meta",
            usingSystemKey,
            remainingCalls:
              usingSystemKey && process.env.NODE_ENV !== "development"
                ? 5
                : null,
            trialUsed,
          };
          enqueue(`data: ${JSON.stringify(metaData)}\n\n`);

          const reader = response.body?.getReader();
          if (!reader) {
            enqueue(
              `data: ${JSON.stringify({ error: "无法读取响应流" })}\n\n`,
            );
            controller.close();
            return;
          }

          const decoder = new TextDecoder();
          let buffer = "";

          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              enqueue(
                `data: ${JSON.stringify({ type: "complete" })}\n\n`,
              );
              break;
            }

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              if (line.trim() === "") continue;
              if (line.startsWith("data: ")) {
                const data = line.slice(6);
                if (data.trim() === "[DONE]") continue;
                try {
                  const parsed = JSON.parse(data);
                  const content = parsed.choices?.[0]?.delta?.content;
                  if (content) {
                    enqueue(
                      `data: ${JSON.stringify({ type: "content", content })}\n\n`,
                    );
                  }
                } catch {
                  // 忽略解析错误
                }
              }
            }
          }
        } catch (error) {
          console.error("流式处理错误:", error);
          enqueue(
            `data: ${JSON.stringify({ type: "error", error: "处理过程中发生错误" })}\n\n`,
          );
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    console.error("API路由错误:", error);
    return new Response(
      JSON.stringify({ error: "服务器内部错误" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}
