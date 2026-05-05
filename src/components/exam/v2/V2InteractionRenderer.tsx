/**
 * V2 Interaction Renderer
 * 
 * Renders the actual student response input based on responseMode.
 * Each interaction = one answer input.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import type {
  V2Interaction,
  V2ExamMode,
  V2ResponsePayload,
} from '@/types/v2';

export interface V2InteractionRendererProps {
  interaction: V2Interaction;
  mode: V2ExamMode;
  isSimulation: boolean;
  label?: string;
  response?: any;
  onSubmit?: (interactionId: string, response: any) => void;
  onCheck?: (interactionId: string) => Promise<void> | void;
  showFeedback?: boolean;
  submission?: any;
  checking?: boolean;
  error?: string | null;
}

export const V2InteractionRenderer: React.FC<V2InteractionRendererProps> = ({
  interaction,
  mode,
  isSimulation,
  label,
  response: propResponse,
  onSubmit,
  onCheck,
  showFeedback = false,
  submission,
  checking = false,
  error = null,
}) => {
  const [localResponse, setLocalResponse] = useState<any>(propResponse);

  useEffect(() => {
    setLocalResponse(propResponse);
  }, [propResponse]);

  const handleSubmit = (value: any) => {
    setLocalResponse(value);
    onSubmit?.(interaction.interactionId, value);
  };

  const hasAnswer = useMemo(() => {
    if (!localResponse || typeof localResponse !== 'object') {
      return false;
    }
    if (typeof localResponse.textAnswer === 'string') {
      return localResponse.textAnswer.trim().length > 0;
    }
    if (localResponse.textAnswer && typeof localResponse.textAnswer === 'object') {
      return Object.values(localResponse.textAnswer).some((value) => String(value || '').trim().length > 0);
    }
    if (Array.isArray(localResponse.selectedOptions)) {
      return localResponse.selectedOptions.length > 0;
    }
    if (localResponse.tableAnswers && typeof localResponse.tableAnswers === 'object') {
      return Object.values(localResponse.tableAnswers).some((value) => String(value || '').trim().length > 0);
    }
    if (localResponse.uploadedFileUrl) {
      return true;
    }
    return false;
  }, [localResponse]);

  const canCheck = mode === 'practice' && typeof onCheck === 'function';

  const stripDuplicateLabel = (content: string) => {
    if (!label) return content;
    const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return content.replace(new RegExp(`^\\s*${escapedLabel}\\s*`), '');
  };

  // Render the prompt if available (but NOT duplicating item stem)
  const renderPrompt = () => {
    if (!interaction.promptText && !interaction.promptMarkdown && !label) return null;

    const promptMarkdown = interaction.promptMarkdown ? stripDuplicateLabel(interaction.promptMarkdown) : '';
    const promptText = interaction.promptText ? stripDuplicateLabel(interaction.promptText) : '';
    
    return (
      <div className="text-gray-700 mb-2">
        {label && <span className="font-semibold mr-2">{label}</span>}
        {promptMarkdown ? (
          <span dangerouslySetInnerHTML={{ __html: promptMarkdown }} />
        ) : (
          <span>{promptText}</span>
        )}
      </div>
    );
  };

  // Render based on response mode
  const renderInput = () => {
    switch (interaction.responseMode) {
      case 'textShort':
        return (
          <input
            type="text"
            className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter your answer..."
            value={localResponse?.textAnswer || ''}
            onChange={(e) => handleSubmit({ textAnswer: e.target.value })}
          />
        );

      case 'textLong':
      case 'textarea':
        return (
          <textarea
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            rows={4}
            placeholder="Enter your answer..."
            value={localResponse?.textAnswer || ''}
            onChange={(e) => handleSubmit({ textAnswer: e.target.value })}
          />
        );

      case 'selectSingle':
        // MCQ single choice - render radio buttons
        const singleOptions = (interaction.validationRules?.find(r => r.type === 'custom')?.value as any) || [];
        return (
          <div className="space-y-2">
            {singleOptions.map((option: any) => (
              <label key={option.id} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name={`interaction-${interaction.interactionId}`}
                  value={option.id}
                  checked={localResponse?.selectedOptions?.[0] === option.id}
                  onChange={() => handleSubmit({ selectedOptions: [option.id] })}
                  className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                />
                <span className="font-medium">{option.label}.</span>
                <span>{option.text}</span>
              </label>
            ))}
          </div>
        );

      case 'selectMultiple':
        // MCQ multiple choice - render checkboxes
        const multiOptions = (interaction.validationRules?.find(r => r.type === 'custom')?.value as any) || [];
        return (
          <div className="space-y-2">
            {multiOptions.map((option: any) => (
              <label key={option.id} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  value={option.id}
                  checked={(localResponse?.selectedOptions || []).includes(option.id)}
                  onChange={(e) => {
                    const current = localResponse?.selectedOptions || [];
                    const updated = e.target.checked
                      ? [...current, option.id]
                      : current.filter((id: string) => id !== option.id);
                    handleSubmit({ selectedOptions: updated });
                  }}
                  className="w-4 h-4 text-blue-600 focus:ring-blue-500 rounded"
                />
                <span className="font-medium">{option.label}.</span>
                <span>{option.text}</span>
              </label>
            ))}
          </div>
        );

      case 'matchPairs':
        // Matching pairs - render dropdowns
        return (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">Match each item with its correct pair:</p>
            {/* Simplified matching UI - would need more complex implementation */}
            <div className="text-gray-500 italic">
              Matching interface would go here
            </div>
          </div>
        );

      case 'orderSequence':
        // Ordering - render drag-and-drop or numbered inputs
        return (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">Arrange in the correct order:</p>
            <div className="text-gray-500 italic">
              Ordering interface would go here
            </div>
          </div>
        );

      case 'tableInputs':
        // Table completion - render editable table cells
        return (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse border border-gray-300">
              <tbody>
                {/* Simplified table input - would need actual table data */}
                <tr>
                  <td className="border border-gray-300 p-2">
                    <input
                      type="text"
                      className="w-full px-2 py-1 border border-gray-300 rounded"
                      placeholder="Cell answer..."
                      value={localResponse?.tableAnswers?.['0-0'] || ''}
                      onChange={(e) => handleSubmit({ 
                        tableAnswers: { ...localResponse?.tableAnswers, '0-0': e.target.value } 
                      })}
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        );

      case 'canvasDraw':
        // Drawing response
        return (
          <div className="border border-gray-300 rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-2">Draw your answer:</p>
            <div className="bg-gray-100 h-48 rounded flex items-center justify-center">
              <span className="text-gray-500">Canvas drawing area</span>
            </div>
          </div>
        );

      case 'imageUpload':
        // Image upload
        return (
          <div className="border border-gray-300 rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-2">Upload your answer:</p>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  handleSubmit({ uploadedFileUrl: URL.createObjectURL(file) });
                }
              }}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>
        );

      case 'fileUpload':
        // File upload
        return (
          <div className="border border-gray-300 rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-2">Upload your file:</p>
            <input
              type="file"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  handleSubmit({ uploadedFileUrl: URL.createObjectURL(file) });
                }
              }}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>
        );

      case 'structuredComposition':
        // Guided composition layout
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Address/Heading (if required)
              </label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                rows={3}
                placeholder="Enter address or heading..."
                value={localResponse?.textAnswer?.address || ''}
                onChange={(e) => handleSubmit({ 
                  textAnswer: { ...localResponse?.textAnswer, address: e.target.value } 
                })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Body
              </label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                rows={8}
                placeholder="Write your composition..."
                value={localResponse?.textAnswer?.body || ''}
                onChange={(e) => handleSubmit({ 
                  textAnswer: { ...localResponse?.textAnswer, body: e.target.value } 
                })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Closing
              </label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                rows={2}
                placeholder="Enter closing..."
                value={localResponse?.textAnswer?.closing || ''}
                onChange={(e) => handleSubmit({ 
                  textAnswer: { ...localResponse?.textAnswer, closing: e.target.value } 
                })}
              />
            </div>
          </div>
        );

      default:
        return (
          <input
            type="text"
            className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-md"
            placeholder="Enter your answer..."
            value={localResponse?.textAnswer || ''}
            onChange={(e) => handleSubmit({ textAnswer: e.target.value })}
          />
        );
    }
  };

  // Render feedback if available
  const renderFeedback = () => {
    if (!showFeedback || !submission) return null;

    const isReviewedByTeacher = submission.reviewStatus === 'reviewed' && Boolean(submission.teacherFeedback);
    const isManualReview =
      !isReviewedByTeacher &&
      (submission.reviewStatus === 'teacherReview' || Boolean(submission.autoFeedback?.requiresManualReview));
    const isIncorrect = submission.autoFeedback && !submission.autoFeedback.isCorrect && !isManualReview;
    const feedbackClass = isIncorrect
      ? 'bg-rose-50 border-rose-200'
      : isManualReview
      ? 'bg-amber-50 border-amber-200'
      : 'bg-green-50 border-green-200';
    const bodyTextClass = isIncorrect
      ? 'text-rose-700'
      : isManualReview
      ? 'text-amber-700'
      : 'text-green-700';

    return (
      <div className={`mt-4 p-4 border rounded-lg ${feedbackClass}`}>
        {isReviewedByTeacher ? (
          <div>
            <p className="font-medium text-green-800">Scored by teacher</p>
            <p className="mt-1 text-sm text-green-700">
              {submission.teacherFeedback?.teacherName ? `${submission.teacherFeedback.teacherName} reviewed this answer.` : 'A teacher reviewed this answer.'}
            </p>
          </div>
        ) : isManualReview ? (
          <div>
            <p className="font-medium text-amber-800">Manual review required</p>
            <p className="mt-1 text-sm text-amber-700">
              This answer may be correct but needs teacher review.
            </p>
            {submission.autoFeedback?.explanation && (
              <p className="text-sm mt-2 text-amber-700">
                <strong>Teacher guidance:</strong> {submission.autoFeedback.explanation}
              </p>
            )}
          </div>
        ) : submission.autoFeedback && (
          <div>
            <p className={`font-medium ${submission.autoFeedback.isCorrect ? 'text-green-800' : 'text-red-800'}`}>
              {submission.autoFeedback.isCorrect ? '✓ Correct!' : '✗ Incorrect'}
            </p>
            {!submission.autoFeedback.isCorrect && (
              <p className={`text-sm mt-1 ${bodyTextClass}`}>
                Correct answer: {submission.autoFeedback.correctAnswer}
              </p>
            )}
            {submission.autoFeedback.explanation && (
              <p className={`text-sm mt-2 ${bodyTextClass}`}>
                <strong>Explanation:</strong> {submission.autoFeedback.explanation}
              </p>
            )}
          </div>
        )}
        {submission.teacherFeedback && (
          <div className="mt-3 pt-3 border-t border-green-200">
            <p className="font-medium text-green-800">
              {submission.teacherFeedback.teacherName
                ? `Scored by teacher: ${submission.teacherFeedback.teacherName}`
                : 'Scored by teacher'}
            </p>
            {typeof submission.teacherFeedback.score === 'number' ? (
              <p className="text-sm text-green-700 mt-1">Score: {submission.teacherFeedback.score}</p>
            ) : null}
            <p className="text-sm text-green-700 mt-1">{submission.teacherFeedback.comments}</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="v2-interaction">
      {renderPrompt()}
      {renderInput()}
      {canCheck && (
        <div className="mt-3 flex items-center gap-3">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => void onCheck?.(interaction.interactionId)}
            disabled={!hasAnswer || checking}
          >
            {checking ? 'Checking...' : 'Check answer'}
          </Button>
          <p className="text-xs text-gray-500">
            {interaction.manualReviewDefault
              ? 'This interaction may require manual review.'
              : 'Runs V2 auto-check for this interaction only.'}
          </p>
        </div>
      )}
      {error && (
        <div className="mt-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </div>
      )}
      {renderFeedback()}
    </div>
  );
};
