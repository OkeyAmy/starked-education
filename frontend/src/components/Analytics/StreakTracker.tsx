import React from 'react'

type Props = {
  activity: Record<string, number>
}

// Simple 90-day heatmap calendar
const StreakTracker: React.FC<Props> = ({activity}) => {
  const days = 90
  const today = new Date()
  const arr = Array.from({length: days}).map((_, i) => {
    const d = new Date()
    d.setDate(today.getDate() - (days - 1 - i))
    const key = d.toISOString().slice(0,10)
    return {date: key, count: activity[key] || 0}
  })

  const max = Math.max(1, ...arr.map(a => a.count))

  const colorFor = (count:number) => {
    if (count <= 0) return 'bg-gray-200'
    const pct = count / max
    if (pct > 0.75) return 'bg-emerald-600'
    if (pct > 0.4) return 'bg-emerald-400'
    return 'bg-emerald-200'
  }

  return (
    <div className="w-full">
      <div className="grid grid-cols-15 gap-1">
        {arr.map(a => (
          <div key={a.date} title={`${a.date}: ${a.count}`} className={`w-5 h-5 rounded ${colorFor(a.count)}`} />
        ))}
      </div>
      <div className="text-xs text-gray-500 mt-2">Last 90 days</div>
    </div>
  )
}

export default StreakTracker
