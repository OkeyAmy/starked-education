import React from 'react';
import { motion } from 'framer-motion';
import { BarChart2, TrendingUp, Users, Target, BookOpen, AlertCircle } from 'lucide-react';

interface QuizAnalyticsProps {
  data: {
    quizId: string;
    totalSubmissions: number;
    averageScore: number;
    passRate: number;
    questionDifficulty: Array<{
      questionId: string;
      text: string;
      correctRate: number;
    }>;
    scoreDistribution: Array<{
      range: string;
      count: number;
    }>;
    learningOutcomes: Array<{
      outcome: string;
      score: number;
    }>;
  };
}

const QuizAnalytics: React.FC<QuizAnalyticsProps> = ({ data }) => {
  const maxScoreCount = Math.max(...data.scoreDistribution.map(d => d.count));

  return (
    <div className="space-y-8 p-1">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Submissions', value: data.totalSubmissions, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
          { label: 'Avg. Score', value: `${Math.round(data.averageScore)}%`, icon: Target, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
          { label: 'Pass Rate', value: `${data.passRate}%`, icon: TrendingUp, color: 'text-violet-600', bg: 'bg-violet-50 dark:bg-violet-900/20' },
          { label: 'Questions', value: data.questionDifficulty.length, icon: BookOpen, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20' }
        ].map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className={`${stat.bg} p-6 rounded-2xl border border-white/10 shadow-sm`}
          >
            <div className={`p-2 w-10 h-10 rounded-lg ${stat.color} bg-white/50 dark:bg-black/20 mb-4 flex items-center justify-center`}>
              <stat.icon size={20} />
            </div>
            <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">{stat.value}</div>
            <div className="text-sm font-medium text-gray-500 dark:text-gray-400">{stat.label}</div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Score Distribution Chart */}
        <div className="bg-white dark:bg-gray-900 p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <BarChart2 className="text-blue-500" size={18} />
              Score Distribution
            </h3>
          </div>
          <div className="h-64 flex items-end justify-between gap-4">
            {data.scoreDistribution.map((item, i) => (
              <div key={i} className="flex-1 flex flex-col items-center group">
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${(item.count / maxScoreCount) * 100}%` }}
                  transition={{ type: 'spring', damping: 15, stiffness: 100, delay: i * 0.05 }}
                  className="w-full bg-blue-100 dark:bg-blue-900/40 rounded-t-lg relative group-hover:bg-blue-500 transition-colors"
                >
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-xs px-2 py-1 rounded">
                    {item.count}
                  </div>
                </motion.div>
                <div className="mt-4 text-[10px] sm:text-xs font-medium text-gray-500 rotate-45 sm:rotate-0 origin-center truncate w-full text-center">
                  {item.range}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Question Difficulty analysis */}
        <div className="bg-white dark:bg-gray-900 p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <AlertCircle className="text-amber-500" size={18} />
              Question Performance
            </h3>
          </div>
          <div className="space-y-6 overflow-y-auto max-h-64 pr-2 custom-scrollbar">
            {data.questionDifficulty.map((q, i) => (
              <div key={i} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-700 dark:text-gray-300 font-medium truncate pr-4">{q.text}</span>
                  <span className={`font-bold ${q.correctRate < 0.6 ? 'text-red-500' : 'text-emerald-500'}`}>
                    {Math.round(q.correctRate * 100)}% Match
                  </span>
                </div>
                <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${q.correctRate * 100}%` }}
                    className={`h-full rounded-full ${q.correctRate < 0.6 ? 'bg-red-500' : 'bg-emerald-500'}`}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Learning Outcomes */}
      <div className="bg-white dark:bg-gray-900 p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-8">Learning Outcomes Alignment</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {data.learningOutcomes.map((outcome, i) => (
            <div key={i} className="flex flex-col items-center text-center">
              <div className="relative w-32 h-32 mb-4">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="64"
                    cy="64"
                    r="58"
                    stroke="currentColor"
                    strokeWidth="12"
                    fill="transparent"
                    className="text-gray-100 dark:text-gray-800"
                  />
                  <motion.circle
                    cx="64"
                    cy="64"
                    r="58"
                    stroke="currentColor"
                    strokeWidth="12"
                    fill="transparent"
                    strokeDasharray={364}
                    initial={{ strokeDashoffset: 364 }}
                    animate={{ strokeDashoffset: 364 - (364 * outcome.score) / 100 }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                    className="text-indigo-600"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center text-2xl font-bold dark:text-white">
                  {outcome.score}%
                </div>
              </div>
              <div className="font-semibold text-gray-900 dark:text-white mb-1">{outcome.outcome}</div>
              <div className="text-xs text-gray-500">Core Objective</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default QuizAnalytics;
