import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export default function HistoryPage() {
  return (
    <div className="flex flex-col min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 p-4">
        <div className="container mx-auto">
          <Link href="/" className="flex items-center text-gray-300 hover:text-white transition-colors">
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Home
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 py-8">
        <div className="container mx-auto px-4 max-w-4xl">
          <h1 className="text-3xl font-bold mb-8">Conversation History</h1>

          <div className="bg-gray-800 rounded-xl p-6 mb-8">
            <p className="text-gray-300">Your conversation history will appear here. This feature is coming soon.</p>
          </div>

          <Link
            href="/chat"
            className="bg-primary hover:bg-primary/90 text-white font-bold py-3 px-6 rounded-full transition-colors inline-block"
          >
            Start New Conversation
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-auto py-8 bg-gray-900 border-t border-gray-800">
        <div className="container mx-auto px-4 text-center text-gray-400">
          <p>© 2024 JARVIS AI Assistant. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
