/**
 * AI Input Sanitization + Mode Detection
 *
 * Validates and sanitizes user input before sending to AI.
 * Detects whether the query should use Builder or Answer mode.
 */

const MAX_INPUT_LENGTH = 2000;

export type AIMode = 'builder' | 'answer' | 'ambiguous';

/**
 * Sanitize user input: trim, limit length, strip control characters.
 */
export function sanitizeInput(text: string): string {
  // Strip control characters (keep newlines and tabs)
  const cleaned = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  // Trim and limit length
  return cleaned.trim().slice(0, MAX_INPUT_LENGTH);
}

/**
 * Detect whether a query is Builder mode (create widgets) or Answer mode (direct answer).
 * Returns 'ambiguous' if can't determine — AI will decide or ask the user.
 */
export function detectMode(text: string): AIMode {
  const lower = text.toLowerCase();

  // Builder mode keywords: user wants to create/add visual widgets
  const builderPatterns = [
    /\b(show me|build|create|add|display|visuali[sz]e|chart|graph|dashboard|widget)\b/,
    /\b(plot|draw|render|put .+ on|add .+ to)\b/,
  ];

  // Answer mode keywords: user wants a direct data answer
  const answerPatterns = [
    /\b(how many|what is|what are|what's|tell me|count|total|average|sum)\b/,
    /\b(who has|who is|which|compare|list)\b/,
    /\b(percentage|ratio|rate|highest|lowest|top|bottom)\b/,
  ];

  const isBuilder = builderPatterns.some((p) => p.test(lower));
  const isAnswer = answerPatterns.some((p) => p.test(lower));

  if (isBuilder && !isAnswer) return 'builder';
  if (isAnswer && !isBuilder) return 'answer';

  // Both or neither matched — let AI decide
  return 'ambiguous';
}
