export function extractV2AnswerDisplay(responsePayload: unknown): string {
  if (responsePayload === null || responsePayload === undefined) return 'No answer submitted';
  if (typeof responsePayload === 'string') return responsePayload.trim() || 'No answer submitted';
  if (typeof responsePayload === 'number' || typeof responsePayload === 'boolean') return String(responsePayload);
  if (Array.isArray(responsePayload)) {
    const values = responsePayload
      .map((value) => extractV2AnswerDisplay(value))
      .filter((value) => value && value !== 'No answer submitted');
    return values.length > 0 ? values.join('\n') : 'No answer submitted';
  }
  if (typeof responsePayload !== 'object') return 'No answer submitted';

  const payload = responsePayload as Record<string, unknown>;
  const scalarKeys = ['textAnswer', 'answer', 'value', 'text', 'response', 'selectedOption', 'uploadedFileUrl'];
  for (const key of scalarKeys) {
    const value = payload[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  }

  if (Array.isArray(payload.selectedOptions)) {
    const values = payload.selectedOptions.map((value) => String(value || '').trim()).filter(Boolean);
    if (values.length > 0) return values.join('\n');
  }

  const objectKeys = ['textAnswer', 'tableAnswers', 'response', 'answer', 'value'];
  for (const key of objectKeys) {
    const value = payload[key];
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const entries = Object.entries(value as Record<string, unknown>)
        .map(([entryKey, entryValue]) => {
          const display = extractV2AnswerDisplay(entryValue);
          return display === 'No answer submitted' ? '' : `${entryKey}: ${display}`;
        })
        .filter(Boolean);
      if (entries.length > 0) return entries.join('\n');
    }
  }

  const nestedEntries = Object.entries(payload)
    .filter(([key]) => !['metadata', 'autoFeedback'].includes(key))
    .map(([key, value]) => {
      const display = extractV2AnswerDisplay(value);
      return display === 'No answer submitted' ? '' : `${key}: ${display}`;
    })
    .filter(Boolean);

  return nestedEntries.length > 0 ? nestedEntries.join('\n') : 'No answer submitted';
}

export function hasSubmittedAnswer(responsePayload: unknown): boolean {
  return extractV2AnswerDisplay(responsePayload) !== 'No answer submitted';
}
