/**
 * COVERT REASONING ENGINE
 * 
 * This module is SERVER-SIDE ONLY and handles all pedagogical analysis.
 * It tracks child engagement, vocabulary usage, hesitation patterns, and emotional state.
 * 
 * CRITICAL: None of this reasoning is ever exposed to the client.
 * The frontend only receives the final, child-safe AI voice outputs.
 */

import OpenAI from 'openai';
import { prisma } from '@/lib/prisma';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface ChildState {
  vocabularyLevel: string;
  recentVocabulary: string[];
  pauseDurations: number[];
  engagementScore: number; // 0-100
  hesitationCount: number;
  lastUtteranceTime: Date;
  emotionalState: 'engaged' | 'confused' | 'frustrated' | 'excited';
}

export interface ReasoningAnalysis {
  // Internal analysis (NEVER sent to client)
  vocabularyUsed: string[];
  newWords: string[];
  complexityLevel: 'simple' | 'moderate' | 'advanced';
  hesitationDetected: boolean;
  pauseDuration: number;
  engagementIndicators: string[];
  strugglingIndicators: string[];
  emotionalTone: string;
  
  // Decision
  shouldIntervene: boolean;
  interventionReason?: string;
  suggestedNudge?: string;
  confidenceScore: number; // 0-1
}

export interface ScaffoldingDecision {
  action: 'speak' | 'observe' | 'encourage';
  message?: string;
  delay: number; // milliseconds before delivering
  reasoning: string; // Internal only
}

/**
 * Analyze a child's utterance for pedagogical insights
 * This is the "covert reasoning" layer that tracks learning patterns
 */
export async function analyzeUtterance(
  utterance: string,
  childState: ChildState,
  context: {
    sessionId: string;
    childAge: number;
    previousUtterances: string[];
  }
): Promise<ReasoningAnalysis> {
  try {
    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `You are a pedagogical analyst for a Sesame Street-style learning system.
Analyze the child's utterance for internal tracking only. DO NOT generate child-facing content.

Child context:
- Age: ${context.childAge}
- Vocabulary level: ${childState.vocabularyLevel}
- Recent vocabulary: ${childState.recentVocabulary.join(', ')}
- Engagement score: ${childState.engagementScore}/100
- Emotional state: ${childState.emotionalState}

Previous utterances: ${context.previousUtterances.slice(-3).join(' | ')}

Analyze and return JSON:
{
  "vocabularyUsed": ["word1", "word2"],
  "newWords": ["words not in recent vocabulary"],
  "complexityLevel": "simple|moderate|advanced",
  "hesitationDetected": boolean,
  "pauseDuration": estimated_seconds,
  "engagementIndicators": ["used details", "asked question", etc],
  "strugglingIndicators": ["repeated words", "incomplete sentences", etc],
  "emotionalTone": "excited|neutral|frustrated|confused",
  "shouldIntervene": boolean,
  "interventionReason": "why or why not",
  "suggestedNudge": "gentle prompt if intervention needed",
  "confidenceScore": 0.0-1.0
}`,
        },
        {
          role: 'user',
          content: `Child's utterance: "${utterance}"`,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.4,
    });

    const analysis = JSON.parse(response.choices[0].message.content || '{}');
    
    return {
      vocabularyUsed: analysis.vocabularyUsed || [],
      newWords: analysis.newWords || [],
      complexityLevel: analysis.complexityLevel || 'simple',
      hesitationDetected: analysis.hesitationDetected || false,
      pauseDuration: analysis.pauseDuration || 0,
      engagementIndicators: analysis.engagementIndicators || [],
      strugglingIndicators: analysis.strugglingIndicators || [],
      emotionalTone: analysis.emotionalTone || 'neutral',
      shouldIntervene: analysis.shouldIntervene || false,
      interventionReason: analysis.interventionReason,
      suggestedNudge: analysis.suggestedNudge,
      confidenceScore: analysis.confidenceScore || 0.5,
    };
  } catch (error) {
    console.error('Reasoning engine error:', error);
    // Fail-safe analysis
    return {
      vocabularyUsed: [],
      newWords: [],
      complexityLevel: 'simple',
      hesitationDetected: false,
      pauseDuration: 0,
      engagementIndicators: [],
      strugglingIndicators: [],
      emotionalTone: 'neutral',
      shouldIntervene: false,
      confidenceScore: 0,
    };
  }
}

/**
 * Detect if child needs assistance based on silence/pause duration
 */
export function detectSilenceIntervention(
  lastUtteranceTime: Date,
  childState: ChildState
): { needsIntervention: boolean; silenceDuration: number } {
  const now = new Date();
  const silenceDuration = (now.getTime() - lastUtteranceTime.getTime()) / 1000; // seconds
  
  // Intervention thresholds based on emotional state
  const thresholds = {
    engaged: 12,      // More patient when engaged
    confused: 8,      // Intervene sooner when confused
    frustrated: 5,    // Quick support when frustrated
    excited: 15,      // Give more space when excited
  };
  
  const threshold = thresholds[childState.emotionalState] || 10;
  
  return {
    needsIntervention: silenceDuration >= threshold,
    silenceDuration,
  };
}

/**
 * Update child state based on analysis
 */
export function updateChildState(
  currentState: ChildState,
  analysis: ReasoningAnalysis
): ChildState {
  // Update vocabulary tracking
  const updatedVocab = [
    ...currentState.recentVocabulary,
    ...analysis.newWords,
  ].slice(-50); // Keep last 50 unique words
  
  // Update engagement score
  let engagementDelta = 0;
  if (analysis.engagementIndicators.length > 0) engagementDelta += 5;
  if (analysis.strugglingIndicators.length > 0) engagementDelta -= 3;
  if (analysis.hesitationDetected) engagementDelta -= 2;
  
  const newEngagementScore = Math.max(
    0,
    Math.min(100, currentState.engagementScore + engagementDelta)
  );
  
  // Update emotional state
  const emotionalMapping: Record<string, ChildState['emotionalState']> = {
    excited: 'excited',
    frustrated: 'frustrated',
    confused: 'confused',
    neutral: 'engaged',
  };
  
  return {
    vocabularyLevel: currentState.vocabularyLevel,
    recentVocabulary: updatedVocab,
    pauseDurations: [
      ...currentState.pauseDurations,
      analysis.pauseDuration,
    ].slice(-10),
    engagementScore: newEngagementScore,
    hesitationCount: currentState.hesitationCount + (analysis.hesitationDetected ? 1 : 0),
    lastUtteranceTime: new Date(),
    emotionalState: emotionalMapping[analysis.emotionalTone] || currentState.emotionalState,
  };
}

/**
 * Decide if and how to intervene with scaffolding
 */
export async function decideScaffolding(
  analysis: ReasoningAnalysis,
  childState: ChildState,
  context: {
    childAge: number;
    scenario: string;
  }
): Promise<ScaffoldingDecision> {
  // High confidence threshold - only intervene when really needed
  if (!analysis.shouldIntervene || analysis.confidenceScore < 0.7) {
    return {
      action: 'observe',
      delay: 0,
      reasoning: 'Child is progressing well, no intervention needed',
    };
  }
  
  // Determine intervention type
  if (childState.emotionalState === 'frustrated') {
    return {
      action: 'encourage',
      message: analysis.suggestedNudge || "You're doing great! Let's think together.",
      delay: 3000, // Quick support for frustration
      reasoning: 'Detected frustration - providing immediate encouragement',
    };
  }
  
  if (analysis.strugglingIndicators.length > 2) {
    return {
      action: 'speak',
      message: analysis.suggestedNudge || "What do you notice? Tell me more!",
      delay: 5000, // Give child time to process first
      reasoning: `Multiple struggling indicators: ${analysis.strugglingIndicators.join(', ')}`,
    };
  }
  
  // Default: gentle prompt
  return {
    action: 'speak',
    message: analysis.suggestedNudge || "I wonder what you're thinking?",
    delay: 6000,
    reasoning: 'Gentle pedagogical nudge based on engagement patterns',
  };
}

/**
 * Store analysis in database for later review
 * (Parents can review, but reasoning never shown to child)
 */
export async function logReasoningAnalysis(
  sessionId: string,
  utteranceId: string,
  analysis: ReasoningAnalysis
): Promise<void> {
  try {
    await prisma.utterance.update({
      where: { id: utteranceId },
      data: {
        metadata: JSON.stringify({
          vocabularyUsed: analysis.vocabularyUsed,
          complexityLevel: analysis.complexityLevel,
          hesitationDetected: analysis.hesitationDetected,
          pauseDuration: analysis.pauseDuration,
          emotionalTone: analysis.emotionalTone,
          timestamp: new Date().toISOString(),
        }),
      },
    });
  } catch (error) {
    console.error('Failed to log analysis:', error);
  }
}
