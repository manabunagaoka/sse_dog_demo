import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { shouldProvidNudge, calculateEngagement, detectStruggles } from '@/lib/ai/scaffolding'
import { ChildState } from '@/lib/ai/reasoningEngine'

/**
 * SSE STREAMING ENDPOINT
 * Accepts child utterances and streams AI voice responses in real-time.
 * Respects parentOptIn flag and applies safety guardrails.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { sessionId, childId, utterance, parentOptIn } = body

    // Validate required fields
    if (!sessionId || !childId) {
      return new Response('Missing required fields', { status: 400 })
    }

    // Check if AI voice is enabled for this child
    const child = await prisma.child.findUnique({
      where: { id: childId },
      include: {
        sessions: {
          where: { id: sessionId },
          include: {
            utterances: {
              orderBy: { timestamp: 'desc' },
              take: 10,
            },
          },
        },
      },
    })

    if (!child) {
      return new Response('Child not found', { status: 404 })
    }

    const session = child.sessions[0]
    if (!session) {
      return new Response('Session not found', { status: 404 })
    }

    // Check parent opt-in
    if (!parentOptIn || !child.aiVoiceEnabled) {
      // Return silent mode - no AI voice
      return new Response('silent', { status: 200 })
    }

    // Store the child's utterance
    if (utterance) {
      await prisma.utterance.create({
        data: {
          sessionId,
          speaker: 'child',
          text: utterance,
          metadata: JSON.stringify({
            timestamp: Date.now(),
          }),
        },
      })
    }

    // Build child state for reasoning engine
    const recentUtterances = session.utterances
      .filter((u) => u.speaker === 'child')
      .map((u) => u.text)
      .reverse()

    const lastSpeechTimestamp = session.utterances.find((u) => u.speaker === 'child')?.timestamp.getTime() || Date.now()

    const childState: ChildState = {
      vocabularyLevel: child.vocabularyLevel,
      recentUtterances,
      hesitationCount: recentUtterances.filter((u) => u.includes('um') || u.includes('uh')).length,
      engagementScore: calculateEngagement(recentUtterances, lastSpeechTimestamp),
      lastSpeechTimestamp,
      detectedStruggles: detectStruggles(recentUtterances),
    }

    // Determine if AI should speak
    const decision = await shouldProvidNudge(childState, utterance)

    if (!decision.shouldSpeak || !decision.message) {
      // Stay silent - child is doing fine
      return new Response('silent', { status: 200 })
    }

    // Store AI's utterance
    await prisma.utterance.create({
      data: {
        sessionId,
        speaker: 'ai_voice',
        text: decision.message,
        metadata: JSON.stringify({
          reasoning: decision.reasoning,
          delay: decision.delay,
        }),
      },
    })

    // Create SSE stream
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Wait for calculated delay before speaking
          if (decision.delay) {
            await new Promise((resolve) => setTimeout(resolve, decision.delay))
          }

          // Stream the message word by word
          const words = decision.message!.split(' ')
          for (let i = 0; i < words.length; i++) {
            const word = words[i]
            const chunk = `data: ${JSON.stringify({ word, isLast: i === words.length - 1 })}\n\n`
            controller.enqueue(encoder.encode(chunk))

            // Natural pacing: 200-300ms between words
            const delay = 200 + Math.random() * 100
            await new Promise((resolve) => setTimeout(resolve, delay))
          }

          controller.close()
        } catch (error) {
          console.error('SSE streaming error:', error)
          controller.error(error)
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  } catch (error) {
    console.error('AI stream error:', error)
    return new Response('Internal server error', { status: 500 })
  }
}

/**
 * GET endpoint to check if AI voice is available for a session
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const childId = searchParams.get('childId')

  if (!childId) {
    return Response.json({ enabled: false })
  }

  const child = await prisma.child.findUnique({
    where: { id: childId },
    select: { aiVoiceEnabled: true },
  })

  return Response.json({ enabled: child?.aiVoiceEnabled || false })
}
