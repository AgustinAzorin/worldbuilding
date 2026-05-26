'use client'

import { useCallback, useRef, useState } from 'react'
import { useEditor, EditorContent, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Mention from '@tiptap/extension-mention'
import Image from '@tiptap/extension-image'
import Table from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableHeader from '@tiptap/extension-table-header'
import TableCell from '@tiptap/extension-table-cell'
import { mergeAttributes } from '@tiptap/core'
import { buildMentionSuggestion } from './mentionSuggestion'
import { uploadArticleImage } from '@/lib/supabase/storage'
import type { TipTapContent } from '@/lib/types'
import 'tippy.js/dist/tippy.css'

interface ArticleEditorProps {
  worldId: string
  initialContent?: TipTapContent
  onChange?: (content: TipTapContent) => void
}

const EMPTY_DOC: TipTapContent = { type: 'doc', content: [{ type: 'paragraph' }] }

/** Sube la imagen al bucket y luego inserta el nodo `<img>` con la URL pública. */
async function insertImageFromFile(
  editor: Editor,
  worldId: string,
  file: File,
  onStart: () => void,
  onError: (msg: string) => void,
  onDone: () => void,
) {
  onStart()
  try {
    const { url } = await uploadArticleImage(worldId, file)
    editor.chain().focus().setImage({ src: url, alt: file.name }).run()
  } catch (err) {
    onError(err instanceof Error ? err.message : 'Error al subir la imagen')
  } finally {
    onDone()
  }
}

export function ArticleEditor({ worldId, initialContent, onChange }: ArticleEditorProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [uploading, setUploading] = useState(0)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const startUpload = useCallback(() => { setUploading(n => n + 1); setUploadError(null) }, [])
  const finishUpload = useCallback(() => { setUploading(n => Math.max(0, n - 1)) }, [])

  const editor = useEditor({
    extensions: [
      StarterKit,
      Mention.extend({
        renderHTML({ node, HTMLAttributes }) {
          return [
            'span',
            mergeAttributes(
              { 'data-type': 'mention' },
              this.options.HTMLAttributes,
              HTMLAttributes,
              { 'data-id': node.attrs.id }
            ),
            `@${node.attrs.label ?? node.attrs.id}`,
          ]
        },
      }).configure({
        HTMLAttributes: { class: 'mention' },
        suggestion: buildMentionSuggestion(worldId),
      }),
      Image.configure({
        inline: false,
        allowBase64: false,
        HTMLAttributes: { class: 'editor-image' },
      }),
      Table.configure({ resizable: true, HTMLAttributes: { class: 'editor-table' } }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: initialContent ?? EMPTY_DOC,
    editorProps: {
      attributes: {
        class: 'prose-editor',
        'data-placeholder': 'Comenzá a escribir... usá @ para referenciar otros artículos',
      },
      // Drag & drop de imágenes desde el sistema operativo
      handleDrop(_view, event) {
        const dt = (event as DragEvent).dataTransfer
        const files = Array.from(dt?.files ?? []).filter(f => f.type.startsWith('image/'))
        if (files.length === 0) return false
        event.preventDefault()
        if (!editor) return false
        files.forEach(file =>
          insertImageFromFile(editor, worldId, file, startUpload, setUploadError, finishUpload),
        )
        return true
      },
      // Pegado de imágenes desde el portapapeles
      handlePaste(_view, event) {
        const files = Array.from(event.clipboardData?.files ?? []).filter(f => f.type.startsWith('image/'))
        if (files.length === 0) return false
        event.preventDefault()
        if (!editor) return false
        files.forEach(file =>
          insertImageFromFile(editor, worldId, file, startUpload, setUploadError, finishUpload),
        )
        return true
      },
    },
    onUpdate({ editor }) {
      onChange?.(editor.getJSON() as TipTapContent)
    },
    immediatelyRender: false,
  })

  const handlePickFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = '' // permite re-seleccionar el mismo archivo
    if (!file || !editor) return
    void insertImageFromFile(editor, worldId, file, startUpload, setUploadError, finishUpload)
  }, [editor, worldId, startUpload, finishUpload])

  if (!editor) return null

  const isTable = editor.isActive('table')

  return (
    <div className="rounded-lg border border-gray-200 focus-within:border-blue-400 focus-within:ring-1 focus-within:ring-blue-400 transition-shadow">
      <div className="flex flex-wrap items-center gap-1 px-3 py-2 border-b border-gray-100 bg-gray-50 rounded-t-lg">
        {([
          { label: 'B', action: () => editor.chain().focus().toggleBold().run() },
          { label: 'I', action: () => editor.chain().focus().toggleItalic().run() },
          { label: 'H2', action: () => editor.chain().focus().toggleHeading({ level: 2 }).run() },
          { label: '• Lista', action: () => editor.chain().focus().toggleBulletList().run() },
        ] as const).map(({ label, action }) => (
          <button
            key={label}
            type="button"
            onMouseDown={e => { e.preventDefault(); action() }}
            className="px-2 py-1 text-xs font-medium text-gray-600 rounded hover:bg-gray-200 transition-colors"
          >
            {label}
          </button>
        ))}

        <span className="mx-1 h-4 w-px bg-gray-300" />

        {/* Tabla */}
        <button
          type="button"
          onMouseDown={e => {
            e.preventDefault()
            editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
          }}
          className="px-2 py-1 text-xs font-medium text-gray-600 rounded hover:bg-gray-200 transition-colors"
          title="Insertar tabla 3×3"
        >
          ⊞ Tabla
        </button>

        {isTable && (
          <>
            {([
              { label: '+ Fila',  fn: () => editor.chain().focus().addRowAfter().run() },
              { label: '− Fila',  fn: () => editor.chain().focus().deleteRow().run() },
              { label: '+ Col',   fn: () => editor.chain().focus().addColumnAfter().run() },
              { label: '− Col',   fn: () => editor.chain().focus().deleteColumn().run() },
              { label: '✕ Tabla', fn: () => editor.chain().focus().deleteTable().run() },
            ] as const).map(({ label, fn }) => (
              <button
                key={label}
                type="button"
                onMouseDown={e => { e.preventDefault(); fn() }}
                className="px-2 py-1 text-xs font-medium text-gray-600 rounded hover:bg-gray-200 transition-colors"
              >
                {label}
              </button>
            ))}
          </>
        )}

        <span className="mx-1 h-4 w-px bg-gray-300" />

        {/* Imagen */}
        <button
          type="button"
          onMouseDown={e => { e.preventDefault(); fileInputRef.current?.click() }}
          disabled={uploading > 0}
          className="px-2 py-1 text-xs font-medium text-gray-600 rounded hover:bg-gray-200 disabled:opacity-50 transition-colors"
          title="Insertar imagen"
        >
          🖼 Imagen
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handlePickFile}
        />

        {uploading > 0 && (
          <span className="ml-2 text-xs text-blue-600 font-medium animate-pulse">
            Subiendo {uploading} imagen{uploading === 1 ? '' : 'es'}…
          </span>
        )}
        {uploadError && (
          <span className="ml-2 text-xs text-red-500" role="alert">{uploadError}</span>
        )}
      </div>

      <EditorContent editor={editor} />
    </div>
  )
}
