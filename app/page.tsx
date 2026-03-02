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
import styles from "./page.module.less";

export default function Home() {
  const [localQuestion, setLocalQuestion] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [localApiKey, setLocalApiKey] = useState("");
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(true);
  const {
    setQuestion,
    resetSession,
    remainingCalls,
    usingSystemKey,
    setApiKey,
  } = useTarotStore();
  const router = useRouter();

  // 从 localStorage 加载 API Key
  useEffect(() => {
    const savedApiKey = localStorage.getItem("deepseek_api_key");
    if (savedApiKey) {
      setLocalApiKey(savedApiKey);
      setApiKey(savedApiKey); // 同时更新store中的API key
    }
  }, [setApiKey]);

  // 获取推荐问题
  useEffect(() => {
    const fetchSuggestedQuestions = async () => {
      try {
        setLoadingSuggestions(true);
        const response = await fetch("/api/suggested-questions");
        const data = await response.json();

        if (response.ok) {
          setSuggestedQuestions(data.questions);
        } else {
          // 使用后备问题
          setSuggestedQuestions(
            data.questions || [
              "我在感情方面应该如何选择？",
              "我的事业发展前景如何？",
              "如何改善我的人际关系？",
            ],
          );
        }
      } catch (error) {
        console.error("获取推荐问题失败:", error);
        // 使用默认问题作为后备
        setSuggestedQuestions([
          "我在感情方面应该如何选择？",
          "我的事业发展前景如何？",
          "如何改善我的人际关系？",
        ]);
      } finally {
        setLoadingSuggestions(false);
      }
    };

    fetchSuggestedQuestions();
  }, []);

  // 保存 API Key 到 localStorage
  const handleApiKeyChange = (newApiKey: string) => {
    setLocalApiKey(newApiKey);
    setApiKey(newApiKey); // 同时更新store中的API key
    if (newApiKey) {
      localStorage.setItem("deepseek_api_key", newApiKey);
    } else {
      localStorage.removeItem("deepseek_api_key");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!localQuestion.trim()) return;

    setIsLoading(true);

    // 重置之前的会话状态
    resetSession();

    // 设置新的问题
    setQuestion(localQuestion.trim());

    // 跳转到抽牌页面
    const t = setTimeout(() => {
      setIsLoading(false);
      clearTimeout(t);
      router.push("/draw");
    }, 666);
  };

  const handleQuestionSelect = (question: string) => {
    setLocalQuestion(question);
  };

  return (
    <MysticalBg className={styles.container}>
      {/* API 设置 */}
      <ApiKeySettings
        currentApiKey={localApiKey}
        onApiKeyChange={handleApiKeyChange}
        remainingCalls={remainingCalls}
        usingSystemKey={usingSystemKey}
      />
      <main className={styles.main}>
        <div className={styles.content}>
          {/* 标题区域 */}
          <motion.div
            className={styles.titleSection}
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className={styles.titleIcon}>
              <Moon className={styles.moon} />
              <h1 className={styles.title}>神秘塔罗</h1>
              <Stars className={styles.stars} />
            </div>
            <p className={styles.subtitle}>倾听内心的声音，探寻命运的指引</p>
          </motion.div>

          {/* 问题输入卡片 */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            <MysticalCard className={styles.questionCard}>
              <form onSubmit={handleSubmit}>
                <div>
                  <label htmlFor="question" className={styles.questionLabel}>
                    你的问题
                  </label>
                  <MysticalInput
                    id="question"
                    value={localQuestion}
                    onChange={(e) => setLocalQuestion(e.target.value)}
                    placeholder="请输入你想要咨询的问题，比如：关于爱情、事业、人际关系等..."
                    className={styles.questionInput}
                    rows={8}
                    required
                  />
                </div>

                <div className={styles.submitSection}>
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <MysticalButton
                      type="submit"
                      disabled={isLoading || !localQuestion.trim()}
                      className={styles.submitButton}
                    >
                      {isLoading ? (
                        <div className={styles.loadingIcon}>
                          <div className={styles.spinner}></div>
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
            className={styles.suggestionsSection}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <h3 className={styles.suggestionsTitle}>猜你想问</h3>
            <div className={styles.suggestionsList}>
              {loadingSuggestions ? (
                // 加载中的骨架屏
                <div className={styles.skeletonContainer}>
                  {[1, 2, 3].map((i) => (
                    <div key={i} className={styles.skeleton} />
                  ))}
                </div>
              ) : (
                suggestedQuestions.map((question, index) => (
                  <motion.button
                    key={`${question}-${index}`}
                    type="button"
                    onClick={() => handleQuestionSelect(question)}
                    className={styles.suggestionButton}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {question}
                  </motion.button>
                ))
              )}
            </div>
          </motion.div>

          {/* 塔罗牌预览 */}
          <motion.div
            className={styles.previewSection}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
          >
            <h3 className={styles.previewTitle}>塔罗牌预览</h3>
            <div className={styles.previewCards}>
              {/* 展示3张示例卡牌 */}
              {tarotCards.slice(0, 3).map((card, index) => (
                <motion.div
                  key={card.id}
                  className={styles.previewCard}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 + index * 0.1 }}
                >
                  <div className={styles.cardContainer}>
                    <TarotCard
                      card={card}
                      size="sm"
                      isRevealed={true}
                      isReversed={index === 1} // 中间的卡牌显示为逆位
                      showDetails={false}
                    />
                  </div>
                </motion.div>
              ))}
            </div>
            <p className={styles.previewDescription}>
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
