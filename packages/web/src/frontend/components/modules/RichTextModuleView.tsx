'use client'

import { RichTextEditor } from '../editor/RichTextEditor'
import type { RichTextModule } from '@/lib/types'

interface Props {
  worldId: string
  module: RichTextModule
  onChange: (next: RichTextModule) => void
}

export function RichTextModuleView({ worldId, module, onChange }: Props) {
  return (
    <RichTextEditor
      worldId={worldId}
      doc={module.data.doc}
      onChange={doc => onChange({ ...module, data: { doc } })}
    />
  )
}
