// DeepSeek 服务端共享模块（规格 R3 / Y7）
// 两个 API 路由不再各自复制 key 解析与调用逻辑，统一走本模块。

export class NeedApiKeyError extends Error {
  constructor(message = "API密钥未配置，请提供您的DeepSeek API密钥，或联系管理员配置系统密钥") {
    super(message);
    this.name = "NeedApiKeyError";
  }
}

export interface ResolvedKey {
  apiKey: string;
  usingSystemKey: boolean;
}

/** 密钥解析：优先用户 key，否则系统 key（未配置则抛 NeedApiKeyError） */
export function resolveApiKey(userApiKey?: string): ResolvedKey {
  if (userApiKey) {
    return { apiKey: userApiKey, usingSystemKey: false };
  }
  const systemKey = process.env.DEEPSEEK_API_KEY;
  if (!systemKey) {
    throw new NeedApiKeyError();
  }
  return { apiKey: systemKey, usingSystemKey: true };
}

export interface ChatCompletionOptions {
  prompt: string;
  apiKey: string;
  stream?: boolean;
}

/** DeepSeek chat/completions 调用（参数统一；stream 透传） */
export function chatCompletion(
  opts: ChatCompletionOptions,
): Promise<Response> {
  const apiUrl = process.env.DEEPSEEK_API_URL || "https://api.deepseek.com/v1";
  return fetch(`${apiUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${opts.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [{ role: "user", content: opts.prompt }],
      temperature: 0.7,
      max_tokens: 1000,
      stream: opts.stream ?? false,
    }),
  });
}
