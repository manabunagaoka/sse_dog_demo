'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import VoiceNarrator from '@/components/learning/VoiceNarrator'

interface SessionPageProps {
  params: {
    sessionId: string
  }
}

export default function SessionPage({ params }: SessionPageProps) {
  const router = useRouter()
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [currentUtterance, setCurrentUtterance] = useState('')
  const [utteranceToStream, setUtteranceToStream] = useState<string | null>(null)
  const [transcript, setTranscript] = useState<any[]>([])
  const [participationMode, setParticipationMode] = useState<'observe' | 'speak'>('speak')

  useEffect(() => {
    fetchSessionData()
  }, [])

  const fetchSessionData = async () => {
    try {
      const res = await fetch(`/api/sessions/${params.sessionId}`)
      if (res.ok) {
        const data = await res.json()
        setSession(data)
        setTranscript(data.utterances || [])
      }
    } catch (error) {
      console.error('Failed to fetch session:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSendUtterance = () => {
    if (!currentUtterance.trim()) return

    // Add to transcript immediately
    const newUtterance = {
      speaker: 'child',
      text: currentUtterance,
      timestamp: new Date(),
    }
    setTranscript((prev) => [...prev, newUtterance])

    // Trigger AI response via Voice Narrator
    setUtteranceToStream(currentUtterance)
    setCurrentUtterance('')
  }

  const handleEndSession = async () => {
    try {
      await fetch(`/api/sessions/${params.sessionId}/end`, {
        method: 'POST',
      })
      router.push(`/summary/${params.sessionId}`)
    } catch (error) {
      console.error('Failed to end session:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-warm-blue to-warm-green">
        <div className="text-white text-2xl">Loading session...</div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-warm-blue to-warm-green">
        <div className="text-white text-2xl">Session not found</div>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-warm-blue to-warm-green p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-white">Learning Session</h1>
          <button
            onClick={handleEndSession}
            className="bg-white text-primary-700 px-6 py-3 rounded-full font-bold hover:shadow-lg transition-all"
          >
            End Session
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Learning Area */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-xl p-8 min-h-[600px] relative">
            {/* Character Scene Placeholder */}
            <div className="flex items-center justify-center h-64 bg-gradient-to-r from-warm-yellow to-warm-orange rounded-xl mb-6">
              <div className="text-center">
                <div className="text-8xl mb-4">🌟</div>
                <p className="text-2xl font-bold text-primary-900">
                  Learning Adventure
                </p>
              </div>
            </div>

            {/* Participation Mode Toggle */}
            <div className="flex justify-center gap-4 mb-6">
              <button
                onClick={() => setParticipationMode('observe')}
                className={`px-6 py-3 rounded-full font-bold transition-all ${
                  participationMode === 'observe'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                👀 Observe
              </button>
              <button
                onClick={() => setParticipationMode('speak')}
                className={`px-6 py-3 rounded-full font-bold transition-all ${
                  participationMode === 'speak'
                    ? 'bg-warm-yellow text-primary-900'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                🎤 Speak
              </button>
            </div>

            {/* Input Area */}
            {participationMode === 'speak' && (
              <div className="space-y-4">
                <textarea
                  value={currentUtterance}
                  onChange={(e) => setCurrentUtterance(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleSendUtterance()
                    }
                  }}
                  placeholder="Type what you want to say..."
                  className="w-full px-4 py-3 border-2 border-primary-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 text-xl min-h-[100px]"
                />
                <button
                  onClick={handleSendUtterance}
                  disabled={!currentUtterance.trim()}
                  className="w-full bg-warm-yellow text-primary-900 py-4 rounded-xl font-bold text-xl hover:shadow-lg transition-all disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  Send Message
                </button>
              </div>
            )}
          </div>

          {/* Transcript Sidebar */}
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <h2 className="text-2xl font-bold text-primary-900 mb-4">
              Transcript
            </h2>
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {transcript.map((item, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg ${
                    item.speaker === 'child'
                      ? 'bg-blue-50 border-l-4 border-blue-500'
                      : 'bg-yellow-50 border-l-4 border-yellow-500'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-2xl">
                      {item.speaker === 'child' ? '👧' : '🤖'}
                    </span>
                    <span className="font-bold text-sm text-gray-700">
                      {item.speaker === 'child' ? 'Child' : 'AI Helper'}
                    </span>
                  </div>
                  <p className="text-gray-900">{item.text}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(item.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Voice Narrator Overlay */}
      <VoiceNarrator
        sessionId={params.sessionId}
        childId={session.childId}
        utterance={utteranceToStream}
        parentOptIn={session.child?.aiVoiceEnabled || false}
        onComplete={() => setUtteranceToStream(null)}
      />
    </main>
  )
}
