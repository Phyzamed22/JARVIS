export function TypingIndicator() {
  return (
    <div className="flex items-center space-x-2 p-4 max-w-[80%]">
      <div className="flex space-x-1">
        <div className="h-2 w-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "0ms" }}></div>
        <div className="h-2 w-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "150ms" }}></div>
        <div className="h-2 w-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "300ms" }}></div>
      </div>
      <div className="text-sm text-gray-400">JARVIS is typing...</div>
    </div>
  )
}
