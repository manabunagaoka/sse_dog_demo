import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/children
 * Get all children for logged-in parent
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const children = await prisma.child.findMany({
      where: { parentId: session.user.id },
      orderBy: { createdAt: 'asc' },
    });
    
    return NextResponse.json({ children });
    
  } catch (error) {
    console.error('Children retrieval error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve children' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/children
 * Create a new child profile
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const body = await req.json();
    const { name, age, vocabularyLevel, aiVoiceEnabled } = body;
    
    if (!name || !age) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    const child = await prisma.child.create({
      data: {
        name,
        age: parseInt(age),
        vocabularyLevel: vocabularyLevel || 'beginner',
        aiVoiceEnabled: aiVoiceEnabled || false,
        parentId: session.user.id,
      },
    });
    
    return NextResponse.json({ child });
    
  } catch (error) {
    console.error('Child creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create child' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/children/[childId]
 * Update child settings
 */
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const body = await req.json();
    const { childId, ...updates } = body;
    
    // Verify child belongs to parent
    const child = await prisma.child.findFirst({
      where: {
        id: childId,
        parentId: session.user.id,
      },
    });
    
    if (!child) {
      return NextResponse.json(
        { error: 'Child not found' },
        { status: 404 }
      );
    }
    
    const updated = await prisma.child.update({
      where: { id: childId },
      data: updates,
    });
    
    return NextResponse.json({ child: updated });
    
  } catch (error) {
    console.error('Child update error:', error);
    return NextResponse.json(
      { error: 'Failed to update child' },
      { status: 500 }
    );
  }
}
