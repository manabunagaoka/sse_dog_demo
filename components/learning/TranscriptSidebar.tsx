'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

interface TranscriptEntry {
  id: string;
  speaker: 'child' | 'ai_voice';
  text: string;
  timestamp: Date;
}

interface TranscriptSidebarProps {
  utterances: TranscriptEntry[];
}

export default function TranscriptSidebar({ utterances }: TranscriptSidebarProps) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <>
      {/* Toggle button for mobile */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 right-4 z-50 lg:hidden bg-blue-500 text-white p-3 rounded-full shadow-lg"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
      </button>

      {/* Sidebar */}
      <motion.div
        initial={false}
        animate={{
          x: isOpen ? 0 : '100%',
        }}
        transition={{ type: 'spring', damping: 20 }}
        className="fixed right-0 top-0 h-full w-full lg:w-96 bg-white shadow-2xl z-40 flex flex-col"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-500 text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Conversation</h2>
              <p className="text-sm opacity-90 mt-1">
                {utterances.length} messages
              </p>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="lg:hidden text-white hover:bg-white/20 rounded-full p-2"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Transcript list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {utterances.length === 0 ? (
            <div className="text-center text-gray-400 py-12">
              <p className="text-lg">No messages yet</p>
              <p className="text-sm mt-2">Start the conversation!</p>
            </div>
          ) : (
            utterances.map((entry) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-4 rounded-2xl ${
                  entry.speaker === 'child'
                    ? 'bg-blue-50 ml-4'
                    : 'bg-purple-50 mr-4'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  {entry.speaker === 'child' ? (
                    <div className="w-8 h-8 bg-blue-400 rounded-full flex items-center justify-center text-white font-bold text-sm">
                      👧
                    </div>
                  ) : (
                    <div className="w-8 h-8 bg-purple-400 rounded-full flex items-center justify-center text-white font-bold text-sm">
                      🤖
                    </div>
                  )}
                  <span className="font-semibold text-sm text-gray-700">
                    {entry.speaker === 'child' ? 'Child' : 'AI Voice'}
                  </span>
                  <span className="text-xs text-gray-400 ml-auto">
                    {new Date(entry.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-gray-800 text-base leading-relaxed ml-10">
                  {entry.text}
                </p>
              </motion.div>
            ))
          )}
        </div>
      </motion.div>

      {/* Overlay for mobile */}
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          exit={{ opacity: 0 }}
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 bg-black z-30 lg:hidden"
        />
      )}
    </>
  );
}
