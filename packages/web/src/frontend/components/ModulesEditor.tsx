'use client'

import { useCallback } from 'react'
import {
  makeEmptyModule,
  type ArticleModule,
  type ArticleModuleType,
  type ArticleRelationEdge,
} from '@/lib/types'
import { RichTextModuleView } from './modules/RichTextModuleView'
import { ImageModuleView } from './modules/ImageModuleView'
import { ChartModuleView } from './modules/ChartModuleView'
import { TableModuleView } from './modules/TableModuleView'
import { RelationsGraphModuleView } from './modules/RelationsGraphModuleView'
import { RelationsManagerModuleView } from './modules/RelationsManagerModuleView'
import { FamilyTreeModuleView } from './modules/FamilyTreeModuleView'
import { OrganizationMembershipModuleView } from './modules/OrganizationMembershipModuleView'
import { LifelineModuleView } from './modules/LifelineModuleView'
import { PrivacyToggle, PRIVATE_BLOCK_CLASS } from './PrivacyToggle'

interface Props {
  worldId: string
  articleId: string | null
  articleTitle: string
  value: ArticleModule[]
  onChange: (next: ArticleModule[]) => void
  outgoing: ArticleRelationEdge[]
  incoming: ArticleRelationEdge[]
}

const MODULE_LABELS: Record<ArticleModuleType, string> = {
  'rich-text':               'Texto',
  'image':                   'Imagen',
  'chart':                   'Estadísticas',
  'relations-graph':         'Relaciones',
  'table':                   'Tabla',
  'relations-manager':       'Relaciones explícitas',
  'family-tree':             'Árbol genealógico',
  'organization-membership': 'Membresías',
  'lifeline':                'Línea de vida',
}

function rid(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `m-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function swap<T>(arr: T[], i: number, j: number): T[] {
  if (i < 0 || j < 0 || i >= arr.length || j >= arr.length) return arr
  const next = arr.slice()
  ;[next[i], next[j]] = [next[j], next[i]]
  return next
}

export function ModulesEditor({
  worldId,
  articleId,
  articleTitle,
  value,
  onChange,
  outgoing,
  incoming,
}: Props) {
  const addModule = useCallback((type: ArticleModuleType) => {
    onChange([...value, makeEmptyModule(type, rid())])
  }, [value, onChange])

  const removeModule = useCallback((id: string) => {
    onChange(value.filter(m => m.id !== id))
  }, [value, onChange])

  const moveModule = useCallback((index: number, delta: -1 | 1) => {
    onChange(swap(value, index, index + delta))
  }, [value, onChange])

  const updateModule = useCallback((next: ArticleModule) => {
    onChange(value.map(m => (m.id === next.id ? next : m)))
  }, [value, onChange])

  const renameModule = useCallback((id: string, title: string) => {
    onChange(value.map(m => (m.id === id ? ({ ...m, title } as ArticleModule) : m)))
  }, [value, onChange])

  const togglePrivacy = useCallback((id: string, isPrivate: boolean) => {
    onChange(value.map(m => {
      if (m.id !== id) return m
      // Cuando is_private=false dejamos la propiedad fuera del JSON.
      if (!isPrivate) {
        const { is_private: _drop, ...rest } = m
        return rest as ArticleModule
      }
      return { ...m, is_private: true } as ArticleModule
    }))
  }, [value, onChange])

  return (
    <section className="space-y-4">
      {value.map((mod, idx) => {
        const isPrivate = mod.is_private === true
        return (
        <article
          key={mod.id}
          className={
            'rounded-lg border border-gray-200 bg-white ' +
            (isPrivate ? PRIVATE_BLOCK_CLASS : '')
          }
        >
          <header className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 bg-gray-50 rounded-t-lg">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 px-2 py-0.5 rounded bg-gray-200">
              {MODULE_LABELS[mod.type]}
            </span>
            {isPrivate && (
              <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-700 px-2 py-0.5 rounded bg-amber-100 border border-amber-200">
                Secreto
              </span>
            )}
            <input
              type="text"
              value={mod.title}
              onChange={e => renameModule(mod.id, e.target.value)}
              placeholder="Título del módulo"
              aria-label="Título del módulo"
              className="flex-1 min-w-0 text-sm font-medium bg-transparent focus:outline-none focus:bg-white focus:ring-1 focus:ring-blue-400 rounded px-1 py-0.5"
            />
            <PrivacyToggle
              isPrivate={isPrivate}
              onToggle={next => togglePrivacy(mod.id, next)}
              label={mod.title || MODULE_LABELS[mod.type]}
              compact
            />
            <div className="flex items-center gap-0.5 text-gray-400">
              <button
                type="button"
                onClick={() => moveModule(idx, -1)}
                disabled={idx === 0}
                aria-label="Subir módulo"
                className="px-1 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => moveModule(idx, 1)}
                disabled={idx === value.length - 1}
                aria-label="Bajar módulo"
                className="px-1 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                ↓
              </button>
              <button
                type="button"
                onClick={() => removeModule(mod.id)}
                aria-label="Eliminar módulo"
                className="px-1 hover:text-red-500"
              >
                ✕
              </button>
            </div>
          </header>

          <div className="p-3">
            {mod.type === 'rich-text' && (
              <RichTextModuleView worldId={worldId} module={mod} onChange={updateModule} />
            )}
            {mod.type === 'image' && (
              <ImageModuleView worldId={worldId} module={mod} onChange={updateModule} />
            )}
            {mod.type === 'chart' && (
              <ChartModuleView module={mod} onChange={updateModule} />
            )}
            {mod.type === 'table' && (
              <TableModuleView module={mod} onChange={updateModule} />
            )}
            {mod.type === 'relations-graph' && (
              <RelationsGraphModuleView
                module={mod}
                worldId={worldId}
                articleId={articleId}
                articleTitle={articleTitle}
                outgoing={outgoing}
                incoming={incoming}
              />
            )}
            {mod.type === 'relations-manager' && (
              <RelationsManagerModuleView
                module={mod}
                worldId={worldId}
                articleId={articleId}
                initialRelations={outgoing}
              />
            )}
            {mod.type === 'family-tree' && (
              <FamilyTreeModuleView
                module={mod}
                worldId={worldId}
                articleId={articleId}
                onChange={updateModule}
              />
            )}
            {mod.type === 'organization-membership' && (
              <OrganizationMembershipModuleView
                module={mod}
                worldId={worldId}
                articleId={articleId}
                initialRelations={outgoing}
              />
            )}
            {mod.type === 'lifeline' && (
              <LifelineModuleView module={mod} onChange={updateModule} />
            )}
          </div>
        </article>
        )
      })}

      <div className="flex flex-wrap items-center gap-2 pt-1">
        <span className="text-xs font-medium text-gray-500">Añadir módulo:</span>
        {(Object.keys(MODULE_LABELS) as ArticleModuleType[]).map(type => (
          <button
            key={type}
            type="button"
            onClick={() => addModule(type)}
            className="text-xs px-2 py-1 rounded border border-gray-200 text-gray-700 hover:bg-gray-100 transition-colors"
          >
            + {MODULE_LABELS[type]}
          </button>
        ))}
      </div>
    </section>
  )
}
