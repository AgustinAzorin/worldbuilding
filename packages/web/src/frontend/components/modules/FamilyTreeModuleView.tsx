'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import type { ArticleRelationEdge, FamilyTreeModule } from '@/lib/types'

interface Props {
  module: FamilyTreeModule
  worldId: string
  articleId: string | null
  articleTitle: string
  relations: ArticleRelationEdge[]
}

// Etiquetas que cuentan como ancestros / descendientes (case-insensitive,
// match por substring para tolerar variantes como "Padre adoptivo").
const ANCESTOR_PATTERN   = /(padre|madre)/i
const DESCENDANT_PATTERN = /(hijo|hija)/i

interface FamilyMember {
  relationId: string
  articleId: string
  title: string
  label: string
}

/**
 * De-duplica miembros por articleId: si el usuario declaró "Padre" y
 * "Padre adoptivo" hacia el mismo artículo, mostramos sólo el primero
 * y prevenimos cualquier riesgo de loop de keys en el render.
 */
function uniqueByArticle(rows: FamilyMember[]): FamilyMember[] {
  const seen = new Set<string>()
  const out: FamilyMember[] = []
  for (const r of rows) {
    if (seen.has(r.articleId)) continue
    seen.add(r.articleId)
    out.push(r)
  }
  return out
}

function MemberBox({
  worldId,
  member,
}: {
  worldId: string
  member: FamilyMember
}) {
  return (
    <Link
      href={`/worlds/${worldId}/articles/${member.articleId}`}
      className="block min-w-[120px] max-w-[180px] rounded-md border border-gray-300 bg-white hover:border-blue-500 hover:shadow transition-all px-3 py-2 text-center"
    >
      <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
        {member.label}
      </div>
      <div className="text-sm font-medium text-gray-900 truncate">
        {member.title}
      </div>
    </Link>
  )
}

function SelfBox({ title }: { title: string }) {
  return (
    <div className="min-w-[140px] max-w-[200px] rounded-md border-2 border-blue-600 bg-blue-50 px-3 py-2 text-center shadow-sm">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-blue-700">
        Este artículo
      </div>
      <div className="text-sm font-bold text-blue-900 truncate">{title}</div>
    </div>
  )
}

export function FamilyTreeModuleView({
  worldId,
  articleId,
  articleTitle,
  relations,
}: Props) {
  const { ancestors, descendants } = useMemo(() => {
    // Sólo consideramos relaciones semánticas salientes del artículo.
    // El label describe al destino desde el punto de vista del artículo
    // actual: "Padre" → ese destino es padre de este artículo.
    const semantic = relations.filter(r => r.connectionType === 'semantic' && r.label)

    const a: FamilyMember[] = []
    const d: FamilyMember[] = []
    for (const r of semantic) {
      const lbl = r.label as string
      if (ANCESTOR_PATTERN.test(lbl)) {
        a.push({ relationId: r.relationId, articleId: r.id, title: r.title, label: lbl })
      } else if (DESCENDANT_PATTERN.test(lbl)) {
        d.push({ relationId: r.relationId, articleId: r.id, title: r.title, label: lbl })
      }
    }
    return { ancestors: uniqueByArticle(a), descendants: uniqueByArticle(d) }
  }, [relations])

  if (!articleId) {
    return (
      <p className="text-xs text-gray-400 italic">
        Guardá el artículo para construir su árbol genealógico.
      </p>
    )
  }

  if (ancestors.length === 0 && descendants.length === 0) {
    return (
      <p className="text-xs text-gray-400 italic">
        Sin parentescos declarados. Añadí relaciones explícitas con etiquetas
        como <code className="bg-gray-100 px-1 rounded">Padre</code>,{' '}
        <code className="bg-gray-100 px-1 rounded">Madre</code>,{' '}
        <code className="bg-gray-100 px-1 rounded">Hijo</code> o{' '}
        <code className="bg-gray-100 px-1 rounded">Hija</code> desde el módulo
        de Relaciones explícitas.
      </p>
    )
  }

  return (
    <div className="flex flex-col items-center gap-3 py-2">
      {/* ── Ancestros ──────────────────────────────────────────────── */}
      {ancestors.length > 0 && (
        <>
          <div className="flex flex-wrap justify-center gap-3">
            {ancestors.map(m => (
              <MemberBox key={m.relationId} worldId={worldId} member={m} />
            ))}
          </div>
          <div className="w-px h-6 bg-gray-300" aria-hidden />
        </>
      )}

      {/* ── Self ───────────────────────────────────────────────────── */}
      <SelfBox title={articleTitle || 'Este artículo'} />

      {/* ── Descendientes ──────────────────────────────────────────── */}
      {descendants.length > 0 && (
        <>
          <div className="w-px h-6 bg-gray-300" aria-hidden />
          <div className="flex flex-wrap justify-center gap-3">
            {descendants.map(m => (
              <MemberBox key={m.relationId} worldId={worldId} member={m} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
