'use client'

import {
  Bar,
  BarChart,
  CartesianGrid,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { ChartRow } from '@/lib/types'

interface Props {
  kind: 'radar' | 'bar'
  rows: ChartRow[]
}

interface ChartDatum {
  attribute: string
  value: number
}

export function ChartCanvas({ kind, rows }: Props) {
  const data: ChartDatum[] = rows.map(r => ({ attribute: r.attribute, value: r.value }))

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        {kind === 'radar' ? (
          <RadarChart data={data} margin={{ top: 8, right: 24, bottom: 8, left: 24 }}>
            <PolarGrid />
            <PolarAngleAxis dataKey="attribute" />
            <PolarRadiusAxis />
            <Tooltip />
            <Radar
              name="Atributos"
              dataKey="value"
              stroke="#2563eb"
              fill="#3b82f6"
              fillOpacity={0.4}
            />
          </RadarChart>
        ) : (
          <BarChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="attribute" stroke="#6b7280" fontSize={12} />
            <YAxis stroke="#6b7280" fontSize={12} />
            <Tooltip />
            <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  )
}
