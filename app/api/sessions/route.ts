import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/sessions
 * Create a new learning session
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { childId, scenario } = body;
    
    if (!childId || !scenario) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Verify child exists
    const child = await prisma.child.findUnique({
      where: { id: childId },
    });
    
    if (!child) {
      return NextResponse.json(
        { error: 'Child not found' },
        { status: 404 }
      );
    }
    
    // Create new session
    const session = await prisma.session.create({
      data: {
        childId,
        scenario,
        status: 'active',
      },
    });
    
    return NextResponse.json({ session });
    
  } catch (error) {
    console.error('Session creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create session' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/sessions?childId=xxx
 * Get all sessions for a child
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const childId = searchParams.get('childId');
    
    if (!childId) {
      return NextResponse.json(
        { error: 'childId required' },
        { status: 400 }
      );
    }
    
    const sessions = await prisma.session.findMany({
      where: { childId },
      orderBy: { startedAt: 'desc' },
      include: {
        utterances: {
          select: { id: true },
        },
      },
    });
    
    return NextResponse.json({ sessions });
    
  } catch (error) {
    console.error('Session retrieval error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve sessions' },
      { status: 500 }
    );
  }
}
