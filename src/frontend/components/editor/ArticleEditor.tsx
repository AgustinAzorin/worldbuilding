'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Mention from '@tiptap/extension-mention'
import { mergeAttributes } from '@tiptap/core'
import { buildMentionSuggestion } from './mentionSuggestion'
import type { TipTapContent } from '@/backend/types'
import 'tippy.js/dist/tippy.css'

interface ArticleEditorProps {
  worldId: string
  initialContent?: TipTapContent
  onChange?: (content: TipTapContent) => void
}

const EMPTY_DOC: TipTapContent = { type: 'doc', content: [{ type: 'paragraph' }] }

export function ArticleEditor({ worldId, initialContent, onChange }: ArticleEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Mention.extend({
        // Renderizado personalizado del chip en el DOM del editor
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
        HTMLAttributes: {
          class: 'mention',
        },
        suggestion: buildMentionSuggestion(worldId),
      }),
    ],
    content: initialContent ?? EMPTY_DOC,
    editorProps: {
      attributes: {
        class: 'prose-editor',
        'data-placeholder': 'Comenzá a escribir... usá @ para referenciar otros artículos',
      },
    },
    onUpdate({ editor }) {
      onChange?.(editor.getJSON() as TipTapContent)
    },
    immediatelyRender: false,
  })

  if (!editor) return null

  return (
    <div className="rounded-lg border border-gray-200 focus-within:border-blue-400 focus-within:ring-1 focus-within:ring-blue-400 transition-shadow">
      {/* Barra de formato mínima */}
      <div className="flex gap-1 px-3 py-2 border-b border-gray-100 bg-gray-50 rounded-t-lg">
        {(
          [
            { label: 'B', action: () => editor.chain().focus().toggleBold().run(), mark: 'bold' },
            { label: 'I', action: () => editor.chain().focus().toggleItalic().run(), mark: 'italic' },
            { label: 'H2', action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(), mark: 'heading' },
            { label: '• Lista', action: () => editor.chain().focus().toggleBulletList().run(), mark: 'bulletList' },
          ] as const
        ).map(({ label, action }) => (
          <button
            key={label}
            type="button"
            onMouseDown={e => { e.preventDefault(); action() }}
            className="px-2 py-1 text-xs font-medium text-gray-600 rounded hover:bg-gray-200 transition-colors"
          >
            {label}
          </button>
        ))}
      </div>

      <EditorContent editor={editor} />
    </div>
  )
}
