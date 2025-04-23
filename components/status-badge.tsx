interface StatusBadgeProps {
  status: "idle" | "listening" | "thinking" | "speaking"
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const getStatusInfo = () => {
    switch (status) {
      case "listening":
        return { text: "Listening", className: "bg-yellow-500/20 text-yellow-500" }
      case "thinking":
        return { text: "Thinking", className: "bg-blue-500/20 text-blue-500" }
      case "speaking":
        return { text: "Speaking", className: "bg-green-500/20 text-green-500" }
      case "idle":
      default:
        return { text: "Ready", className: "bg-gray-500/20 text-gray-400" }
    }
  }

  const { text, className } = getStatusInfo()

  return <span className={`text-xs px-2 py-0.5 rounded-full ${className}`}>{text}</span>
}
