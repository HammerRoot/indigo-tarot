"use client";

import { memo } from "react";
import styles from "./MarkdownRenderer.module.less";

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
      .replace(/^### (.*$)/gim, '<h3 class="md-h3">$1</h3>')
      .replace(/^## (.*$)/gim, '<h2 class="md-h2">$1</h2>')
      .replace(/^# (.*$)/gim, '<h1 class="md-h1">$1</h1>')
      // 处理粗体文本
      .replace(/\*\*(.*?)\*\*/g, '<strong class="md-strong">$1</strong>')
      .replace(/__(.*?)__/g, '<strong class="md-strong">$1</strong>')
      // 处理斜体文本
      .replace(/\*(.*?)\*/g, '<em class="md-em">$1</em>')
      .replace(/_(.*?)_/g, '<em class="md-em">$1</em>')
      // 处理行内代码
      .replace(/`([^`]+)`/g, '<code class="md-code">$1</code>')
      // 处理链接
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="md-link" target="_blank" rel="noopener noreferrer">$1</a>')
      // 处理无序列表
      .replace(/^[\s]*[-*+]\s+(.+)$/gim, '<li class="md-li">$1</li>')
      // 处理有序列表
      .replace(/^[\s]*\d+\.\s+(.+)$/gim, '<li class="md-li">$1</li>')
      // 处理引用
      .replace(/^>\s*(.*)$/gim, '<blockquote class="md-blockquote">$1</blockquote>')
      // 处理水平分割线
      .replace(/^---$/gim, '<hr class="md-hr" />')
      // 处理段落换行
      .replace(/\n\n/g, '</p><p class="md-p">')
      // 处理单个换行
      .replace(/\n/g, '<br />');
  };

  // 将处理后的内容包装在段落标签中
  const processedContent = `<p class="md-p">${processMarkdown(content)}</p>`;

  return (
    <div 
      className={`${styles.prose} ${className}`}
      dangerouslySetInnerHTML={{ 
        __html: processedContent
          // 处理连续的段落标签
          .replace(/<\/p><p[^>]*><\/p><p[^>]*>/g, '</p><p class="md-p">')
          // 移除空段落
          .replace(/<p[^>]*><\/p>/g, '')
          // 处理列表项的包装
          .replace(/(<li[^>]*>[\s\S]*?<\/li>)/g, (match, listItems) => {
            return `<ul class="md-ul">${listItems}</ul>`;
          })
      }}
    />
  );
});