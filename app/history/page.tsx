"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTarotStore } from "@/lib/store";
import { MarkdownRenderer } from "@/app/components/MarkdownRenderer";

export default function HistoryPage() {
  const router = useRouter();
  const readings = useTarotStore((s) => s.readings);
  const removeReading = useTarotStore((s) => s.removeReading);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleDelete = (id: string) => {
    if (window.confirm("确定要删除这条占卜记录吗？")) {
      removeReading(id);
      if (expandedId === id) setExpandedId(null);
    }
  };

  return (
    <div className="min-h-screen mystical-bg relative overflow-hidden">
      <div className="stars"></div>

      <main className="relative z-10 min-h-screen px-4 py-8">
        <div className="max-w-3xl mx-auto">
          {/* 顶部导航 */}
          <div className="flex items-center gap-4 mb-8">
            <motion.button
              onClick={() => router.push("/")}
              className="mystical-button p-3"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              aria-label="返回首页"
            >
              <ArrowLeft className="w-5 h-5" />
            </motion.button>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
              📚 历史记录
            </h1>
          </div>

          {readings.length === 0 ? (
            <div className="mystical-card p-10 text-center">
              <p className="text-4xl mb-4">🔮</p>
              <p className="text-gray-500 text-lg">暂无占卜记录</p>
              <p className="text-gray-400 text-sm mt-2">
                完成一次占卜后，结果会自动保存在这里
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {readings.map((reading) => {
                const isExpanded = expandedId === reading.id;
                return (
                  <motion.div
                    key={reading.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mystical-card p-5 md:p-6"
                  >
                    {/* 列表摘要 */}
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : reading.id)}
                      className="w-full text-left"
                      aria-expanded={isExpanded}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="text-lg font-semibold text-gray-800 truncate">
                            {reading.question || "（未填写问题）"}
                          </p>
                          <div className="flex flex-wrap gap-2 mt-2">
                            <span className="text-xs bg-purple-50 border border-purple-200 rounded-full px-3 py-1 text-purple-700">
                              {reading.spread?.name ?? "牌阵"}
                            </span>
                            <span className="text-xs text-gray-500">
                              {reading.cards.map((c) =>
                                c.name +
                                  (reading.cardReversals?.[reading.cards.indexOf(c)] ? "（逆）" : ""),
                              ).join("、")}
                            </span>
                          </div>
                          <p className="text-xs text-gray-400 mt-2">
                            {new Date(reading.timestamp).toLocaleString("zh-CN")}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(reading.id);
                            }}
                            className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                            aria-label="删除记录"
                            title="删除记录"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          {isExpanded ? (
                            <ChevronUp className="w-5 h-5 text-purple-500" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-purple-500" />
                          )}
                        </div>
                      </div>
                    </button>

                    {/* 展开详情 */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="mt-4 pt-4 border-t border-gray-100">
                            <h3 className="text-sm font-bold text-purple-700 mb-2">
                              🤖 AI 深度解析
                            </h3>
                            <div className="prose prose-sm max-w-none text-gray-700">
                              <MarkdownRenderer
                                content={reading.interpretation}
                                className="text-gray-700"
                              />
                            </div>
                            {reading.advice && (
                              <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                <h4 className="text-sm font-bold text-yellow-800 mb-1">
                                  💡 核心建议
                                </h4>
                                <MarkdownRenderer
                                  content={reading.advice}
                                  className="text-yellow-900"
                                />
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
