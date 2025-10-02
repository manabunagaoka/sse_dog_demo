import { ChildState, ReasoningOutput, analyzeChildState, generateNudge } from './reasoningEngine'
import { checkContentSafety, getSafeFallbackMessage } from './guardrails'

/**
 * ANTICIPATORY NUDGES SYSTEM
 * Detects when children need help and provides gentle scaffolding prompts.
 * Uses timing and context to know when to speak vs. stay silent.
 */

export interface ScaffoldingDecision {
  shouldSpeak: boolean
  message?: string
  delay?: number // milliseconds to wait before speaking
  reasoning?: string // internal only, never exposed
}

/**
 * Determine if and when to provide a scaffolding nudge
 */
export async function shouldProvidNudge(
  childState: ChildState,
  currentUtterance?: string
): Promise<ScaffoldingDecision> {
  try {
    // Analyze the child's current state
    const reasoning = await analyzeChildState(childState, currentUtterance)
    
    // If no intervention needed, stay silent
    if (!reasoning.shouldIntervene) {
      return {
        shouldSpeak: false,
        reasoning: 'Child is engaged and progressing well',
      }
    }
    
    // If intervention is needed but confidence is low, wait
    if (reasoning.confidenceScore < 60) {
      return {
        shouldSpeak: false,
        reasoning: `Low confidence (${reasoning.confidenceScore}%) - waiting for clearer signal`,
      }
    }
    
    // Generate a gentle nudge
    const nudge = await generateNudge(reasoning, childState)
    
    // Apply safety guardrails
    const safetyCheck = await checkContentSafety(nudge)
    
    if (!safetyCheck.isSafe) {
      console.warn('Generated nudge failed safety check:', safetyCheck.reason)
      return {
        shouldSpeak: true,
        message: getSafeFallbackMessage(),
        delay: calculateDelay(reasoning),
        reasoning: 'Using safe fallback due to safety check failure',
      }
    }
    
    return {
      shouldSpeak: true,
      message: safetyCheck.sanitizedContent || nudge,
      delay: calculateDelay(reasoning),
      reasoning: reasoning.interventionReason,
    }
  } catch (error) {
    console.error('Scaffolding decision error:', error)
    return {
      shouldSpeak: false,
      reasoning: 'Error in scaffolding system',
    }
  }
}

/**
 * Calculate appropriate delay before speaking
 * Give child time to think, but don't wait too long
 */
function calculateDelay(reasoning: ReasoningOutput): number {
  // Base delay: 5 seconds
  let delay = 5000
  
  // Adjust based on emotional state
  switch (reasoning.emotionalState) {
    case 'confused':
      delay = 3000 // Respond sooner if confused
      break
    case 'frustrated':
      delay = 2000 // Respond quickly if frustrated
      break
    case 'confident':
      delay = 8000 // Give more time if confident
      break
    default:
      delay = 5000
  }
  
  // Add slight randomness for natural feel (±1 second)
  delay += Math.random() * 2000 - 1000
  
  return Math.max(2000, Math.min(delay, 10000)) // Clamp between 2-10 seconds
}

/**
 * Detect patterns that suggest the child needs help
 */
export function detectStruggles(utterances: string[]): string[] {
  const struggles: string[] = []
  
  if (utterances.length === 0) {
    struggles.push('no_recent_utterances')
    return struggles
  }
  
  // Check for hesitation markers
  const lastUtterance = utterances[utterances.length - 1]
  if (lastUtterance.includes('um') || lastUtterance.includes('uh')) {
    struggles.push('hesitation_markers')
  }
  
  // Check for very short responses (might indicate disengagement)
  if (lastUtterance.split(' ').length < 3) {
    struggles.push('minimal_response')
  }
  
  // Check for repetitive language
  if (utterances.length >= 2) {
    const last = utterances[utterances.length - 1]
    const secondLast = utterances[utterances.length - 2]
    if (last === secondLast) {
      struggles.push('repetitive_language')
    }
  }
  
  return struggles
}

/**
 * Calculate engagement score based on recent activity
 */
export function calculateEngagement(
  utterances: string[],
  lastSpeechTimestamp: number
): number {
  let score = 5 // Start at neutral
  
  // Positive indicators
  if (utterances.length > 0) {
    score += 2 // Recent participation
  }
  
  if (utterances.length >= 3) {
    const avgLength = utterances.slice(-3).reduce((sum, u) => sum + u.split(' ').length, 0) / 3
    if (avgLength > 5) {
      score += 2 // Detailed responses
    }
  }
  
  // Negative indicators
  const silenceDuration = Date.now() - lastSpeechTimestamp
  if (silenceDuration > 15000) {
    score -= 3 // Long silence
  }
  
  const struggles = detectStruggles(utterances)
  score -= struggles.length
  
  return Math.max(0, Math.min(10, score)) // Clamp to 0-10
}
