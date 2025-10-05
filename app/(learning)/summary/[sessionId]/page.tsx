'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

interface Summary {
  whatWeTalkedAbout: string;
  wordsYouUsedWell: string[];
  thinkingQuestion: string;
  parentNotes: string;
}

interface SummaryPageProps {
  params: {
    sessionId: string;
  };
}

export default function SummaryPage({ params }: SummaryPageProps) {
  const router = useRouter();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadSummary = async () => {
      try {
        const response = await fetch(`/api/sessions/${params.sessionId}/summary`);
        if (response.ok) {
          const data = await response.json();
          setSummary(data.summary);
        } else {
          // Summary might not exist yet, try generating it
          const generateResponse = await fetch(
            `/api/sessions/${params.sessionId}/summary`,
            { method: 'POST' }
          );
          if (generateResponse.ok) {
            const data = await generateResponse.json();
            setSummary(data.summary);
          }
        }
      } catch (error) {
        console.error('Failed to load summary:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSummary();
  }, [params.sessionId]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">✨</div>
          <div className="text-2xl text-gray-600">Creating your summary...</div>
        </div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">😕</div>
          <div className="text-2xl text-gray-600">Summary not available</div>
          <button
            onClick={() => router.push('/parent-dashboard')}
            className="mt-6 px-6 py-3 bg-blue-500 text-white rounded-full font-semibold hover:bg-blue-600"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="text-8xl mb-4">🎉</div>
          <h1 className="text-5xl font-bold text-gray-800 mb-2">
            Great Learning Session!
          </h1>
          <p className="text-xl text-gray-600">
            Here's what we discovered together
          </p>
        </motion.div>

        {/* What We Talked About */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-3xl shadow-xl p-8 mb-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="text-4xl">💭</div>
            <h2 className="text-3xl font-bold text-gray-800">
              What We Talked About
            </h2>
          </div>
          <p className="text-xl text-gray-700 leading-relaxed">
            {summary.whatWeTalkedAbout}
          </p>
        </motion.div>

        {/* Words You Used Well */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-3xl shadow-xl p-8 mb-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="text-4xl">⭐</div>
            <h2 className="text-3xl font-bold text-gray-800">
              Words You Used Well
            </h2>
          </div>
          <div className="flex flex-wrap gap-3">
            {summary.wordsYouUsedWell.map((word, index) => (
              <motion.div
                key={index}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3 + index * 0.1 }}
                className="bg-gradient-to-r from-yellow-400 to-orange-400 text-white px-6 py-3 rounded-full text-xl font-semibold shadow-lg"
              >
                {word}
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Thinking Question */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-gradient-to-br from-purple-400 to-pink-400 rounded-3xl shadow-xl p-8 mb-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="text-4xl">🤔</div>
            <h2 className="text-3xl font-bold text-white">
              Keep Thinking About...
            </h2>
          </div>
          <p className="text-2xl text-white leading-relaxed font-medium">
            {summary.thinkingQuestion}
          </p>
        </motion.div>

        {/* Parent Notes */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-gray-100 rounded-3xl shadow-xl p-8 mb-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="text-4xl">📝</div>
            <h2 className="text-2xl font-bold text-gray-800">
              Notes for Parents
            </h2>
          </div>
          <p className="text-lg text-gray-700 leading-relaxed">
            {summary.parentNotes}
          </p>
        </motion.div>

        {/* Actions */}
        <div className="flex gap-4 justify-center">
          <button
            onClick={() => router.push('/parent-dashboard')}
            className="px-8 py-4 bg-blue-500 text-white rounded-full font-semibold text-lg hover:bg-blue-600 shadow-lg transition"
          >
            Back to Dashboard
          </button>
          <button
            onClick={() => router.push('/session/new')}
            className="px-8 py-4 bg-green-500 text-white rounded-full font-semibold text-lg hover:bg-green-600 shadow-lg transition"
          >
            Start New Session
          </button>
        </div>
      </div>
    </div>
  );
}
