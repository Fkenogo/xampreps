/**
 * V2 Item Renderer
 * 
 * Renders a single exam item (question) with its stem and interactions.
 * Key rule: Item stem must NOT be duplicated inside interactions.
 */

import React, { useEffect, useMemo, useState } from 'react';
import type {
  V2Item,
  V2Interaction,
  V2ExamMode,
  V2ResponsePayload,
} from '@/types/v2';
import MarkdownRenderer from '@/components/common/MarkdownRenderer';
import { V2InteractionRenderer } from './V2InteractionRenderer';

export interface V2ItemRendererProps {
  item: V2Item;
  interactions: V2Interaction[];
  mode: V2ExamMode;
  isSimulation: boolean;
  isActive?: boolean;
  onInteractionSubmit?: (interactionId: string, response: any) => void;
  onInteractionCheck?: (interactionId: string) => Promise<void> | void;
  onNavigateToItem?: (itemId: string) => void;
  showFeedback?: boolean;
  submissions?: Map<string, any>;
  checkingInteractionIds?: Set<string>;
  interactionErrors?: Record<string, string | null>;
  readOnly?: boolean;
}

export const V2ItemRenderer: React.FC<V2ItemRendererProps> = ({
  item,
  interactions,
  mode,
  isSimulation,
  isActive = false,
  onInteractionSubmit,
  onInteractionCheck,
  onNavigateToItem,
  showFeedback = false,
  submissions,
  checkingInteractionIds,
  interactionErrors,
  readOnly = false,
}) => {
  const [localResponses, setLocalResponses] = useState<Record<string, any>>({});
  const isMultiPart = item.layoutMode === 'multiPart' || interactions.length > 1;

  const normalizePromptText = (value: string) =>
    value
      .replace(/<[^>]+>/g, ' ')
      .replace(/\([a-z]+\)/gi, ' ')
      .replace(/[_*`~|]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();

  const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const removeTrailingPrompt = (stem: string, prompt?: string) => {
    if (!stem || !prompt) return stem;

    const normalizedStem = normalizePromptText(stem);
    const normalizedPrompt = normalizePromptText(prompt);

    if (!normalizedStem || !normalizedPrompt || !normalizedStem.endsWith(normalizedPrompt)) {
      return stem;
    }

    const promptPattern = new RegExp(`\\s*${escapeRegExp(prompt.trim())}\\s*$`, 'i');
    return stem.replace(promptPattern, '').trim();
  };

  const displayInteractions = useMemo(() => {
    if (interactions.length !== 1) return interactions;

    const stem = normalizePromptText(item.stemMarkdown || item.stemText || '');
    const interaction = interactions[0];
    const prompt = normalizePromptText(interaction.promptMarkdown || interaction.promptText || '');

    if (!stem || !prompt || stem !== prompt) return interactions;

    return [{
      ...interaction,
      promptMarkdown: undefined,
      promptText: undefined,
    }];
  }, [interactions, item.stemMarkdown, item.stemText]);

  const displayStemContent = useMemo(() => {
    const content = item.stemMarkdown || item.stemText || '';
    if (interactions.length !== 1 || displayInteractions[0] !== interactions[0]) return content;

    const interaction = interactions[0];
    return removeTrailingPrompt(
      content,
      interaction.promptMarkdown || interaction.promptText || '',
    );
  }, [displayInteractions, interactions, item.stemMarkdown, item.stemText]);

  const handleInteractionSubmit = (interactionId: string, response: any) => {
    setLocalResponses(prev => ({ ...prev, [interactionId]: response }));
    onInteractionSubmit?.(interactionId, response);
  };

  useEffect(() => {
    const nextResponses = displayInteractions.reduce<Record<string, any>>((acc, interaction) => {
      const submission = submissions?.get(interaction.interactionId);
      if (submission?.responsePayload) {
        acc[interaction.interactionId] = submission.responsePayload;
      }
      return acc;
    }, {});

    if (Object.keys(nextResponses).length > 0) {
      setLocalResponses((prev) => ({ ...prev, ...nextResponses }));
    }
  }, [displayInteractions, submissions]);

  // Render item stem with formatting hints
  const renderStem = () => {
    let content = displayStemContent;

    if (
      isMultiPart &&
      displayInteractions.some((interaction) => interaction.promptMarkdown || interaction.promptText)
    ) {
      const firstPartIndex = content.search(/\([a-z]\)/i);
      if (firstPartIndex === 0) {
        content = '';
      } else if (firstPartIndex > 0) {
        content = content.slice(0, firstPartIndex).trim();
      }
    }

    if (!content) return null;

    // Handle blank spaces in stem (for fill-in questions)
    if (item.itemType === 'singleBlank') {
      const parts = content.split(/_{2,}/);
      if (parts.length > 1) {
        return (
          <div className="whitespace-pre-wrap">
            {parts.map((part, index) => (
              <React.Fragment key={index}>
                {part}
                {index < parts.length - 1 && (
                  <span className="inline-block w-24 border-b-2 border-gray-400 mx-1" />
                )}
              </React.Fragment>
            ))}
          </div>
        );
      }
    }

    if (item.stemMarkdown) {
      return <MarkdownRenderer content={content} className="text-gray-800" />;
    }

    return <div className="whitespace-pre-wrap">{content}</div>;
  };

  const renderMediaRefs = () => {
    if (!item.mediaRefs || item.mediaRefs.length === 0) return null;

    return (
      <div className="mt-3 space-y-3">
        {item.mediaRefs.map((media, index) => (
          <figure key={media.mediaId || `${media.url}-${index}`} className="w-full">
            <img
              src={media.url}
              alt={media.altText || media.caption || `Question ${item.orderIndex + 1} diagram`}
              className="max-h-[420px] w-auto max-w-full rounded-md border border-gray-200 bg-white object-contain"
              loading="lazy"
            />
            {media.caption && (
              <figcaption className="mt-1 text-xs text-gray-500">
                {media.caption}
              </figcaption>
            )}
          </figure>
        ))}
      </div>
    );
  };

  // Get marks display
  const renderMarks = () => {
    if (item.marksTotal <= 0) return null;
    return (
      <span className="inline-block px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded ml-2">
        [{item.marksTotal} mark{item.marksTotal !== 1 ? 's' : ''}]
      </span>
    );
  };

  return (
    <div
      className={`v2-item ${isActive ? 'ring-2 ring-blue-400 rounded-lg p-4' : ''}`}
      id={`item-${item.itemId}`}
    >
      {/* Item Header: Number/Label + Marks */}
      <div className="flex items-start gap-2 mb-3">
        <span className="font-semibold text-gray-800 shrink-0">
          {item.orderIndex + 1}.
        </span>
        <div className="flex-1">
          {/* Item Stem - renders ONCE, not duplicated in interactions */}
          <div className="text-gray-800 mb-2">
            {renderStem()}
            {renderMediaRefs()}
          </div>
          {renderMarks()}
        </div>
      </div>

      {/* Interactions - the actual response inputs */}
      <div className={`space-y-4 ${isMultiPart ? 'ml-6' : ''}`}>
        {displayInteractions.map((interaction, index) => (
          <V2InteractionRenderer
            key={interaction.interactionId}
            interaction={interaction}
            mode={mode}
            isSimulation={isSimulation}
            label={isMultiPart ? interaction.label || `(${String.fromCharCode(97 + index)})` : undefined}
            response={localResponses[interaction.interactionId] || submissions?.get(interaction.interactionId)?.responsePayload}
            onSubmit={handleInteractionSubmit}
            onCheck={onInteractionCheck}
            showFeedback={showFeedback}
            submission={submissions?.get(interaction.interactionId)}
            checking={checkingInteractionIds?.has(interaction.interactionId) || false}
            error={interactionErrors?.[interaction.interactionId] || null}
            readOnly={readOnly}
          />
        ))}
      </div>

      {/* Source reference (not shown in simulation mode) */}
      {item.sourceReference && !isSimulation && (
        <p className="text-xs text-gray-500 mt-3 italic">
          Source: {item.sourceReference}
        </p>
      )}
    </div>
  );
};
