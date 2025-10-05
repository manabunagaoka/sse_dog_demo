/**
 * AI GUARDRAILS MODULE
 * 
 * This module implements comprehensive safety filters for all AI-generated content.
 * It ensures that children are never exposed to:
 * - Internal reasoning/analysis
 * - Negative framing or criticism
 * - Personal information
 * - Unsafe or inappropriate content
 * 
 * All AI outputs pass through multiple layers of protection.
 */

import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface GuardrailResult {
  safe: boolean;
  sanitizedContent: string;
  violations: string[];
  suggestion?: string;
}

// Patterns that should NEVER appear in child-facing content
const FORBIDDEN_PATTERNS = [
  // Internal reasoning exposure
  /reasoning|analysis|internal|covert|scaffold|intervention/gi,
  /struggle|struggling|difficulty|problem|issue|confused/gi,
  /assessment|evaluate|track|monitor|detect/gi,
  
  // Negative framing
  /wrong|incorrect|bad|poor|weak|failure/gi,
  /can't|cannot|unable|failed/gi,
  
  // Metadata/technical terms
  /utterance|metadata|confidence|threshold/gi,
  /API|prompt|model|GPT/gi,
  
  // Personal information patterns
  /password|credit card|ssn|social security/gi,
];

// Positive alternative phrasings
const POSITIVE_ALTERNATIVES: Record<string, string> = {
  'struggling': 'learning',
  'wrong': 'let\'s try another way',
  'incorrect': 'interesting idea',
  'problem': 'challenge',
  'confused': 'thinking carefully',
  'can\'t': 'learning how to',
  'failed': 'tried',
};

/**
 * Primary content filter - checks for forbidden patterns
 */
export function checkForbiddenPatterns(content: string): {
  hasForbidden: boolean;
  violations: string[];
} {
  const violations: string[] = [];
  
  for (const pattern of FORBIDDEN_PATTERNS) {
    const matches = content.match(pattern);
    if (matches) {
      violations.push(...matches);
    }
  }
  
  return {
    hasForbidden: violations.length > 0,
    violations: Array.from(new Set(violations)), // Remove duplicates
  };
}

/**
 * Sanitize content by replacing negative terms with positive alternatives
 */
export function sanitizeContent(content: string): string {
  let sanitized = content;
  
  for (const [negative, positive] of Object.entries(POSITIVE_ALTERNATIVES)) {
    const regex = new RegExp(negative, 'gi');
    sanitized = sanitized.replace(regex, positive);
  }
  
  return sanitized;
}

/**
 * AI-powered secondary safety review
 * Uses GPT to detect subtle issues that pattern matching might miss
 */
export async function aiSafetyReview(
  content: string,
  context: { childAge: number; vocabularyLevel: string }
): Promise<GuardrailResult> {
  try {
    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `You are a safety reviewer for educational content shown to children (age ${context.childAge}).
Your job is to:
1. Identify any unsafe, inappropriate, or negative content
2. Check if the content is age-appropriate
3. Ensure the tone is warm, encouraging, and positive
4. Verify no internal reasoning or technical jargon is exposed

Respond with JSON:
{
  "safe": boolean,
  "violations": string[],
  "suggestion": "alternative phrasing if unsafe"
}`,
        },
        {
          role: 'user',
          content: `Review this content for a child:\n\n"${content}"`,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    
    return {
      safe: result.safe ?? true,
      sanitizedContent: result.safe ? content : (result.suggestion || content),
      violations: result.violations || [],
      suggestion: result.suggestion,
    };
  } catch (error) {
    console.error('AI safety review failed:', error);
    // Fail-safe: if review fails, assume unsafe and sanitize
    return {
      safe: false,
      sanitizedContent: sanitizeContent(content),
      violations: ['AI review failed - applied default sanitization'],
    };
  }
}

/**
 * Comprehensive guardrail check - combines pattern matching and AI review
 */
export async function guardContent(
  content: string,
  context: { childAge: number; vocabularyLevel: string }
): Promise<GuardrailResult> {
  // Step 1: Pattern-based filtering
  const patternCheck = checkForbiddenPatterns(content);
  
  if (patternCheck.hasForbidden) {
    // Content has forbidden patterns - sanitize immediately
    const sanitized = sanitizeContent(content);
    
    return {
      safe: false,
      sanitizedContent: sanitized,
      violations: patternCheck.violations,
      suggestion: sanitized,
    };
  }
  
  // Step 2: AI-powered safety review (for subtle issues)
  const aiReview = await aiSafetyReview(content, context);
  
  return aiReview;
}

/**
 * Quick validation for real-time streaming
 * Only uses pattern matching (faster, no API calls)
 */
export function quickGuard(content: string): boolean {
  const { hasForbidden } = checkForbiddenPatterns(content);
  return !hasForbidden;
}

/**
 * Filter for parent-facing content
 * Less strict than child-facing, but still professional
 */
export function parentGuard(content: string): GuardrailResult {
  // Parents can see more technical details, but still filter sensitive info
  const sensitivePatterns = [
    /password|credit card|ssn|social security/gi,
    /private key|secret|token/gi,
  ];
  
  const violations: string[] = [];
  let safe = true;
  
  for (const pattern of sensitivePatterns) {
    const matches = content.match(pattern);
    if (matches) {
      violations.push(...matches);
      safe = false;
    }
  }
  
  return {
    safe,
    sanitizedContent: safe ? content : '[REDACTED SENSITIVE INFO]',
    violations: Array.from(new Set(violations)),
  };
}
