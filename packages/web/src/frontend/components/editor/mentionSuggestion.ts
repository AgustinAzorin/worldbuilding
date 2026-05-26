import { ReactRenderer } from '@tiptap/react'
import tippy, { type Instance, type Props as TippyProps } from 'tippy.js'
import type { SuggestionOptions, SuggestionProps } from '@tiptap/suggestion'
import type { Editor } from '@tiptap/core'
import { createClient } from '@/lib/supabase/client'
import MentionList, { type MentionListRef } from './MentionList'
import type { ArticleSuggestion } from '@/lib/types'

export function buildMentionSuggestion(
  worldId: string
): Partial<SuggestionOptions<ArticleSuggestion>> {
  return {
    char: '@',

    items: async ({ query }): Promise<ArticleSuggestion[]> => {
      try {
        const supabase = createClient()
        const { data: { session } } = await supabase.auth.getSession()
        const token = session?.access_token ?? ''

        const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? ''
        const res = await fetch(
          `${apiUrl}/articles/search?worldId=${encodeURIComponent(worldId)}&q=${encodeURIComponent(query)}`,
          { headers: { Authorization: `Bearer ${token}` } }
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
          renderer = new ReactRenderer(MentionList, { props, editor: props.editor as Editor })
          if (!props.clientRect) return
          popup = tippy('body', {
            getReferenceClientRect: props.clientRect as () => DOMRect,
            appendTo: () => document.body,
            content: renderer.element,
            showOnCreate: true,
            interactive: true,
            trigger: 'manual',
            placement: 'bottom-start',
          })
        },
        onUpdate(props: SuggestionProps<ArticleSuggestion>) {
          renderer.updateProps(props)
          if (!props.clientRect) return
          popup[0]?.setProps({ getReferenceClientRect: props.clientRect as () => DOMRect })
        },
        onKeyDown(props) {
          if (props.event.key === 'Escape') { popup[0]?.hide(); return true }
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
