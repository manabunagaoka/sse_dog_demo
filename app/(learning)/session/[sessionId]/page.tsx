'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import VoiceNarrator from '@/components/learning/VoiceNarrator';
import TranscriptSidebar from '@/components/learning/TranscriptSidebar';
import { motion } from 'framer-motion';

interface Utterance {
  id: string;
  speaker: 'child' | 'ai_voice';
  text: string;
  timestamp: Date;
}

interface SessionPageProps {
  params: {
    sessionId: string;
  };
}

export default function SessionPage({ params }: SessionPageProps) {
  const router = useRouter();
  const [childId, setChildId] = useState<string>('');
  const [childName, setChildName] = useState<string>('');
  const [aiVoiceEnabled, setAiVoiceEnabled] = useState(false);
  const [mode, setMode] = useState<'observe' | 'speak'>('observe');
  const [inputText, setInputText] = useState('');
  const [utterances, setUtterances] = useState<Utterance[]>([]);
  const [lastUtterance, setLastUtterance] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Load session data
  useEffect(() => {
    const loadSession = async () => {
      try {
        // Get session from localStorage (set during session creation)
        const sessionData = localStorage.getItem('currentSession');
        if (sessionData) {
          const { childId, childName, aiVoiceEnabled } = JSON.parse(sessionData);
          setChildId(childId);
          setChildName(childName);
          setAiVoiceEnabled(aiVoiceEnabled);
        }

        // Load existing utterances
        const response = await fetch(`/api/sessions/${params.sessionId}`);
        if (response.ok) {
          const data = await response.json();
          if (data.session?.utterances) {
            setUtterances(data.session.utterances);
          }
        }
      } catch (error) {
        console.error('Failed to load session:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSession();
  }, [params.sessionId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    // Add utterance to local state
    const newUtterance: Utterance = {
      id: Date.now().toString(),
      speaker: 'child',
      text: inputText,
      timestamp: new Date(),
    };

    setUtterances([...utterances, newUtterance]);
    setLastUtterance(inputText);
    setInputText('');
  };

  const handleAIComplete = () => {
    // Reload utterances to get AI response
    fetch(`/api/sessions/${params.sessionId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.session?.utterances) {
          setUtterances(data.session.utterances);
        }
      });
  };

  const handleEndSession = async () => {
    try {
      // Generate summary
      await fetch(`/api/sessions/${params.sessionId}/summary`, {
        method: 'POST',
      });

      // Navigate to summary page
      router.push(`/summary/${params.sessionId}`);
    } catch (error) {
      console.error('Failed to end session:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 flex items-center justify-center">
        <div className="text-2xl text-gray-600">Loading session...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 relative">
      {/* Header */}
      <div className="bg-white shadow-md p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              Learning with {childName}
            </h1>
            <p className="text-sm text-gray-600">
              {aiVoiceEnabled ? '🎤 AI Voice Active' : '👁️ Observe Mode'}
            </p>
          </div>
          <button
            onClick={handleEndSession}
            className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-full font-semibold transition"
          >
            End Session
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-7xl mx-auto p-8 lg:pr-96">
        {/* Character scene area */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl shadow-2xl p-12 mb-8 min-h-[400px] flex flex-col items-center justify-center"
        >
          {/* Placeholder for character scene */}
          <div className="text-center">
            <div className="text-8xl mb-4">🎨</div>
            <h2 className="text-3xl font-bold text-gray-800 mb-2">
              Imagine & Explore
            </h2>
            <p className="text-gray-600 text-lg">
              Tell me what you see and what you're thinking!
            </p>
          </div>
        </motion.div>

        {/* Mode toggle */}
        <div className="flex gap-4 mb-6 justify-center">
          <button
            onClick={() => setMode('observe')}
            className={`px-6 py-3 rounded-full font-semibold transition ${
              mode === 'observe'
                ? 'bg-blue-500 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            👁️ Observe
          </button>
          <button
            onClick={() => setMode('speak')}
            className={`px-6 py-3 rounded-full font-semibold transition ${
              mode === 'speak'
                ? 'bg-purple-500 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            💬 Speak
          </button>
        </div>

        {/* Input area */}
        {mode === 'speak' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl shadow-xl p-6"
          >
            <form onSubmit={handleSubmit} className="space-y-4">
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Type what you want to say..."
                className="w-full p-4 text-xl border-2 border-gray-200 rounded-2xl focus:border-purple-500 focus:outline-none resize-none"
                rows={4}
              />
              <button
                type="submit"
                disabled={!inputText.trim()}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-4 rounded-2xl font-bold text-xl hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                Send Message
              </button>
            </form>
          </motion.div>
        )}
      </div>

      {/* Voice Narrator */}
      {aiVoiceEnabled && lastUtterance && (
        <VoiceNarrator
          sessionId={params.sessionId}
          childId={childId}
          utterance={lastUtterance}
          parentOptIn={aiVoiceEnabled}
          onComplete={handleAIComplete}
        />
      )}

      {/* Transcript Sidebar */}
      <TranscriptSidebar utterances={utterances} />
    </div>
  );
}
