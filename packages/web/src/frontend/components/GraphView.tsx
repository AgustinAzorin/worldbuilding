'use client'

import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import type { GraphData, GraphNode } from '@/lib/types'

// react-force-graph-2d requires a browser canvas → no SSR.
// We cast to `any` because `dynamic()` strips the generic ForceGraph2D props and
// the library's NodeObject uses `[key: string]: any`, making type-safe callbacks
// more trouble than they're worth.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), { ssr: false }) as any

// ── Runtime-enriched node (simulation adds x/y/vx/vy at runtime) ─────────
interface SimNode extends GraphNode {
  val?: number
  x?: number
  y?: number
  // allow force-graph to attach any extra fields
  [key: string]: unknown
}

// ── Degree centrality ────────────────────────────────────────────────────

function computeDegrees(data: GraphData): Map<string, number> {
  const map = new Map<string, number>()
  data.nodes.forEach(n => map.set(n.id, 0))
  data.links.forEach(l => {
    map.set(l.source, (map.get(l.source) ?? 0) + 1)
    map.set(l.target, (map.get(l.target) ?? 0) + 1)
  })
  return map
}

// ── Component ─────────────────────────────────────────────────────────────

interface GraphViewProps {
  worldId: string
  data: GraphData
}

export function GraphView({ worldId, data }: GraphViewProps) {
  const router = useRouter()
  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 })
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  // Fill parent container
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const obs = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect
      setDimensions({ width, height })
    })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  const degrees = useMemo(() => computeDegrees(data), [data])

  // Enrich nodes with `val` so higher-degree nodes render larger
  const enrichedNodes: SimNode[] = useMemo(
    () => data.nodes.map(n => ({ ...n, val: Math.max(1, (degrees.get(n.id) ?? 0) + 1) })),
    [data.nodes, degrees],
  )

  const graphData = useMemo(
    () => ({ nodes: enrichedNodes, links: data.links }),
    [enrichedNodes, data.links],
  )

  const handleNodeClick = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (node: any) => router.push(`/worlds/${worldId}/articles/${node.id as string}`),
    [router, worldId],
  )

  const handleNodeHover = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (node: any) => {
      setHoveredId(node ? (node.id as string) : null)
      if (containerRef.current) {
        containerRef.current.style.cursor = node ? 'pointer' : 'default'
      }
    },
    [],
  )

  // Colores por tipo: eventos en naranja/rojo, documentos en azul.
  // `hoveredId` recibe un tono más saturado del mismo color.
  const colorForNode = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (node: any): string => {
      const isEvent = node.type === 'event'
      const isHovered = (node.id as string) === hoveredId
      if (isEvent) return isHovered ? '#dc2626' : '#ef4444'
      return isHovered ? '#2563eb' : '#3b82f6'
    },
    [hoveredId],
  )

  const nodeColor = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (node: any) => colorForNode(node),
    [colorForNode],
  )

  const nodeCanvasObject = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const x = node.x as number
      const y = node.y as number
      const r = Math.sqrt((node.val as number) ?? 1) * 5
      const isEvent = node.type === 'event'

      // Circle
      ctx.beginPath()
      ctx.arc(x, y, r, 0, 2 * Math.PI)
      ctx.fillStyle = colorForNode(node)
      ctx.fill()

      // Borde diferenciado para eventos (anillo blanco sutil)
      if (isEvent) {
        ctx.lineWidth = Math.max(0.5, 1 / globalScale)
        ctx.strokeStyle = 'rgba(255,255,255,0.85)'
        ctx.stroke()
      }

      // Label below circle
      const label = node.title as string
      const fontSize = Math.max(6, 12 / globalScale)
      ctx.font = `${fontSize}px Sans-Serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'
      const textWidth = ctx.measureText(label).width
      const labelY = y + r + 3
      ctx.fillStyle = 'rgba(3,7,18,0.6)'
      ctx.fillRect(x - textWidth / 2 - 2, labelY - 1, textWidth + 4, fontSize + 3)
      ctx.fillStyle = 'rgba(255,255,255,0.9)'
      ctx.fillText(label, x, labelY)
    },
    [hoveredId, colorForNode],
  )

  const nodePointerAreaPaint = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (node: any, color: string, ctx: CanvasRenderingContext2D) => {
      const r = Math.sqrt((node.val as number) ?? 1) * 5
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.arc(node.x as number, node.y as number, r, 0, 2 * Math.PI)
      ctx.fill()
    },
    [],
  )

  if (data.nodes.length === 0) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-950 text-gray-500">
        <div className="text-center">
          <p className="text-lg font-medium">Sin artículos en este mundo</p>
          <p className="text-sm mt-1">
            Creá artículos y mencioná otros con @ para ver las conexiones
          </p>
        </div>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="w-full h-full bg-gray-950">
      <ForceGraph2D
        graphData={graphData}
        width={dimensions.width}
        height={dimensions.height}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        nodeVal={(node: any) => (node.val as number) ?? 1}
        nodeColor={nodeColor}
        nodeRelSize={5}
        nodeCanvasObject={nodeCanvasObject}
        nodeCanvasObjectMode={() => 'replace'}
        nodePointerAreaPaint={nodePointerAreaPaint}
        onNodeClick={handleNodeClick}
        onNodeHover={handleNodeHover}
        linkColor={() => 'rgba(148,163,184,0.45)'}
        linkWidth={1.2}
        linkDirectionalArrowLength={5}
        linkDirectionalArrowRelPos={1}
        linkDirectionalArrowColor={() => 'rgba(148,163,184,0.8)'}
        backgroundColor="#030712"
        cooldownTicks={120}
      />
    </div>
  )
}
