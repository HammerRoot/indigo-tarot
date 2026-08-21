"use client";

import { memo } from "react";
import ReactMarkdown, { Components } from "react-markdown";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

// 样式类从旧版正则实现平移，保持视觉一致
const components: Components = {
  h1: (props) => (
    <h1 className="text-2xl font-bold text-gray-800 mt-8 mb-6" {...props} />
  ),
  h2: (props) => (
    <h2 className="text-xl font-bold text-gray-800 mt-8 mb-4 border-b-2 border-purple-300 pb-2" {...props} />
  ),
  h3: (props) => (
    <h3 className="text-lg font-bold text-gray-800 mt-6 mb-3 border-b border-purple-200 pb-2" {...props} />
  ),
  p: (props) => <p className="mb-4" {...props} />,
  strong: (props) => (
    <strong className="font-bold text-gray-900" {...props} />
  ),
  em: (props) => <em className="italic text-gray-700" {...props} />,
  code: (props) => {
    const { className, children, ...rest } = props;
    const isBlock =
      typeof className === "string" && className.includes("language-");
    return isBlock ? (
      <code
        className={`block bg-purple-100 text-purple-800 p-4 rounded-lg text-sm font-mono overflow-x-auto ${className ?? ""}`}
        {...rest}
      >
        {children}
      </code>
    ) : (
      <code
        className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-sm font-mono"
        {...rest}
      >
        {children}
      </code>
    );
  },
  a: (props) => (
    <a
      className="text-purple-600 hover:text-purple-800 underline"
      target="_blank"
      rel="noopener noreferrer"
      {...props}
    />
  ),
  ul: (props) => <ul className="mb-4 list-disc pl-5" {...props} />,
  ol: (props) => <ol className="mb-4 list-decimal pl-5" {...props} />,
  li: (props) => <li className="mb-2" {...props} />,
  blockquote: (props) => (
    <blockquote className="border-l-4 border-purple-300 pl-4 py-2 my-4 bg-purple-50 italic text-gray-700" {...props} />
  ),
  hr: (props) => <hr className="border-t-2 border-purple-200 my-6" {...props} />,
};

export const MarkdownRenderer = memo(function MarkdownRenderer({
  content,
  className = "",
}: MarkdownRendererProps) {
  if (!content) return null;

  return (
    <div className={`prose max-w-none ${className}`}>
      <ReactMarkdown components={components}>{content}</ReactMarkdown>
    </div>
  );
});
