'use client'

import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'

interface MarkdownRendererProps {
  content: string
}

export default function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <div className="prose prose-sm max-w-none dark:prose-invert">
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          code({ node, inline, className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || '')
            return !inline && match ? (
              <pre className="bg-slate-50 rounded-lg p-4 overflow-x-auto my-4 border border-slate-200">
                <code className={className} {...props}>
                  {children}
                </code>
              </pre>
            ) : (
              <code className="bg-slate-100 px-1.5 py-0.5 rounded text-sm font-mono text-slate-800" {...props}>
                {children}
              </code>
            )
          },
          p({ children, ...props }: any) {
            return (
              <p className="mb-4 last:mb-0 leading-relaxed" {...props}>
                {children}
              </p>
            )
          },
          h1({ children }: any) {
            return <h1 className="text-2xl font-bold mb-4 mt-6 first:mt-0">{children}</h1>
          },
          h2({ children }: any) {
            return <h2 className="text-xl font-semibold mb-3 mt-5 first:mt-0">{children}</h2>
          },
          h3({ children }: any) {
            return <h3 className="text-lg font-semibold mb-2 mt-4 first:mt-0">{children}</h3>
          },
          ul({ children }: any) {
            return <ul className="list-disc list-outside mb-4 ml-5 space-y-2">{children}</ul>
          },
          ol({ children }: any) {
            return <ol className="list-decimal list-outside mb-4 ml-5 space-y-2">{children}</ol>
          },
          li({ children }: any) {
            return <li className="leading-relaxed">{children}</li>
          },
          a({ children, href }: any) {
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-700 underline"
              >
                {children}
              </a>
            )
          },
          blockquote({ children }: any) {
            return (
              <blockquote className="border-l-4 border-slate-300 pl-4 italic my-4 text-slate-600">
                {children}
              </blockquote>
            )
          },
          span({ className, children, ...props }: any) {
            if (className?.includes('katex')) {
              const isDisplay = className.includes('katex-display')
              return (
                <span 
                  className={`${className} ${isDisplay ? 'block my-4' : 'inline-block mx-1 my-2'}`}
                  style={{ display: isDisplay ? 'block' : 'inline-block' }}
                  {...props}
                >
                  {children}
                </span>
              )
            }
            return <span {...props}>{children}</span>
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
