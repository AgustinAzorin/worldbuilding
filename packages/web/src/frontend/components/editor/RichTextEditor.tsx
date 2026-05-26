'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Mention from '@tiptap/extension-mention'
import { mergeAttributes } from '@tiptap/core'
import { buildMentionSuggestion } from './mentionSuggestion'
import { EMPTY_TIPTAP_DOC, type TipTapContent } from '@/lib/types'
import 'tippy.js/dist/tippy.css'

interface RichTextEditorProps {
  worldId: string
  doc: TipTapContent
  onChange: (doc: TipTapContent) => void
}

/**
 * Editor TipTap "ligero" usado dentro de un módulo `rich-text`.
 * Soporta mark básicos + menciones `@`. Tablas e imágenes viven en
 * módulos dedicados, así que no se incluyen aquí.
 */
export function RichTextEditor({ worldId, doc, onChange }: RichTextEditorProps) {
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
              { 'data-id': node.attrs.id },
            ),
            `@${node.attrs.label ?? node.attrs.id}`,
          ]
        },
      }).configure({
        HTMLAttributes: { class: 'mention' },
        suggestion: buildMentionSuggestion(worldId),
      }),
    ],
    content: doc ?? EMPTY_TIPTAP_DOC,
    editorProps: {
      attributes: {
        class: 'prose-editor',
        'data-placeholder': 'Escribí aquí... usá @ para referenciar otros artículos',
      },
    },
    onUpdate({ editor }) {
      onChange(editor.getJSON() as TipTapContent)
    },
    immediatelyRender: false,
  })

  if (!editor) return null

  const buttons = [
    { label: 'B',       fn: () => editor.chain().focus().toggleBold().run() },
    { label: 'I',       fn: () => editor.chain().focus().toggleItalic().run() },
    { label: 'H2',      fn: () => editor.chain().focus().toggleHeading({ level: 2 }).run() },
    { label: '• Lista', fn: () => editor.chain().focus().toggleBulletList().run() },
  ] as const

  return (
    <div className="rounded border border-gray-200 focus-within:border-blue-400 focus-within:ring-1 focus-within:ring-blue-400 transition-shadow">
      <div className="flex gap-1 px-2 py-1 border-b border-gray-100 bg-gray-50 rounded-t">
        {buttons.map(({ label, fn }) => (
          <button
            key={label}
            type="button"
            onMouseDown={e => { e.preventDefault(); fn() }}
            className="px-2 py-0.5 text-xs font-medium text-gray-600 rounded hover:bg-gray-200 transition-colors"
          >
            {label}
          </button>
        ))}
      </div>
      <EditorContent editor={editor} />
    </div>
  )
}
