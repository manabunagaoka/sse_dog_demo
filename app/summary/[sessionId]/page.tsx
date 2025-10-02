import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'

interface SummaryPageProps {
  params: {
    sessionId: string
  }
}

export default async function SummaryPage({ params }: SummaryPageProps) {
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
    redirect('/parent-dashboard')
  }

  let summary
  try {
    summary = session.summary ? JSON.parse(session.summary) : null
  } catch (e) {
    summary = null
  }

  if (!summary) {
    summary = {
      whatWeDiscussed: "We had a wonderful learning conversation!",
      vocabularyHighlights: ["explored", "discovered", "wondered"],
      criticalThinkingMoments: "Great questions were asked and new ideas were explored.",
      thinkingQuestion: "What would you like to learn about next?",
    }
  }

  const childUtterances = session.utterances.filter((u: any) => u.speaker === 'child')
  const aiUtterances = session.utterances.filter((u: any) => u.speaker === 'ai_voice')

  return (
    <main className="min-h-screen bg-gradient-to-br from-warm-blue to-warm-green p-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-white mb-4">
            ✨ Session Summary ✨
          </h1>
          <p className="text-white/90 text-xl">
            Great work, {session.child.name}!
          </p>
        </div>

        {/* What We Discussed */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-4xl">💬</span>
            <h2 className="text-2xl font-bold text-primary-900">
              What We Talked About
            </h2>
          </div>
          <p className="text-xl text-gray-700 leading-relaxed">
            {summary.whatWeDiscussed}
          </p>
        </div>

        {/* Words You Used Well */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-4xl">📚</span>
            <h2 className="text-2xl font-bold text-primary-900">
              Words You Used Well
            </h2>
          </div>
          <div className="flex flex-wrap gap-3">
            {summary.vocabularyHighlights.map((word: string, index: number) => (
              <span
                key={index}
                className="bg-warm-yellow text-primary-900 px-6 py-3 rounded-full font-bold text-lg"
              >
                {word}
              </span>
            ))}
          </div>
        </div>

        {/* Critical Thinking Moments */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-4xl">💡</span>
            <h2 className="text-2xl font-bold text-primary-900">
              Great Thinking!
            </h2>
          </div>
          <p className="text-xl text-gray-700 leading-relaxed">
            {summary.criticalThinkingMoments}
          </p>
        </div>

        {/* Thinking Question */}
        <div className="bg-warm-yellow rounded-2xl shadow-xl p-8 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-4xl">🤔</span>
            <h2 className="text-2xl font-bold text-primary-900">
              Something to Think About
            </h2>
          </div>
          <p className="text-xl text-primary-900 font-medium leading-relaxed">
            {summary.thinkingQuestion}
          </p>
        </div>

        {/* Session Stats */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 mb-6 text-white">
          <h3 className="text-xl font-bold mb-3">Session Stats</h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-3xl font-bold">{childUtterances.length}</div>
              <div className="text-sm">Your Messages</div>
            </div>
            <div>
              <div className="text-3xl font-bold">{aiUtterances.length}</div>
              <div className="text-sm">AI Nudges</div>
            </div>
            <div>
              <div className="text-3xl font-bold">
                {Math.round((session.endedAt ? new Date(session.endedAt).getTime() : Date.now()) - new Date(session.startedAt).getTime() / 1000 / 60)}
                {' min'}
              </div>
              <div className="text-sm">Duration</div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-4 justify-center">
          <Link
            href="/parent-dashboard"
            className="bg-white text-primary-700 px-8 py-4 rounded-full font-bold text-xl hover:shadow-lg transition-all"
          >
            Back to Dashboard
          </Link>
          <Link
            href={`/session/new?childId=${session.childId}`}
            className="bg-warm-yellow text-primary-900 px-8 py-4 rounded-full font-bold text-xl hover:shadow-lg transition-all"
          >
            Start New Session
          </Link>
        </div>
      </div>
    </main>
  )
}
