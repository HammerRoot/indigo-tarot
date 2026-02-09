'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Stars, Moon, Sparkles } from 'lucide-react';
import { useTarotStore } from '@/lib/store';
import { useRouter } from 'next/navigation';

export default function Home() {
  const [localQuestion, setLocalQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { setQuestion, resetSession } = useTarotStore();
  const router = useRouter();

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
      router.push('/draw');
    }, 1000);
  };

  return (
    <div className="min-h-screen mystical-bg relative overflow-hidden">
      {/* 星空背景 */}
      <div className="stars"></div>
      
      <main className="relative z-10 min-h-screen flex items-center justify-center px-4">
        <div className="max-w-2xl w-full">
          {/* 标题区域 */}
          <motion.div 
            className="text-center mb-12"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="flex items-center justify-center mb-6">
              <Moon className="w-8 h-8 text-yellow-300 mr-3" />
              <h1 className="text-4xl md:text-6xl font-bold text-transparent bg-gradient-to-r from-yellow-300 via-purple-400 to-pink-400 bg-clip-text">
                神秘塔罗
              </h1>
              <Stars className="w-8 h-8 text-yellow-300 ml-3" />
            </div>
            <p className="text-xl text-gray-300 mb-4">
              倾听内心的声音，探寻命运的指引
            </p>
            <div className="flex items-center justify-center text-gray-400">
              <Sparkles className="w-5 h-5 mr-2" />
              <span>韦特塔罗 · AI智能解读</span>
              <Sparkles className="w-5 h-5 ml-2" />
            </div>
          </motion.div>

          {/* 问题输入卡片 */}
          <motion.div
            className="mystical-card p-8"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            <h2 className="text-2xl font-semibold text-center mb-6 text-white">
              在心中默念你的问题
            </h2>
            <p className="text-gray-300 text-center mb-8">
              塔罗牌将为你揭示隐藏在命运中的答案。请诚挚地提出你内心的困惑或疑问，让神秘的力量指引你的方向。
            </p>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="question" className="block text-sm font-medium text-gray-300 mb-3">
                  你的问题
                </label>
                <textarea
                  id="question"
                  value={localQuestion}
                  onChange={(e) => setLocalQuestion(e.target.value)}
                  placeholder="请输入你想要咨询的问题，比如：关于爱情、事业、人际关系等..."
                  className="mystical-input resize-none h-32"
                  required
                />
              </div>
              
              <div className="text-center">
                <motion.button
                  type="submit"
                  disabled={isLoading || !localQuestion.trim()}
                  className="mystical-button px-12 py-4 text-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {isLoading ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                      正在为你占卜...
                    </div>
                  ) : (
                    '开始占卜'
                  )}
                </motion.button>
              </div>
            </form>
          </motion.div>

          {/* 特色功能 */}
          <motion.div
            className="grid md:grid-cols-3 gap-6 mt-12"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
          >
            {[
              { icon: '🎴', title: '智能推荐牌型', desc: '根据问题类型自动选择最适合的塔罗牌阵' },
              { icon: '✨', title: 'AI深度解析', desc: '结合传统塔罗智慧与现代AI技术的专业解读' },
              { icon: '📚', title: '历史记录', desc: '保存您的每一次占卜记录，见证成长轨迹' }
            ].map((feature, index) => (
              <div key={index} className="mystical-card p-6 text-center">
                <div className="text-3xl mb-3">{feature.icon}</div>
                <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-gray-400 text-sm">{feature.desc}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </main>
    </div>
  );
}
