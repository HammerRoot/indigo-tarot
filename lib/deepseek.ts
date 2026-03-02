import { TarotCard } from './tarot-data';

export interface DeepSeekResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
  meta?: {
    usingSystemKey: boolean;
    remainingCalls: number | null;
  };
}

export interface TarotReading {
  question: string;
  cards: TarotCard[];
  interpretation: string;
  advice: string;
}

// DeepSeek API调用函数
export async function callDeepSeek(prompt: string, userApiKey?: string): Promise<{content: string, meta?: DeepSeekResponse['meta']}> {
  try {
    const response = await fetch('/api/deepseek', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt, userApiKey }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      if (errorData.needApiKey) {
        throw new Error(`API_KEY_NEEDED:${errorData.message}`);
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: DeepSeekResponse = await response.json();
    return {
      content: data.choices[0]?.message?.content || '抱歉，未能获得解读结果。',
      meta: data.meta
    };
  } catch (error) {
    console.error('DeepSeek API调用失败:', error);
    if (error instanceof Error && error.message.startsWith('API_KEY_NEEDED:')) {
      throw error;
    }
    throw new Error('AI解读服务暂时不可用，请稍后重试。');
  }
}

// 流式AI解读回调函数类型
export interface StreamCallbacks {
  onContent: (content: string) => void;
  onComplete: () => void;
  onError: (error: string) => void;
  onMeta?: (meta: { usingSystemKey: boolean; remainingCalls: number | null }) => void;
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
`;

  try {
    const response = await fetch('/api/deepseek-stream', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt, userApiKey }),
    });

    if (!response.ok) {
      const errorData = await response.json();
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
                remainingCalls: parsed.remainingCalls
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

// 生成塔罗解读
export async function generateTarotReading(
  question: string,
  cards: TarotCard[],
  userApiKey?: string
): Promise<{reading: TarotReading, meta?: DeepSeekResponse['meta']}> {
  const cardInfo = cards.map((card, index) => 
    `第${index + 1}张牌：${card.name}(${card.nameEn})
    含义：${card.meaningUpright}
    关键词：${card.keywordsUpright.join(', ')}`
  ).join('\n\n');

  const prompt = `
作为一位专业的塔罗占卜师，请为以下问题提供深刻而有帮助的解读：

问题：${question}

抽到的牌：
${cardInfo}

请提供：
1. 整体解读（结合所有牌的含义和问题）
2. 具体建议和指引
3. 用温暖、智慧、有希望的语调

格式要求：
- 用中文回答
- 语调要专业但温暖
- 给出实用的建议
- 长度控制在300-500字
`;

  try {
    const result = await callDeepSeek(prompt, userApiKey);
    
    const reading: TarotReading = {
      question,
      cards,
      interpretation: result.content,
      advice: '相信自己的直觉，勇敢面对未来。'
    };

    return { reading, meta: result.meta };
  } catch (error) {
    console.error('生成塔罗解读失败:', error);
    // 如果是API密钥问题，重新抛出错误
    if (error instanceof Error && error.message.startsWith('API_KEY_NEEDED:')) {
      throw error;
    }
    // 返回备用解读
    const reading: TarotReading = {
      question,
      cards,
      interpretation: '这次占卜显示了重要的信息。请仔细思考抽到的牌的含义，它们会为你指引方向。',
      advice: '相信自己的直觉，每一张牌都有它的深意。'
    };
    return { reading };
  }
}