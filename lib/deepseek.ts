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