import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { TarotCard, tarotCards } from './tarot-data';

// 牌阵类型定义
export interface TarotSpread {
  id: string;
  name: string;
  description: string;
  cardCount: number;
  positions: string[];
  category: string[];
}

// 占卜记录类型
export interface TarotReading {
  id: string;
  question: string;
  spread: TarotSpread;
  cards: TarotCard[];
  interpretation: string;
  advice: string;
  timestamp: Date;
}

// 应用状态接口
interface TarotStore {
  // 当前问题
  question: string;
  setQuestion: (question: string) => void;
  
  // API Key
  apiKey: string;
  setApiKey: (apiKey: string) => void;
  
  // 推荐的牌阵
  recommendedSpread: TarotSpread | null;
  setRecommendedSpread: (spread: TarotSpread | null) => void;
  
  // 抽取的卡牌
  drawnCards: TarotCard[];
  setDrawnCards: (cards: TarotCard[]) => void;
  
  // 当前解读
  currentReading: TarotReading | null;
  setCurrentReading: (reading: TarotReading | null) => void;
  
  // 历史记录
  readings: TarotReading[];
  addReading: (reading: TarotReading) => void;
  removeReading: (id: string) => void;
  
  // 加载状态
  isLoading: boolean;
  setLoading: (loading: boolean) => void;
  
  // 重置状态
  resetSession: () => void;
  
  // 工具函数
  getRandomCards: (count: number) => TarotCard[];
}

// 预定义的牌阵
export const tarotSpreads: TarotSpread[] = [
  {
    id: 'single-card',
    name: '单张牌指引',
    description: '最简单直接的指引，适合日常决策和即时答案',
    cardCount: 1,
    positions: ['核心指引'],
    category: ['日常', '简单问题', '快速答案']
  },
  {
    id: 'past-present-future',
    name: '时间之流',
    description: '经典三牌阵，揭示过去、现在、未来的脉络',
    cardCount: 3,
    positions: ['过去', '现在', '未来'],
    category: ['时间', '发展', '趋势']
  },
  {
    id: 'relationship-cross',
    name: '情感十字',
    description: '专门解读爱情与人际关系的四牌阵',
    cardCount: 4,
    positions: ['你的感受', '对方的感受', '关系现状', '未来发展'],
    category: ['爱情', '关系', '情感']
  },
  {
    id: 'decision-making',
    name: '选择之路',
    description: '帮助做出重要决定的五牌阵',
    cardCount: 5,
    positions: ['现状', '选项A', '选项B', '影响因素', '建议'],
    category: ['决策', '选择', '事业']
  },
  {
    id: 'life-guidance',
    name: '生命指引',
    description: '全面的人生指导，探索各个生活层面',
    cardCount: 7,
    positions: ['现状', '挑战', '过去影响', '可能未来', '内在力量', '外在影响', '最终建议'],
    category: ['人生', '全面', '深度']
  }
];

// 创建状态管理器
export const useTarotStore = create<TarotStore>()(
  persist(
    (set, get) => ({
      // 初始状态
      question: '',
      apiKey: '',
      recommendedSpread: null,
      drawnCards: [],
      currentReading: null,
      readings: [],
      isLoading: false,

      // 状态更新函数
      setQuestion: (question) => set({ question }),
      
      setApiKey: (apiKey) => set({ apiKey }),
      
      setRecommendedSpread: (spread) => set({ recommendedSpread: spread }),
      
      setDrawnCards: (cards) => set({ drawnCards: cards }),
      
      setCurrentReading: (reading) => set({ currentReading: reading }),
      
      addReading: (reading) => set((state) => ({
        readings: [reading, ...state.readings].slice(0, 50) // 最多保存50条记录
      })),
      
      removeReading: (id) => set((state) => ({
        readings: state.readings.filter(r => r.id !== id)
      })),
      
      setLoading: (loading) => set({ isLoading: loading }),
      
      resetSession: () => set({
        question: '',
        recommendedSpread: null,
        drawnCards: [],
        currentReading: null,
        isLoading: false
      }),
      
      // 工具函数
      getRandomCards: (count) => {
        const shuffled = [...tarotCards].sort(() => Math.random() - 0.5);
        return shuffled.slice(0, count);
      }
    }),
    {
      name: 'tarot-store',
      // 持久化历史记录和API Key
      partialize: (state) => ({ readings: state.readings, apiKey: state.apiKey })
    }
  )
);

// 牌阵推荐逻辑
export function recommendSpread(question: string): TarotSpread {
  const lowerQuestion = question.toLowerCase();
  
  // 关键词匹配
  if (lowerQuestion.includes('爱情') || lowerQuestion.includes('恋爱') || 
      lowerQuestion.includes('感情') || lowerQuestion.includes('关系') ||
      lowerQuestion.includes('喜欢') || lowerQuestion.includes('爱')) {
    return tarotSpreads.find(s => s.id === 'relationship-cross') || tarotSpreads[1];
  }
  
  if (lowerQuestion.includes('选择') || lowerQuestion.includes('决定') || 
      lowerQuestion.includes('应该') || lowerQuestion.includes('还是') ||
      lowerQuestion.includes('工作') || lowerQuestion.includes('事业')) {
    return tarotSpreads.find(s => s.id === 'decision-making') || tarotSpreads[3];
  }
  
  if (lowerQuestion.includes('未来') || lowerQuestion.includes('将来') || 
      lowerQuestion.includes('发展') || lowerQuestion.includes('趋势')) {
    return tarotSpreads.find(s => s.id === 'past-present-future') || tarotSpreads[1];
  }
  
  if (lowerQuestion.includes('人生') || lowerQuestion.includes('命运') || 
      lowerQuestion.includes('指引') || question.length > 50) {
    return tarotSpreads.find(s => s.id === 'life-guidance') || tarotSpreads[4];
  }
  
  // 默认返回单张牌
  return tarotSpreads[0];
}