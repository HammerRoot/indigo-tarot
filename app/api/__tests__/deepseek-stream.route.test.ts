import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  trialGuardMock,
  rateLimiterMock,
  resolveApiKeyMock,
  chatCompletionMock,
  quotaGuardMock,
} = vi.hoisted(() => ({
  trialGuardMock: {
    kind: "memory",
    check: vi.fn(),
    markUsed: vi.fn(),
  },
  rateLimiterMock: { kind: "memory", consume: vi.fn() },
  resolveApiKeyMock: vi.fn(),
  chatCompletionMock: vi.fn(),
  quotaGuardMock: {
    kind: "memory",
    getStatus: vi.fn(),
    setEnabled: vi.fn(),
    consume: vi.fn(),
    increment: vi.fn(),
  },
}));

vi.mock("@/lib/server/trial", () => ({ getTrialGuard: () => trialGuardMock }));
vi.mock("@/lib/server/rate-limit", () => ({
  getRateLimiter: () => rateLimiterMock,
}));
vi.mock("@/lib/server/quota", () => ({ getQuotaGuard: () => quotaGuardMock }));
vi.mock("@/lib/server/deepseek", () => ({
  NeedApiKeyError: class NeedApiKeyError extends Error {
    name = "NeedApiKeyError";
  },
  resolveApiKey: resolveApiKeyMock,
  chatCompletion: chatCompletionMock,
}));

import { NextRequest } from "next/server";
import { POST } from "@/app/api/deepseek-stream/route";
import { NeedApiKeyError } from "@/lib/server/deepseek";

function makeRequest(
  body: Record<string, unknown>,
  headers: Record<string, string> = {},
): NextRequest {
  return new NextRequest("http://localhost/api/deepseek-stream", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

function sseResponse(chunks: string[]): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      for (const c of chunks) controller.enqueue(encoder.encode(c));
      controller.close();
    },
  });
  return new Response(stream, {
    status: 200,
    headers: { "Content-Type": "text/event-stream" },
  });
}

const deepseekChunks = [
  'data: {"choices":[{"delta":{"content":"你好"}}]}\n\n',
  'data: {"choices":[{"delta":{"content":"世界"}}]}\n\n',
  "data: [DONE]\n\n",
];

describe("R3 /api/deepseek-stream 试用 + 限流 + 流式", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    trialGuardMock.check.mockResolvedValue({ allowed: true, trialUsed: false });
    trialGuardMock.markUsed.mockResolvedValue(undefined);
    rateLimiterMock.consume.mockResolvedValue({
      allowed: true,
      remaining: 5,
      resetTime: 0,
    });
    quotaGuardMock.getStatus.mockResolvedValue({
      enabled: true,
      count: 0,
      limit: 50,
    });
    quotaGuardMock.increment.mockResolvedValue({
      allowed: true,
      count: 1,
      limit: 50,
    });
  });

  it("系统 key 未配置 → 400 needApiKey", async () => {
    resolveApiKeyMock.mockImplementation(() => {
      throw new NeedApiKeyError("API密钥未配置");
    });
    const res = await POST(makeRequest({ prompt: "p" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.needApiKey).toBe(true);
  });

  it("用系统 key 但缺 X-Device-Id → 400", async () => {
    resolveApiKeyMock.mockReturnValue({ apiKey: "sk-sys", usingSystemKey: true });
    const res = await POST(makeRequest({ prompt: "p" }));
    expect(res.status).toBe(400);
    expect(trialGuardMock.check).not.toHaveBeenCalled();
  });

  it("试用已用完 → 429 trial_used + needApiKey", async () => {
    resolveApiKeyMock.mockReturnValue({ apiKey: "sk-sys", usingSystemKey: true });
    trialGuardMock.check.mockResolvedValue({ allowed: false, trialUsed: true });
    const res = await POST(
      makeRequest({ prompt: "p" }, { "X-Device-Id": "dev-1" }),
    );
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.error).toBe("trial_used");
    expect(body.needApiKey).toBe(true);
    expect(chatCompletionMock).not.toHaveBeenCalled();
  });

  it("用户自带 key 跳过试用检查（即使已试用也放行）", async () => {
    resolveApiKeyMock.mockReturnValue({ apiKey: "sk-user", usingSystemKey: false });
    trialGuardMock.check.mockResolvedValue({ allowed: false, trialUsed: true });
    chatCompletionMock.mockResolvedValue(sseResponse(deepseekChunks));
    const res = await POST(
      makeRequest({ prompt: "p", userApiKey: "sk-user" }),
    );
    expect(res.status).toBe(200);
    expect(trialGuardMock.check).not.toHaveBeenCalled();
  });

  it("IP 限流命中 → 429（系统 key 且生产环境）", async () => {
    resolveApiKeyMock.mockReturnValue({ apiKey: "sk-sys", usingSystemKey: true });
    rateLimiterMock.consume.mockResolvedValue({
      allowed: false,
      remaining: 0,
      resetTime: 0,
    });
    const res = await POST(
      makeRequest({ prompt: "p" }, { "X-Device-Id": "dev-1" }),
    );
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.error).toBe("调用次数已达上限");
    expect(chatCompletionMock).not.toHaveBeenCalled();
  });

  it("每日熔断：配额已满 → 429 quota_exhausted", async () => {
    resolveApiKeyMock.mockReturnValue({ apiKey: "sk-sys", usingSystemKey: true });
    quotaGuardMock.getStatus.mockResolvedValue({
      enabled: true,
      count: 50,
      limit: 50,
    });
    const res = await POST(
      makeRequest({ prompt: "p" }, { "X-Device-Id": "dev-1" }),
    );
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.error).toBe("quota_exhausted");
    expect(chatCompletionMock).not.toHaveBeenCalled();
    expect(trialGuardMock.check).not.toHaveBeenCalled();
  });

  it("熔断关闭时：跳过配额检查，正常放行", async () => {
    resolveApiKeyMock.mockReturnValue({ apiKey: "sk-sys", usingSystemKey: true });
    quotaGuardMock.getStatus.mockResolvedValue({
      enabled: false,
      count: 99,
      limit: 50,
    });
    chatCompletionMock.mockResolvedValue(sseResponse(deepseekChunks));
    const res = await POST(
      makeRequest({ prompt: "p" }, { "X-Device-Id": "dev-1" }),
    );
    expect(res.status).toBe(200);
  });

  it("成功调用后：配额计数 increment 被调用", async () => {
    resolveApiKeyMock.mockReturnValue({ apiKey: "sk-sys", usingSystemKey: true });
    chatCompletionMock.mockResolvedValue(sseResponse(deepseekChunks));
    await POST(makeRequest({ prompt: "p" }, { "X-Device-Id": "dev-1" }));
    expect(quotaGuardMock.increment).toHaveBeenCalled();
  });

  it("DeepSeek 上游错误（500）→ 不标记试用、不计配额", async () => {
    resolveApiKeyMock.mockReturnValue({ apiKey: "sk-sys", usingSystemKey: true });
    chatCompletionMock.mockResolvedValue(new Response("err", { status: 500 }));
    const res = await POST(
      makeRequest({ prompt: "p" }, { "X-Device-Id": "dev-1" }),
    );
    expect(res.status).toBe(500);
    expect(trialGuardMock.markUsed).not.toHaveBeenCalled();
    expect(quotaGuardMock.increment).not.toHaveBeenCalled();
  });

  it("成功流式转发：标记试用 + content/meta/complete 帧 + meta.trialUsed", async () => {
    resolveApiKeyMock.mockReturnValue({ apiKey: "sk-sys", usingSystemKey: true });
    chatCompletionMock.mockResolvedValue(sseResponse(deepseekChunks));
    const res = await POST(
      makeRequest({ prompt: "p" }, { "X-Device-Id": "dev-1" }),
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/event-stream");
    expect(trialGuardMock.markUsed).toHaveBeenCalledWith("dev-1");

    const text = await res.text();
    expect(text).toContain('"type":"content","content":"你好"');
    expect(text).toContain('"type":"content","content":"世界"');
    expect(text).toContain('"type":"meta"');
    expect(text).toContain('"trialUsed":true');
    expect(text).toContain('"type":"complete"');
  });
});
