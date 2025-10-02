import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { signOut } from '@/lib/auth'
import Link from 'next/link'

export default async function ParentDashboard() {
  const session = await auth()
  
  if (!session?.user) {
    redirect('/login')
  }

  const parent = await prisma.parent.findUnique({
    where: { email: session.user.email! },
    include: {
      children: {
        include: {
          sessions: {
            orderBy: { startedAt: 'desc' },
            take: 5,
          },
        },
      },
    },
  })

  if (!parent) {
    redirect('/login')
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-warm-blue to-warm-green p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white">Parent Dashboard</h1>
            <p className="text-white/80 text-xl mt-2">Welcome back, {parent.name}!</p>
          </div>
          
          <form
            action={async () => {
              'use server'
              await signOut()
            }}
          >
            <button
              type="submit"
              className="bg-white text-primary-700 px-6 py-3 rounded-full font-bold hover:shadow-lg transition-all"
            >
              Sign Out
            </button>
          </form>
        </div>

        {/* Children Overview */}
        <div className="grid gap-6">
          {parent.children.map((child: any) => (
            <div key={child.id} className="bg-white rounded-2xl shadow-xl p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-primary-900">{child.name}</h2>
                  <p className="text-gray-600">
                    Age: {child.age} | Level: {child.vocabularyLevel}
                  </p>
                </div>
                
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={child.aiVoiceEnabled}
                      onChange={async () => {
                        // This would need to be a server action
                      }}
                      className="w-5 h-5 text-primary-600 rounded"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      AI Voice Guidance
                    </span>
                  </label>
                </div>
              </div>

              {/* Recent Sessions */}
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-3">
                  Recent Sessions
                </h3>
                {child.sessions.length === 0 ? (
                  <p className="text-gray-500 italic">No sessions yet</p>
                ) : (
                  <div className="space-y-2">
                    {child.sessions.map((session: any) => (
                      <div
                        key={session.id}
                        className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
                      >
                        <div>
                          <p className="font-medium text-gray-900">
                            {session.scenario.replace('_', ' ')}
                          </p>
                          <p className="text-sm text-gray-600">
                            {new Date(session.startedAt).toLocaleDateString()} at{' '}
                            {new Date(session.startedAt).toLocaleTimeString()}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          {session.status === 'active' ? (
                            <Link
                              href={`/session/${session.id}`}
                              className="bg-warm-yellow text-primary-900 px-4 py-2 rounded-full font-bold text-sm hover:shadow-lg transition-all"
                            >
                              Continue
                            </Link>
                          ) : (
                            <Link
                              href={`/summary/${session.id}`}
                              className="bg-primary-600 text-white px-4 py-2 rounded-full font-bold text-sm hover:bg-primary-700 transition-all"
                            >
                              View Summary
                            </Link>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* New Session Button */}
              <Link
                href={`/session/new?childId=${child.id}`}
                className="mt-4 block text-center bg-warm-yellow text-primary-900 px-6 py-3 rounded-full font-bold hover:shadow-lg transition-all"
              >
                Start New Session
              </Link>
            </div>
          ))}
        </div>

        {/* Privacy & Settings */}
        <div className="mt-8 bg-white/10 backdrop-blur-sm rounded-2xl p-6 text-white">
          <h2 className="text-2xl font-bold mb-4">🛡️ Privacy & Safety</h2>
          <ul className="space-y-2">
            <li>✓ All AI interactions are monitored for child safety</li>
            <li>✓ No personal information is shared with the AI</li>
            <li>✓ You have full control over AI voice guidance</li>
            <li>✓ All sessions are recorded for your review</li>
            <li>✓ Internal reasoning is never shown to your child</li>
          </ul>
        </div>
      </div>
    </main>
  )
}
