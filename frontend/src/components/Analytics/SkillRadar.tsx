import React from 'react'
import {ResponsiveContainer, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis} from 'recharts'

type Skill = {name: string, level: number}

// This component visualizes the user's skill proficiency across different areas using a radar chart. It receives an array of skills with their corresponding levels and renders an intuitive graphical representation of the user's strengths and areas for improvement.
const SkillRadar: React.FC<{skills: Skill[]}> = ({skills}) => {
  const data = skills.length ? skills.map(s => ({subject: s.name, A: s.level, fullMark: 100})) : [
    {subject: 'No data', A: 0, fullMark: 100}
  ]

  return (
    <ResponsiveContainer width="100%" height="100%">
      <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
        <PolarGrid />
        <PolarAngleAxis dataKey="subject" />
        <PolarRadiusAxis angle={30} domain={[0,100]} />
        <Radar name="Proficiency" dataKey="A" stroke="#6366F1" fill="#6366F1" fillOpacity={0.6} />
      </RadarChart>
    </ResponsiveContainer>
  )
}

export default SkillRadar
