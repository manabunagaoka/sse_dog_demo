# AI-Powered Educational Platform 🌟

A Next.js 14 application providing Sesame Street-style learning sessions for children with AI voice guidance, built with safety and pedagogy as top priorities.

## 🎯 Overview

This platform provides an interactive learning environment for children (ages 5-10) with:
- **Covert AI reasoning** that analyzes child engagement without exposing internal analysis
- **Real-time SSE streaming** for natural, word-by-word AI voice responses
- **Safety guardrails** that filter all AI outputs for child protection
- **Parent dashboard** with full control over AI features
- **Session summaries** highlighting learning progress

## 🏗️ Architecture

### Core Components

1. **Reasoning Engine** (`lib/ai/reasoningEngine.ts`)
   - Analyzes child's vocabulary, hesitation patterns, emotional state
   - Plans scaffolding interventions (server-side only, never exposed)
   - Generates gentle pedagogical nudges

2. **Safety Guardrails** (`lib/ai/guardrails.ts`)
   - Pattern-based blocking of unsafe content
   - AI-powered contextual safety review
   - Positive framing conversion

3. **SSE Streaming** (`app/api/ai/stream/route.ts`)
   - Streams AI responses word-by-word (200-300ms pacing)
   - Respects parent opt-in settings
   - Returns 'silent' mode when no intervention needed

4. **Voice Narrator** (`components/learning/VoiceNarrator.tsx`)
   - Animated speech bubble with word-by-word display
   - Only appears when AI speaks
   - Smooth Framer Motion animations

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm
- OpenAI API key

### Installation

1. **Clone and install dependencies:**
```bash
git clone <repository-url>
cd sse_dog_demo
npm install
```

2. **Set up environment variables:**
```bash
cp .env.example .env
```

Edit `.env` and add your OpenAI API key:
```env
OPENAI_API_KEY="your-api-key-here"
OPENAI_MODEL="gpt-4"
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"
NEXTAUTH_URL="http://localhost:3000"
DATABASE_URL="file:./dev.db"
```

3. **Initialize database:**
```bash
npx prisma generate
npx prisma db push
npm run prisma:seed
```

4. **Run development server:**
```bash
npm run dev
```

5. **Open application:**
Navigate to [http://localhost:3000](http://localhost:3000)

### Demo Credentials

```
Email: parent@example.com
Password: password123
```

## 📁 Project Structure

```
sse_dog_demo/
├── app/
│   ├── api/
│   │   ├── ai/stream/          # SSE endpoint for AI responses
│   │   ├── auth/               # NextAuth.js routes
│   │   └── sessions/           # Session management APIs
│   ├── login/                  # Parent login page
│   ├── parent-dashboard/       # Parent control panel
│   ├── session/[sessionId]/    # Learning session interface
│   ├── summary/[sessionId]/    # Post-session summary
│   └── layout.tsx              # Root layout
├── components/
│   └── learning/
│       └── VoiceNarrator.tsx   # AI voice bubble component
├── lib/
│   ├── ai/
│   │   ├── reasoningEngine.ts  # Covert reasoning system
│   │   ├── guardrails.ts       # Safety filters
│   │   └── scaffolding.ts      # Anticipatory nudges
│   ├── auth.ts                 # NextAuth configuration
│   └── prisma.ts               # Database client
├── prisma/
│   ├── schema.prisma           # Database schema
│   └── seed.js                 # Seed data script
└── middleware.ts               # Auth protection
```

## 🔐 Security & Privacy

### Safety Measures
- **Multi-layer content filtering**: Pattern matching + AI review
- **No internal reasoning exposure**: Analysis stays server-side
- **Positive framing**: Converts negative patterns to encouraging language
- **Parent control**: Full opt-in/opt-out for AI features

### Privacy Protections
- **No personal info requests**: Blocked patterns prevent data collection
- **Parent oversight**: All sessions recorded for review
- **Local database**: SQLite for development (PostgreSQL-ready)

## 🎨 Key Features

### 1. Covert Reasoning Engine
Analyzes child state without exposing analysis:
- Vocabulary tracking
- Hesitation pattern detection
- Engagement scoring
- Emotional state assessment

### 2. Anticipatory Nudges
AI speaks only when pedagogically valuable:
- 8+ second silence detection
- Confusion/frustration signals
- High-confidence interventions (60%+ threshold)
- Natural timing delays (2-10 seconds)

### 3. Session Summaries
AI-generated reflective summaries:
- "What We Talked About"
- "Words You Used Well"
- "Great Thinking!" moments
- "Something to Think About" questions

### 4. Parent Dashboard
Full control and visibility:
- AI voice toggle per child
- Session history and summaries
- Privacy controls
- Child profile management

## 🛠️ Technology Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Animation**: Framer Motion
- **Auth**: NextAuth.js v5
- **Database**: Prisma + SQLite (PostgreSQL-ready)
- **AI**: OpenAI GPT-4
- **Streaming**: Server-Sent Events (SSE)

## 📊 Database Schema

```prisma
Parent
  - id, email, password, name
  - children[]

Child
  - id, name, age, vocabularyLevel
  - aiVoiceEnabled (boolean)
  - parent, sessions[]

Session
  - id, scenario, status, summary
  - startedAt, endedAt
  - child, utterances[]

Utterance
  - id, speaker, text, metadata
  - timestamp, session
```

## 🧪 Development

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run linter
npm run prisma:generate  # Generate Prisma client
npm run prisma:push      # Push schema to database
npm run prisma:seed      # Seed database with demo data
```

### Testing the AI Flow

1. Log in with demo credentials
2. Navigate to a child's profile
3. Start a new session
4. Type messages in the text area
5. Watch for AI voice responses (yellow speech bubble)
6. End session to see AI-generated summary

## 🌐 Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import to Vercel
3. Add environment variables
4. Update `DATABASE_URL` to PostgreSQL
5. Run migrations: `npx prisma migrate deploy`

### Environment Variables for Production

```env
OPENAI_API_KEY=<your-key>
OPENAI_MODEL=gpt-4
NEXTAUTH_SECRET=<generate-new>
NEXTAUTH_URL=https://yourdomain.com
DATABASE_URL=<postgresql-url>
NODE_ENV=production
```

## 🎓 Pedagogical Approach

### Design Principles
1. **Child-centered**: Respects pace and interests
2. **Warm & encouraging**: Positive reinforcement
3. **Non-judgmental**: No mention of "struggling"
4. **Scaffolded**: Timely, gentle interventions
5. **Transparent**: Parents see everything

### AI Prompting Strategy
- **Analysis prompts**: Internal reasoning only
- **Nudge generation**: Warm, curious, open-ended
- **Safety review**: Strict child protection
- **Summary creation**: Growth-focused, encouraging

## 🔄 Future Enhancements

- [ ] Real speech-to-text integration
- [ ] Multiple scenario types
- [ ] Character illustrations/animations
- [ ] Progress tracking over time
- [ ] Multi-language support
- [ ] Parent analytics dashboard

## 📝 License

MIT License - See LICENSE file for details

## 🙏 Acknowledgments

Built with inspiration from:
- Sesame Street's pedagogical approach
- Research on scaffolded learning
- Child safety best practices

---

**Note**: This is an educational platform. Always supervise children during learning sessions and review all AI interactions.
