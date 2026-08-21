import { describe, expect, it } from "vitest";
import {
  createTrialGuard,
  getTrialGuard,
  TRIAL_TTL_MS,
} from "@/lib/server/trial";

describe("R3 trial 免费试用模块", () => {
  it("未试用放行并标记：check 允许 → markUsed → check 拒绝", async () => {
    const guard = createTrialGuard();
    expect(await guard.check("dev-a")).toEqual({
      allowed: true,
      trialUsed: false,
    });
    await guard.markUsed("dev-a");
    expect(await guard.check("dev-a")).toEqual({
      allowed: false,
      trialUsed: true,
    });
  });

  it("markUsed 幂等（重复标记不抛错）", async () => {
    const guard = createTrialGuard();
    await guard.markUsed("dev-a");
    await guard.markUsed("dev-a");
    expect(await guard.check("dev-a")).toEqual({
      allowed: false,
      trialUsed: true,
    });
  });

  it("不同设备相互独立", async () => {
    const guard = createTrialGuard();
    await guard.markUsed("dev-a");
    expect(await guard.check("dev-b")).toEqual({
      allowed: true,
      trialUsed: false,
    });
  });

  it("TTL 过期后可再试用（注入时钟，惰性清理）", async () => {
    let now = 1_000_000;
    const guard = createTrialGuard({ now: () => now });
    await guard.markUsed("dev-a");
    expect((await guard.check("dev-a")).allowed).toBe(false);
    now += TRIAL_TTL_MS + 1; // 推进超过 TTL
    expect((await guard.check("dev-a")).allowed).toBe(true);
    expect((await guard.check("dev-a")).trialUsed).toBe(false);
  });

  it("工厂回退：无 UPSTASH_* 环境变量 → 内存版", async () => {
    const originalUrl = process.env.UPSTASH_REDIS_REST_URL;
    const originalToken = process.env.UPSTASH_REDIS_REST_TOKEN;
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    try {
      expect(getTrialGuard(true).kind).toBe("memory");
    } finally {
      if (originalUrl) process.env.UPSTASH_REDIS_REST_URL = originalUrl;
      if (originalToken) process.env.UPSTASH_REDIS_REST_TOKEN = originalToken;
    }
  });

  it("工厂：有 UPSTASH_* 环境变量 → Redis 版（不真实请求）", async () => {
    const originalUrl = process.env.UPSTASH_REDIS_REST_URL;
    const originalToken = process.env.UPSTASH_REDIS_REST_TOKEN;
    process.env.UPSTASH_REDIS_REST_URL = "https://mock.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "mock-token";
    // 工厂是单例，先清除缓存以便按 env 重建
    try {
      expect(getTrialGuard(true).kind).toBe("redis");
    } finally {
      if (originalUrl === undefined) delete process.env.UPSTASH_REDIS_REST_URL;
      else process.env.UPSTASH_REDIS_REST_URL = originalUrl;
      if (originalToken === undefined)
        delete process.env.UPSTASH_REDIS_REST_TOKEN;
      else process.env.UPSTASH_REDIS_REST_TOKEN = originalToken;
    }
  });
});
