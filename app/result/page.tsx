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
            <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-gradient-to-r from-purple-600 via-purple-500 to-purple-400 bg-clip-text mb-8">
              你的塔罗解读
            </h1>
            <div className="mystical-card p-8 md:p-10">
              <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-4">你的问题</h2>
              <p className="text-gray-700 text-lg leading-relaxed">"{currentReading.question}"</p>
            </div>
          </motion.div>

          {/* 牌阵和卡牌 */}
          <motion.div
            className="mystical-card p-8 mb-8"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <div className="text-center mb-10">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">
                {currentReading.spread.name}
              </h2>
              <p className="text-gray-600 text-lg md:text-xl leading-relaxed max-w-3xl mx-auto">
                {currentReading.spread.description}
              </p>
            </div>
            
            <div className="flex justify-center gap-6 md:gap-8 flex-wrap">
              {currentReading.cards.map((card, index) => (
                <motion.div
                  key={card.id}
                  className="text-center"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 + index * 0.1 }}
                >
                  <div className="mb-4">
                    <div className="bg-purple-100 border border-purple-200 rounded-lg px-4 py-2 inline-block">
                      <span className="text-sm font-semibold text-gray-700">
                        {currentReading.spread.positions[index]}
                      </span>
                    </div>
                  </div>
                  <div className="w-36 h-56 md:w-40 md:h-60 mystical-card p-6 flex flex-col items-center justify-center group hover:scale-105 transition-transform">
                    <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-purple-600 rounded-full flex items-center justify-center mb-4">
                      <div className="text-white text-2xl">✨</div>
                    </div>
                    <h3 className="text-gray-800 font-bold text-sm mb-3 text-center leading-tight">
                      {card.name}
                    </h3>
                    <p className="text-gray-600 text-xs text-center leading-relaxed">
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
            <div className="flex items-center justify-center mb-8">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-purple-600 rounded-full flex items-center justify-center mr-4">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-800">
                智能解读
              </h2>
            </div>
            
            <div className="prose max-w-none">
              <div className="text-gray-700 text-lg leading-relaxed whitespace-pre-wrap bg-purple-50 border border-purple-200 rounded-xl p-6 md:p-8">
                {showFullInterpretation 
                  ? currentReading.interpretation 
                  : currentReading.interpretation.slice(0, 300) + (currentReading.interpretation.length > 300 ? '...' : '')
                }
              </div>
              
              {currentReading.interpretation.length > 300 && (
                <div className="text-center mt-6">
                  <motion.button
                    onClick={() => setShowFullInterpretation(!showFullInterpretation)}
                    className="text-purple-600 hover:text-purple-700 font-semibold transition-colors bg-white border border-purple-200 rounded-lg px-6 py-2"
                    whileHover={{ scale: 1.02 }}
                  >
                    {showFullInterpretation ? '收起' : '展开完整解读'}
                  </motion.button>
                </div>
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
            <div className="flex items-center justify-center mb-6">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-purple-600 rounded-full flex items-center justify-center mr-3">
                <span className="text-white text-lg">💡</span>
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-800">
                给你的建议
              </h2>
            </div>
            <div className="bg-gradient-to-r from-purple-50 to-purple-100 border border-purple-200 rounded-xl p-6 md:p-8">
              <p className="text-gray-700 text-lg leading-relaxed">
                {currentReading.advice}
              </p>
            </div>
          </motion.div>

          {/* 卡牌详细含义 */}
          <motion.div
            className="space-y-4"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.9 }}
          >
            <div className="text-center mb-8">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-800">
                卡牌详细含义
              </h2>
            </div>
            
            {currentReading.cards.map((card, index) => (
              <motion.div 
                key={card.id} 
                className="mystical-card p-6 md:p-8 hover:scale-[1.02] transition-transform"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * index }}
              >
                <div className="flex flex-col md:flex-row items-start gap-6">
                  <div className="flex-shrink-0 text-center">
                    <div className="w-20 h-28 md:w-24 md:h-32 mystical-card p-3 flex flex-col items-center justify-center mb-3">
                      <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-purple-600 rounded-full flex items-center justify-center mb-2">
                        <div className="text-white text-lg">✨</div>
                      </div>
                      <div className="text-xs font-semibold text-gray-600 text-center leading-tight">
                        {currentReading.spread.positions[index]}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex-1">
                    <h3 className="text-xl md:text-2xl font-bold text-gray-800 mb-4">
                      {card.name} <span className="text-gray-500 font-medium">({card.nameEn})</span>
                    </h3>
                    
                    <div className="mb-6">
                      <span className="text-base font-semibold text-gray-700 mr-3">关键词:</span>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {card.keywordsUpright.map((keyword, i) => (
                          <span key={i} className="inline-block bg-purple-100 border border-purple-200 rounded-full px-3 py-1 text-sm font-medium text-purple-700">
                            {keyword}
                          </span>
                        ))}
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <p className="text-gray-700 leading-relaxed">
                        {card.meaningUpright}
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* 底部操作 */}
          <motion.div
            className="text-center mt-12"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1.1 }}
          >
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <motion.button
                onClick={handleStartNew}
                className="mystical-button px-10 py-4 text-lg font-bold"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                再次占卜
              </motion.button>
              
              <motion.button
                onClick={() => router.push('/')}
                className="bg-white border-2 border-purple-300 text-purple-600 hover:bg-purple-50 rounded-xl px-10 py-4 text-lg font-bold transition-colors"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                返回首页
              </motion.button>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}