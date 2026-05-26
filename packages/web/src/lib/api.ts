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
  },

  articles: {
    get: (token: string, id: string) =>
      request<import('./types').ArticleWithRelations>('GET', `/articles/${id}`, token),

    create: (
      token: string,
      worldId: string,
      title: string,
      content: import('./types').TipTapContent
    ) => request<{ id: string }>('POST', '/articles', token, { worldId, title, content }),

    update: (
      token: string,
      id: string,
      worldId: string,
      title: string,
      content: import('./types').TipTapContent
    ) => request<void>('PATCH', `/articles/${id}`, token, { worldId, title, content }),

    search: (token: string, worldId: string, q: string) =>
      request<import('./types').ArticleSuggestion[]>(
        'GET',
        `/articles/search?worldId=${encodeURIComponent(worldId)}&q=${encodeURIComponent(q)}`,
        token
      ),
  },
}
