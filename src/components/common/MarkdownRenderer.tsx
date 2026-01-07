import { useMemo } from 'react';
import { cn } from '@/lib/utils';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export default function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  const rendered = useMemo(() => {
    if (!content) return '';
    
    let html = content;
    
    // Escape HTML to prevent XSS
    html = html
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    
    // Headers
    html = html.replace(/^### (.+)$/gm, '<h3 class="text-lg font-semibold mt-4 mb-2">$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2 class="text-xl font-semibold mt-4 mb-2">$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold mt-4 mb-2">$1</h1>');
    
    // Bold and italic
    html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');
    html = html.replace(/_(.+?)_/g, '<em>$1</em>');
    
    // Code blocks
    html = html.replace(/```([\s\S]*?)```/g, '<pre class="bg-muted p-3 rounded-lg my-2 overflow-x-auto text-sm font-mono">$1</pre>');
    html = html.replace(/`([^`]+)`/g, '<code class="bg-muted px-1.5 py-0.5 rounded text-sm font-mono">$1</code>');
    
    // Numbered lists
    html = html.replace(/^(\d+)\. (.+)$/gm, '<li class="ml-6 list-decimal">$2</li>');
    
    // Bullet lists
    html = html.replace(/^[-*] (.+)$/gm, '<li class="ml-6 list-disc">$1</li>');
    
    // Wrap consecutive list items
    html = html.replace(/(<li class="ml-6 list-decimal">[\s\S]*?<\/li>\n?)+/g, '<ol class="my-2">$&</ol>');
    html = html.replace(/(<li class="ml-6 list-disc">[\s\S]*?<\/li>\n?)+/g, '<ul class="my-2">$&</ul>');
    
    // Line breaks - convert double newlines to paragraph breaks
    html = html.replace(/\n\n/g, '</p><p class="my-2">');
    
    // Single newlines in non-list context
    html = html.replace(/(?<!\>)\n(?!\<)/g, '<br/>');
    
    // Wrap in paragraph
    html = `<p class="my-2">${html}</p>`;
    
    // Clean up empty paragraphs
    html = html.replace(/<p class="my-2"><\/p>/g, '');
    
    return html;
  }, [content]);

  return (
    <div 
      className={cn('prose prose-sm dark:prose-invert max-w-none', className)}
      dangerouslySetInnerHTML={{ __html: rendered }}
    />
  );
}
