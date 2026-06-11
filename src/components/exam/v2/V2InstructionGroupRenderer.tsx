/**
 * V2 Instruction Group Renderer
 * 
 * Renders grouped instructions that apply to multiple items.
 * This is a critical V2 addition - instructions like:
 * "Questions 1-5: Choose the correct answer"
 * "Read the passage below and answer questions 6-10"
 * 
 * Render order:
 * 1. Instruction text (once)
 * 2. Context blocks (once each)
 * 3. Items with their interactions
 */

import React from 'react';
import type {
  V2InstructionGroup,
  V2ContextBlock,
  V2Item,
  V2Interaction,
  V2ExamMode,
} from '@/types/v2';
import { V2ContextBlockRenderer } from './V2ContextBlockRenderer';
import { V2ItemRenderer } from './V2ItemRenderer';

export interface V2InstructionGroupRendererProps {
  group: V2InstructionGroup;
  contextBlocks: V2ContextBlock[];
  items: V2Item[];
  interactions: Map<string, V2Interaction[]>;
  mode: V2ExamMode;
  isSimulation: boolean;
  onInteractionSubmit?: (interactionId: string, response: any) => void;
  onInteractionCheck?: (interactionId: string) => Promise<void> | void;
  onNavigateToItem?: (itemId: string) => void;
  activeItemId?: string;
  showFeedback?: boolean;
  submissions?: Map<string, any>;
  checkingInteractionIds?: Set<string>;
  interactionErrors?: Record<string, string | null>;
}

export const V2InstructionGroupRenderer: React.FC<V2InstructionGroupRendererProps> = ({
  group,
  contextBlocks,
  items,
  interactions,
  mode,
  isSimulation,
  onInteractionSubmit,
  onInteractionCheck,
  onNavigateToItem,
  activeItemId,
  showFeedback,
  submissions,
  checkingInteractionIds,
  interactionErrors,
}) => {
  // Get display mode styling
  const getDisplayModeStyles = () => {
    switch (group.displayMode) {
      case 'boxed':
        return 'p-4 bg-amber-50 border-2 border-amber-200 rounded-lg mb-6';
      case 'inline':
        return 'py-3 mb-4';
      case 'sticky':
        return 'p-4 bg-amber-50 border-l-4 border-amber-400 mb-6 sticky top-0 z-10';
      case 'highlighted':
        return 'p-4 bg-blue-50 border border-blue-200 rounded-lg mb-6';
      default:
        return 'p-4 bg-gray-50 rounded-lg mb-6';
    }
  };

  return (
    <div className="v2-instruction-group mb-8">
      {/* Instruction Text - Renders ONCE */}
      <div className={getDisplayModeStyles()}>
        {group.title && (
          <h3 className="font-semibold text-gray-800 mb-2">{group.title}</h3>
        )}
        {group.questionRangeLabel && (
          <span className="inline-block px-2 py-1 bg-amber-100 text-amber-800 text-xs font-medium rounded mb-2">
            {group.questionRangeLabel}
          </span>
        )}
        <div 
          className="text-gray-700 prose prose-sm max-w-none"
          dangerouslySetInnerHTML={{ __html: group.instructionsMarkdown }}
        />
      </div>

      {/* Context Blocks - Render ONCE before items */}
      {contextBlocks.length > 0 && (
        <div className="mb-6">
          {contextBlocks
            .sort((a, b) => {
              // Sort by type priority: passages/poems first, then tables, then images
              const priority: Record<string, number> = {
                passage: 1,
                poem: 1,
                table: 2,
                imageSet: 3,
                image: 3,
                diagram: 3,
                map: 3,
              };
              return (priority[a.type] || 4) - (priority[b.type] || 4);
            })
            .map((block) => (
              <V2ContextBlockRenderer
                key={block.contextBlockId}
                block={block}
                isSimulation={isSimulation}
              />
            ))}
        </div>
      )}

      {/* Items - Each item renders with its interactions */}
      <div className="space-y-6">
        {items.map((item) => (
          <V2ItemRenderer
            key={item.itemId}
            item={item}
            interactions={interactions.get(item.itemId) || []}
            mode={mode}
            isSimulation={isSimulation}
            isActive={activeItemId === item.itemId}
            onInteractionSubmit={onInteractionSubmit}
            onInteractionCheck={onInteractionCheck}
            onNavigateToItem={onNavigateToItem}
            showFeedback={showFeedback}
            submissions={submissions}
            checkingInteractionIds={checkingInteractionIds}
            interactionErrors={interactionErrors}
          />
        ))}
      </div>
    </div>
  );
};
