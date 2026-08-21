import { TarotCard } from './tarot-data';
import { getOrCreateDeviceId } from './deviceId';

// 流式AI解读回调函数类型
export interface StreamCallbacks {
  onContent: (content: string) => void;
  onComplete: () => void;
  onError: (error: string) => void;
  onMeta?: (meta: {
    usingSystemKey: boolean;
    remainingCalls: number | null;
    trialUsed?: boolean;
  }) => void;
}

// 流式生成塔罗解读
export async function generateTarotReadingStream(
  question: string,
  cards: TarotCard[],
  callbacks: StreamCallbacks,
  userApiKey?: string,
  cardReversals?: boolean[]
): Promise<void> {
  const cardInfo = cards.map((card, index) => {
    const isReversed = cardReversals?.[index] || false;
    return `第${index + 1}张牌：${card.name}(${card.nameEn})${isReversed ? ' - 逆位' : ' - 正位'}
    含义：${isReversed ? card.meaningReversed : card.meaningUpright}
    关键词：${isReversed ? card.keywordsReversed.join(', ') : card.keywordsUpright.join(', ')}`
  }).join('\n\n');

  const prompt = `
作为一位专业的塔罗占卜师，请为以下问题提供深刻而有帮助的解读：

问题：${question}

抽到的牌：
${cardInfo}

请按照以下结构进行分析：

## 🔮 深度解析过程

**第一步：卡牌组合分析**
分析各张牌之间的相互关系和组合含义...

**第二步：针对问题的具体解读** 
结合问题背景，分析卡牌对问题的指引...

**第三步：潜在机会与挑战**
指出可能的机遇和需要注意的方面...

## 💡 核心建议

根据以上分析，给出最重要的一句话建议。

请用温暖、专业、有希望的语调，并确保内容有深度且实用。
务必严格包含「## 🔮 深度解析过程」与「## 💡 核心建议」两个小节（用「## 」加粗标题或「**粗体**」标题均可），核心建议为单独一句话。
`;

  try {
    const response = await fetch('/api/deepseek-stream', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Device-Id': getOrCreateDeviceId(),
      },
      body: JSON.stringify({ prompt, userApiKey }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      // 免费试用已用完 / 每日配额熔断：专用错误码，由 UI 展示引导文案
      if (
        errorData.error === 'trial_used' ||
        errorData.error === 'quota_exhausted'
      ) {
        callbacks.onError(errorData.error);
        return;
      }
      if (errorData.needApiKey) {
        throw new Error(`API_KEY_NEEDED:${errorData.message}`);
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('无法读取响应流');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.trim() === '') continue;
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          try {
            const parsed = JSON.parse(data);
            
            if (parsed.type === 'content') {
              callbacks.onContent(parsed.content);
            } else if (parsed.type === 'meta') {
              callbacks.onMeta?.({
                usingSystemKey: parsed.usingSystemKey,
                remainingCalls: parsed.remainingCalls,
                trialUsed: parsed.trialUsed,
              });
            } else if (parsed.type === 'complete') {
              callbacks.onComplete();
              return;
            } else if (parsed.type === 'error' || parsed.error) {
              callbacks.onError(parsed.error || 'Unknown error');
              return;
            }
          } catch {
            console.warn('Failed to parse SSE data:', data);
          }
        }
      }
    }

  } catch (error) {
    console.error('Stream error:', error);
    if (error instanceof Error && error.message.startsWith('API_KEY_NEEDED:')) {
      callbacks.onError(error.message);
    } else {
      callbacks.onError('AI解读服务暂时不可用，请稍后重试。');
    }
  }
}