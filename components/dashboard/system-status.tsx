"use client"

import { useEffect, useState } from "react"
import { Activity, Cpu, HardDrive, Thermometer } from "lucide-react"

export function SystemStatus() {
  // Simulated system metrics
  const [metrics, setMetrics] = useState({
    cpu: 0,
    memory: 0,
    temperature: 0,
    storage: 0,
  })

  useEffect(() => {
    // Simulate changing metrics
    const interval = setInterval(() => {
      setMetrics({
        cpu: Math.floor(Math.random() * 100),
        memory: Math.floor(Math.random() * 100),
        temperature: Math.floor(Math.random() * 40) + 40, // 40-80°C
        storage: Math.floor(Math.random() * 30) + 70, // 70-100%
      })
    }, 3000)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="glass-card p-6 h-full">
      <h2 className="text-xl font-semibold mb-4 text-primary">System Status</h2>

      <div className="space-y-6">
        <StatusItem
          icon={<Cpu className="h-5 w-5 text-primary" />}
          label="CPU Usage"
          value={`${metrics.cpu}%`}
          percentage={metrics.cpu}
        />

        <StatusItem
          icon={<Activity className="h-5 w-5 text-primary" />}
          label="Memory"
          value={`${metrics.memory}%`}
          percentage={metrics.memory}
        />

        <StatusItem
          icon={<Thermometer className="h-5 w-5 text-primary" />}
          label="Temperature"
          value={`${metrics.temperature}°C`}
          percentage={(metrics.temperature - 40) * 2.5} // Scale to 0-100%
          colorClass={metrics.temperature > 70 ? "from-yellow-400 to-red-500" : "from-green-400 to-primary"}
        />

        <StatusItem
          icon={<HardDrive className="h-5 w-5 text-primary" />}
          label="Storage"
          value={`${metrics.storage}%`}
          percentage={metrics.storage}
          colorClass={metrics.storage > 90 ? "from-yellow-400 to-red-500" : "from-green-400 to-primary"}
        />
      </div>
    </div>
  )
}

function StatusItem({ icon, label, value, percentage, colorClass = "from-primary to-secondary" }) {
  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center">
          {icon}
          <span className="ml-2 text-gray-300">{label}</span>
        </div>
        <span className="text-gray-300">{value}</span>
      </div>

      <div className="h-2 bg-background/50 rounded-full overflow-hidden">
        <div
          className={`h-full bg-gradient-to-r ${colorClass} transition-all duration-700 ease-in-out`}
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    </div>
  )
}
