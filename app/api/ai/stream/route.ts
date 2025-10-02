/**
 * SSE STREAMING ENDPOINT
 * 
 * This endpoint handles real-time AI voice streaming to the client.
 * It uses Server-Sent Events (SSE) for progressive word-by-word delivery.
 * 
 * Flow:
 * 1. Receive child's utterance
 * 2. Run covert reasoning analysis (server-side only)
 * 3. Decide if AI should speak or remain silent
 * 4. If speaking, generate safe, child-appropriate response
 * 5. Stream response word-by-word with natural pacing
 */

import { NextRequest } from 'next/server';
import OpenAI from 'openai';
import { prisma } from '@/lib/prisma';
import { guardContent } from '@/lib/ai/guardrails';
import {
  analyzeUtterance,
  decideScaffolding,
  updateChildState,
  logReasoningAnalysis,
  ChildState,
} from '@/lib/ai/reasoningEngine';
import { generateAnticipatorNudge } from '@/lib/ai/scaffolding';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface StreamRequest {
  sessionId: string;
  childId: string;
  utterance: string;
  parentOptIn: boolean;
  timestamp: string;
}

/**
 * POST /api/ai/stream
 * Handles AI voice streaming with SSE
 */
export async function POST(req: NextRequest) {
  const encoder = new TextEncoder();
  
  try {
    const body: StreamRequest = await req.json();
    const { sessionId, childId, utterance, parentOptIn } = body;
    
    // Verify parent has opted in to AI voice
    if (!parentOptIn) {
      return new Response(
        encoder.encode('data: {"type":"silent","reason":"AI voice not enabled"}\n\n'),
        {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          },
        }
      );
    }
    
    // Get child and session data
    const child = await prisma.child.findUnique({
      where: { id: childId },
    });
    
    if (!child) {
      throw new Error('Child not found');
    }
    
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        utterances: {
          orderBy: { timestamp: 'desc' },
          take: 10,
        },
      },
    });
    
    if (!session) {
      throw new Error('Session not found');
    }
    
    // Save child's utterance
    const savedUtterance = await prisma.utterance.create({
      data: {
        sessionId,
        speaker: 'child',
        text: utterance,
        timestamp: new Date(),
      },
    });
    
    // Build child state from session history
    const previousUtterances = session.utterances.map(u => u.text);
    const childState: ChildState = {
      vocabularyLevel: child.vocabularyLevel,
      recentVocabulary: extractVocabulary(previousUtterances),
      pauseDurations: [],
      engagementScore: 70, // Default mid-range
      hesitationCount: 0,
      lastUtteranceTime: new Date(),
      emotionalState: 'engaged',
    };
    
    // COVERT REASONING ANALYSIS (server-side only, never exposed)
    const analysis = await analyzeUtterance(utterance, childState, {
      sessionId,
      childAge: child.age,
      previousUtterances,
    });
    
    // Log analysis for parent review (not shown to child)
    await logReasoningAnalysis(sessionId, savedUtterance.id, analysis);
    
    // Update child state based on analysis
    const updatedState = updateChildState(childState, analysis);
    
    // Decide if AI should intervene
    const scaffolding = await decideScaffolding(analysis, updatedState, {
      childAge: child.age,
      scenario: session.scenario,
    });
    
    // If no intervention needed, return silent
    if (scaffolding.action === 'observe') {
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(
            encoder.encode('data: {"type":"silent","reasoning":"observing"}\n\n')
          );
          controller.close();
        },
      });
      
      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }
    
    // Generate AI response
    let aiResponse = scaffolding.message || await generateAIResponse(
      utterance,
      previousUtterances,
      child.age,
      session.scenario
    );
    
    // SAFETY GUARDRAILS - filter content
    const guardResult = await guardContent(aiResponse, {
      childAge: child.age,
      vocabularyLevel: child.vocabularyLevel,
    });
    
    if (!guardResult.safe) {
      console.warn('Content filtered:', guardResult.violations);
      aiResponse = guardResult.sanitizedContent;
    }
    
    // Save AI response
    await prisma.utterance.create({
      data: {
        sessionId,
        speaker: 'ai_voice',
        text: aiResponse,
        timestamp: new Date(),
      },
    });
    
    // Stream response word-by-word
    const stream = new ReadableStream({
      async start(controller) {
        const words = aiResponse.split(' ');
        
        // Send start event
        controller.enqueue(
          encoder.encode('data: {"type":"start"}\n\n')
        );
        
        // Stream each word with natural pacing
        for (let i = 0; i < words.length; i++) {
          await new Promise(resolve => setTimeout(resolve, 250)); // 250ms between words
          
          controller.enqueue(
            encoder.encode(`data: {"type":"word","content":"${words[i]}","index":${i}}\n\n`)
          );
        }
        
        // Send end event
        controller.enqueue(
          encoder.encode('data: {"type":"end"}\n\n')
        );
        
        controller.close();
      },
    });
    
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
    
  } catch (error) {
    console.error('SSE streaming error:', error);
    
    return new Response(
      encoder.encode(`data: {"type":"error","message":"${error}"}\n\n`),
      {
        status: 500,
        headers: {
          'Content-Type': 'text/event-stream',
        },
      }
    );
  }
}

/**
 * Generate AI response using OpenAI
 */
async function generateAIResponse(
  childUtterance: string,
  previousUtterances: string[],
  childAge: number,
  scenario: string
): Promise<string> {
  const conversationContext = previousUtterances.slice(-6).join('\n');
  
  const response = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || 'gpt-4',
    messages: [
      {
        role: 'system',
        content: `You are a warm, encouraging Sesame Street-style AI companion for a ${childAge}-year-old child.

Scenario: ${scenario}

Your responses must:
- Be short (1-2 sentences max)
- Use age-appropriate vocabulary
- Be warm, curious, and encouraging
- Ask open-ended questions when appropriate
- NEVER expose internal reasoning or analysis
- NEVER be negative or corrective
- Build on what the child said

Recent conversation:
${conversationContext}`,
      },
      {
        role: 'user',
        content: childUtterance,
      },
    ],
    max_tokens: 100,
    temperature: 0.8,
  });
  
  return response.choices[0].message.content?.trim() || "Tell me more!";
}

/**
 * Extract vocabulary from utterances
 */
function extractVocabulary(utterances: string[]): string[] {
  const allWords = utterances.join(' ').toLowerCase().split(/\s+/);
  const uniqueWords = Array.from(new Set(allWords));
  return uniqueWords
    .filter(word => word.length > 3) // Filter short words
    .slice(0, 50); // Keep last 50
}
