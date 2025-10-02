const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Create demo parent account
  const hashedPassword = await bcrypt.hash('password123', 10)
  
  const parent = await prisma.parent.upsert({
    where: { email: 'parent@example.com' },
    update: {},
    create: {
      email: 'parent@example.com',
      password: hashedPassword,
      name: 'Demo Parent',
    },
  })

  console.log('✓ Created parent:', parent.email)

  // Create demo children
  const child1 = await prisma.child.upsert({
    where: { id: 'demo-child-1' },
    update: {},
    create: {
      id: 'demo-child-1',
      name: 'Emma',
      age: 6,
      vocabularyLevel: 'beginner',
      aiVoiceEnabled: true,
      parentId: parent.id,
    },
  })

  const child2 = await prisma.child.upsert({
    where: { id: 'demo-child-2' },
    update: {},
    create: {
      id: 'demo-child-2',
      name: 'Lucas',
      age: 8,
      vocabularyLevel: 'intermediate',
      aiVoiceEnabled: false,
      parentId: parent.id,
    },
  })

  console.log('✓ Created children:', child1.name, child2.name)

  // Create a demo completed session with summary
  const completedSession = await prisma.session.create({
    data: {
      childId: child1.id,
      scenario: 'story_exploration',
      status: 'completed',
      endedAt: new Date(),
      summary: JSON.stringify({
        whatWeDiscussed: "We explored a wonderful story about animals in the forest. Emma showed great curiosity about how animals help each other.",
        vocabularyHighlights: ["curious", "friendship", "explore"],
        criticalThinkingMoments: "Emma asked thoughtful questions about why animals work together, showing understanding of cooperation.",
        thinkingQuestion: "What would you do if you found a lost animal friend in the forest?",
      }),
    },
  })

  // Add utterances to the completed session
  await prisma.utterance.createMany({
    data: [
      {
        sessionId: completedSession.id,
        speaker: 'child',
        text: 'I want to learn about animals!',
      },
      {
        sessionId: completedSession.id,
        speaker: 'ai_voice',
        text: 'That sounds wonderful! What kind of animals are you curious about?',
      },
      {
        sessionId: completedSession.id,
        speaker: 'child',
        text: 'I like rabbits and foxes. Do they live together?',
      },
      {
        sessionId: completedSession.id,
        speaker: 'ai_voice',
        text: 'Great question! Let\'s think about where they might live...',
      },
    ],
  })

  console.log('✓ Created demo session with utterances')

  // Create an active session for testing
  const activeSession = await prisma.session.create({
    data: {
      childId: child1.id,
      scenario: 'general_learning',
      status: 'active',
    },
  })

  console.log('✓ Created active session:', activeSession.id)

  console.log('\n🎉 Database seeding completed!\n')
  console.log('📝 Demo credentials:')
  console.log('   Email: parent@example.com')
  console.log('   Password: password123\n')
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
