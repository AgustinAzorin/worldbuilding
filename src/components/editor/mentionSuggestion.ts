import { ReactRenderer } from '@tiptap/react'
import tippy, { type Instance, type Props as TippyProps } from 'tippy.js'
import type { SuggestionOptions, SuggestionProps } from '@tiptap/suggestion'
import type { Editor } from '@tiptap/core'
import MentionList, { type MentionListRef } from './MentionList'
import type { ArticleSuggestion } from '@/lib/types'

/**
 * Construye la configuración de suggestion para la extensión Mention de TipTap.
 * Recibe el worldId para filtrar sugerencias al mundo activo.
 */
export function buildMentionSuggestion(
  worldId: string
): Partial<SuggestionOptions<ArticleSuggestion>> {
  return {
    char: '@',

    // Recupera artículos del mundo actual que coincidan con el query
    items: async ({ query }): Promise<ArticleSuggestion[]> => {
      try {
        const res = await fetch(
          `/api/articles/search?q=${encodeURIComponent(query)}&worldId=${encodeURIComponent(worldId)}`
        )
        if (!res.ok) return []
        return res.json()
      } catch {
        return []
      }
    },

    render: () => {
      let renderer: ReactRenderer<MentionListRef>
      let popup: Instance<TippyProps>[]

      return {
        onStart(props: SuggestionProps<ArticleSuggestion>) {
          renderer = new ReactRenderer(MentionList, {
            props,
            editor: props.editor as Editor,
          })

          if (!props.clientRect) return

          popup = tippy('body', {
            getReferenceClientRect: props.clientRect as () => DOMRect,
            appendTo: () => document.body,
            content: renderer.element,
            showOnCreate: true,
            interactive: true,
            trigger: 'manual',
            placement: 'bottom-start',
            theme: 'light-border',
            animation: 'shift-away',
            maxWidth: 320,
          })
        },

        onUpdate(props: SuggestionProps<ArticleSuggestion>) {
          renderer.updateProps(props)
          if (!props.clientRect) return
          popup[0]?.setProps({
            getReferenceClientRect: props.clientRect as () => DOMRect,
          })
        },

        onKeyDown(props) {
          if (props.event.key === 'Escape') {
            popup[0]?.hide()
            return true
          }
          return renderer.ref?.onKeyDown(props) ?? false
        },

        onExit() {
          popup[0]?.destroy()
          renderer.destroy()
        },
      }
    },
  }
}
