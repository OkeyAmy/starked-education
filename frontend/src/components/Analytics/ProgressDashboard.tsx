import React, {useEffect, useState} from 'react'
import SkillRadar from './SkillRadar'
import StreakTracker from './StreakTracker'
import GoalSetter from './GoalSetter'
import { ProgressDashboardSkeleton } from './AnalyticsSkeleton'
// This component provides a comprehensive dashboard for users to track their learning progress, skill proficiency, and streaks. It fetches data from the backend and visualizes it in an engaging way.
type ProgressData = {
  overallCompletion: number
  timeThisWeekMinutes: number
  currentStreak: number
  activeGoals: Array<{id:string,title:string,progress:number,target:number}>
  skills: Array<{name:string,level:number}>
  streakActivity: Record<string, number>
}

const ProgressDashboard: React.FC = () => {
  const [data, setData] = useState<ProgressData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    fetch('/api/analytics/progress')
      .then(res => res.json())
      .then(json => {
        if (!mounted) return
        setData(json)
      })
      .catch(() => {
        if (!mounted) return
        setData({
          overallCompletion: 0,
          timeThisWeekMinutes: 0,
          currentStreak: 0,
          activeGoals: [],
          skills: [],
          streakActivity: {}
        })
      })
      .finally(() => setLoading(false))
    return () => { mounted = false }
  }, [])

  if (loading) return <ProgressDashboardSkeleton />

  if (!data) return <div className="p-6">Unable to load analytics.</div>

  const hours = Math.round((data.timeThisWeekMinutes || 0) / 60)

  return (
    <div className="space-y-6 p-6">
      <header className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Learning Analytics</h2>
        <div className="text-sm text-gray-600">Updated just now</div>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow-sm">
          <div className="text-sm text-gray-500">Overall Completion</div>
          <div className="mt-2 flex items-center justify-between">
            <div className="text-3xl font-bold">{Math.round(data.overallCompletion)}%</div>
            <div className="w-2/5">
              <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-500"
                  style={{width: `${Math.min(100, Math.max(0, data.overallCompletion))}%`}}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow-sm">
          <div className="text-sm text-gray-500">Time Spent This Week</div>
          <div className="mt-2">
            <div className="text-2xl font-semibold">{hours}h</div>
            <div className="text-sm text-gray-500">{data.timeThisWeekMinutes} minutes</div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow-sm">
          <div className="text-sm text-gray-500">Current Streak</div>
          <div className="mt-2 text-2xl font-semibold">{data.currentStreak} days</div>
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="col-span-1 lg:col-span-2 bg-white dark:bg-slate-800 rounded-lg p-4 shadow-sm">
          <h3 className="font-medium mb-3">Skill Proficiency</h3>
          <div style={{height: 300}}>
            <SkillRadar skills={data.skills} />
          </div>
        </div>

        <div className="col-span-1 bg-white dark:bg-slate-800 rounded-lg p-4 shadow-sm">
          <h3 className="font-medium mb-3">Streaks</h3>
          <StreakTracker activity={data.streakActivity} />
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow-sm">
          <h3 className="font-medium mb-3">Active Goals</h3>
          {data.activeGoals.length === 0 ? (
            <div className="text-sm text-gray-500">No active goals. Try creating one.</div>
          ) : (
            <ul className="space-y-3">
              {data.activeGoals.map(g => (
                <li key={g.id} className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{g.title}</div>
                    <div className="text-sm text-gray-500">{Math.round(g.progress)} / {g.target}</div>
                  </div>
                  <div className="w-1/3">
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500" style={{width:`${Math.min(100, (g.progress/g.target)*100)}%`}} />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow-sm">
          <h3 className="font-medium mb-3">Create Goal</h3>
          <GoalSetter onCreate={() => { /* optimistic refresh could be triggered */ }} />
        </div>
      </section>
    </div>
  )
}

export default ProgressDashboard
