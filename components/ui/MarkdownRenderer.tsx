import React from "react";
import ReactMarkdown from "react-markdown";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export default function MarkdownRenderer({ content, className = "" }: MarkdownRendererProps) {
  if (!content) return null;

  return (
    <div className={`prose-dark font-sans text-xs sm:text-sm ${className}`}>
      <ReactMarkdown
        components={{
          h1: ({ node, ...props }) => (
            <h1 className="text-base sm:text-lg font-bold text-[#d4af37] font-serif mt-4 mb-2 first:mt-0" {...props} />
          ),
          h2: ({ node, ...props }) => (
            <h2 className="text-sm sm:text-base font-bold text-[#d4af37] font-serif mt-3 mb-2 first:mt-0" {...props} />
          ),
          h3: ({ node, ...props }) => (
            <h3 className="text-xs sm:text-sm font-semibold text-[#f5d76e] font-serif mt-2.5 mb-1.5 first:mt-0" {...props} />
          ),
          p: ({ node, ...props }) => (
            <p className="mb-2 leading-relaxed text-[#ece9e2]/90 last:mb-0" {...props} />
          ),
          ul: ({ node, ...props }) => (
            <ul className="list-disc pl-5 mb-2 space-y-1 text-[#ece9e2]/90" {...props} />
          ),
          ol: ({ node, ...props }) => (
            <ol className="list-decimal pl-5 mb-2 space-y-1 text-[#ece9e2]/90" {...props} />
          ),
          li: ({ node, ...props }) => (
            <li className="leading-relaxed" {...props} />
          ),
          blockquote: ({ node, ...props }) => (
            <blockquote
              className="border-l-2 border-[#d4af37] pl-3 py-1.5 my-2.5 italic text-[#9a978f] bg-[#1b1b1e]/60 rounded-r-lg"
              {...props}
            />
          ),
          strong: ({ node, ...props }) => (
            <strong className="font-semibold text-[#ece9e2]" {...props} />
          ),
          em: ({ node, ...props }) => (
            <em className="italic text-[#ece9e2]/90" {...props} />
          ),
          code: ({ node, className: codeClassName, children, ...props }: any) => {
            const hasNewLine = typeof children === "string" && children.includes("\n");
            const isCodeBlock = Boolean(codeClassName) || hasNewLine;

            if (!isCodeBlock) {
              return (
                <code
                  className="px-1.5 py-0.5 rounded bg-[#1b1b1e] text-[#d4af37] font-mono text-[11px] sm:text-xs border border-[#2a2a2e]"
                  {...props}
                >
                  {children}
                </code>
              );
            }

            return (
              <div className="my-2.5 rounded-xl overflow-hidden border border-[#2a2a2e] bg-[#0e0e10]">
                <pre className="p-3.5 overflow-x-auto text-[11px] sm:text-xs font-mono text-[#ece9e2] leading-relaxed">
                  <code {...props}>{children}</code>
                </pre>
              </div>
            );
          },
          table: ({ node, ...props }) => (
            <div className="overflow-x-auto my-3">
              <table className="min-w-full text-xs text-left border-collapse border border-[#2a2a2e]" {...props} />
            </div>
          ),
          th: ({ node, ...props }) => (
            <th className="border border-[#2a2a2e] bg-[#1b1b1e] px-3 py-1.5 font-semibold text-[#d4af37]" {...props} />
          ),
          td: ({ node, ...props }) => (
            <td className="border border-[#2a2a2e] px-3 py-1.5 text-[#ece9e2]/90" {...props} />
          ),
          a: ({ node, href, children, ...props }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#d4af37] underline underline-offset-2 hover:text-[#f5d76e] transition"
              {...props}
            >
              {children}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
