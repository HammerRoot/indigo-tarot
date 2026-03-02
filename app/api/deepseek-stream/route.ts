import { NextRequest } from 'next/server';

// 简单的内存缓存，用于限制调用频率
const requestCache = new Map<string, { count: number; resetTime: number }>();

// 清理过期缓存
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of requestCache) {
    if (now > value.resetTime) {
      requestCache.delete(key);
    }
  }
}, 60000); // 每分钟清理一次

export async function POST(request: NextRequest) {
  try {
    const { prompt, userApiKey } = await request.json();

    if (!prompt) {
      return new Response('缺少prompt参数', { status: 400 });
    }

    // 获取客户端IP地址用于限频
    const clientIP = request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    'unknown';

    let apiKey = userApiKey; // 优先使用用户提供的API KEY
    let usingSystemKey = false;
    const isDevelopment = process.env.NODE_ENV === 'development';

    // 如果用户没有提供API KEY，使用系统默认的
    if (!apiKey) {
      apiKey = process.env.DEEPSEEK_API_KEY;
      usingSystemKey = true;

      if (!apiKey) {
        return new Response(
          JSON.stringify({ 
            error: 'API密钥未配置', 
            message: '请提供您的DeepSeek API密钥，或联系管理员配置系统密钥',
            needApiKey: true
          }),
          { 
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }

      // 仅在生产环境下进行频率限制
      if (!isDevelopment) {
        const cacheKey = `system_${clientIP}`;
        const now = Date.now();
        const threeHoursMs = 3 * 60 * 60 * 1000; // 3小时
        
        const cached = requestCache.get(cacheKey);
        if (cached) {
          if (now < cached.resetTime && cached.count >= 5) { // 每3小时限制5次
            return new Response(
              JSON.stringify({ 
                error: '调用次数已达上限', 
                message: '使用系统API密钥每3小时限制5次调用，请稍后再试或使用您自己的API密钥',
                needApiKey: true
              }),
              { 
                status: 429,
                headers: { 'Content-Type': 'application/json' }
              }
            );
          }
          
          if (now >= cached.resetTime) {
            // 重置计数器
            requestCache.set(cacheKey, { count: 1, resetTime: now + threeHoursMs });
          } else {
            // 增加计数
            cached.count++;
          }
        } else {
          // 首次请求
          requestCache.set(cacheKey, { count: 1, resetTime: now + threeHoursMs });
        }
      }
    }

    const apiUrl = process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com/v1';

    // 创建可读流
    const readable = new ReadableStream({
      async start(controller) {
        try {
          const response = await fetch(`${apiUrl}/chat/completions`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'deepseek-chat',
              messages: [
                {
                  role: 'user',
                  content: prompt
                }
              ],
              temperature: 0.7,
              max_tokens: 1000,
              stream: true,
            }),
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.error('DeepSeek API错误:', response.status, errorText);
            controller.enqueue(`data: ${JSON.stringify({ error: 'AI服务暂时不可用' })}\n\n`);
            controller.close();
            return;
          }

          // 发送元数据
          const metaData = {
            type: 'meta',
            usingSystemKey,
            remainingCalls: (usingSystemKey && !isDevelopment) ? 
              Math.max(0, 5 - (requestCache.get(`system_${clientIP}`)?.count || 0)) : 
              null
          };
          controller.enqueue(`data: ${JSON.stringify(metaData)}\n\n`);

          const reader = response.body?.getReader();
          if (!reader) {
            controller.enqueue(`data: ${JSON.stringify({ error: '无法读取响应流' })}\n\n`);
            controller.close();
            return;
          }

          const decoder = new TextDecoder();
          let buffer = '';

          while (true) {
            const { done, value } = await reader.read();
            
            if (done) {
              controller.enqueue(`data: ${JSON.stringify({ type: 'complete' })}\n\n`);
              break;
            }

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (line.trim() === '') continue;
              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                if (data.trim() === '[DONE]') {
                  continue;
                }
                
                try {
                  const parsed = JSON.parse(data);
                  const content = parsed.choices?.[0]?.delta?.content;
                  if (content) {
                    controller.enqueue(`data: ${JSON.stringify({ 
                      type: 'content', 
                      content 
                    })}\n\n`);
                  }
                } catch {
                  // 忽略解析错误
                }
              }
            }
          }
        } catch (error) {
          console.error('流式处理错误:', error);
          controller.enqueue(`data: ${JSON.stringify({ 
            type: 'error', 
            error: '处理过程中发生错误' 
          })}\n\n`);
        } finally {
          controller.close();
        }
      }
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('API路由错误:', error);
    return new Response(
      JSON.stringify({ error: '服务器内部错误' }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}