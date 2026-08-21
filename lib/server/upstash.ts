// Upstash Redis REST 客户端（无需安装 @upstash/redis，直接调用 REST 协议）
// 用于限流与试用的跨实例共享存储；未配置时上层回退内存实现。

export interface RedisCommandResult {
  result: unknown;
  error?: unknown;
}

export async function redisCommand(
  commands: unknown[][],
): Promise<RedisCommandResult[]> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    throw new Error("Upstash Redis 未配置（UPSTASH_REDIS_REST_URL/TOKEN）");
  }
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(commands),
  });
  if (!res.ok) {
    throw new Error(`Upstash Redis error: ${res.status}`);
  }
  return res.json() as Promise<RedisCommandResult[]>;
}
