import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

/**
 * Create a new learning session
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { childId, scenario } = body

    if (!childId) {
      return NextResponse.json({ error: 'Child ID required' }, { status: 400 })
    }

    // Verify child belongs to this parent
    const child = await prisma.child.findUnique({
      where: { id: childId },
      include: { parent: true },
    })

    if (!child || child.parent.email !== session.user.email) {
      return NextResponse.json({ error: 'Child not found' }, { status: 404 })
    }

    // Create new session
    const newSession = await prisma.session.create({
      data: {
        childId,
        scenario: scenario || 'general_learning',
        status: 'active',
      },
    })

    return NextResponse.json(newSession)
  } catch (error) {
    console.error('Session creation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * Get all sessions for the authenticated parent
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const parent = await prisma.parent.findUnique({
      where: { email: session.user.email! },
      include: {
        children: {
          include: {
            sessions: {
              orderBy: { startedAt: 'desc' },
              take: 20,
            },
          },
        },
      },
    })

    if (!parent) {
      return NextResponse.json({ error: 'Parent not found' }, { status: 404 })
    }

    return NextResponse.json(parent.children)
  } catch (error) {
    console.error('Sessions fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
