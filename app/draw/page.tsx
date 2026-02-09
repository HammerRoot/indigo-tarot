'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Sparkles, Eye } from 'lucide-react';
import { useTarotStore, recommendSpread } from '@/lib/store';
import { generateTarotReading } from '@/lib/deepseek';
import { useRouter } from 'next/navigation';

export default function DrawPage() {
  const router = useRouter();
  const {
    question,
    recommendedSpread,
    drawnCards,
    isLoading,
    setRecommendedSpread,
    setDrawnCards,
    setCurrentReading,
    setLoading,
    getRandomCards
  } = useTarotStore();

  const [currentStep, setCurrentStep] = useState<'spread' | 'draw' | 'reveal'>('spread');
  const [selectedCards, setSelectedCards] = useState<number[]>([]);
  const [revealedCards, setRevealedCards] = useState<number[]>([]);

  // 如果没有问题，返回首页
  useEffect(() => {
    if (!question) {
      router.push('/');
      return;
    }
    
    // 推荐牌阵
    if (!recommendedSpread) {
      const spread = recommendSpread(question);
      setRecommendedSpread(spread);
    }
  }, [question, recommendedSpread, setRecommendedSpread, router]);

  // 开始抽牌
  const handleStartDraw = () => {
    setCurrentStep('draw');
  };

  // 选择卡牌
  const handleCardSelect = (index: number) => {
    if (selectedCards.includes(index) || !recommendedSpread) return;
    
    const newSelected = [...selectedCards, index];
    setSelectedCards(newSelected);
    
    // 如果选够了卡牌，开始翻牌
    if (newSelected.length === recommendedSpread.cardCount) {
      setTimeout(() => {
        const cards = getRandomCards(recommendedSpread.cardCount);
        setDrawnCards(cards);
        setCurrentStep('reveal');
      }, 1000);
    }
  };

  // 翻牌动画
  const handleRevealCard = (index: number) => {
    if (revealedCards.includes(index)) return;
    
    const newRevealed = [...revealedCards, index];
    setRevealedCards(newRevealed);
    
    // 全部翻完后获取解读
    if (newRevealed.length === drawnCards.length) {
      setTimeout(() => {
        handleGetReading();
      }, 1500);
    }
  };

  // 获取AI解读
  const handleGetReading = async () => {
    if (!recommendedSpread || drawnCards.length === 0) return;
    
    setLoading(true);
    try {
      const reading = await generateTarotReading(question, drawnCards);
      const fullReading = {
        ...reading,
        id: Date.now().toString(),
        spread: recommendedSpread,
        timestamp: new Date()
      };
      
      setCurrentReading(fullReading);
      router.push('/result');
    } catch (error) {
      console.error('获取解读失败:', error);
      // 可以显示错误提示
    } finally {
      setLoading(false);
    }
  };

  if (!recommendedSpread) {
    return (
      <div className="min-h-screen mystical-bg flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-yellow-300"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen mystical-bg relative overflow-hidden">
      <div className="stars"></div>
      
      <main className="relative z-10 min-h-screen px-4 py-8">
        {/* 返回按钮 */}
        <motion.button
          onClick={() => router.push('/')}
          className="fixed top-6 left-6 mystical-button p-3"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <ArrowLeft className="w-5 h-5" />
        </motion.button>

        <div className="max-w-4xl mx-auto pt-20">
          {/* 步骤指示器 */}
          <div className="flex justify-center mb-8">
            <div className="flex space-x-4">
              {['推荐牌阵', '选择卡牌', '揭示结果'].map((step, index) => {
                const steps = ['spread', 'draw', 'reveal'];
                const isActive = steps[index] === currentStep;
                const isCompleted = steps.indexOf(currentStep) > index;
                
                return (
                  <div key={step} className="flex items-center">
                    <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-medium transition-all ${
                      isActive ? 'border-yellow-300 bg-yellow-300 text-gray-900' :
                      isCompleted ? 'border-green-400 bg-green-400 text-gray-900' :
                      'border-gray-400 text-gray-400'
                    }`}>
                      {index + 1}
                    </div>
                    <span className={`ml-2 text-sm font-medium ${
                      isActive ? 'text-yellow-300' :
                      isCompleted ? 'text-green-400' :
                      'text-gray-400'
                    }`}>
                      {step}
                    </span>
                    {index < 2 && <div className="w-12 h-px bg-gray-400 mx-4" />}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 问题显示 */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-semibold text-white mb-2">你的问题</h1>
            <p className="text-gray-300 max-w-2xl mx-auto">"{question}"</p>
          </div>

          <AnimatePresence mode="wait">
            {/* 步骤1: 推荐牌阵 */}
            {currentStep === 'spread' && (
              <motion.div
                key="spread"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="mystical-card p-8 text-center"
              >
                <Sparkles className="w-16 h-16 text-yellow-300 mx-auto mb-6" />
                <h2 className="text-3xl font-bold text-white mb-4">
                  {recommendedSpread.name}
                </h2>
                <p className="text-gray-300 text-lg mb-6">
                  {recommendedSpread.description}
                </p>
                <div className="bg-white/10 rounded-lg p-4 mb-6">
                  <p className="text-sm text-gray-300 mb-2">牌位含义：</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {recommendedSpread.positions.map((position, index) => (
                      <span key={index} className="bg-white/10 rounded px-3 py-1 text-sm text-white">
                        {position}
                      </span>
                    ))}
                  </div>
                </div>
                <motion.button
                  onClick={handleStartDraw}
                  className="mystical-button px-8 py-3 text-lg font-semibold"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  开始抽牌
                </motion.button>
              </motion.div>
            )}

            {/* 步骤2: 选择卡牌 */}
            {currentStep === 'draw' && (
              <motion.div
                key="draw"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="text-center"
              >
                <h2 className="text-2xl font-semibold text-white mb-2">
                  请选择 {recommendedSpread.cardCount} 张牌
                </h2>
                <p className="text-gray-300 mb-8">
                  已选择: {selectedCards.length} / {recommendedSpread.cardCount}
                </p>
                
                <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4 max-w-4xl mx-auto">
                  {Array.from({ length: 24 }, (_, index) => (
                    <motion.div
                      key={index}
                      className={`aspect-[2/3] mystical-card cursor-pointer relative ${
                        selectedCards.includes(index) ? 'border-yellow-300 bg-yellow-300/20' : ''
                      }`}
                      whileHover={{ scale: 1.05, y: -5 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleCardSelect(index)}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-b from-purple-900/50 to-blue-900/50 rounded-lg flex items-center justify-center">
                        <div className="text-4xl">🎴</div>
                      </div>
                      {selectedCards.includes(index) && (
                        <motion.div
                          className="absolute inset-0 bg-yellow-300/20 rounded-lg border-2 border-yellow-300"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                        />
                      )}
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* 步骤3: 揭示卡牌 */}
            {currentStep === 'reveal' && (
              <motion.div
                key="reveal"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="text-center"
              >
                <h2 className="text-2xl font-semibold text-white mb-2">
                  点击卡牌揭示结果
                </h2>
                <p className="text-gray-300 mb-8">
                  已揭示: {revealedCards.length} / {drawnCards.length}
                </p>
                
                <div className="flex justify-center gap-6 flex-wrap">
                  {drawnCards.map((card, index) => (
                    <motion.div
                      key={card.id}
                      className="relative"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.2 }}
                    >
                      <div className="text-center mb-2">
                        <span className="text-sm text-gray-300">
                          {recommendedSpread.positions[index]}
                        </span>
                      </div>
                      <motion.div
                        className="w-32 h-48 mystical-card cursor-pointer relative overflow-hidden"
                        whileHover={{ scale: 1.05 }}
                        onClick={() => handleRevealCard(index)}
                      >
                        <AnimatePresence>
                          {!revealedCards.includes(index) ? (
                            <motion.div
                              key="back"
                              className="absolute inset-0 bg-gradient-to-b from-purple-900 to-blue-900 flex items-center justify-center"
                              exit={{ rotateY: 90 }}
                              transition={{ duration: 0.6 }}
                            >
                              <div className="text-5xl">🎴</div>
                            </motion.div>
                          ) : (
                            <motion.div
                              key="front"
                              className="absolute inset-0 bg-white/10 p-4 flex flex-col items-center justify-center text-center"
                              initial={{ rotateY: -90 }}
                              animate={{ rotateY: 0 }}
                              transition={{ duration: 0.6 }}
                            >
                              <div className="text-yellow-300 text-2xl mb-2">✨</div>
                              <h3 className="text-white font-semibold text-sm mb-1">
                                {card.name}
                              </h3>
                              <p className="text-gray-300 text-xs">
                                {card.keywordsUpright[0]}
                              </p>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    </motion.div>
                  ))}
                </div>

                {isLoading && (
                  <motion.div
                    className="mt-8"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-300 mr-3"></div>
                      <span className="text-gray-300">AI正在为你解读...</span>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}