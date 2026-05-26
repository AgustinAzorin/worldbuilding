'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import type { ArticleRef } from '@/lib/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), { ssr: false }) as any

interface Props {
  worldId: string
  centerId: string
  centerTitle: string
  outgoing: ArticleRef[]
  incoming: ArticleRef[]
}

interface MiniNode {
  id: string
  title: string
  isCenter: boolean
}

interface MiniLink {
  source: string
  target: string
}

/**
 * Mini grafo localizado: muestra únicamente el artículo central y sus vecinos
 * directos (entrantes / salientes). Click en un vecino navega a su página.
 */
export function RelationsMiniGraph({
  worldId,
  centerId,
  centerTitle,
  outgoing,
  incoming,
}: Props) {
  const router = useRouter()
  const containerRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ width: 320, height: 240 })

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const obs = new ResizeObserver(entries => {
      const { width } = entries[0].contentRect
      setSize({ width, height: 240 })
    })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  const data = useMemo(() => {
    const nodeMap = new Map<string, MiniNode>()
    nodeMap.set(centerId, { id: centerId, title: centerTitle, isCenter: true })
    outgoing.forEach(o => nodeMap.set(o.id, { id: o.id, title: o.title, isCenter: false }))
    incoming.forEach(i => nodeMap.set(i.id, { id: i.id, title: i.title, isCenter: false }))

    const links: MiniLink[] = [
      ...outgoing.map(o => ({ source: centerId, target: o.id })),
      ...incoming.map(i => ({ source: i.id, target: centerId })),
    ]

    return { nodes: [...nodeMap.values()], links }
  }, [centerId, centerTitle, outgoing, incoming])

  const handleClick = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (node: any) => {
      const id = node?.id as string | undefined
      if (id && id !== centerId) router.push(`/worlds/${worldId}/articles/${id}`)
    },
    [centerId, router, worldId],
  )

  const nodeCanvasObject = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const x = node.x as number
      const y = node.y as number
      const r = node.isCenter ? 8 : 5
      ctx.beginPath()
      ctx.arc(x, y, r, 0, 2 * Math.PI)
      ctx.fillStyle = node.isCenter ? '#dc2626' : '#3b82f6'
      ctx.fill()

      const label = (node.title as string) || ''
      const fontSize = Math.max(8, 11 / globalScale)
      ctx.font = `${fontSize}px Sans-Serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'
      const w = ctx.measureText(label).width
      ctx.fillStyle = 'rgba(0,0,0,0.65)'
      ctx.fillRect(x - w / 2 - 2, y + r + 2, w + 4, fontSize + 2)
      ctx.fillStyle = '#fff'
      ctx.fillText(label, x, y + r + 3)
    },
    [],
  )

  return (
    <div
      ref={containerRef}
      className="h-60 w-full rounded-md bg-gray-950 overflow-hidden"
    >
      <ForceGraph2D
        graphData={data}
        width={size.width}
        height={size.height}
        nodeCanvasObject={nodeCanvasObject}
        nodeCanvasObjectMode={() => 'replace'}
        onNodeClick={handleClick}
        linkColor={() => 'rgba(148,163,184,0.5)'}
        linkDirectionalArrowLength={4}
        linkDirectionalArrowRelPos={1}
        backgroundColor="#030712"
        cooldownTicks={80}
      />
    </div>
  )
}
