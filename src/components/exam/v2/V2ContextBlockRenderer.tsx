/**
 * V2 Context Block Renderer
 * 
 * Renders shared stimulus content like passages, poems, tables, images, etc.
 * Key rule: Context renders ONCE, shared by all items that reference it.
 */

import React from 'react';
import type { V2ContextBlock } from '@/types/v2';

export interface V2ContextBlockRendererProps {
  block: V2ContextBlock;
  isSimulation?: boolean;
}

export const V2ContextBlockRenderer: React.FC<V2ContextBlockRendererProps> = ({
  block,
  isSimulation = false,
}) => {
  const renderContent = () => {
    switch (block.type) {
      case 'passage':
      case 'plainText':
        return (
          <div className="prose prose-sm max-w-none">
            {block.contentMarkdown ? (
              <div dangerouslySetInnerHTML={{ __html: block.contentMarkdown }} />
            ) : (
              <p className="whitespace-pre-wrap">{block.contentText}</p>
            )}
          </div>
        );

      case 'poem':
        return (
          <div className="font-serif italic text-gray-800 whitespace-pre-line p-4 bg-gray-50 rounded-lg border-l-4 border-gray-300">
            {block.contentMarkdown ? (
              <div dangerouslySetInnerHTML={{ __html: block.contentMarkdown }} />
            ) : (
              <p className="whitespace-pre-wrap">{block.contentText}</p>
            )}
          </div>
        );

      case 'table':
        if (!block.tableData) return null;
        return (
          <div className="overflow-x-auto">
            {block.tableData.caption && (
              <div className="text-sm font-medium text-gray-700 mb-2 text-center">
                {block.tableData.caption}
              </div>
            )}
            <table className="min-w-full border-collapse border border-gray-300 text-sm">
              <thead>
                <tr className="bg-gray-100">
                  {(block.tableData.headers as any[]).map((header, i) => (
                    <th
                      key={i}
                      className="border border-gray-300 px-4 py-2 text-left font-semibold"
                    >
                      {typeof header === 'string' ? header : header.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {block.tableData.rows.map((row, rowIndex) => (
                  <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    {Array.isArray(row)
                      ? // Legacy support: row as array
                        row.map((cell, cellIndex) => (
                          <td key={cellIndex} className="border border-gray-300 px-4 py-2">
                            {cell}
                          </td>
                        ))
                      : // New format: row as object
                        (block.tableData.headers as any[]).map((header, cellIndex) => {
                          const key = typeof header === 'string' ? header : header.key;
                          return (
                            <td key={cellIndex} className="border border-gray-300 px-4 py-2">
                              {(row as any)[key] || ''}
                            </td>
                          );
                        })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      case 'image':
        if (!block.mediaRefs || block.mediaRefs.length === 0) return null;
        return (
          <figure className="my-4">
            <img
              src={block.mediaRefs[0].url}
              alt={block.mediaRefs[0].altText || block.title || ''}
              className="max-w-full h-auto rounded-lg"
            />
            {block.mediaRefs[0].caption && (
              <figcaption className="text-sm text-gray-600 mt-2 text-center">
                {block.mediaRefs[0].caption}
              </figcaption>
            )}
          </figure>
        );

      case 'imageSet':
        if (!block.mediaRefs || block.mediaRefs.length === 0) return null;
        return (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 my-4">
            {block.mediaRefs.map((media, index) => (
              <figure key={index} className="text-center">
                <div className="font-bold text-sm text-gray-700 mb-1">
                  {media.label || String.fromCharCode(65 + index)}
                </div>
                <img
                  src={media.url}
                  alt={media.altText || media.caption || ''}
                  className="w-full h-auto rounded-lg border border-gray-200"
                />
                {media.caption && (
                  <figcaption className="text-xs text-gray-600 mt-1">
                    {media.caption}
                  </figcaption>
                )}
              </figure>
            ))}
          </div>
        );

      case 'diagram':
      case 'map':
        if (!block.mediaRefs || block.mediaRefs.length === 0) return null;
        return (
          <figure className="my-4">
            <img
              src={block.mediaRefs[0].url}
              alt={block.title || block.mediaRefs[0].altText || ''}
              className="max-w-full h-auto rounded-lg border border-gray-200"
            />
            {block.mediaRefs[0].caption && (
              <figcaption className="text-sm text-gray-600 mt-2 text-center">
                {block.mediaRefs[0].caption}
              </figcaption>
            )}
          </figure>
        );

      case 'compositionPrompt':
        return (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-semibold text-gray-800 mb-2">
              {block.title || 'Composition'}
            </h4>
            <div className="text-gray-700 whitespace-pre-wrap">
              {block.contentMarkdown || block.contentText}
            </div>
          </div>
        );

      case 'markdown':
        return (
          <div className="prose prose-sm max-w-none">
            <div dangerouslySetInnerHTML={{ __html: block.contentMarkdown || '' }} />
          </div>
        );

      default:
        return (
          <div className="text-gray-700">
            {block.contentMarkdown ? (
              <div dangerouslySetInnerHTML={{ __html: block.contentMarkdown }} />
            ) : (
              <p className="whitespace-pre-wrap">{block.contentText}</p>
            )}
          </div>
        );
    }
  };

  return (
    <div className="v2-context-block mb-6">
      {block.title && block.type !== 'compositionPrompt' && (
        <h4 className="font-semibold text-gray-800 mb-3">{block.title}</h4>
      )}
      {renderContent()}
      {block.sourceReference && !isSimulation && (
        <p className="text-xs text-gray-500 mt-2 italic">
          Source: {block.sourceReference}
        </p>
      )}
    </div>
  );
};