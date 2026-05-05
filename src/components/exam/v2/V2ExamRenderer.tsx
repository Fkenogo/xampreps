/**
 * XamPreps V2 Exam Renderer
 * 
 * Renders exam content following the V2 display hierarchy:
 * SECTION → Instruction Group → Context Block → Item → Interaction(s)
 * 
 * Key rules:
 * - Shared context renders once only
 * - Instructions render once only
 * - Item stem must not be duplicated inside interactions
 * - Context must not be flattened into interactions
 */

import React, { useMemo } from 'react';
import type {
  V2Exam,
  V2Section,
  V2InstructionGroup,
  V2ContextBlock,
  V2Item,
  V2Interaction,
  V2ExamMode,
} from '@/types/v2';
import { V2SectionRenderer } from './V2SectionRenderer';

export interface V2ExamRendererProps {
  exam: V2Exam;
  sections: V2Section[];
  instructionGroups: V2InstructionGroup[];
  contextBlocks: V2ContextBlock[];
  items: V2Item[];
  interactions: V2Interaction[];
  mode: V2ExamMode;
  /** Callback when student submits an answer */
  onInteractionSubmit?: (interactionId: string, response: any) => void;
  /** Callback when student requests auto-check */
  onInteractionCheck?: (interactionId: string) => Promise<void> | void;
  /** Callback when student navigates to a specific item */
  onNavigateToItem?: (itemId: string) => void;
  /** Currently active item ID for highlighting */
  activeItemId?: string;
  /** Whether to show feedback (based on mode) */
  showFeedback?: boolean;
  /** Existing submissions for this attempt */
  submissions?: Map<string, any>;
  /** Interactions currently being auto-checked */
  checkingInteractionIds?: Set<string>;
  /** Per-interaction runtime errors */
  interactionErrors?: Record<string, string | null>;
}

export const V2ExamRenderer: React.FC<V2ExamRendererProps> = ({
  exam,
  sections,
  instructionGroups,
  contextBlocks,
  items,
  interactions,
  mode,
  onInteractionSubmit,
  onInteractionCheck,
  onNavigateToItem,
  activeItemId,
  showFeedback = false,
  submissions = new Map(),
  checkingInteractionIds = new Set(),
  interactionErrors = {},
}) => {
  // Organize content into a hierarchical structure for rendering
  const renderHierarchy = useMemo(() => {
    // Group items by instruction group
    const itemsByInstructionGroup = new Map<string, V2Item[]>();
    for (const item of items) {
      const igId = item.instructionGroupId || 'default';
      if (!itemsByInstructionGroup.has(igId)) {
        itemsByInstructionGroup.set(igId, []);
      }
      itemsByInstructionGroup.get(igId)!.push(item);
    }

    // Sort items by orderIndex within each group
    for (const [, item_list] of itemsByInstructionGroup) {
      item_list.sort((a, b) => a.orderIndex - b.orderIndex);
    }

    // Group instruction groups by section
    const groupsBySection = new Map<string, V2InstructionGroup[]>();
    for (const group of instructionGroups) {
      if (!groupsBySection.has(group.sectionId)) {
        groupsBySection.set(group.sectionId, []);
      }
      groupsBySection.get(group.sectionId)!.push(group);
    }

    // Sort instruction groups by orderIndex within each section
    for (const [, groups] of groupsBySection) {
      groups.sort((a, b) => a.orderIndex - b.orderIndex);
    }

    // Group context blocks by instruction group
    const contextByInstructionGroup = new Map<string, V2ContextBlock[]>();
    for (const block of contextBlocks) {
      const igId = block.instructionGroupId || 'default';
      if (!contextByInstructionGroup.has(igId)) {
        contextByInstructionGroup.set(igId, []);
      }
      contextByInstructionGroup.get(igId)!.push(block);
    }

    // Group interactions by item
    const interactionsByItem = new Map<string, V2Interaction[]>();
    for (const interaction of interactions) {
      if (!interactionsByItem.has(interaction.itemId)) {
        interactionsByItem.set(interaction.itemId, []);
      }
      interactionsByItem.get(interaction.itemId)!.push(interaction);
    }

    // Sort interactions by orderIndex within each item
    for (const [, int_list] of interactionsByItem) {
      int_list.sort((a, b) => a.orderIndex - b.orderIndex);
    }

    return {
      itemsByInstructionGroup,
      groupsBySection,
      contextByInstructionGroup,
      interactionsByItem,
    };
  }, [items, instructionGroups, contextBlocks, interactions]);

  // Determine if we're in simulation mode (reduced help, full paper flow)
  const isSimulation = mode === 'simulation';

  return (
    <div className="v2-exam-renderer max-w-4xl mx-auto px-4 py-6">
      {/* Exam Header */}
      <header className="mb-8 pb-4 border-b-2 border-gray-300">
        <h1 className="text-2xl font-bold text-gray-900">{exam.title}</h1>
        <div className="mt-2 flex flex-wrap gap-4 text-sm text-gray-600">
          <span>{exam.subject}</span>
          <span>•</span>
          <span>{exam.level}</span>
          <span>•</span>
          <span>{exam.year}</span>
          <span>•</span>
          <span>{exam.durationMinutes} minutes</span>
          <span>•</span>
          <span>{exam.totalMarks} marks</span>
        </div>
        {exam.overallInstructions && (
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <h2 className="font-semibold text-gray-800 mb-2">Overall Instructions</h2>
            <div className="text-gray-700 whitespace-pre-wrap">{exam.overallInstructions}</div>
          </div>
        )}
      </header>

      {/* Render Sections */}
      {sections
        .sort((a, b) => a.orderIndex - b.orderIndex)
        .map((section) => (
          <V2SectionRenderer
            key={section.sectionId}
            section={section}
            instructionGroups={renderHierarchy.groupsBySection.get(section.sectionId) || []}
            contextBlocks={renderHierarchy.contextByInstructionGroup}
            items={renderHierarchy.itemsByInstructionGroup}
            interactions={renderHierarchy.interactionsByItem}
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
    </div>
  );
};
