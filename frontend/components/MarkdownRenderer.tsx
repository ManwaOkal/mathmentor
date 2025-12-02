'use client'

import React, { useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'

interface MarkdownRendererProps {
  content: string
  className?: string
}

/**
 * Enhanced LaTeX preprocessor with better pattern matching
 */
function preprocessLatex(content: string): string {
  if (!content.trim()) return content
  
  // Track replacements to avoid circular processing
  const replacements: Array<{ pattern: RegExp, replacement: string | ((match: string, ...args: any[]) => string) }> = [
    // Protect already wrapped math expressions first
    { pattern: /\$\$[\s\S]*?\$\$/g, replacement: (match) => `__BLOCK_MATH__${btoa(match)}__END__` },
    { pattern: /\$[^$\n]+\$/g, replacement: (match) => `__INLINE_MATH__${btoa(match)}__END__` },
    
    // Protect code blocks
    { pattern: /```[\s\S]*?```/g, replacement: (match) => `__CODE_BLOCK__${btoa(match)}__END__` },
    { pattern: /`[^`]+`/g, replacement: (match) => `__INLINE_CODE__${btoa(match)}__END__` },
    
    // Matrix sizes (m×n, n×p, etc.)
    { pattern: /\b([a-zA-Z])\s*×\s*([a-zA-Z])\b/g, replacement: '$$1 \\times $2$' },
    
    // Matrix declarations like "A = [1 2; 3 4]"
    { pattern: /([A-Z])\s*=\s*\[([^\]]+)\]/g, replacement: '$$1 = \\begin{bmatrix} $2 \\end{bmatrix}$' },
    
    // Matrix element notation like a_{ij}, c_{11}
    { pattern: /\b([a-z])_\{(\d+)(\d+)\}\b/g, replacement: '$$1_{$2$3}$' },
    
    // Summation notation
    { pattern: /c_\{ij\}=\s*∑_\{k=1\}^n\s*a_\{ik\}⋅b_\{kj\}/g, replacement: '$$c_{ij} = \sum_{k=1}^{n} a_{ik} \cdot b_{kj}$$' },
    
    // Multiplication expressions like AB, BA
    { pattern: /\b([A-Z])([A-Z])\b/g, replacement: (match, a, b) => {
      // Only replace if likely to be matrix multiplication (two consecutive capital letters)
      return a === a.toUpperCase() && b === b.toUpperCase() ? `$${a}${b}$` : match
    }},
    
    // Single capital letters that are likely matrices
    { pattern: /\b(Matrix|matrix|Let|Given|Consider|For)\s+([A-Z])\b/g, replacement: '$1 $${2}$' },
  ]

  let processed = content
  
  // Apply all replacements
  replacements.forEach(({ pattern, replacement }) => {
    processed = processed.replace(pattern, replacement as any)
  })
  
  // Restore protected content
  processed = processed.replace(/__BLOCK_MATH__([A-Za-z0-9+/=]+)__END__/g, (_, encoded) => {
    try {
      return atob(encoded)
    } catch {
      return `$$${encoded}$$`
    }
  })
  
  processed = processed.replace(/__INLINE_MATH__([A-Za-z0-9+/=]+)__END__/g, (_, encoded) => {
    try {
      return atob(encoded)
    } catch {
      return `$${encoded}$`
    }
  })
  
  processed = processed.replace(/__CODE_BLOCK__([A-Za-z0-9+/=]+)__END__/g, (_, encoded) => {
    try {
      return atob(encoded)
    } catch {
      return `\`\`\`\n${encoded}\n\`\`\``
    }
  })
  
  processed = processed.replace(/__INLINE_CODE__([A-Za-z0-9+/=]+)__END__/g, (_, encoded) => {
    try {
      return atob(encoded)
    } catch {
      return `\`${encoded}\``
    }
  })
  
  return processed
}

/**
 * Clean content by fixing common LaTeX issues
 */
function cleanContent(content: string): string {
  return content
    // Fix broken matrix representations
    .replace(/\$1\$\s*([^$]+)\s*\$1\$/g, '$$\\begin{bmatrix} $1 \\end{bmatrix}$$')
    // Fix missing LaTeX commands
    .replace(/\\begin\{bmatrix\}([^}]+)\\\\([^}]+)\\end\{bmatrix\}/g, '\\begin{bmatrix} $1 \\\\ $2 \\end{bmatrix}')
    // Normalize multiplication dots
    .replace(/⋅/g, '\\cdot')
    .replace(/×/g, '\\times')
    // Fix summation notation
    .replace(/∑_\{([^}]+)\}\^\{([^}]+)\}/g, '\\sum_{$1}^{$2}')
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = React.memo(
  ({ content, className = '' }) => {
    const processedContent = useMemo(() => {
      const cleaned = cleanContent(content)
      return preprocessLatex(cleaned)
    }, [content])
    
    return (
      <div className={`prose prose-sm max-w-none dark:prose-invert ${className}`}>
        <style dangerouslySetInnerHTML={{ __html: `
          .prose {
            color: inherit;
          }
          .prose code:not(pre code) {
            background-color: rgba(0, 0, 0, 0.05);
            padding: 0.2em 0.4em;
            border-radius: 0.25rem;
            font-size: 0.875em;
          }
          .dark .prose code:not(pre code) {
            background-color: rgba(255, 255, 255, 0.1);
          }
          .prose pre {
            background-color: #1a202c;
            color: #e2e8f0;
            overflow-x: auto;
            padding: 1rem;
            border-radius: 0.5rem;
            margin: 1rem 0;
          }
        ` }} />
        
        <ReactMarkdown
          remarkPlugins={[remarkMath]}
          rehypePlugins={[rehypeKatex]}
          components={{
            code({ node, inline, className, children, ...props }: any) {
              const match = /language-(\w+)/.exec(className || '')
              const language = match ? match[1] : ''
              
              if (inline) {
                return (
                  <code 
                    className={`font-mono text-sm ${className || ''}`}
                    style={{ 
                      backgroundColor: 'rgba(0, 0, 0, 0.05)',
                      padding: '0.2em 0.4em',
                      borderRadius: '0.25rem'
                    }}
                    {...props}
                  >
                    {children}
                  </code>
                )
              }
              
              return (
                <div className="relative my-4">
                  {language && (
                    <div className="absolute top-0 right-0 px-2 py-1 text-xs bg-gray-700 text-gray-200 rounded-bl rounded-tr">
                      {language}
                    </div>
                  )}
                  <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
                    <code className={`${className} block`} {...props}>
                    {children}
                  </code>
                </pre>
                </div>
              )
            },
            // Add custom styling for tables
            table({ children }: any) {
              return (
                <div className="overflow-x-auto my-4">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    {children}
                  </table>
                </div>
              )
            },
            th({ children }: any) {
              return (
                <th className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  {children}
                </th>
              )
            },
            td({ children }: any) {
              return (
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                  {children}
                </td>
              )
            }
          }}
        >
          {processedContent}
        </ReactMarkdown>
      </div>
    )
  },
  (prevProps, nextProps) => prevProps.content === nextProps.content
)

MarkdownRenderer.displayName = 'MarkdownRenderer'

export default MarkdownRenderer
