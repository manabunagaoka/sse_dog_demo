import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(
  req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const session = await prisma.session.findUnique({
      where: { id: params.sessionId },
      include: {
        child: true,
        utterances: {
          orderBy: { timestamp: 'asc' },
        },
      },
    })

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Generate AI summary
    const summary = await generateSessionSummary(session)

    // Update session
    const updatedSession = await prisma.session.update({
      where: { id: params.sessionId },
      data: {
        status: 'completed',
        endedAt: new Date(),
        summary: JSON.stringify(summary),
      },
    })

    return NextResponse.json(updatedSession)
  } catch (error) {
    console.error('Session end error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function generateSessionSummary(session: any) {
  const childUtterances = session.utterances
    .filter((u: any) => u.speaker === 'child')
    .map((u: any) => u.text)

  const summaryPrompt = `Create a warm, encouraging summary of this learning session for parents.

CHILD: ${session.child.name}, Age ${session.child.age}
UTTERANCES: ${childUtterances.join('; ')}

Create a JSON summary with these sections:
{
  "whatWeDiscussed": "Brief, positive description of topics covered",
  "vocabularyHighlights": ["word1", "word2", "word3"],
  "criticalThinkingMoments": "1-2 sentence description of thinking moments",
  "thinkingQuestion": "An open-ended question for the child to ponder"
}

Make it warm, encouraging, and pedagogically sound. Focus on growth and curiosity.`

  try {
    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are a warm, encouraging educational summarizer for young children. Focus on growth, curiosity, and positive reinforcement.',
        },
        {
          role: 'user',
          content: summaryPrompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 400,
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      return getDefaultSummary()
    }

    return JSON.parse(content)
  } catch (error) {
    console.error('Summary generation error:', error)
    return getDefaultSummary()
  }
}

function getDefaultSummary() {
  return {
    whatWeDiscussed: "We had a wonderful learning conversation!",
    vocabularyHighlights: ["explored", "discovered", "wondered"],
    criticalThinkingMoments: "Great questions were asked and new ideas were explored.",
    thinkingQuestion: "What would you like to learn about next?",
  }
}
