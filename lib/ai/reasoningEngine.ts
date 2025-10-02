import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export interface ChildState {
  vocabularyLevel: string
  recentUtterances: string[]
  hesitationCount: number
  engagementScore: number
  lastSpeechTimestamp: number
  detectedStruggles: string[]
}

export interface ReasoningOutput {
  shouldIntervene: boolean
  interventionReason?: string
  suggestedNudge?: string
  vocabularyGaps?: string[]
  emotionalState?: 'engaged' | 'frustrated' | 'confused' | 'confident'
  confidenceScore: number
}

/**
 * COVERT REASONING ENGINE
 * This analyzes the child's state and determines if/when to provide guidance.
 * CRITICAL: This analysis is NEVER exposed to the client - it's server-side only.
 */
export async function analyzeChildState(
  childState: ChildState,
  currentUtterance?: string
): Promise<ReasoningOutput> {
  try {
    const silenceDuration = Date.now() - childState.lastSpeechTimestamp
    const prolongedSilence = silenceDuration > 8000 // 8+ seconds
    
    // Build analysis context (internal only)
    const analysisPrompt = `You are an internal reasoning engine analyzing a child's learning state. This analysis is for pedagogical planning only and will NEVER be shown to the child or parent.

CHILD STATE:
- Vocabulary Level: ${childState.vocabularyLevel}
- Recent Utterances: ${childState.recentUtterances.slice(-3).join(', ') || 'None'}
- Hesitation Count: ${childState.hesitationCount}
- Engagement Score: ${childState.engagementScore}/10
- Silence Duration: ${Math.round(silenceDuration / 1000)}s
- Current Utterance: ${currentUtterance || 'None'}
- Detected Struggles: ${childState.detectedStruggles.join(', ') || 'None'}

ANALYZE:
1. Does the child need a gentle nudge? (prolonged silence, confusion, frustration)
2. What is their emotional state?
3. Are there vocabulary gaps?
4. What type of scaffolding would help?

Return JSON only:
{
  "shouldIntervene": boolean,
  "interventionReason": "brief reason",
  "emotionalState": "engaged|frustrated|confused|confident",
  "vocabularyGaps": ["word1", "word2"],
  "confidenceScore": 0-100
}`

    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are a pedagogical reasoning engine. Analyze child learning states and provide internal reasoning. Never expose your analysis to users.',
        },
        {
          role: 'user',
          content: analysisPrompt,
        },
      ],
      temperature: 0.3,
      max_tokens: 300,
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      return defaultReasoningOutput()
    }

    // Parse the AI response
    const parsed = JSON.parse(content)
    
    // Override shouldIntervene for prolonged silence
    if (prolongedSilence && !parsed.shouldIntervene) {
      parsed.shouldIntervene = true
      parsed.interventionReason = 'prolonged_silence'
    }

    return {
      shouldIntervene: parsed.shouldIntervene || false,
      interventionReason: parsed.interventionReason,
      emotionalState: parsed.emotionalState || 'engaged',
      vocabularyGaps: parsed.vocabularyGaps || [],
      confidenceScore: parsed.confidenceScore || 0,
    }
  } catch (error) {
    console.error('Reasoning engine error:', error)
    return defaultReasoningOutput()
  }
}

/**
 * Generate a gentle nudge for the child based on reasoning analysis
 * CRITICAL: This output IS shown to the child, so it must be:
 * - Warm and encouraging
 * - Age-appropriate
 * - Free of any internal reasoning mentions
 */
export async function generateNudge(
  reasoning: ReasoningOutput,
  childState: ChildState
): Promise<string> {
  try {
    const nudgePrompt = `Create a gentle, pedagogical prompt for a child learning session.

CONTEXT (do not mention these details to the child):
- Child's vocabulary level: ${childState.vocabularyLevel}
- Emotional state: ${reasoning.emotionalState}
- Reason for nudge: ${reasoning.interventionReason}

REQUIREMENTS:
- Warm, curious, and encouraging tone
- Age-appropriate language
- Open-ended question or gentle prompt
- NO mention of struggles, analysis, or reasoning
- Keep it short (1-2 sentences)

Examples of good nudges:
- "What do you see in this picture?"
- "I wonder what happens next?"
- "Let's pause and think about that together!"
- "That's interesting! Can you tell me more?"

Generate ONE gentle nudge:`

    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are a warm, encouraging AI learning companion for children. Create gentle, curious prompts that help without being judgmental.',
        },
        {
          role: 'user',
          content: nudgePrompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 100,
    })

    return response.choices[0]?.message?.content?.trim() || "What are you thinking about?"
  } catch (error) {
    console.error('Nudge generation error:', error)
    return "I wonder what you're thinking about?"
  }
}

function defaultReasoningOutput(): ReasoningOutput {
  return {
    shouldIntervene: false,
    emotionalState: 'engaged',
    confidenceScore: 0,
  }
}
