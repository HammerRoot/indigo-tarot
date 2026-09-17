import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { TarotCard, tarotCards } from './tarot-data';
import { SelectionFill, createDeckOrder } from './drawFlow';
import { recommendSpreadId } from './spread';
import {
  decryptApiKey,
  encryptApiKey,
  generateSessionKey,
  importSessionKey,
} from './apiKeyCrypto';

// 会话密钥在 sessionStorage 中的键名（会话级，关闭浏览器即失效）
const SESSION_KEY_NAME = 'tarot-session-key';

async function ensureSessionKey(): Promise<CryptoKey> {
  let b64 = sessionStorage.getItem(SESSION_KEY_NAME);
  if (!b64) {
    b64 = await generateSessionKey();
    sessionStorage.setItem(SESSION_KEY_NAME, b64);
  }
  return importSessionKey(b64);
}

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
  cardReversals: boolean[];
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
  // 加密后的 API Key（localStorage 持久化；明文 apiKey 仅存内存）
  encryptedApiKey: string | null;
  setApiKey: (apiKey: string, remember?: boolean) => Promise<void>;
  // 从存储恢复：同一会话（sessionStorage 密钥在）→ 解密恢复；否则清空并返回 false
  initApiKeyFromStorage: () => Promise<boolean>;
  clearStoredKey: () => Promise<void>;
  
  // 推荐的牌阵
  recommendedSpread: TarotSpread | null;
  setRecommendedSpread: (spread: TarotSpread | null) => void;
  
  // 选牌进行中的槽位填充(长度为 cardCount,null 表示未选)——情况页与选牌子页共享,内存态不持久化
  selectedSlots: (SelectionFill | null)[];
  setSelectedSlots: (slots: (SelectionFill | null)[]) => void;

  // 本局的牌序(0..77 的排列,值即 tarotCards 下标)——每局洗一次,整局固定,内存态不持久化
  deckOrder: number[];
  setDeckOrder: (order: number[]) => void;
  
  // 抽取的卡牌
  drawnCards: TarotCard[];
  setDrawnCards: (cards: TarotCard[]) => void;
  
  // 卡牌逆位状态
  cardReversals: boolean[];
  setCardReversals: (reversals: boolean[]) => void;
  
  // 历史记录
  readings: TarotReading[];
  addReading: (reading: TarotReading) => void;
  removeReading: (id: string) => void;
  
  // 加载状态
  isLoading: boolean;
  setLoading: (loading: boolean) => void;
  
  // 剩余次数状态
  remainingCalls: number | null;
  usingSystemKey: boolean;
  trialUsed: boolean;
  setApiUsage: (remainingCalls: number | null, usingSystemKey: boolean, trialUsed?: boolean) => void;
  // 仅更新免费试用状态（页面加载时由服务端查询校正；不触碰 usingSystemKey/remainingCalls）
  setTrialStatus: (trialUsed: boolean) => void;
  
  // 重置状态
  resetSession: () => void;
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
      encryptedApiKey: null,
      recommendedSpread: null,
      selectedSlots: [],
      deckOrder: [],
      drawnCards: [],
      cardReversals: [],
      readings: [],
      isLoading: false,
      remainingCalls: null,
      usingSystemKey: false,
      trialUsed: false,

      // 状态更新函数
      setQuestion: (question) => set({ question }),
      
      setApiKey: async (apiKey, remember = true) => {
        set({ apiKey });
        if (remember && apiKey) {
          try {
            const key = await ensureSessionKey();
            const encrypted = await encryptApiKey(apiKey, key);
            set({ encryptedApiKey: encrypted });
          } catch (error) {
            console.error('API Key 加密保存失败:', error);
            set({ encryptedApiKey: null });
          }
        } else {
          set({ encryptedApiKey: null });
        }
      },

      initApiKeyFromStorage: async () => {
        const sessionKeyB64 = sessionStorage.getItem(SESSION_KEY_NAME);
        const stored = get().encryptedApiKey;
        if (!sessionKeyB64 || !stored) {
          // 会话密钥缺失（如关闭浏览器后）→ 密文不可解，清空并提示重输
          set({ encryptedApiKey: null, apiKey: '' });
          return false;
        }
        try {
          const key = await importSessionKey(sessionKeyB64);
          const plain = await decryptApiKey(stored, key);
          set({ apiKey: plain });
          return true;
        } catch (error) {
          console.error('API Key 解密失败，已清除存储:', error);
          set({ encryptedApiKey: null, apiKey: '' });
          return false;
        }
      },

      clearStoredKey: async () => {
        sessionStorage.removeItem(SESSION_KEY_NAME);
        set({ encryptedApiKey: null });
      },
      
      setRecommendedSpread: (spread) => set({ recommendedSpread: spread }),
      setSelectedSlots: (slots) => set({ selectedSlots: slots }),

      setDeckOrder: (order) => set({ deckOrder: order }),
      
      setDrawnCards: (cards) => set({ drawnCards: cards }),
      
      setCardReversals: (reversals) => set({ cardReversals: reversals }),
      
      addReading: (reading) => set((state) => ({
        readings: [reading, ...state.readings].slice(0, 50) // 最多保存50条记录
      })),
      
      removeReading: (id) => set((state) => ({
        readings: state.readings.filter(r => r.id !== id)
      })),
      
      setLoading: (loading) => set({ isLoading: loading }),
      
      setApiUsage: (remainingCalls, usingSystemKey, trialUsed) => set({
        remainingCalls,
        usingSystemKey,
        trialUsed: trialUsed ?? false,
      }),

      setTrialStatus: (trialUsed) => set({ trialUsed }),
      
      resetSession: () => set({
        question: '',
        recommendedSpread: null,
        selectedSlots: [],
        // 新的一局 → 重新洗牌。整局只洗这一次(规格 G17):
        // 局中重洗会让"关掉浮层再点同一格"得到不同的牌
        deckOrder: createDeckOrder(tarotCards.length),
        drawnCards: [],
        cardReversals: [],
        isLoading: false
      }),
    }),
    {
      name: 'tarot-store',
      // 持久化历史记录与加密后的 API Key（明文 apiKey 不落盘）
      partialize: (state) => ({
        readings: state.readings,
        encryptedApiKey: state.encryptedApiKey,
        // 免费试用状态持久化为缓存：刷新瞬间先显示上次状态，页面加载时再由服务端查询校正
        trialUsed: state.trialUsed,
      }),
      // 丢弃旧版本持久化中的明文 apiKey 字段，防止明文进入内存态
      merge: (persisted, current) => {
        const persistedState = (persisted ?? {}) as Partial<TarotStore>;
        const { apiKey: _legacyPlainApiKey, ...rest } = persistedState;
        void _legacyPlainApiKey;
        return { ...current, ...rest };
      },
    }
  )
);

// 牌阵推荐逻辑（评分制，规格 G1：委托 lib/spread.ts 纯函数）
export function recommendSpread(question: string): TarotSpread {
  const spreadId = recommendSpreadId(question);
  return tarotSpreads.find((s) => s.id === spreadId) ?? tarotSpreads[0];
}