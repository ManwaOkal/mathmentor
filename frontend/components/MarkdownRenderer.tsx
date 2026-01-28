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
  
  // First, protect complete math expressions to avoid breaking them
  // Temporarily replace complete expressions with placeholders
  const completeMathExpressions: string[] = []
  content = content.replace(/\$\$[\s\S]*?\$\$/g, (match) => {
    completeMathExpressions.push(match)
    return `__COMPLETE_BLOCK_MATH_${completeMathExpressions.length - 1}__`
  })
  content = content.replace(/\$[^$\n]+\$/g, (match) => {
    completeMathExpressions.push(match)
    return `__COMPLETE_INLINE_MATH_${completeMathExpressions.length - 1}__`
  })
  
  // Now fix incomplete math expressions (missing closing $)
  // This handles cases like "$x - y" that should be "$x - y$"
  content = content.replace(/\$([a-zA-Z0-9_+\-*/=(){}[\]\s\\]+?)(?=\s|$|\.|,|;|:|\)|\(|\n|and|or|the|a|an)/g, (match, mathContent) => {
    const trimmed = mathContent.trim()
    
    // Only fix if it looks like math:
    // - Contains letters (variables) AND operators (like "x - y", "3x+2y=8")
    // - OR single letter variable (like "x")
    // - OR starts with letter followed by operator (like "x -")
    // Avoid matching currency like "$5" by requiring letters or operators
    if (trimmed && (
      (/[a-zA-Z]/.test(trimmed) && /[\-+*/=]/.test(trimmed)) || // variable with operator
      /^[a-zA-Z]$/.test(trimmed) || // single variable
      /^[a-zA-Z]\s*[-+*/=]/.test(trimmed) || // variable followed by operator
      (/^[0-9]/.test(trimmed) && /[a-zA-Z+\-*/=]/.test(trimmed)) // starts with number but has letters/operators
    )) {
      return `$${trimmed}$`
    }
    return match
  })
  
  // Restore complete math expressions
  content = content.replace(/__COMPLETE_BLOCK_MATH_(\d+)__/g, (_, index) => {
    return completeMathExpressions[parseInt(index)] || ''
  })
  content = content.replace(/__COMPLETE_INLINE_MATH_(\d+)__/g, (_, index) => {
    return completeMathExpressions[parseInt(index)] || ''
  })
  
  // Track replacements to avoid circular processing
  const replacements: Array<{ pattern: RegExp, replacement: string | ((match: string, ...args: any[]) => string) }> = [
    // Protect already wrapped math expressions first
    { pattern: /\$\$[\s\S]*?\$\$/g, replacement: (match) => `__BLOCK_MATH__${btoa(match)}__END__` },
    { pattern: /\$[^$\n]+\$/g, replacement: (match) => `__INLINE_MATH__${btoa(match)}__END__` },
    
    // Protect code blocks
    { pattern: /```[\s\S]*?```/g, replacement: (match) => `__CODE_BLOCK__${btoa(match)}__END__` },
    { pattern: /`[^`]+`/g, replacement: (match) => `__INLINE_CODE__${btoa(match)}__END__` },
    
    // Matrix sizes (m×n, n×p, etc.) - handle Unicode × symbol
    { pattern: /\b([a-zA-Z])\s*×\s*([a-zA-Z])\b/g, replacement: '$$1 \\times $2$' },
    { pattern: /\b(\d+)\s*×\s*(\d+)\b/g, replacement: '$$1 \\times $2$' },
    
    // Handle \times without delimiters (from backend) - wrap in $ delimiters
    { pattern: /(?<!\$)(\d+)\\times(\d+)(?!\$)/g, replacement: '$$1\\times$2$' },
    { pattern: /(?<!\$)([A-Za-z])\\times([A-Za-z])(?!\$)/g, replacement: '$$1\\times$2$' },
    { pattern: /(?<!\$)(\d+)\\times([A-Za-z])(?!\$)/g, replacement: '$$1\\times$2$' },
    { pattern: /(?<!\$)([A-Za-z])\\times(\d+)(?!\$)/g, replacement: '$$1\\times$2$' },
    // More general pattern for \times in context
    { pattern: /(?<!\$)([^\s$]+)\\times([^\s$]+)(?=\s|$|\.|,|;|:|\))(?!\$)/g, replacement: '$$1\\times$2$' },
    
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
      <div className={`prose prose-sm max-w-none dark:prose-invert ${className} break-words overflow-wrap-anywhere`}>
        <style dangerouslySetInnerHTML={{ __html: `
          /* Enhanced typography */
          .prose {
            color: inherit;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
            font-feature-settings: 'kern' 1, 'liga' 1;
            text-rendering: optimizeLegibility;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
            word-wrap: break-word;
            overflow-wrap: break-word;
            word-break: break-word;
            max-width: 100%;
            overflow-x: hidden;
          }
          
          /* Consistent spacing between thoughts/steps */
          .prose p {
            margin: 0.75em 0;
            line-height: 1.75;
            font-weight: 400;
            letter-spacing: 0.01em;
          }
          
          /* Enhanced headings */
          .prose h1, .prose h2, .prose h3, .prose h4, .prose h5, .prose h6 {
            font-weight: 700;
            letter-spacing: -0.02em;
            line-height: 1.3;
            margin-top: 1.5em;
            margin-bottom: 0.75em;
            background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(147, 51, 234, 0.1));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
          }
          
          .dark .prose h1, .dark .prose h2, .dark .prose h3, 
          .dark .prose h4, .dark .prose h5, .dark .prose h6 {
            background: linear-gradient(135deg, rgba(96, 165, 250, 0.9), rgba(168, 85, 247, 0.9));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
          }
          
          .prose p:first-child {
            margin-top: 0;
          }
          
          .prose p:last-child {
            margin-bottom: 0;
          }
          
          /* Ensure consistent spacing even when thoughts are on separate lines */
          .prose p + p {
            margin-top: 0.75em;
          }
          
          /* Handle line breaks within paragraphs (for step-by-step thinking) */
          .prose br {
            display: block;
            margin: 0.5em 0;
            line-height: 1.7;
          }
          
          /* Ensure consistent spacing for consecutive paragraphs (thoughts) */
          .prose p:not(:last-child) {
            margin-bottom: 0.75em;
          }
          
          /* Handle spacing around formulas within thoughts */
          .prose p .katex-display {
            margin: 0.75em 0;
          }
          
          /* Enhanced list styling */
          .prose ul, .prose ol {
            margin: 0.75em 0;
            padding-left: 1.75em;
          }
          
          .prose ul {
            list-style: none;
          }
          
          .prose ul li {
            position: relative;
            padding-left: 1em;
            margin: 0.6em 0;
            line-height: 1.75;
          }
          
          .prose ul li::before {
            content: '▸';
            position: absolute;
            left: 0;
            color: rgba(59, 130, 246, 0.6);
            font-weight: 600;
            font-size: 1.1em;
            transition: all 0.2s ease;
          }
          
          .dark .prose ul li::before {
            color: rgba(96, 165, 250, 0.8);
          }
          
          .prose ul li:hover::before {
            color: rgba(59, 130, 246, 0.9);
            transform: translateX(2px);
          }
          
          .dark .prose ul li:hover::before {
            color: rgba(96, 165, 250, 1);
          }
          
          .prose ol li {
            margin: 0.6em 0;
            line-height: 1.75;
            padding-left: 0.5em;
          }
          
          .prose ol li::marker {
            color: rgba(59, 130, 246, 0.7);
            font-weight: 600;
          }
          
          .dark .prose ol li::marker {
            color: rgba(96, 165, 250, 0.9);
          }
          
          /* Enhanced links */
          .prose a {
            color: rgba(59, 130, 246, 0.9);
            text-decoration: none;
            border-bottom: 1px solid rgba(59, 130, 246, 0.3);
            transition: all 0.2s ease;
            font-weight: 500;
          }
          
          .prose a:hover {
            color: rgba(59, 130, 246, 1);
            border-bottom-color: rgba(59, 130, 246, 0.6);
            border-bottom-width: 2px;
          }
          
          .dark .prose a {
            color: rgba(96, 165, 250, 0.9);
            border-bottom-color: rgba(96, 165, 250, 0.4);
          }
          
          .dark .prose a:hover {
            color: rgba(96, 165, 250, 1);
            border-bottom-color: rgba(96, 165, 250, 0.7);
          }
          
          /* Enhanced blockquotes */
          .prose blockquote {
            border-left: 4px solid;
            border-image: linear-gradient(135deg, 
              rgba(59, 130, 246, 0.5), 
              rgba(147, 51, 234, 0.5)) 1;
            padding-left: 1.5em;
            margin: 1.25em 0;
            font-style: italic;
            background: linear-gradient(135deg, 
              rgba(59, 130, 246, 0.03), 
              rgba(147, 51, 234, 0.03));
            border-radius: 0 0.5rem 0.5rem 0;
            padding: 1em 1.5em;
          }
          
          .dark .prose blockquote {
            background: linear-gradient(135deg, 
              rgba(59, 130, 246, 0.08), 
              rgba(147, 51, 234, 0.08));
            border-image: linear-gradient(135deg, 
              rgba(96, 165, 250, 0.6), 
              rgba(168, 85, 247, 0.6)) 1;
          }
          /* Enhanced code styling */
          .prose code:not(pre code) {
            background: linear-gradient(135deg, 
              rgba(0, 0, 0, 0.08), 
              rgba(0, 0, 0, 0.05));
            padding: 0.25em 0.5em;
            border-radius: 0.375rem;
            font-size: 0.9em;
            font-weight: 500;
            font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', 'Source Code Pro', monospace;
            box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
            transition: all 0.2s ease;
          }
          
          .dark .prose code:not(pre code) {
            background: linear-gradient(135deg, 
              rgba(255, 255, 255, 0.12), 
              rgba(255, 255, 255, 0.08));
            box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.2);
          }
          
          .prose code:not(pre code):hover {
            transform: translateY(-1px);
            box-shadow: 0 2px 4px 0 rgba(0, 0, 0, 0.1);
          }
          
          /* Premium code block styling */
          .prose pre {
            background: linear-gradient(135deg, #1a202c 0%, #1e293b 100%);
            color: #e2e8f0;
            overflow-x: auto;
            overflow-y: hidden;
            max-width: 100%;
            padding: 1.25rem 1.5rem;
            border-radius: 0.75rem;
            margin: 1.25rem 0;
            border: 1px solid rgba(255, 255, 255, 0.1);
            box-shadow: 
              0 4px 6px -1px rgba(0, 0, 0, 0.3),
              0 2px 4px -1px rgba(0, 0, 0, 0.2),
              inset 0 1px 0 0 rgba(255, 255, 255, 0.05);
            font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', 'Source Code Pro', monospace;
            transition: all 0.3s ease;
          }
          
          /* Ensure all prose elements respect container width */
          .prose * {
            max-width: 100%;
          }
          
          .prose p, .prose li, .prose td, .prose th {
            word-wrap: break-word;
            overflow-wrap: break-word;
            word-break: break-word;
          }
          
          .prose pre:hover {
            box-shadow: 
              0 8px 12px -2px rgba(0, 0, 0, 0.4),
              0 4px 6px -2px rgba(0, 0, 0, 0.3),
              inset 0 1px 0 0 rgba(255, 255, 255, 0.05);
            transform: translateY(-1px);
          }
          
          /* Enhanced formula styling */
          .prose .katex {
            font-size: 1.15em;
            color: inherit;
            font-weight: 500;
            letter-spacing: 0.02em;
          }
          
          /* Display math (block formulas) - premium styling */
          .prose .katex-display {
            margin: 1.75em 0;
            padding: 1.25em 1.5em;
            background: linear-gradient(135deg, 
              rgba(59, 130, 246, 0.08) 0%, 
              rgba(99, 102, 241, 0.06) 50%,
              rgba(147, 51, 234, 0.08) 100%);
            border-left: 4px solid;
            border-image: linear-gradient(135deg, 
              rgba(59, 130, 246, 0.6), 
              rgba(147, 51, 234, 0.6)) 1;
            border-radius: 0.75rem;
            overflow-x: auto;
            overflow-y: hidden;
            max-width: 100%;
            box-shadow: 
              0 4px 6px -1px rgba(0, 0, 0, 0.1),
              0 2px 4px -1px rgba(0, 0, 0, 0.06),
              inset 0 1px 0 0 rgba(255, 255, 255, 0.1);
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            position: relative;
          }
          
          /* Prevent katex from causing horizontal overflow */
          .prose .katex {
            max-width: 100%;
            overflow-x: auto;
            display: inline-block;
          }
          
          .prose .katex > .katex-html {
            max-width: 100%;
            overflow-x: auto;
          }
          
          .prose .katex-display::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 2px;
            background: linear-gradient(90deg, 
              transparent, 
              rgba(59, 130, 246, 0.4), 
              rgba(147, 51, 234, 0.4),
              transparent);
            border-radius: 0.75rem 0.75rem 0 0;
            opacity: 0;
            transition: opacity 0.3s ease;
          }
          
          .prose .katex-display:hover::before {
            opacity: 1;
          }
          
          .dark .prose .katex-display {
            background: linear-gradient(135deg, 
              rgba(59, 130, 246, 0.15) 0%, 
              rgba(99, 102, 241, 0.12) 50%,
              rgba(147, 51, 234, 0.15) 100%);
            border-image: linear-gradient(135deg, 
              rgba(96, 165, 250, 0.7), 
              rgba(168, 85, 247, 0.7)) 1;
            box-shadow: 
              0 4px 6px -1px rgba(0, 0, 0, 0.3),
              0 2px 4px -1px rgba(0, 0, 0, 0.2),
              inset 0 1px 0 0 rgba(255, 255, 255, 0.05);
          }
          
          .prose .katex-display:hover {
            box-shadow: 
              0 10px 15px -3px rgba(0, 0, 0, 0.1),
              0 4px 6px -2px rgba(0, 0, 0, 0.05),
              inset 0 1px 0 0 rgba(255, 255, 255, 0.1);
            transform: translateY(-2px) scale(1.01);
            border-image: linear-gradient(135deg, 
              rgba(59, 130, 246, 0.8), 
              rgba(147, 51, 234, 0.8)) 1;
          }
          
          .dark .prose .katex-display:hover {
            box-shadow: 
              0 10px 15px -3px rgba(0, 0, 0, 0.4),
              0 4px 6px -2px rgba(0, 0, 0, 0.3),
              inset 0 1px 0 0 rgba(255, 255, 255, 0.05);
            border-image: linear-gradient(135deg, 
              rgba(96, 165, 250, 0.9), 
              rgba(168, 85, 247, 0.9)) 1;
          }
          
          /* Inline math - premium styling */
          .prose .katex:not(.katex-display) {
            padding: 0.2em 0.5em;
            margin: 0 0.15em;
            background: linear-gradient(135deg, 
              rgba(59, 130, 246, 0.12), 
              rgba(147, 51, 234, 0.08));
            border-radius: 0.375rem;
            font-size: 1.08em;
            font-weight: 500;
            vertical-align: baseline;
            transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
            box-shadow: 
              0 1px 2px 0 rgba(0, 0, 0, 0.05),
              inset 0 1px 0 0 rgba(255, 255, 255, 0.1);
            position: relative;
          }
          
          .dark .prose .katex:not(.katex-display) {
            background: linear-gradient(135deg, 
              rgba(59, 130, 246, 0.2), 
              rgba(147, 51, 234, 0.15));
            box-shadow: 
              0 1px 2px 0 rgba(0, 0, 0, 0.2),
              inset 0 1px 0 0 rgba(255, 255, 255, 0.05);
          }
          
          .prose .katex:not(.katex-display):hover {
            background: linear-gradient(135deg, 
              rgba(59, 130, 246, 0.18), 
              rgba(147, 51, 234, 0.12));
            transform: translateY(-1px) scale(1.03);
            box-shadow: 
              0 2px 4px 0 rgba(0, 0, 0, 0.1),
              inset 0 1px 0 0 rgba(255, 255, 255, 0.15);
          }
          
          .dark .prose .katex:not(.katex-display):hover {
            background: linear-gradient(135deg, 
              rgba(59, 130, 246, 0.25), 
              rgba(147, 51, 234, 0.2));
            box-shadow: 
              0 2px 4px 0 rgba(0, 0, 0, 0.3),
              inset 0 1px 0 0 rgba(255, 255, 255, 0.08);
          }
          
          /* Better spacing around formulas */
          .prose p .katex-display {
            margin: 1.5em auto;
            display: block;
          }
          
          /* Ensure formulas don't break lines awkwardly */
          .prose .katex {
            white-space: nowrap;
          }
          
          /* Improve formula readability */
          .prose .katex .base {
            position: relative;
          }
          
          /* Better contrast for math symbols */
          .prose .katex .mord {
            color: inherit;
          }
          
          /* Smooth scrolling for long formulas */
          .prose .katex-display::-webkit-scrollbar {
            height: 6px;
          }
          
          .prose .katex-display::-webkit-scrollbar-track {
            background: rgba(0, 0, 0, 0.05);
            border-radius: 3px;
          }
          
          .prose .katex-display::-webkit-scrollbar-thumb {
            background: rgba(59, 130, 246, 0.3);
            border-radius: 3px;
          }
          
          .prose .katex-display::-webkit-scrollbar-thumb:hover {
            background: rgba(59, 130, 246, 0.5);
          }
          
          .dark .prose .katex-display::-webkit-scrollbar-track {
            background: rgba(255, 255, 255, 0.05);
          }
          
          .dark .prose .katex-display::-webkit-scrollbar-thumb {
            background: rgba(59, 130, 246, 0.5);
          }
          
          .dark .prose .katex-display::-webkit-scrollbar-thumb:hover {
            background: rgba(59, 130, 246, 0.7);
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
                <div className="overflow-x-auto my-4 max-w-full">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 max-w-full">
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
