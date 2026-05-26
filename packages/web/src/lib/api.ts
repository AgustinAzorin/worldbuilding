/**
 * Thin fetch wrapper para llamar a la API NestJS.
 *
 * API_URL  → usado en Server Components (variable de servidor)
 * NEXT_PUBLIC_API_URL → usado en Client Components (expuesto al browser)
 *
 * Ambas variables deben apuntar a la misma URL del servicio worldbuilding-api.
 */

type Method = 'GET' | 'POST' | 'PATCH' | 'DELETE'

async function request<T>(
  method: Method,
  path: string,
  accessToken: string,
  body?: unknown
): Promise<T> {
  const base = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? ''

  const res = await fetch(`${base}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    cache: 'no-store',
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { message?: string }
    throw new Error(err.message ?? `HTTP ${res.status}`)
  }

  const text = await res.text()
  return text ? (JSON.parse(text) as T) : (undefined as unknown as T)
}

export const api = {
  worlds: {
    list: (token: string) =>
      request<import('./types').World[]>('GET', '/worlds', token),

    create: (token: string, title: string) =>
      request<import('./types').World>('POST', '/worlds', token, { title }),

    get: (token: string, id: string) =>
      request<import('./types').World>('GET', `/worlds/${id}`, token),

    articles: (token: string, worldId: string) =>
      request<Pick<import('./types').Article, 'id' | 'title' | 'updated_at' | 'created_at'>[]>(
        'GET',
        `/worlds/${worldId}/articles`,
        token
      ),

    folderTree: (token: string, worldId: string) =>
      request<import('./types').FolderTreePayload>(
        'GET',
        `/worlds/${worldId}/folder-tree`,
        token
      ),

    graph: (token: string, worldId: string) =>
      request<import('./types').GraphData>('GET', `/worlds/${worldId}/graph`, token),

    timelineEvents: (token: string, worldId: string) =>
      request<import('./types').TimelineEvent[]>(
        'GET',
        `/worlds/${worldId}/timeline`,
        token,
      ),
  },

  folders: {
    create: (
      token: string,
      worldId: string,
      name: string,
      parentId?: string | null,
    ) =>
      request<import('./types').Folder>('POST', '/folders', token, {
        worldId,
        name,
        parentId: parentId ?? null,
      }),

    update: (
      token: string,
      folderId: string,
      patch: { name?: string; parentId?: string | null },
    ) => request<import('./types').Folder>('PATCH', `/folders/${folderId}`, token, patch),

    remove: (token: string, folderId: string) =>
      request<void>('DELETE', `/folders/${folderId}`, token),

    moveArticle: (token: string, articleId: string, folderId: string | null) =>
      request<void>('PATCH', `/folders/articles/${articleId}/move`, token, { folderId }),
  },

  articles: {
    get: (token: string, id: string) =>
      request<import('./types').ArticleWithRelations>('GET', `/articles/${id}`, token),

    create: (
      token: string,
      worldId: string,
      title: string,
      headerFields: import('./types').HeaderField[],
      modules: import('./types').ArticleModule[],
      eventMeta?: import('./types').EventMetadataPatch,
    ) =>
      request<{ id: string }>('POST', '/articles', token, {
        worldId,
        title,
        headerFields,
        modules,
        ...(eventMeta ?? {}),
      }),

    update: (
      token: string,
      id: string,
      worldId: string,
      title: string,
      headerFields: import('./types').HeaderField[],
      modules: import('./types').ArticleModule[],
      eventMeta?: import('./types').EventMetadataPatch,
    ) =>
      request<void>('PATCH', `/articles/${id}`, token, {
        worldId,
        title,
        headerFields,
        modules,
        ...(eventMeta ?? {}),
      }),

    search: (token: string, worldId: string, q: string) =>
      request<import('./types').ArticleSuggestion[]>(
        'GET',
        `/articles/search?worldId=${encodeURIComponent(worldId)}&q=${encodeURIComponent(q)}`,
        token
      ),

    /**
     * Instancia un artículo desde una plantilla — o vacío si `templateId` es
     * null. El backend regenera los UUIDs de campos/módulos del preset.
     */
    createFromTemplate: (
      token: string,
      worldId: string,
      title: string,
      templateId: string | null,
    ) =>
      request<{ id: string }>('POST', '/templates/instantiate', token, {
        worldId,
        title,
        templateId,
      }),
  },

  templates: {
    list: (token: string, worldId: string) =>
      request<import('./types').ArticleTemplateSummary[]>(
        'GET',
        `/templates?worldId=${encodeURIComponent(worldId)}`,
        token,
      ),

    get: (token: string, id: string) =>
      request<import('./types').ArticleTemplate>('GET', `/templates/${id}`, token),

    create: (
      token: string,
      worldId: string,
      name: string,
      headerFields: import('./types').HeaderField[],
      modules: import('./types').ArticleModule[],
    ) =>
      request<import('./types').ArticleTemplate>('POST', '/templates', token, {
        worldId,
        name,
        headerFields,
        modules,
      }),

    update: (
      token: string,
      id: string,
      name: string,
      headerFields: import('./types').HeaderField[],
      modules: import('./types').ArticleModule[],
    ) =>
      request<void>('PATCH', `/templates/${id}`, token, {
        name,
        headerFields,
        modules,
      }),

    remove: (token: string, id: string) =>
      request<void>('DELETE', `/templates/${id}`, token),
  },
}
