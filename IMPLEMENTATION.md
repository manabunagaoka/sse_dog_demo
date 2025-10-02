# Implementation Overview

This document provides a technical overview of the AI-Powered Educational Platform implementation.

## Architecture Highlights

### 1. Covert Reasoning Engine (`lib/ai/reasoningEngine.ts`)

The reasoning engine analyzes child learning states WITHOUT exposing internal reasoning to the client:

```typescript
interface ChildState {
  vocabularyLevel: string
  recentUtterances: string[]
  hesitationCount: number
  engagementScore: number
  lastSpeechTimestamp: number
  detectedStruggles: string[]
}
```

**Key Functions:**
- `analyzeChildState()` - Internal analysis using OpenAI (server-side only)
- `generateNudge()` - Creates child-friendly prompts based on reasoning
- Never exposes analysis details to client or child

### 2. Safety Guardrails (`lib/ai/guardrails.ts`)

Multi-layer protection system:

**Layer 1: Pattern Matching**
- Fast regex-based blocking of unsafe patterns
- Blocks: internal reasoning mentions, negative framing, private info requests

**Layer 2: AI Review**
- Contextual safety check using OpenAI
- Age-appropriateness validation
- Positive tone verification

**Layer 3: Fallback Messages**
- Safe default messages if both layers fail
- Always positive and encouraging

### 3. SSE Streaming (`app/api/ai/stream/route.ts`)

Real-time streaming endpoint:

```typescript
POST /api/ai/stream
{
  sessionId: string
  childId: string
  utterance: string
  parentOptIn: boolean
}
```

**Response Modes:**
1. `silent` - AI stays quiet (child doing well)
2. SSE stream - Word-by-word response with natural pacing (200-300ms)

**Process:**
1. Check parent opt-in and child AI settings
2. Build child state from session history
3. Call reasoning engine to decide intervention
4. Apply safety guardrails to any output
5. Stream response or return 'silent'

### 4. Anticipatory Nudges (`lib/ai/scaffolding.ts`)

Intelligent intervention system:

**Detection Triggers:**
- Prolonged silence (8+ seconds)
- Hesitation patterns ("um", "uh")
- Minimal responses (<3 words)
- Repetitive language

**Intervention Rules:**
- Only speak at 60%+ confidence
- Natural delay: 2-10 seconds based on emotional state
- Gentle, curious prompts
- No mention of struggles

### 5. Voice Narrator Component (`components/learning/VoiceNarrator.tsx`)

React component with Framer Motion animations:

**Features:**
- Appears only when AI speaks
- Word-by-word display with progressive text accumulation
- Animated entry/exit
- Microphone icon indicator
- Speech bubble design

**Props:**
```typescript
{
  sessionId: string
  childId: string
  utterance: string | null
  parentOptIn: boolean
  onComplete?: () => void
}
```

### 6. Database Schema

**Parent**
- Credentials and authentication
- One-to-many with Children

**Child**
- Profile: name, age, vocabularyLevel
- `aiVoiceEnabled` flag (parent control)
- One-to-many with Sessions

**Session**
- Learning session instance
- Status: active | completed
- Stores AI-generated summary (JSON)

**Utterance**
- Individual message (child or AI)
- Metadata: timing, tone, hesitation markers

## API Routes

### Authentication
- `POST /api/auth/signin` - NextAuth.js credentials login
- `GET /api/auth/signout` - Logout

### Sessions
- `POST /api/sessions` - Create new session
- `GET /api/sessions` - List sessions for authenticated parent
- `GET /api/sessions/[sessionId]` - Get session details
- `POST /api/sessions/[sessionId]/end` - End session and generate summary

### AI Streaming
- `POST /api/ai/stream` - SSE endpoint for real-time AI responses
- `GET /api/ai/stream?childId=x` - Check if AI enabled

## Key Design Decisions

### 1. Server-Side Reasoning
All AI analysis happens on the server. Client never sees:
- Internal reasoning
- Confidence scores
- Vocabulary gap analysis
- Emotional state assessments

### 2. Opt-In by Default
Parents must explicitly enable AI voice guidance:
```typescript
child.aiVoiceEnabled = true // Parent dashboard toggle
```

### 3. Silent Observation Mode
AI doesn't always respond. Returns 'silent' when:
- Child is engaged and progressing
- No intervention needed
- Confidence threshold not met

### 4. Safety-First Approach
Multiple safety layers ensure:
- No harmful content reaches children
- Positive, encouraging tone
- Age-appropriate language
- No exposure of internal processes

### 5. Parent Transparency
All AI interactions are:
- Recorded in database
- Visible in session transcripts
- Summarized after sessions
- Fully controlled by parents

## Environment Configuration

Required environment variables:

```env
# AI
OPENAI_API_KEY=sk-proj-...
OPENAI_MODEL=gpt-4

# Auth
NEXTAUTH_SECRET=random-string
NEXTAUTH_URL=http://localhost:3000

# Database
DATABASE_URL=file:./dev.db
```

## Testing Flow

1. **Setup:**
   ```bash
   npm install
   npx prisma generate
   npx prisma db push
   npm run prisma:seed
   ```

2. **Run:**
   ```bash
   npm run dev
   ```

3. **Test:**
   - Login: parent@example.com / password123
   - Navigate to child profile
   - Start new session
   - Type messages
   - Observe AI responses (yellow bubble)
   - End session for summary

## Future Enhancements

Potential improvements:
- Real speech-to-text integration
- Multiple learning scenarios
- Character animations (Canvas/WebGL)
- Long-term progress tracking
- Multi-language support
- Advanced analytics dashboard

## Security Considerations

**Data Protection:**
- Passwords hashed with bcrypt
- JWT-based sessions
- Database credentials in .env (not committed)
- No PII sent to OpenAI

**Child Safety:**
- Content filtering before display
- No external links
- Parent oversight required
- Age-appropriate interactions

**API Security:**
- Authentication required for all learning routes
- Session validation
- Rate limiting (recommended for production)

## Performance Notes

**Optimizations:**
- Prisma connection pooling
- SSE for efficient streaming
- Client-side state management
- Minimal re-renders with React hooks

**Scalability:**
- SQLite for dev (PostgreSQL-ready)
- Stateless API design
- CDN-ready static assets

---

Built with ❤️ for child learning and safety.
