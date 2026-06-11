/**
 * V2 Test Page
 * 
 * Internal test route for validating V2 exam engine.
 * Access at: /v2-test/:examId
 * 
 * This page is for development/testing only and should not be used in production.
 */

import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useV2ExamData } from '@/hooks/useV2ExamData';
import { V2ExamRenderer } from '@/components/exam/v2/V2ExamRenderer';
import { useAuth } from '@/contexts/AuthContext';

const V2TestPage: React.FC = () => {
  const { examId } = useParams<{ examId: string }>();
  const { user } = useAuth();
  const [mode, setMode] = useState<'practice' | 'quiz' | 'simulation'>('practice');
  const [showFeedback, setShowFeedback] = useState(true);

  const {
    exam,
    sections,
    instructionGroups,
    contextBlocks,
    items,
    interactions,
    markingRules,
    rubrics,
    modelAnswers,
    loading,
    error,
  } = useV2ExamData(examId || null);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Authentication Required</h1>
          <p className="text-gray-600">Please log in to access the V2 test page.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading V2 exam data...</p>
        </div>
      </div>
    );
  }

  if (error || !exam) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error Loading Exam</h1>
          <p className="text-gray-600 mb-4">{error || 'Exam not found'}</p>
          <a href="/admin" className="text-blue-500 hover:underline">
            Return to Admin Dashboard
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Test Controls Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-lg font-bold text-gray-800">V2 Exam Test Mode</h1>
            <p className="text-sm text-gray-500">
              Exam: {exam.title} ({exam.examId})
            </p>
          </div>

          <div className="flex items-center gap-4 flex-wrap">
            {/* Mode Selector */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Mode:</label>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value as typeof mode)}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm"
              >
                <option value="practice">Practice</option>
                <option value="quiz">Quiz</option>
                <option value="simulation">Simulation</option>
              </select>
            </div>

            {/* Feedback Toggle */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Feedback:</label>
              <button
                onClick={() => setShowFeedback(!showFeedback)}
                className={`px-3 py-1 rounded-md text-sm ${
                  showFeedback
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {showFeedback ? 'ON' : 'OFF'}
              </button>
            </div>

            {/* Stats */}
            <div className="text-sm text-gray-500">
              {sections.length} sections | {items.size} items
            </div>
          </div>
        </div>
      </div>

      {/* Exam Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        <V2ExamRenderer
          exam={exam}
          sections={sections}
          instructionGroups={Array.from(instructionGroups.values()).flat()}
          contextBlocks={Array.from(contextBlocks.values()).flat()}
          items={Array.from(items.values()).flat()}
          interactions={Array.from(interactions.values()).flat()}
          mode={mode}
          showFeedback={showFeedback}
          onInteractionSubmit={(interactionId, response) => {
            console.log('Interaction submitted:', { interactionId, response });
          }}
        />
      </div>

      {/* Debug Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-gray-900 text-white px-4 py-2 text-xs">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <span>V2 Test Mode - Development Only</span>
          <div className="flex items-center gap-4">
            <span>Sections: {sections.length}</span>
            <span>Items: {items.size}</span>
            <span>Interactions: {interactions.size}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default V2TestPage;