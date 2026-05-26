'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { World } from '@/lib/types'

export function CreateWorldForm() {
  const [title, setTitle] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    setLoading(true); setError(null)

    const { data: { session } } = await createClient().auth.getSession()
    const token = session?.access_token ?? ''

    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/worlds`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ title: title.trim() }),
    })

    if (res.ok) {
      const world = await res.json() as World
      router.push(`/worlds/${world.id}`)
      router.refresh()
    } else {
      const err = await res.json().catch(() => ({})) as { message?: string }
      setError(err.message ?? 'Error al crear el mundo')
    }
    setLoading(false)
    setTitle('')
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-8 p-5 bg-white rounded-xl border border-gray-200 shadow-sm"
    >
      <h2 className="text-base font-semibold text-gray-700 mb-3">Crear nuevo mundo</h2>
      <div className="flex gap-3">
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Nombre del mundo…"
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          required
        />
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {loading ? '…' : 'Crear'}
        </button>
      </div>
      {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
    </form>
  )
}
