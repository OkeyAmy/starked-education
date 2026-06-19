import React, {useState} from 'react'

type Props = {
  onCreate?: () => void
}

const GoalSetter: React.FC<Props> = ({onCreate}) => {
  const [title, setTitle] = useState('')
  const [type, setType] = useState<'time'|'completion'>('completion')
  const [target, setTarget] = useState<number>(3)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)
    try {
      const res = await fetch('/api/analytics/goals', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({title, type, target})
      })
      if (!res.ok) throw new Error('Failed')
      setTitle('')
      setTarget(type === 'time' ? 60 : 3)
      setMessage('Goal created')
      onCreate && onCreate()
    } catch (err) {
      setMessage('Failed to create goal')
    } finally { setLoading(false) }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div>
        <label className="block text-sm text-gray-600">Title</label>
        <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Complete 3 courses this month" className="mt-1 w-full border rounded px-2 py-1" />
      </div>
      <div>
        <label className="block text-sm text-gray-600">Type</label>
        <select value={type} onChange={e=>setType(e.target.value as any)} className="mt-1 w-full border rounded px-2 py-1">
          <option value="completion">Completion-based</option>
          <option value="time">Time-based (minutes)</option>
        </select>
      </div>
      <div>
        <label className="block text-sm text-gray-600">Target</label>
        <input type="number" value={target} onChange={e=>setTarget(Number(e.target.value))} className="mt-1 w-full border rounded px-2 py-1" />
      </div>
      <div className="flex items-center space-x-2">
        <button disabled={loading} className="px-3 py-1 bg-indigo-600 text-white rounded">{loading? 'Creating...' : 'Create'}</button>
        {message && <div className="text-sm text-gray-600">{message}</div>}
      </div>
    </form>
  )
}

export default GoalSetter
