"use client";

import { useState } from "react";
import { Settings, Key, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import styles from "./ApiKeySettings.module.less";

interface ApiKeySettingsProps {
  onApiKeyChange: (apiKey: string) => void;
  currentApiKey: string;
  remainingCalls?: number | null;
  usingSystemKey?: boolean;
}

export function ApiKeySettings({ onApiKeyChange, currentApiKey, remainingCalls, usingSystemKey }: ApiKeySettingsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [apiKey, setApiKey] = useState(currentApiKey);
  const [showKey, setShowKey] = useState(false);

  const handleSave = () => {
    onApiKeyChange(apiKey);
    setIsOpen(false);
  };

  const handleClear = () => {
    setApiKey("");
    onApiKeyChange("");
  };

  return (
    <>
      {/* 设置按钮 */}
      <button
        onClick={() => setIsOpen(true)}
        className={styles.settingsButton}
        title="API设置"
      >
        <Settings />
      </button>

      {/* 设置弹窗 */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* 背景遮罩 */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={styles.overlay}
              onClick={() => setIsOpen(false)}
            >
              {/* 弹窗内容 */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className={styles.modal}
                onClick={(e) => e.stopPropagation()}
              >
                {/* 标题 */}
                <div className={styles.header}>
                  <div className={styles.title}>
                    <Key />
                    <h3>API 设置</h3>
                  </div>
                  <button
                    onClick={() => setIsOpen(false)}
                    className={styles.closeButton}
                  >
                    <X />
                  </button>
                </div>

                {/* 说明 */}
                <div className={styles.description}>
                  <h4>💡 API密钥说明</h4>
                  <ul>
                    <li>• 未配置密钥：使用系统密钥，每3小时限制5次</li>
                    <li>• 配置个人密钥：无限制，费用自承担</li>
                    <li>• 获取密钥：访问 <a href="https://platform.deepseek.com" target="_blank">DeepSeek官网</a></li>
                  </ul>
                </div>

                {/* API Key 输入 */}
                <div className={styles.inputSection}>
                  <label>DeepSeek API Key（可选）</label>
                  <div className={styles.inputContainer}>
                    <input
                      type={showKey ? "text" : "password"}
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="sk-..."
                    />
                    <button
                      type="button"
                      onClick={() => setShowKey(!showKey)}
                    >
                      {showKey ? "隐藏" : "显示"}
                    </button>
                  </div>
                </div>

                {/* 当前状态 */}
                <div className={styles.status}>
                  <div className={styles.statusContent}>
                    <div>
                      <strong>当前状态：</strong>
                      {currentApiKey ? (
                        <span className={styles.personal}>使用个人密钥</span>
                      ) : (
                        <span className={styles.system}>使用系统密钥（限制5次/3小时）</span>
                      )}
                    </div>
                    {usingSystemKey && remainingCalls !== null && (
                      <div>
                        <strong>剩余次数：</strong>
                        <span className={`${styles.remaining} ${remainingCalls === 0 ? styles.empty : (remainingCalls ?? 0) <= 2 ? styles.low : styles.good}`}>
                          {remainingCalls}/5 次
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 按钮组 */}
                <div className={styles.actions}>
                  <button
                    onClick={handleClear}
                    className={styles.clearButton}
                  >
                    清除
                  </button>
                  <button
                    onClick={handleSave}
                    className={styles.saveButton}
                  >
                    保存
                  </button>
                </div>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}