import Link from 'next/link'

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-gradient-to-b from-warm-blue to-warm-green">
      <div className="max-w-2xl w-full text-center space-y-8">
        <h1 className="text-5xl font-bold text-white mb-4">
          🌟 Welcome to Learning Adventures! 🌟
        </h1>
        <p className="text-xl text-white/90 mb-8">
          A safe, fun place for children to learn with AI voice guidance
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link
            href="/login"
            className="bg-white text-primary-700 px-8 py-4 rounded-full font-bold text-xl shadow-lg hover:shadow-xl transition-all hover:scale-105"
          >
            Parent Login
          </Link>
          
          <Link
            href="/parent-dashboard"
            className="bg-warm-yellow text-primary-900 px-8 py-4 rounded-full font-bold text-xl shadow-lg hover:shadow-xl transition-all hover:scale-105"
          >
            View Dashboard
          </Link>
        </div>
        
        <div className="mt-12 bg-white/10 backdrop-blur-sm rounded-2xl p-6 text-white">
          <h2 className="text-2xl font-bold mb-4">✨ Features</h2>
          <ul className="text-left space-y-2 text-lg">
            <li>🎙️ Gentle AI voice guidance that respects your child&apos;s pace</li>
            <li>🛡️ Built-in safety guardrails for child protection</li>
            <li>👨‍👩‍👧 Parent dashboard with full control</li>
            <li>📊 Session summaries showing learning progress</li>
            <li>🎨 Warm, child-friendly design</li>
          </ul>
        </div>
      </div>
    </main>
  )
}
