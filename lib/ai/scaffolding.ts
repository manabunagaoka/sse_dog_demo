/**
 * ANTICIPATORY NUDGES & SCAFFOLDING MODULE
 * 
 * Generates gentle, pedagogical prompts when children need support.
 * All prompts are warm, curious, and non-judgmental.
 */

import OpenAI from 'openai';
import { ChildState } from './reasoningEngine';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export type NudgeType = 
  | 'silence'
  | 'confusion'
  | 'encouragement'
  | 'vocabulary'
  | 'thinking';

export interface NudgeContext {
  type: NudgeType;
  childAge: number;
  vocabularyLevel: string;
  scenario: string;
  recentTopics: string[];
  emotionalState: ChildState['emotionalState'];
}

/**
 * Pre-defined gentle prompts for different situations
 * Used as fallbacks when AI generation isn't needed
 */
const NUDGE_TEMPLATES: Record<NudgeType, string[]> = {
  silence: [
    "What do you see?",
    "I wonder what happens next?",
    "Tell me what you're thinking!",
    "What's interesting here?",
  ],
  confusion: [
    "Let's pause and think together.",
    "What part are you curious about?",
    "Let's try looking at it this way...",
    "That's a tricky one! Want to explore it?",
  ],
  encouragement: [
    "You're doing great!",
    "I love how you're thinking!",
    "That's a wonderful idea!",
    "Keep going, you've got this!",
  ],
  vocabulary: [
    "That's a great word! Tell me more.",
    "Ooh, interesting! What does that mean to you?",
    "I like that word! Can you use it in another way?",
  ],
  thinking: [
    "Let's think about that together.",
    "What do you wonder about?",
    "Hmm, that's interesting...",
    "Let's explore that idea!",
  ],
};

/**
 * Get a simple template-based nudge
 */
export function getTemplateNudge(type: NudgeType): string {
  const templates = NUDGE_TEMPLATES[type];
  return templates[Math.floor(Math.random() * templates.length)];
}

/**
 * Generate a contextual, AI-powered nudge
 * More sophisticated than templates, tailored to the specific situation
 */
export async function generateContextualNudge(
  context: NudgeContext
): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `You are a Sesame Street-style AI companion helping a ${context.childAge}-year-old child learn.

Your prompts must be:
- Short (5-10 words max)
- Warm and encouraging
- Open-ended and curious
- Age-appropriate
- Never judgmental or corrective
- Never expose internal analysis

Scenario: ${context.scenario}
Child's emotional state: ${context.emotionalState}
Vocabulary level: ${context.vocabularyLevel}
Recent topics: ${context.recentTopics.join(', ')}

Generate a gentle prompt for a "${context.type}" situation.
Respond with ONLY the prompt text, no quotes or formatting.`,
        },
        {
          role: 'user',
          content: `Generate a ${context.type} nudge.`,
        },
      ],
      max_tokens: 50,
      temperature: 0.8, // More creative
    });

    const nudge = response.choices[0].message.content?.trim() || getTemplateNudge(context.type);
    
    // Safety check: ensure it's short enough
    if (nudge.split(' ').length > 15) {
      return getTemplateNudge(context.type);
    }
    
    return nudge;
  } catch (error) {
    console.error('Nudge generation error:', error);
    return getTemplateNudge(context.type);
  }
}

/**
 * Generate an anticipatory nudge with timing
 * Returns both the message and recommended delay before delivery
 */
export async function generateAnticipatorNudge(
  context: NudgeContext
): Promise<{ message: string; delay: number; reasoning: string }> {
  const message = await generateContextualNudge(context);
  
  // Determine delay based on context
  let delay = 5000; // Default 5 seconds
  
  switch (context.type) {
    case 'silence':
      // Longer wait for silence - give child time to think
      delay = context.emotionalState === 'frustrated' ? 5000 : 8000;
      break;
    case 'confusion':
      // Moderate delay for confusion
      delay = 6000;
      break;
    case 'encouragement':
      // Quick encouragement when needed
      delay = 3000;
      break;
    case 'vocabulary':
      // Immediate for vocabulary building moments
      delay = 2000;
      break;
    case 'thinking':
      // Patient for thinking prompts
      delay = 7000;
      break;
  }
  
  return {
    message,
    delay,
    reasoning: `${context.type} nudge with ${delay/1000}s delay for ${context.emotionalState} state`,
  };
}

/**
 * Evaluate if a nudge is pedagogically valuable
 * Prevents over-intervention
 */
export function shouldDeliverNudge(
  recentNudgeCount: number,
  timeSinceLastNudge: number,
  childEngagement: number
): boolean {
  // Don't over-intervene
  if (recentNudgeCount > 3) return false;
  
  // Wait at least 20 seconds between nudges
  if (timeSinceLastNudge < 20000) return false;
  
  // If child is highly engaged, be more patient
  if (childEngagement > 80) return false;
  
  return true;
}

/**
 * Generate scaffolding prompts for specific learning goals
 */
export async function generateScaffoldingPrompt(
  goal: string,
  childState: ChildState,
  context: { childAge: number; scenario: string }
): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `You are scaffolding a learning moment for a ${context.childAge}-year-old.

Learning goal: ${goal}
Child's vocabulary level: ${childState.vocabularyLevel}
Current emotional state: ${childState.emotionalState}
Scenario: ${context.scenario}

Create a gentle, Socratic prompt that guides the child toward the learning goal.
Keep it conversational, warm, and age-appropriate.
Maximum 2 sentences.`,
        },
        {
          role: 'user',
          content: 'Generate the scaffolding prompt.',
        },
      ],
      max_tokens: 80,
      temperature: 0.7,
    });

    return response.choices[0].message.content?.trim() || 
           "Let's explore that together! What do you think?";
  } catch (error) {
    console.error('Scaffolding generation error:', error);
    return "Let's explore that together! What do you think?";
  }
}
