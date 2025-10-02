import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

/**
 * SAFETY GUARDRAILS
 * These protect children by filtering all AI outputs before they reach the client.
 * Multiple layers of protection ensure no harmful content gets through.
 */

// Blocklist patterns that should never appear in child-facing content
const BLOCKED_PATTERNS = [
  // Internal reasoning mentions
  /reasoning/gi,
  /analysis/gi,
  /internal/gi,
  /covert/gi,
  /engine/gi,
  /algorithm/gi,
  
  // Negative framing
  /you're struggling/gi,
  /you failed/gi,
  /that's wrong/gi,
  /you can't/gi,
  /you shouldn't/gi,
  
  // Private information requests
  /home address/gi,
  /phone number/gi,
  /password/gi,
  /credit card/gi,
  /social security/gi,
  
  // Inappropriate topics
  /violence/gi,
  /weapon/gi,
  /drugs/gi,
  /alcohol/gi,
]

export interface SafetyCheckResult {
  isSafe: boolean
  reason?: string
  sanitizedContent?: string
}

/**
 * Primary safety check - scans content for blocked patterns
 */
export function checkBlockedPatterns(content: string): SafetyCheckResult {
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(content)) {
      return {
        isSafe: false,
        reason: `Content contains blocked pattern: ${pattern.source}`,
      }
    }
  }
  
  return { isSafe: true, sanitizedContent: content }
}

/**
 * AI-based safety review - uses OpenAI to do a deeper safety check
 * This provides a second layer of protection with contextual understanding
 */
export async function aiSafetyReview(content: string): Promise<SafetyCheckResult> {
  try {
    const reviewPrompt = `Review this content that will be shown to a child (ages 5-10) in an educational context.

CONTENT TO REVIEW:
"${content}"

CHECK FOR:
1. Age-appropriateness (5-10 years old)
2. Positive, encouraging tone
3. No mentions of internal analysis, reasoning, or AI processes
4. No negative framing (e.g., "you're struggling", "that's wrong")
5. No requests for private information
6. No inappropriate topics

Respond with JSON only:
{
  "isSafe": boolean,
  "reason": "brief explanation if unsafe",
  "suggestedRevision": "positive alternative if unsafe"
}`

    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are a child safety expert reviewing content for an educational platform. Be strict about child safety and age-appropriateness.',
        },
        {
          role: 'user',
          content: reviewPrompt,
        },
      ],
      temperature: 0.2,
      max_tokens: 200,
    })

    const result = response.choices[0]?.message?.content
    if (!result) {
      // If AI fails, default to blocking for safety
      return { isSafe: false, reason: 'AI review failed' }
    }

    const parsed = JSON.parse(result)
    
    return {
      isSafe: parsed.isSafe,
      reason: parsed.reason,
      sanitizedContent: parsed.isSafe ? content : parsed.suggestedRevision,
    }
  } catch (error) {
    console.error('AI safety review error:', error)
    // If review fails, block for safety
    return { isSafe: false, reason: 'Safety review error' }
  }
}

/**
 * Comprehensive safety check - combines pattern matching and AI review
 */
export async function checkContentSafety(content: string): Promise<SafetyCheckResult> {
  // First layer: Fast pattern matching
  const patternCheck = checkBlockedPatterns(content)
  if (!patternCheck.isSafe) {
    return patternCheck
  }
  
  // Second layer: AI-based contextual review
  const aiCheck = await aiSafetyReview(content)
  return aiCheck
}

/**
 * Convert unsafe prompts to safe, positive alternatives
 */
export function sanitizeToPositive(content: string): string {
  // Replace negative patterns with positive alternatives
  let sanitized = content
    .replace(/you're struggling/gi, "let's think about this together")
    .replace(/that's wrong/gi, "let's try another way")
    .replace(/you failed/gi, "let's keep learning")
    .replace(/you can't/gi, "let's work on this")
  
  return sanitized
}

/**
 * Emergency fallback for when content fails all safety checks
 */
export function getSafeFallbackMessage(): string {
  const fallbacks = [
    "Let's take a moment to think!",
    "What do you notice?",
    "I wonder what happens next?",
    "Tell me what you're thinking!",
    "Let's explore this together!",
  ]
  
  return fallbacks[Math.floor(Math.random() * fallbacks.length)]
}
