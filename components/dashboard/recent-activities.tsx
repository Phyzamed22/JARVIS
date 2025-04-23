export function RecentActivities() {
  // Sample activities
  const activities = [
    { id: 1, type: "search", content: "Searched for quantum computing research papers", time: "10 minutes ago" },
    { id: 2, type: "task", content: "Completed analysis of market trends", time: "25 minutes ago" },
    { id: 3, type: "email", content: "Sent email to team about project status", time: "1 hour ago" },
    { id: 4, type: "calendar", content: "Added meeting with Dr. Banner to calendar", time: "2 hours ago" },
    { id: 5, type: "system", content: "System update completed successfully", time: "3 hours ago" },
  ]

  return (
    <div className="glass-card p-6 h-full overflow-hidden flex flex-col">
      <h2 className="text-xl font-semibold mb-4 text-primary">Recent Activities</h2>

      <div className="flex-1 overflow-y-auto pr-2">
        <div className="space-y-4">
          {activities.map((activity) => (
            <div key={activity.id} className="glass-card p-3 border-l-4 border-primary">
              <p className="text-gray-200">{activity.content}</p>
              <p className="text-xs text-gray-400 mt-1">{activity.time}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
