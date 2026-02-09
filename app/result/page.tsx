'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Home, BookOpen, Share2, RotateCcw } from 'lucide-react';
import { useTarotStore } from '@/lib/store';
import { useRouter } from 'next/navigation';

export default function ResultPage() {
  const router = useRouter();
  const {
    currentReading,
    addReading,
    resetSession
  } = useTarotStore();

  const [showFullInterpretation, setShowFullInterpretation] = useState(false);

  useEffect(() => {
    if (!currentReading) {
      router.push('/');
      return;
    }

    // 保存到历史记录
    addReading(currentReading);
  }, [currentReading, addReading, router]);

  const handleStartNew = () => {
    resetSession();
    router.push('/');
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: '我的塔罗占卜结果',
          text: `问题：${currentReading?.question}\n\n解读：${currentReading?.interpretation.slice(0, 100)}...`,
          url: window.location.origin
        });
      } catch (error) {
        console.log('分享失败:', error);
      }
    } else {
      // 复制到剪贴板
      const text = `我的塔罗占卜结果\n\n问题：${currentReading?.question}\n\n解读：${currentReading?.interpretation}`;
      navigator.clipboard.writeText(text).then(() => {
        alert('结果已复制到剪贴板');
      });
    }
  };

  if (!currentReading) {
    return (
      <div className="min-h-screen mystical-bg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-yellow-300 mx-auto mb-4"></div>
          <p className="text-gray-300">正在加载结果...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen mystical-bg relative overflow-hidden">
      <div className="stars"></div>
      
      <main className="relative z-10 min-h-screen px-4 py-8">
        {/* 顶部导航 */}
        <div className="flex justify-between items-center mb-8">
          <motion.button
            onClick={() => router.push('/')}
            className="mystical-button p-3"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <ArrowLeft className="w-5 h-5" />
          </motion.button>
          
          <div className="flex gap-3">
            <motion.button
              onClick={handleShare}
              className="mystical-button p-3"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <Share2 className="w-5 h-5" />
            </motion.button>
            
            <motion.button
              onClick={handleStartNew}
              className="mystical-button p-3"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <RotateCcw className="w-5 h-5" />
            </motion.button>
          </div>
        </div>

        <div className="max-w-4xl mx-auto">
          {/* 标题和问题 */}
          <motion.div
            className="text-center mb-8"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="text-3xl font-bold text-transparent bg-gradient-to-r from-yellow-300 via-purple-400 to-pink-400 bg-clip-text mb-4">
              你的塔罗解读
            </h1>
            <div className="mystical-card p-6">
              <h2 className="text-lg font-semibold text-white mb-2">你的问题</h2>
              <p className="text-gray-300">"{currentReading.question}"</p>
            </div>
          </motion.div>

          {/* 牌阵和卡牌 */}
          <motion.div
            className="mystical-card p-8 mb-8"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <div className="text-center mb-6">
              <h2 className="text-2xl font-semibold text-white mb-2">
                {currentReading.spread.name}
              </h2>
              <p className="text-gray-300">
                {currentReading.spread.description}
              </p>
            </div>
            
            <div className="flex justify-center gap-6 flex-wrap">
              {currentReading.cards.map((card, index) => (
                <motion.div
                  key={card.id}
                  className="text-center"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 + index * 0.1 }}
                >
                  <div className="text-sm text-gray-300 mb-2">
                    {currentReading.spread.positions[index]}
                  </div>
                  <div className="w-32 h-48 mystical-card p-4 flex flex-col items-center justify-center">
                    <div className="text-yellow-300 text-3xl mb-2">✨</div>
                    <h3 className="text-white font-semibold text-sm mb-2">
                      {card.name}
                    </h3>
                    <p className="text-gray-300 text-xs text-center leading-tight">
                      {card.keywordsUpright.slice(0, 2).join(' · ')}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* AI解读 */}
          <motion.div
            className="mystical-card p-8 mb-8"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
          >
            <div className="flex items-center mb-6">
              <BookOpen className="w-6 h-6 text-yellow-300 mr-3" />
              <h2 className="text-2xl font-semibold text-white">
                智能解读
              </h2>
            </div>
            
            <div className="prose prose-invert max-w-none">
              <div className="text-gray-300 leading-relaxed whitespace-pre-wrap">
                {showFullInterpretation 
                  ? currentReading.interpretation 
                  : currentReading.interpretation.slice(0, 300) + (currentReading.interpretation.length > 300 ? '...' : '')
                }
              </div>
              
              {currentReading.interpretation.length > 300 && (
                <motion.button
                  onClick={() => setShowFullInterpretation(!showFullInterpretation)}
                  className="mt-4 text-yellow-300 hover:text-yellow-400 transition-colors"
                  whileHover={{ scale: 1.05 }}
                >
                  {showFullInterpretation ? '收起' : '展开完整解读'}
                </motion.button>
              )}
            </div>
          </motion.div>

          {/* 建议 */}
          <motion.div
            className="mystical-card p-8 mb-8"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.7 }}
          >
            <h2 className="text-xl font-semibold text-white mb-4">
              给你的建议
            </h2>
            <p className="text-gray-300 leading-relaxed">
              {currentReading.advice}
            </p>
          </motion.div>

          {/* 卡牌详细含义 */}
          <motion.div
            className="space-y-4"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.9 }}
          >
            <h2 className="text-xl font-semibold text-white text-center mb-6">
              卡牌详细含义
            </h2>
            
            {currentReading.cards.map((card, index) => (
              <div key={card.id} className="mystical-card p-6">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 text-center">
                    <div className="w-16 h-24 mystical-card p-2 flex flex-col items-center justify-center mb-2">
                      <div className="text-yellow-300 text-lg">✨</div>
                      <div className="text-xs text-gray-300">
                        {currentReading.spread.positions[index]}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white mb-2">
                      {card.name} ({card.nameEn})
                    </h3>
                    
                    <div className="mb-3">
                      <span className="text-sm text-gray-400 mr-2">关键词:</span>
                      {card.keywordsUpright.map((keyword, i) => (
                        <span key={i} className="inline-block bg-white/10 rounded-full px-2 py-1 text-xs text-gray-300 mr-2 mb-1">
                          {keyword}
                        </span>
                      ))}
                    </div>
                    
                    <p className="text-gray-300 text-sm leading-relaxed">
                      {card.meaningUpright}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </motion.div>

          {/* 底部操作 */}
          <motion.div
            className="text-center mt-12"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1.1 }}
          >
            <motion.button
              onClick={handleStartNew}
              className="mystical-button px-8 py-3 text-lg font-semibold mr-4"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              再次占卜
            </motion.button>
            
            <motion.button
              onClick={() => router.push('/')}
              className="mystical-button px-8 py-3 text-lg font-semibold bg-white/10"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              返回首页
            </motion.button>
          </motion.div>
        </div>
      </main>
    </div>
  );
}