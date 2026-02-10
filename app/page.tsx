"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Stars, Moon } from "lucide-react";
import { useTarotStore } from "@/lib/store";
import { useRouter } from "next/navigation";
import {
  MysticalBg,
  MysticalCard,
  MysticalButton,
  MysticalInput,
} from "@/app/components/ui";
import { ApiKeySettings } from "@/app/components/ApiKeySettings";
import { TarotCard } from "@/app/components/TarotCard";
import { tarotCards } from "@/lib/tarot-data";

export default function Home() {
  const [localQuestion, setLocalQuestion] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const { setQuestion, resetSession } = useTarotStore();
  const router = useRouter();

  // 从 localStorage 加载 API Key
  useEffect(() => {
    const savedApiKey = localStorage.getItem("deepseek_api_key");
    if (savedApiKey) {
      setApiKey(savedApiKey);
    }
  }, []);

  // 保存 API Key 到 localStorage
  const handleApiKeyChange = (newApiKey: string) => {
    setApiKey(newApiKey);
    if (newApiKey) {
      localStorage.setItem("deepseek_api_key", newApiKey);
    } else {
      localStorage.removeItem("deepseek_api_key");
    }
  };

  // 智能生成的默认问题
  const defaultQuestions = [
    "我在感情方面应该如何选择？",
    "我的事业发展前景如何？",
    "如何改善我的人际关系？",
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!localQuestion.trim()) return;

    setIsLoading(true);

    // 重置之前的会话状态
    resetSession();

    // 设置新的问题
    setQuestion(localQuestion.trim());

    // 跳转到抽牌页面
    setTimeout(() => {
      setIsLoading(false);
      router.push("/draw");
    }, 1000);
  };

  const handleQuestionSelect = (question: string) => {
    setLocalQuestion(question);
  };

  return (
    <MysticalBg className="min-h-screen relative overflow-hidden">
      {/* API 设置 */}
      <ApiKeySettings
        currentApiKey={apiKey}
        onApiKeyChange={handleApiKeyChange}
      />
      <main className="relative z-10 min-h-screen flex items-center justify-center px-4 py-8 md:py-12">
        <div className="max-w-2xl w-full">
          {/* 标题区域 */}
          <motion.div
            className="text-center mb-12"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="flex items-center justify-center mb-8">
              <Moon className="w-10 h-10 text-purple-500 mr-4" />
              <h1 className="text-5xl md:text-7xl font-bold text-transparent bg-gradient-to-r from-purple-600 via-purple-500 to-purple-400 bg-clip-text">
                神秘塔罗
              </h1>
              <Stars className="w-10 h-10 text-purple-500 ml-4" />
            </div>
            <p className="text-xl md:text-2xl text-gray-600 mb-6 font-medium">
              倾听内心的声音，探寻命运的指引
            </p>
          </motion.div>

          {/* 问题输入卡片 */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            <MysticalCard className="p-8 md:p-10">
              <form onSubmit={handleSubmit}>
                <div>
                  <label
                    htmlFor="question"
                    className="block text-2xl font-bold text-center mb-6 text-gray-800"
                  >
                    你的问题
                  </label>
                  <MysticalInput
                    id="question"
                    value={localQuestion}
                    onChange={(e) => setLocalQuestion(e.target.value)}
                    placeholder="请输入你想要咨询的问题，比如：关于爱情、事业、人际关系等..."
                    className="resize-none h-40 leading-relaxed border-2 shadow-lg"
                    rows={8}
                    required
                  />
                </div>

                <div className="mt-4">
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <MysticalButton
                      type="submit"
                      disabled={isLoading || !localQuestion.trim()}
                      className="w-full py-4 text-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed bg-purple-100 hover:bg-purple-200 text-purple-700 border-purple-200 shadow-sm"
                      style={{ borderRadius: "8px" }}
                    >
                      {isLoading ? (
                        <div className="flex items-center">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                          正在为你占卜...
                        </div>
                      ) : (
                        "开始占卜"
                      )}
                    </MysticalButton>
                  </motion.div>
                </div>
              </form>
            </MysticalCard>
          </motion.div>

          {/* 猜你想问 */}
          <motion.div
            className="mt-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <h3 className="text-center text-lg font-semibold text-gray-500 mb-4">
              猜你想问
            </h3>
            <div className="flex flex-col items-center space-y-2 max-w-md mx-auto">
              {defaultQuestions.map((question, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleQuestionSelect(question)}
                  className="px-6 py-3 text-gray-600 hover:text-gray-800 bg-purple-50 hover:bg-purple-100 rounded-full transition-all duration-200 border border-purple-200 hover:border-purple-300"
                >
                  {question}
                </button>
              ))}
            </div>
          </motion.div>

          {/* 塔罗牌预览 */}
          <motion.div
            className="mt-16"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
          >
            <h3 className="text-center text-lg font-semibold text-gray-700 mb-8">塔罗牌预览</h3>
            <div className="flex justify-center gap-4 flex-wrap">
              {/* 展示3张示例卡牌 */}
              {tarotCards.slice(0, 3).map((card, index) => (
                <motion.div
                  key={card.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 + index * 0.1 }}
                >
                  <TarotCard
                    card={card}
                    size="sm"
                    isRevealed={true}
                    isReversed={index === 1} // 中间的卡牌显示为逆位
                    showDetails={false}
                  />
                </motion.div>
              ))}
            </div>
            <p className="text-center text-xs text-gray-500 mt-4 max-w-md mx-auto">
              韦特塔罗牌，包含22张大阿尔卡纳和56张小阿尔卡纳，每张牌都有独特的含义和象征
            </p>
          </motion.div>

          {/* 特色功能 - 简化版 */}
          <motion.div
            className="mt-12"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.8 }}
          >
            <div className="flex items-center justify-center gap-8 text-sm text-gray-500">
              <div className="flex items-center gap-1">
                <span>🎴</span>
                <span>智能牌阵</span>
              </div>
              <div className="flex items-center gap-1">
                <span>✨</span>
                <span>AI解析</span>
              </div>
              <div className="flex items-center gap-1">
                <span>📚</span>
                <span>历史记录</span>
              </div>
            </div>
          </motion.div>

          {/* 声明 */}
          <motion.div
            className="mt-8 mb-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.8 }}
          >
            <p className="text-center text-xs text-gray-400 leading-relaxed max-w-sm mx-auto">
              内容由AI生成，请仔细甄别，禁止非法行为
            </p>
          </motion.div>
        </div>
      </main>
    </MysticalBg>
  );
}
