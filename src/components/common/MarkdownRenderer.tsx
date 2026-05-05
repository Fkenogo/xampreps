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
    
    // Markdown tables - must be processed before line breaks
    // Match standard markdown table format: | cell | cell | cell |
    const tableRegex = /^(\|.+\|\n?)+/gm;
    html = html.replace(tableRegex, (match) => {
      const rows = match.trim().split('\n');
      if (rows.length < 2) return match; // Need at least header + separator + data
      
      // Find the header row (first row with | separators)
      // Skip the separator row (|---|---|) which contains only dashes and pipes
      let headerRowIndex = 0;
      let firstDataRowIndex = 2;
      
      // Check if second row is a separator (contains only dashes, pipes, and spaces)
      if (rows.length > 1 && /^[\s|:-]+$/.test(rows[1])) {
        firstDataRowIndex = 2;
      } else {
        // No separator row found, treat all rows as data
        firstDataRowIndex = 1;
      }
      
      const headerRow = rows[headerRowIndex];
      const dataRows = rows.slice(firstDataRowIndex).filter(row => row.trim() && !/^[\s|:-]+$/.test(row));
      
      if (dataRows.length === 0) return match;
      
      const headers = headerRow.split('|').filter(c => c.trim()).map(c => c.trim());
      const headerCells = headers.map(h => `<th class="border border-border px-3 py-2 bg-muted font-semibold text-left">${h}</th>`).join('');
      
      const bodyRows = dataRows.map(row => {
        const cells = row.split('|').filter(c => c.trim() !== undefined).map(c => c.trim()).filter(c => c !== '');
        const cellsHtml = cells.map(cell => `<td class="border border-border px-3 py-2">${cell}</td>`).join('');
        return `<tr>${cellsHtml}</tr>`;
      }).join('');
      
      return `<table class="border-collapse border border-border my-3 w-full max-w-full overflow-x-auto"><thead><tr>${headerCells}</tr></thead><tbody>${bodyRows}</tbody></table>`;
    });
    
    // Handle bullet-point tables (e.g., "• Item: Col1 | Col2 | Col3")
    // Matches consecutive bullet lines containing pipe-separated values
    // Format: "• Label: value | value | ..."
    // All bullet lines are treated as data rows; headers are derived from the content structure
    const bulletTableRegex = /((?:^|\n)•\s+.+?\|.+\n?)+/gm;
    html = html.replace(bulletTableRegex, (match) => {
      const lines = match.trim().split('\n').filter(line => line.trim().startsWith('•'));
      if (lines.length < 1) return match;
      
      // Parse all lines to extract label and values
      const parsedLines = lines.map(line => {
        // Try format with colon: "• Label: value | value"
        let m = line.match(/^•\s+(.+?):\s*(.+)$/);
        if (m) {
          return { label: m[1], values: m[2].split('|').map(c => c.trim()).filter(c => c) };
        }
        // Try format without colon: "• Label | value | value"
        m = line.match(/^•\s+(.+)$/);
        if (m) {
          const parts = m[1].split('|').map(c => c.trim()).filter(c => c);
          if (parts.length >= 2) {
            return { label: parts[0], values: parts.slice(1) };
          }
        }
        return null;
      }).filter((p): p is { label: string; values: string[] } => p !== null);
      
      if (parsedLines.length === 0) return match;
      
      // Derive headers from first line's values by removing numeric content
      const firstValues = parsedLines[0].values;
      const headers = firstValues.map(v => {
        // Remove numeric values and extra spaces to get header text
        // e.g., "Selling 3,600 UGX" → "Selling UGX"
        const textPart = v.replace(/[\d,]+/g, '').replace(/\s+/g, ' ').trim();
        return textPart || 'Column';
      });
      
      // Build table HTML - ALL bullet lines are data rows
      const headerCells = `<th class="border border-border px-3 py-2 bg-muted font-semibold text-left">Item</th>` +
        headers.map(h => `<th class="border border-border px-3 py-2 bg-muted font-semibold text-left">${h}</th>`).join('');
      
      const bodyRows = parsedLines.map(p => {
        const cellsHtml = `<td class="border border-border px-3 py-2">${p.label}</td>` +
          p.values.map(v => `<td class="border border-border px-3 py-2">${v}</td>`).join('');
        return `<tr>${cellsHtml}</tr>`;
      }).join('');
      
      return `<table class="border-collapse border border-border my-3 w-full max-w-full overflow-x-auto"><thead><tr>${headerCells}</tr></thead><tbody>${bodyRows}</tbody></table>`;
    });

    // Numbered lists
    html = html.replace(/^(\d+)\. (.+)$/gm, '<li class="ml-6 list-decimal">$2</li>');

    // Bullet lists. Standard list parsing happens after bullet-table parsing so
    // table-shaped bullet rows do not get flattened before they can become a table.
    html = html.replace(/^[-*•] (.+)$/gm, '<li class="ml-6 list-disc">$1</li>');
    
    // Wrap consecutive list items
    html = html.replace(/(<li class="ml-6 list-decimal">[\s\S]*?<\/li>\n?)+/g, '<ol class="my-2">$&</ol>');
    html = html.replace(/(<li class="ml-6 list-disc">[\s\S]*?<\/li>\n?)+/g, '<ul class="my-2">$&</ul>');
    
    // Line breaks - convert double newlines to paragraph breaks
    html = html.replace(/\n\n/g, '</p><p class="my-2">');
    
    // Single newlines in non-list context
    html = html.replace(/(?<!>)\n(?!<)/g, '<br/>');
    
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
