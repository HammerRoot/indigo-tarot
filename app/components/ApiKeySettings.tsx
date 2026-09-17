"use client";

import { useEffect, useState } from "react";
import { Settings, Key, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ApiKeySettingsProps {
  onApiKeyChange: (apiKey: string, remember?: boolean) => void;
  currentApiKey: string;
  trialUsed?: boolean;
  /** 受控打开（首页在试用用完时自动弹出） */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** 弹窗顶部提示文案 */
  notice?: string | null;
}

export function ApiKeySettings({
  onApiKeyChange,
  currentApiKey,
  trialUsed,
  open,
  onOpenChange,
  notice,
}: ApiKeySettingsProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [apiKey, setApiKey] = useState(currentApiKey);
  const [showKey, setShowKey] = useState(false);
  const [remember, setRemember] = useState(true);

  // 「记住 Key」依赖 crypto.subtle 做 AES-GCM 加密（lib/apiKeyCrypto.ts），而 crypto.subtle
  // 只在安全上下文（HTTPS / localhost）存在。生产是 HTTP 公网直连，它是 undefined，
  // 加密必然抛 `Cannot read properties of undefined (reading 'generateKey')`（决策 D10）。
  // 检测到不可用就隐藏整行——否则用户勾了、刷新后 Key 没了，看起来像 bug。
  //
  // 初值 true 与 SSR 输出一致，避免 hydration 不匹配；弹窗默认关闭，用户看到时已校正完毕。
  const [canRememberKey, setCanRememberKey] = useState(true);
  useEffect(() => {
    setCanRememberKey(typeof window.crypto?.subtle !== "undefined");
  }, []);

  const isControlled = open !== undefined;
  const isOpen = isControlled ? open : internalOpen;
  const setOpen = (v: boolean) => {
    if (isControlled) onOpenChange?.(v);
    else setInternalOpen(v);
  };

  const handleSave = () => {
    // 不能记住时显式传 false：跳过注定失败的加密分支（store 里会 catch 并打 console.error）
    onApiKeyChange(apiKey, canRememberKey && remember);
    setOpen(false);
  };

  const handleClear = () => {
    setApiKey("");
    onApiKeyChange("");
  };

  return (
    <>
      {/* 设置按钮 */}
      <button
        onClick={() => setOpen(true)}
        className="fixed top-4 right-4 z-50 p-3 bg-white border border-purple-200 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 hover:bg-purple-50"
        title="API设置"
      >
        <Settings className="w-5 h-5 text-purple-600" />
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
              className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
              onClick={() => setOpen(false)}
            >
              {/* 弹窗内容 */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                {/* 标题 */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <Key className="w-5 h-5 text-purple-600" />
                    <h3 className="text-lg font-semibold text-gray-800">
                      API 设置
                    </h3>
                  </div>
                  <button
                    onClick={() => setOpen(false)}
                    className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>

                {/* 提示条（如试用用完） */}
                {notice && (
                  <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700 leading-relaxed">
                    {notice}
                  </div>
                )}

                {/* 说明 */}
                <div className="mb-6 p-4 bg-purple-50 rounded-lg">
                  <h4 className="text-sm font-medium text-purple-800 mb-2">
                    💡 API密钥说明
                  </h4>
                  <ul className="text-xs text-purple-700 space-y-1">
                    <li>• 未配置密钥：可免费试用 1 次（每个设备仅一次）</li>
                    <li>• 配置个人密钥：无限制，费用自承担</li>
                    <li>
                      • 获取密钥：访问{" "}
                      <a
                        href="https://platform.deepseek.com"
                        target="_blank"
                        className="underline"
                      >
                        DeepSeek官网
                      </a>
                    </li>
                  </ul>
                </div>

                {/* API Key 输入 */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    DeepSeek API Key（可选）
                  </label>
                  <div className="relative">
                    <input
                      type={showKey ? "text" : "password"}
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="sk-..."
                      className="w-full px-4 py-3 border border-purple-200 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowKey(!showKey)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showKey ? "隐藏" : "显示"}
                    </button>
                  </div>
                </div>

                {/* 记住 Key（加密保存）——仅在加密可用的安全上下文下渲染（O6） */}
                {canRememberKey && (
                  <div className="mb-6">
                    <label className="flex items-start gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={remember}
                        onChange={(e) => setRemember(e.target.checked)}
                        className="mt-1 accent-purple-600"
                      />
                      <span className="text-sm text-gray-700">
                        在本设备记住 Key（加密保存）
                      </span>
                    </label>
                    <p className="text-xs text-gray-400 mt-2 leading-relaxed">
                      加密保存可防止静态窃取（如浏览器扩展扫描、磁盘取证），
                      但无法防恶意脚本/浏览器扩展在会话期间的读取。
                      关闭后 Key 仅保存在当前会话，刷新页面需重新输入。
                    </p>
                  </div>
                )}

                {/* 保存按钮（当前状态上方，全宽） */}
                <button
                  onClick={handleSave}
                  className="w-full mb-4 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
                >
                  保存
                </button>

                {/* 当前状态 */}
                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-600 space-y-1">
                    <div>
                      <strong>当前状态：</strong>
                      {currentApiKey ? (
                        <span className="text-green-600">使用个人密钥</span>
                      ) : (
                        <span className="text-orange-600">
                          使用系统密钥（免费试用 1 次）
                        </span>
                      )}
                    </div>
                    <div>
                      <strong>免费试用：</strong>
                      {trialUsed ? (
                        <span className="text-orange-600">
                          已用完（请输入个人密钥继续）
                        </span>
                      ) : (
                        <span className="text-green-600">可用 1 次</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* 清除按钮（当前状态下方，全宽） */}
                <button
                  onClick={handleClear}
                  className="w-full px-4 py-3 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  清除已保存的api key
                </button>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
