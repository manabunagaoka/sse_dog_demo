import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * POST /api/sessions/[sessionId]/summary
 * Generate pedagogical summary after session ends
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const { sessionId } = params;
    
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        utterances: {
          orderBy: { timestamp: 'asc' },
        },
        child: true,
      },
    });
    
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }
    
    // Extract conversation
    const childUtterances = session.utterances
      .filter(u => u.speaker === 'child')
      .map(u => u.text);
    
    const aiUtterances = session.utterances
      .filter(u => u.speaker === 'ai_voice')
      .map(u => u.text);
    
    // Generate summary using AI
    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `You are creating a warm, encouraging summary of a learning session for a ${session.child.age}-year-old child.

Create a JSON summary with these sections:
{
  "whatWeTalkedAbout": "2-3 sentences about the main topics explored",
  "wordsYouUsedWell": ["word1", "word2", "word3"],
  "thinkingQuestion": "An open-ended question to extend learning",
  "parentNotes": "Brief pedagogical insights for the parent"
}

Focus on:
- Positive framing
- Vocabulary growth
- Critical thinking moments
- Curiosity and engagement

Child said: ${childUtterances.join(' | ')}
AI said: ${aiUtterances.join(' | ')}`,
        },
        {
          role: 'user',
          content: 'Generate the session summary.',
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    });
    
    const summary = JSON.parse(response.choices[0].message.content || '{}');
    
    // Update session with summary
    await prisma.session.update({
      where: { id: sessionId },
      data: {
        summary: JSON.stringify(summary),
        status: 'completed',
        completedAt: new Date(),
      },
    });
    
    return NextResponse.json({ summary });
    
  } catch (error) {
    console.error('Summary generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate summary' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/sessions/[sessionId]/summary
 * Retrieve existing summary
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const { sessionId } = params;
    
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      select: {
        summary: true,
        status: true,
      },
    });
    
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }
    
    if (!session.summary) {
      return NextResponse.json({ error: 'Summary not yet generated' }, { status: 404 });
    }
    
    const summary = JSON.parse(session.summary);
    
    return NextResponse.json({ summary });
    
  } catch (error) {
    console.error('Summary retrieval error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve summary' },
      { status: 500 }
    );
  }
}
