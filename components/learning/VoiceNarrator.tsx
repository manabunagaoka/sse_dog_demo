'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface VoiceNarratorProps {
  sessionId: string
  childId: string
  utterance: string | null
  parentOptIn: boolean
  onComplete?: () => void
}

/**
 * VOICE NARRATOR COMPONENT
 * Animated speech bubble that appears when AI speaks.
 * Fetches SSE stream and displays text progressively.
 */
export default function VoiceNarrator({
  sessionId,
  childId,
  utterance,
  parentOptIn,
  onComplete,
}: VoiceNarratorProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [displayedText, setDisplayedText] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)

  useEffect(() => {
    if (!utterance || !parentOptIn) {
      return
    }

    // EventSource not used in this implementation
    
    const fetchStream = async () => {
      try {
        setIsStreaming(true)
        setDisplayedText('')

        const response = await fetch('/api/ai/stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            childId,
            utterance,
            parentOptIn,
          }),
        })

        if (!response.ok) {
          console.error('Stream failed:', response.statusText)
          setIsStreaming(false)
          return
        }

        const contentType = response.headers.get('content-type')
        
        // Check if response is SSE stream
        if (contentType?.includes('text/event-stream')) {
          const reader = response.body?.getReader()
          const decoder = new TextDecoder()

          if (!reader) return

          setIsVisible(true)
          let accumulatedText = ''

          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            const chunk = decoder.decode(value)
            const lines = chunk.split('\n')

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const data = JSON.parse(line.slice(6))
                  if (data.word) {
                    accumulatedText += (accumulatedText ? ' ' : '') + data.word
                    setDisplayedText(accumulatedText)
                  }
                } catch (e) {
                  console.error('Failed to parse SSE data:', e)
                }
              }
            }
          }

          // Keep visible for 2 seconds after complete
          await new Promise((resolve) => setTimeout(resolve, 2000))
          setIsVisible(false)
          setDisplayedText('')
        } else {
          // Silent mode or error
          const text = await response.text()
          if (text === 'silent') {
            // AI is staying silent - this is normal
            console.log('AI in silent observation mode')
          }
        }

        setIsStreaming(false)
        onComplete?.()
      } catch (error) {
        console.error('Voice narrator error:', error)
        setIsStreaming(false)
        setIsVisible(false)
      }
    }

    fetchStream()
  }, [utterance, sessionId, childId, parentOptIn, onComplete])

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50"
        >
          <div className="bg-warm-yellow rounded-3xl shadow-2xl px-8 py-6 max-w-2xl relative">
            {/* Speech bubble tail */}
            <div className="absolute -bottom-3 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-[15px] border-l-transparent border-r-[15px] border-r-transparent border-t-[15px] border-t-warm-yellow"></div>
            
            {/* Microphone icon */}
            <div className="absolute -top-4 -left-4 bg-warm-blue rounded-full p-3 shadow-lg">
              <svg
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
              </svg>
            </div>

            {/* Text content */}
            <p className="text-2xl font-bold text-primary-900 min-h-[2em]">
              {displayedText}
              {isStreaming && (
                <motion.span
                  animate={{ opacity: [1, 0.5, 1] }}
                  transition={{ repeat: Infinity, duration: 1 }}
                  className="ml-1"
                >
                  ●
                </motion.span>
              )}
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
