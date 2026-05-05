/**
 * V2 Section Renderer
 * 
 * Renders a section with its title, marks, and shared instructions.
 * Contains instruction groups which contain context blocks and items.
 */

import React from 'react';
import type {
  V2Section,
  V2InstructionGroup,
  V2ContextBlock,
  V2Item,
  V2Interaction,
  V2ExamMode,
} from '@/types/v2';
import { V2InstructionGroupRenderer } from './V2InstructionGroupRenderer';

export interface V2SectionRendererProps {
  section: V2Section;
  instructionGroups: V2InstructionGroup[];
  contextBlocks: Map<string, V2ContextBlock[]>;
  items: Map<string, V2Item[]>;
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

export const V2SectionRenderer: React.FC<V2SectionRendererProps> = ({
  section,
  instructionGroups,
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
  return (
    <section className="v2-section mb-10">
      {/* Section Header */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900">{section.title}</h2>
        {section.marks > 0 && (
          <span className="text-sm text-gray-600">[{section.marks} marks]</span>
        )}
        {section.sharedInstructions && (
          <div className="mt-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="text-gray-700 whitespace-pre-wrap text-sm">
              {section.sharedInstructions}
            </div>
          </div>
        )}
      </div>

      {/* Render Instruction Groups */}
      {instructionGroups.map((group) => (
        <V2InstructionGroupRenderer
          key={group.instructionGroupId}
          group={group}
          contextBlocks={contextBlocks.get(group.instructionGroupId) || []}
          items={items.get(group.instructionGroupId) || []}
          interactions={interactions}
          mode={mode}
          isSimulation={isSimulation}
          onInteractionSubmit={onInteractionSubmit}
          onInteractionCheck={onInteractionCheck}
          onNavigateToItem={onNavigateToItem}
          activeItemId={activeItemId}
          showFeedback={showFeedback}
          submissions={submissions}
          checkingInteractionIds={checkingInteractionIds}
          interactionErrors={interactionErrors}
        />
      ))}
    </section>
  );
};
