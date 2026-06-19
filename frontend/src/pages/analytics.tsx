import React from 'react'
import ProgressDashboard from '../components/analytics/ProgressDashboard'

const AnalyticsPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <main className="max-w-6xl mx-auto py-8">
        <ProgressDashboard />
      </main>
    </div>
  )
}

export default AnalyticsPage
