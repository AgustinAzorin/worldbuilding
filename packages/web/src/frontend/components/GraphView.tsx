'use client'

import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import type { GraphData, GraphLink, GraphNode } from '@/lib/types'

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

// ── Interpolación de color por diplomacy_score ───────────────────────────
//
// El eje diplomático va de −100 (hostilidad / guerra) → 0 (neutral) →
// +100 (alianza). Mapeamos linealmente cada componente RGB entre tres
// anclas, así obtenemos un degradado continuo sin pasar por
// representaciones HSL más caras en el hot path del canvas.
//
//   −100 → ROJO   #ef4444 = (239,  68,  68)
//      0 → GRIS   #94a3b8 = (148, 163, 184)
//   +100 → VERDE  #22c55e = ( 34, 197,  94)
//
// Cacheamos los strings ya formateados para los 201 enteros posibles
// para que el render del grafo no asigne strings por frame.

const COLOR_WAR     = [239,  68,  68] as const
const COLOR_NEUTRAL = [148, 163, 184] as const
const COLOR_ALLY    = [ 34, 197,  94] as const
const COLOR_MENTION = 'rgba(148,163,184,0.55)' as const

function lerp(a: number, b: number, t: number): number {
  return Math.round(a + (b - a) * t)
}

function buildDiplomacyColor(score: number): string {
  if (score < 0) {
    const t = (score + 100) / 100  // −100 → 0  ⇒ t: 0 → 1
    const r = lerp(COLOR_WAR[0],     COLOR_NEUTRAL[0], t)
    const g = lerp(COLOR_WAR[1],     COLOR_NEUTRAL[1], t)
    const b = lerp(COLOR_WAR[2],     COLOR_NEUTRAL[2], t)
    return `rgb(${r},${g},${b})`
  }
  const t = score / 100              // 0 → +100 ⇒ t: 0 → 1
  const r = lerp(COLOR_NEUTRAL[0], COLOR_ALLY[0], t)
  const g = lerp(COLOR_NEUTRAL[1], COLOR_ALLY[1], t)
  const b = lerp(COLOR_NEUTRAL[2], COLOR_ALLY[2], t)
  return `rgb(${r},${g},${b})`
}

// Tabla [-100..100] precalculada para evitar allocs por frame.
const DIPLOMACY_COLOR_LUT: string[] = Array.from({ length: 201 }, (_, i) =>
  buildDiplomacyColor(i - 100),
)
const NEUTRAL_COLOR = DIPLOMACY_COLOR_LUT[100]

function colorForDiplomacy(score: number | null | undefined): string {
  if (score === null || score === undefined || Number.isNaN(score)) {
    return NEUTRAL_COLOR
  }
  const clamped = Math.max(-100, Math.min(100, Math.round(score)))
  return DIPLOMACY_COLOR_LUT[clamped + 100]
}

// ── Component ─────────────────────────────────────────────────────────────

interface GraphViewProps {
  worldId: string
  data: GraphData
}

interface TooltipState {
  x: number
  y: number
  text: string
}

export function GraphView({ worldId, data }: GraphViewProps) {
  const router = useRouter()
  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 })
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [tooltip, setTooltip] = useState<TooltipState | null>(null)

  // Resolver títulos rápido a partir del id para armar el texto del tooltip.
  const titleById = useMemo(() => {
    const m = new Map<string, string>()
    data.nodes.forEach(n => m.set(n.id, n.title))
    return m
  }, [data.nodes])

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

  // Hover sobre un enlace: mostramos tooltip solo si es semántico.
  const handleLinkHover = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (link: any) => {
      if (!link || link.connection_type !== 'semantic') {
        setTooltip(null)
        return
      }
      // Tras la simulación, source/target ya son objetos { id, x, y, ... }
      const srcId = typeof link.source === 'object' ? (link.source.id as string) : (link.source as string)
      const tgtId = typeof link.target === 'object' ? (link.target.id as string) : (link.target as string)
      const sx = typeof link.source === 'object' ? (link.source.x as number | undefined) : undefined
      const sy = typeof link.source === 'object' ? (link.source.y as number | undefined) : undefined
      const tx = typeof link.target === 'object' ? (link.target.x as number | undefined) : undefined
      const ty = typeof link.target === 'object' ? (link.target.y as number | undefined) : undefined

      const label = (link.relation_label as string | null) ?? 'relación'
      const srcTitle = titleById.get(srcId) ?? '???'
      const tgtTitle = titleById.get(tgtId) ?? '???'
      const text = `${srcTitle} es [${label}] de ${tgtTitle}`

      if (sx !== undefined && sy !== undefined && tx !== undefined && ty !== undefined) {
        const midX = (sx + tx) / 2
        const midY = (sy + ty) / 2
        setTooltip({ x: midX, y: midY, text })
      } else {
        setTooltip({ x: dimensions.width / 2, y: 20, text })
      }
    },
    [dimensions.width, titleById],
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

      ctx.beginPath()
      ctx.arc(x, y, r, 0, 2 * Math.PI)
      ctx.fillStyle = colorForNode(node)
      ctx.fill()

      if (isEvent) {
        ctx.lineWidth = Math.max(0.5, 1 / globalScale)
        ctx.strokeStyle = 'rgba(255,255,255,0.85)'
        ctx.stroke()
      }

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
    [colorForNode],
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

  // Línea sólida y gruesa para semántico, fina y punteada para mention.
  // Usamos linkCanvasObject para poder aplicar dash y color por etiqueta.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const linkColor = useCallback((link: any): string => {
    const l = link as GraphLink
    if (l.connection_type === 'semantic') return colorForDiplomacy(l.diplomacy_score)
    return COLOR_MENTION
  }, [])

  const linkCanvasObject = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (link: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const l = link as GraphLink
      const s = link.source
      const t = link.target
      if (typeof s !== 'object' || typeof t !== 'object') return
      const sx = s.x as number | undefined
      const sy = s.y as number | undefined
      const tx = t.x as number | undefined
      const ty = t.y as number | undefined
      if (sx === undefined || sy === undefined || tx === undefined || ty === undefined) return

      ctx.save()
      const isSemantic = l.connection_type === 'semantic'
      const color = isSemantic
        ? colorForDiplomacy(l.diplomacy_score)
        : COLOR_MENTION

      if (isSemantic) {
        ctx.setLineDash([])
        ctx.strokeStyle = color
        ctx.lineWidth = Math.max(1.2, 2.2 / globalScale)
      } else {
        ctx.setLineDash([4 / globalScale, 3 / globalScale])
        ctx.strokeStyle = color
        ctx.lineWidth = Math.max(0.4, 0.8 / globalScale)
      }
      ctx.beginPath()
      ctx.moveTo(sx, sy)
      ctx.lineTo(tx, ty)
      ctx.stroke()

      // Punta de flecha sólo para semánticas — comunican dirección de rol.
      if (isSemantic) {
        const dx = tx - sx
        const dy = ty - sy
        const len = Math.hypot(dx, dy) || 1
        // Detener la flecha justo antes del nodo destino (~ radio típico).
        const backoff = 8
        const hx = tx - (dx / len) * backoff
        const hy = ty - (dy / len) * backoff
        const ah = Math.max(4, 6 / globalScale) // alto
        const aw = Math.max(3, 4 / globalScale) // ancho
        const nx = -dy / len
        const ny = dx / len
        ctx.setLineDash([])
        ctx.fillStyle = color
        ctx.beginPath()
        ctx.moveTo(hx, hy)
        ctx.lineTo(hx - (dx / len) * ah + nx * aw, hy - (dy / len) * ah + ny * aw)
        ctx.lineTo(hx - (dx / len) * ah - nx * aw, hy - (dy / len) * ah - ny * aw)
        ctx.closePath()
        ctx.fill()
      }
      ctx.restore()
    },
    [],
  )

  // Área de hit ancha para que el hover sobre el link sea fácil de disparar.
  const linkPointerAreaPaint = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (link: any, color: string, ctx: CanvasRenderingContext2D) => {
      const s = link.source
      const t = link.target
      if (typeof s !== 'object' || typeof t !== 'object') return
      const sx = s.x as number | undefined
      const sy = s.y as number | undefined
      const tx = t.x as number | undefined
      const ty = t.y as number | undefined
      if (sx === undefined || sy === undefined || tx === undefined || ty === undefined) return
      ctx.save()
      ctx.setLineDash([])
      ctx.strokeStyle = color
      ctx.lineWidth = 8
      ctx.beginPath()
      ctx.moveTo(sx, sy)
      ctx.lineTo(tx, ty)
      ctx.stroke()
      ctx.restore()
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
    <div ref={containerRef} className="relative w-full h-full bg-gray-950">
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
        onLinkHover={handleLinkHover}
        linkColor={linkColor}
        linkCanvasObject={linkCanvasObject}
        linkCanvasObjectMode={() => 'replace'}
        linkPointerAreaPaint={linkPointerAreaPaint}
        backgroundColor="#030712"
        cooldownTicks={120}
      />

      {/* Tooltip flotante para aristas semánticas */}
      {tooltip && (
        <div
          className="pointer-events-none absolute z-10 px-2 py-1 rounded-md bg-gray-900/95 text-white text-xs shadow-lg border border-gray-700 -translate-x-1/2 -translate-y-full max-w-[260px] whitespace-normal"
          style={{ left: tooltip.x, top: Math.max(tooltip.y - 6, 18) }}
        >
          {tooltip.text}
        </div>
      )}

      {/* Leyenda compacta */}
      <div className="absolute bottom-3 left-3 z-10 text-xs text-gray-300 bg-gray-900/80 rounded-md px-3 py-2 border border-gray-800 space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="inline-block w-6 border-t-2 border-dashed border-slate-400" />
          <span>Menciones (auto)</span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="inline-block w-16 h-1.5 rounded-sm"
            style={{
              background: `linear-gradient(to right, ${colorForDiplomacy(-100)}, ${colorForDiplomacy(0)}, ${colorForDiplomacy(100)})`,
            }}
          />
          <span>Hostilidad ↔ Alianza</span>
        </div>
      </div>
    </div>
  )
}
