import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export default function SettingsPage() {
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
          <h1 className="text-3xl font-bold mb-8">Settings</h1>

          <div className="bg-gray-800 rounded-xl p-6 mb-8">
            <h2 className="text-xl font-bold mb-4">Voice Settings</h2>
            <p className="text-gray-300 mb-6">Customize the voice interaction settings for JARVIS.</p>

            <div className="space-y-4">
              <div>
                <label className="block text-gray-300 mb-2">Voice Type</label>
                <select className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white">
                  <option value="rachel">Rachel (Female)</option>
                  <option value="adam">Adam (Male)</option>
                  <option value="sam">Sam (Neutral)</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-300 mb-2">Speech Rate</label>
                <input
                  type="range"
                  min="0.5"
                  max="2"
                  step="0.1"
                  defaultValue="1"
                  className="w-full bg-gray-700 accent-primary"
                />
              </div>

              <div>
                <label className="block text-gray-300 mb-2">Voice Volume</label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  defaultValue="0.8"
                  className="w-full bg-gray-700 accent-primary"
                />
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-xl p-6 mb-8">
            <h2 className="text-xl font-bold mb-4">AI Model Settings</h2>
            <p className="text-gray-300 mb-6">Configure the AI model behavior for JARVIS.</p>

            <div className="space-y-4">
              <div>
                <label className="block text-gray-300 mb-2">AI Model</label>
                <select className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white">
                  <option value="llama3-70b">LLaMA 3 70B (Recommended)</option>
                  <option value="llama3-8b">LLaMA 3 8B (Faster)</option>
                  <option value="mixtral-8x7b">Mixtral 8x7B (Balanced)</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-300 mb-2">Temperature</label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  defaultValue="0.7"
                  className="w-full bg-gray-700 accent-primary"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>Precise</span>
                  <span>Creative</span>
                </div>
              </div>

              <div>
                <label className="block text-gray-300 mb-2">Response Length</label>
                <select className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white">
                  <option value="concise">Concise</option>
                  <option value="balanced" selected>
                    Balanced
                  </option>
                  <option value="detailed">Detailed</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button className="bg-primary hover:bg-primary/90 text-white font-bold py-3 px-6 rounded-full transition-colors">
              Save Settings
            </button>
          </div>
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
