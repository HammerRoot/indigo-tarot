"use client";

import { memo } from "react";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export const MarkdownRenderer = memo(function MarkdownRenderer({
  content,
  className = "",
}: MarkdownRendererProps) {
  if (!content) return null;

  // 处理Markdown格式的内容
  const processMarkdown = (text: string) => {
    return text
      // 处理标题
      .replace(/^### (.*$)/gim, '<h3 class="text-lg font-bold text-gray-800 mt-6 mb-3 border-b border-purple-200 pb-2">$1</h3>')
      .replace(/^## (.*$)/gim, '<h2 class="text-xl font-bold text-gray-800 mt-8 mb-4 border-b-2 border-purple-300 pb-2">$1</h2>')
      .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold text-gray-800 mt-8 mb-6">$1</h1>')
      // 处理粗体文本
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-gray-900">$1</strong>')
      .replace(/__(.*?)__/g, '<strong class="font-bold text-gray-900">$1</strong>')
      // 处理斜体文本
      .replace(/\*(.*?)\*/g, '<em class="italic text-gray-700">$1</em>')
      .replace(/_(.*?)_/g, '<em class="italic text-gray-700">$1</em>')
      // 处理行内代码
      .replace(/`([^`]+)`/g, '<code class="bg-purple-100 text-purple-800 px-2 py-1 rounded text-sm font-mono">$1</code>')
      // 处理链接
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-purple-600 hover:text-purple-800 underline" target="_blank" rel="noopener noreferrer">$1</a>')
      // 处理无序列表
      .replace(/^[\s]*[-*+]\s+(.+)$/gim, '<li class="ml-6 mb-2 list-disc">$1</li>')
      // 处理有序列表
      .replace(/^[\s]*\d+\.\s+(.+)$/gim, '<li class="ml-6 mb-2 list-decimal">$1</li>')
      // 处理引用
      .replace(/^>\s*(.*)$/gim, '<blockquote class="border-l-4 border-purple-300 pl-4 py-2 my-4 bg-purple-50 italic text-gray-700">$1</blockquote>')
      // 处理水平分割线
      .replace(/^---$/gim, '<hr class="border-t-2 border-purple-200 my-6" />')
      // 处理段落换行
      .replace(/\n\n/g, '</p><p class="mb-4">')
      // 处理单个换行
      .replace(/\n/g, '<br />');
  };

  // 将处理后的内容包装在段落标签中
  const processedContent = `<p class="mb-4">${processMarkdown(content)}</p>`;

  return (
    <div 
      className={`prose max-w-none ${className}`}
      dangerouslySetInnerHTML={{ 
        __html: processedContent
          // 处理连续的段落标签
          .replace(/<\/p><p[^>]*><\/p><p[^>]*>/g, '</p><p class="mb-4">')
          // 移除空段落
          .replace(/<p[^>]*><\/p>/g, '')
          // 处理列表项的包装
          .replace(/(<li[^>]*>[\s\S]*?<\/li>)/g, (match, listItems) => {
            return `<ul class="mb-4">${listItems}</ul>`;
          })
      }}
    />
  );
});