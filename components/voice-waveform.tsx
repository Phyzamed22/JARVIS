interface VoiceWaveformProps {
  volume: number // 0-1 normalized volume
}

export function VoiceWaveform({ volume }: VoiceWaveformProps) {
  // Generate bars based on volume
  const bars = 20
  const activeBarCount = Math.max(1, Math.floor(volume * bars))

  return (
    <div className="flex items-center justify-center h-8 gap-1">
      {Array.from({ length: bars }).map((_, i) => {
        const isActive = i < activeBarCount
        const height = isActive ? Math.min(100, 30 + (i / activeBarCount) * 70) : 30

        return (
          <div
            key={i}
            className={`w-1 rounded-full transition-all duration-100 ${isActive ? "bg-primary" : "bg-gray-600"}`}
            style={{ height: `${height}%` }}
          />
        )
      })}
    </div>
  )
}
