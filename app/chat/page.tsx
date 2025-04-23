import { ChatInterface } from "@/components/chat-interface"

export default function ChatPage() {
  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 p-4">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-blue-400">
            JARVIS
          </h1>
          <nav>
            <ul className="flex space-x-4">
              <li>
                <a href="/" className="text-gray-300 hover:text-white transition-colors">
                  Home
                </a>
              </li>
              <li>
                <a href="/history" className="text-gray-300 hover:text-white transition-colors">
                  History
                </a>
              </li>
              <li>
                <a href="/settings" className="text-gray-300 hover:text-white transition-colors">
                  Settings
                </a>
              </li>
            </ul>
          </nav>
        </div>
      </header>

      {/* Main Chat Interface */}
      <main className="flex-1 overflow-hidden">
        <div className="container mx-auto h-full max-w-4xl">
          <ChatInterface />
        </div>
      </main>
    </div>
  )
}
