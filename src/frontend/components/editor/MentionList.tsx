'use client'

import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
} from 'react'
import type { SuggestionKeyDownProps } from '@tiptap/suggestion'
import type { ArticleSuggestion } from '@/backend/types'

export interface MentionListRef {
  onKeyDown: (props: SuggestionKeyDownProps) => boolean
}

interface MentionListProps {
  items: ArticleSuggestion[]
  command: (item: { id: string; label: string }) => void
}

const MentionList = forwardRef<MentionListRef, MentionListProps>(
  ({ items, command }, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0)

    // Reset selection cuando cambia la lista
    useEffect(() => setSelectedIndex(0), [items])

    const selectItem = (index: number) => {
      const item = items[index]
      if (item) command({ id: item.id, label: item.title })
    }

    useImperativeHandle(ref, () => ({
      onKeyDown({ event }: SuggestionKeyDownProps) {
        if (event.key === 'ArrowUp') {
          setSelectedIndex(i => (i + items.length - 1) % items.length)
          return true
        }
        if (event.key === 'ArrowDown') {
          setSelectedIndex(i => (i + 1) % items.length)
          return true
        }
        if (event.key === 'Enter') {
          selectItem(selectedIndex)
          return true
        }
        return false
      },
    }))

    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden min-w-[200px] max-w-xs">
        {items.length > 0 ? (
          <ul role="listbox" className="py-1">
            {items.map((item, index) => (
              <li key={item.id} role="option" aria-selected={index === selectedIndex}>
                <button
                  type="button"
                  className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                    index === selectedIndex
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                  onMouseEnter={() => setSelectedIndex(index)}
                  onClick={() => selectItem(index)}
                >
                  <span className="text-blue-500 mr-1">@</span>
                  {item.title}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-3 py-2 text-sm text-gray-400 italic">
            No se encontraron artículos
          </p>
        )}
      </div>
    )
  }
)

MentionList.displayName = 'MentionList'

export default MentionList
