// ============================================================
// TipTap / ProseMirror JSON types
// ============================================================

export interface TipTapNode {
  type: string
  attrs?: Record<string, unknown>
  content?: TipTapNode[]
  text?: string
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>
}

export interface TipTapContent {
  type: 'doc'
  content: TipTapNode[]
}

// ============================================================
// Supabase Database schema (used for typed client)
// ============================================================

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export interface Database {
  public: {
    Tables: {
      worlds: {
        Row: {
          id: string
          title: string
          user_id: string
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          user_id: string
          created_at?: string
        }
        Update: {
          id?: string
          title?: string
          user_id?: string
          created_at?: string
        }
      }
      articles: {
        Row: {
          id: string
          world_id: string
          title: string
          content: TipTapContent | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          world_id: string
          title: string
          content?: TipTapContent | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          world_id?: string
          title?: string
          content?: TipTapContent | null
          updated_at?: string
        }
      }
      article_relations: {
        Row: {
          id: string
          source_article_id: string
          target_article_id: string
        }
        Insert: {
          id?: string
          source_article_id: string
          target_article_id: string
        }
        Update: {
          id?: string
          source_article_id?: string
          target_article_id?: string
        }
      }
    }
    Functions: {
      sync_article_relations: {
        Args: {
          p_source_id: string
          p_target_ids: string[]
        }
        Returns: void
      }
    }
  }
}

// ============================================================
// Convenience aliases
// ============================================================

export type World = Database['public']['Tables']['worlds']['Row']
export type Article = Database['public']['Tables']['articles']['Row']
export type ArticleRelation = Database['public']['Tables']['article_relations']['Row']

/** Shape returned by the /api/articles/search endpoint */
export interface ArticleSuggestion {
  id: string
  title: string
}
