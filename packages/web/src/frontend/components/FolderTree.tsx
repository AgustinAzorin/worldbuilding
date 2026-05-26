'use client'

import { useState, useCallback, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Folder, ArticleListItem, FolderTreeNode } from '@/lib/types'

// ── Tree builder ──────────────────────────────────────────────────────────

function buildTree(
  folders: Folder[],
  articles: ArticleListItem[],
  parentId: string | null = null,
): FolderTreeNode[] {
  return folders
    .filter(f => f.parent_id === parentId)
    .map(f => ({
      ...f,
      children: buildTree(folders, articles, f.id),
      articles: articles.filter(a => a.folder_id === f.id),
    }))
}

// ── Token helper (client-side) ────────────────────────────────────────────

async function getToken(): Promise<string> {
  const {
    data: { session },
  } = await createClient().auth.getSession()
  return session?.access_token ?? ''
}

const API = () => process.env.NEXT_PUBLIC_API_URL ?? ''

// ── Single folder row ─────────────────────────────────────────────────────

interface FolderNodeItemProps {
  node: FolderTreeNode
  worldId: string
  depth?: number
  onMutated: () => void
}

function FolderNodeItem({ node, worldId, depth = 0, onMutated }: FolderNodeItemProps) {
  const [expanded, setExpanded] = useState(true)
  const [renaming, setRenaming] = useState(false)
  const [nameInput, setNameInput] = useState(node.name)
  const [isPending, startTransition] = useTransition()

  const handleRename = useCallback(async () => {
    const trimmed = nameInput.trim()
    if (!trimmed || trimmed === node.name) { setRenaming(false); return }
    const token = await getToken()
    await fetch(`${API()}/folders/${node.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: trimmed }),
    })
    setRenaming(false)
    startTransition(onMutated)
  }, [nameInput, node.id, node.name, onMutated])

  const handleDelete = useCallback(async () => {
    if (!confirm(`¿Eliminar la carpeta "${node.name}"? Los artículos que contiene quedarán en la raíz.`)) return
    const token = await getToken()
    await fetch(`${API()}/folders/${node.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    startTransition(onMutated)
  }, [node.id, node.name, onMutated])

  const hasContent = node.children.length > 0 || node.articles.length > 0
  const indent = depth * 12

  return (
    <div>
      {/* Folder header row */}
      <div
        className="group flex items-center gap-1.5 py-1 px-2 rounded-md hover:bg-gray-100 cursor-pointer select-none"
        style={{ paddingLeft: `${indent + 8}px` }}
      >
        {/* Chevron */}
        <button
          onClick={() => setExpanded(e => !e)}
          className="text-gray-400 w-4 text-xs shrink-0"
          aria-label={expanded ? 'Colapsar' : 'Expandir'}
        >
          {hasContent ? (expanded ? '▾' : '▸') : ' '}
        </button>

        {/* Folder icon */}
        <span className="text-amber-500 text-sm shrink-0">{expanded ? '📂' : '📁'}</span>

        {/* Name or rename input */}
        {renaming ? (
          <input
            autoFocus
            value={nameInput}
            onChange={e => setNameInput(e.target.value)}
            onBlur={handleRename}
            onKeyDown={e => {
              if (e.key === 'Enter') handleRename()
              if (e.key === 'Escape') { setRenaming(false); setNameInput(node.name) }
            }}
            className="flex-1 text-sm bg-white border border-blue-400 rounded px-1 outline-none"
            onClick={e => e.stopPropagation()}
          />
        ) : (
          <span
            className="flex-1 text-sm text-gray-700 truncate"
            onDoubleClick={() => setRenaming(true)}
          >
            {node.name}
          </span>
        )}

        {/* Action buttons (visible on hover) */}
        {!renaming && (
          <div className="hidden group-hover:flex items-center gap-1 shrink-0">
            <button
              onClick={e => { e.stopPropagation(); setRenaming(true) }}
              title="Renombrar"
              className="text-gray-400 hover:text-blue-500 text-xs px-1"
            >
              ✏️
            </button>
            <button
              onClick={e => { e.stopPropagation(); handleDelete() }}
              disabled={isPending}
              title="Eliminar carpeta"
              className="text-gray-400 hover:text-red-500 text-xs px-1"
            >
              🗑
            </button>
          </div>
        )}
      </div>

      {/* Children */}
      {expanded && (
        <div>
          {node.children.map(child => (
            <FolderNodeItem
              key={child.id}
              node={child}
              worldId={worldId}
              depth={depth + 1}
              onMutated={onMutated}
            />
          ))}
          {node.articles.map(article => (
            <ArticleItem
              key={article.id}
              article={article}
              worldId={worldId}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Article leaf ──────────────────────────────────────────────────────────

function ArticleItem({
  article,
  worldId,
  depth = 0,
}: {
  article: ArticleListItem
  worldId: string
  depth?: number
}) {
  return (
    <Link
      href={`/worlds/${worldId}/articles/${article.id}`}
      className="flex items-center gap-1.5 py-1 px-2 rounded-md hover:bg-gray-100 text-sm text-gray-600 hover:text-blue-700 truncate"
      style={{ paddingLeft: `${depth * 12 + 24}px` }}
      title={article.title}
    >
      <span className="text-gray-400 shrink-0">📄</span>
      <span className="truncate">{article.title}</span>
    </Link>
  )
}

// ── New-folder inline form ────────────────────────────────────────────────

function NewFolderRow({
  worldId,
  parentId,
  onCreated,
}: {
  worldId: string
  parentId: string | null
  onCreated: () => void
}) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [isPending, startTransition] = useTransition()

  const handleCreate = useCallback(async () => {
    const trimmed = name.trim()
    if (!trimmed) return
    const token = await getToken()
    await fetch(`${API()}/folders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ worldId, name: trimmed, parentId }),
    })
    setName('')
    setOpen(false)
    startTransition(onCreated)
  }, [name, worldId, parentId, onCreated])

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 py-1 px-2 text-xs text-gray-400 hover:text-blue-600 hover:bg-gray-50 rounded-md w-full"
      >
        <span>＋</span> Nueva carpeta
      </button>
    )
  }

  return (
    <div className="flex items-center gap-1 px-2 py-1">
      <span className="text-amber-500 text-sm">📁</span>
      <input
        autoFocus
        value={name}
        onChange={e => setName(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') handleCreate()
          if (e.key === 'Escape') { setOpen(false); setName('') }
        }}
        placeholder="Nombre de la carpeta…"
        className="flex-1 text-sm border border-blue-400 rounded px-2 py-0.5 outline-none"
      />
      <button
        onClick={handleCreate}
        disabled={isPending || !name.trim()}
        className="text-xs px-2 py-0.5 bg-blue-600 text-white rounded disabled:opacity-50"
      >
        OK
      </button>
      <button
        onClick={() => { setOpen(false); setName('') }}
        className="text-xs px-1.5 py-0.5 text-gray-400 hover:text-gray-600"
      >
        ✕
      </button>
    </div>
  )
}

// ── Public FolderTree component ───────────────────────────────────────────

export interface FolderTreeProps {
  worldId: string
  folders: Folder[]
  articles: ArticleListItem[]
}

export function FolderTree({ worldId, folders, articles }: FolderTreeProps) {
  const router = useRouter()
  const refresh = useCallback(() => router.refresh(), [router])

  const tree = buildTree(folders, articles)
  const rootArticles = articles.filter(a => a.folder_id === null)

  return (
    <nav className="py-2">
      {/* Folders (recursive) */}
      {tree.map(node => (
        <FolderNodeItem key={node.id} node={node} worldId={worldId} onMutated={refresh} />
      ))}

      {/* Unsorted articles at world root */}
      {rootArticles.map(article => (
        <ArticleItem key={article.id} article={article} worldId={worldId} depth={0} />
      ))}

      {/* Empty state */}
      {tree.length === 0 && rootArticles.length === 0 && (
        <p className="px-3 py-2 text-xs text-gray-400 italic">Sin artículos todavía</p>
      )}

      {/* Create root folder */}
      <div className="mt-1 border-t border-gray-100 pt-1">
        <NewFolderRow worldId={worldId} parentId={null} onCreated={refresh} />
      </div>
    </nav>
  )
}
