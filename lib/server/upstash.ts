// Upstash Redis REST 客户端（无需安装 @upstash/redis，直接调用 REST 协议）
// 用于限流与试用的跨实例共享存储；未配置时上层回退内存实现。
//
// 环境变量兼容两种来源（REST 协议相同）：
// - Vercel KV 集成注入：KV_REST_API_URL + KV_REST_API_TOKEN（优先）
// - Upstash 直接配置：UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN（回退）

export interface RedisCommandResult {
  result: unknown;
  error?: unknown;
}

/** 是否存在可用的 Redis 配置（Vercel KV 或 Upstash） */
export function hasRedisConfig(): boolean {
  return Boolean(
    (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) ||
      (process.env.UPSTASH_REDIS_REST_URL &&
        process.env.UPSTASH_REDIS_REST_TOKEN),
  );
}

function getRedisConfig(): { url: string; token: string } {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token =
    process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    throw new Error(
      "Redis 未配置（KV_REST_API_URL/TOKEN 或 UPSTASH_REDIS_REST_URL/TOKEN）",
    );
  }
  return { url, token };
}

export async function redisCommand(
  commands: unknown[][],
): Promise<RedisCommandResult[]> {
  const { url, token } = getRedisConfig();
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(commands),
  });
  if (!res.ok) {
    throw new Error(`Redis error: ${res.status}`);
  }
  return res.json() as Promise<RedisCommandResult[]>;
}
