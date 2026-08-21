import { describe, expect, it, vi } from "vitest";
import {
  chatCompletion,
  NeedApiKeyError,
  resolveApiKey,
} from "@/lib/server/deepseek";

describe("R3 deepseek 共享模块", () => {
  it("resolveApiKey 优先用户 key", () => {
    const r = resolveApiKey("sk-user");
    expect(r).toEqual({ apiKey: "sk-user", usingSystemKey: false });
  });

  it("无用户 key 且无系统 key → 抛 NeedApiKeyError", () => {
    const original = process.env.DEEPSEEK_API_KEY;
    delete process.env.DEEPSEEK_API_KEY;
    try {
      expect(() => resolveApiKey(undefined)).toThrow(NeedApiKeyError);
    } finally {
      if (original !== undefined) process.env.DEEPSEEK_API_KEY = original;
    }
  });

  it("无用户 key 用系统 key", () => {
    const original = process.env.DEEPSEEK_API_KEY;
    process.env.DEEPSEEK_API_KEY = "sk-system";
    try {
      const r = resolveApiKey(undefined);
      expect(r).toEqual({ apiKey: "sk-system", usingSystemKey: true });
    } finally {
      if (original === undefined) delete process.env.DEEPSEEK_API_KEY;
      else process.env.DEEPSEEK_API_KEY = original;
    }
  });

  it("chatCompletion 转发参数（URL/method/headers/body/stream）", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("ok"));
    vi.stubGlobal("fetch", fetchMock);
    try {
      await chatCompletion({ prompt: "你好", apiKey: "sk-x", stream: true });
      const [url, init] = fetchMock.mock.calls[0];
      expect(String(url)).toBe("https://api.deepseek.com/v1/chat/completions");
      expect(init.method).toBe("POST");
      expect(init.headers.Authorization).toBe("Bearer sk-x");
      const body = JSON.parse(init.body as string);
      expect(body.model).toBe("deepseek-chat");
      expect(body.messages[0].content).toBe("你好");
      expect(body.stream).toBe(true);
      expect(body.temperature).toBe(0.7);
      expect(body.max_tokens).toBe(1000);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("chatCompletion 支持自定义 DEEPSEEK_API_URL", async () => {
    const original = process.env.DEEPSEEK_API_URL;
    process.env.DEEPSEEK_API_URL = "https://proxy.example.com/v1";
    const fetchMock = vi.fn().mockResolvedValue(new Response("ok"));
    vi.stubGlobal("fetch", fetchMock);
    try {
      await chatCompletion({ prompt: "p", apiKey: "sk-x" });
      expect(String(fetchMock.mock.calls[0][0])).toBe(
        "https://proxy.example.com/v1/chat/completions",
      );
    } finally {
      vi.unstubAllGlobals();
      if (original === undefined) delete process.env.DEEPSEEK_API_URL;
      else process.env.DEEPSEEK_API_URL = original;
    }
  });
});
