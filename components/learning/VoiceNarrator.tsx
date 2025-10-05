'use client';

/**
 * VOICE NARRATOR COMPONENT
 * 
 * Animated speech bubble that appears when AI is speaking.
 * Fetches SSE stream and displays text progressively (word by word).
 * Only visible when AI has something to say.
 */

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface VoiceNarratorProps {
  sessionId: string;
  childId: string;
  utterance: string;
  parentOptIn: boolean;
  onComplete?: () => void;
}

interface StreamEvent {
  type: 'start' | 'word' | 'end' | 'silent' | 'error';
  content?: string;
  index?: number;
  reason?: string;
  message?: string;
}

export default function VoiceNarrator({
  sessionId,
  childId,
  utterance,
  parentOptIn,
  onComplete,
}: VoiceNarratorProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [displayText, setDisplayText] = useState('');
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (!utterance) return;

    // Reset state
    setDisplayText('');
    setIsVisible(false);
    setIsAnimating(true);

    // Connect to SSE stream
    const fetchStream = async () => {
      try {
        const response = await fetch('/api/ai/stream', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sessionId,
            childId,
            utterance,
            parentOptIn,
            timestamp: new Date().toISOString(),
          }),
        });

        if (!response.ok) {
          throw new Error('Stream failed');
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) return;

        let buffer = '';
        const words: string[] = [];

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              try {
                const event: StreamEvent = JSON.parse(data);

                if (event.type === 'start') {
                  setIsVisible(true);
                } else if (event.type === 'word' && event.content) {
                  words.push(event.content);
                  setDisplayText(words.join(' '));
                } else if (event.type === 'end') {
                  setIsAnimating(false);
                  setTimeout(() => {
                    setIsVisible(false);
                    onComplete?.();
                  }, 3000); // Keep visible for 3s after completion
                } else if (event.type === 'silent') {
                  // AI chose not to speak
                  setIsAnimating(false);
                  onComplete?.();
                } else if (event.type === 'error') {
                  console.error('Stream error:', event.message);
                  setIsAnimating(false);
                  setIsVisible(false);
                  onComplete?.();
                }
              } catch (e) {
                console.error('Failed to parse SSE event:', e);
              }
            }
          }
        }
      } catch (error) {
        console.error('SSE connection error:', error);
        setIsAnimating(false);
        setIsVisible(false);
        onComplete?.();
      }
    };

    fetchStream();
  }, [utterance, sessionId, childId, parentOptIn, onComplete]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 20 }}
          transition={{ type: 'spring', duration: 0.5 }}
          className="fixed bottom-24 left-1/2 -translate-x-1/2 max-w-2xl w-full px-4 z-50"
        >
          <div className="bg-gradient-to-r from-blue-400 to-purple-400 rounded-3xl shadow-2xl p-6 relative">
            {/* Speech bubble tail */}
            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-8 h-8 bg-purple-400 rotate-45" />
            
            {/* Microphone icon */}
            <div className="absolute -top-6 left-8 bg-yellow-400 rounded-full p-3 shadow-lg">
              <motion.svg
                animate={isAnimating ? { scale: [1, 1.1, 1] } : {}}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className="w-6 h-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                />
              </motion.svg>
            </div>

            {/* Text content */}
            <div className="text-white text-2xl font-medium leading-relaxed min-h-[3rem] flex items-center">
              {displayText}
              {isAnimating && (
                <motion.span
                  animate={{ opacity: [0, 1, 0] }}
                  transition={{ repeat: Infinity, duration: 1 }}
                  className="ml-1"
                >
                  ...
                </motion.span>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
