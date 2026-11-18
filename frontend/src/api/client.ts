import { API_URL } from './config'
import { tokens } from './tokens'

// Every backend error has the form {"detail": "<code or text>"}.
export class ApiError extends Error {
  readonly status: number
  readonly detail: string

  constructor(status: number, detail: string) {
    super(detail)
    this.name = 'ApiError'
    this.status = status
    this.detail = detail
  }
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'
  body?: unknown
  // false for register, login and refresh: they work without a token.
  auth?: boolean
}

async function readDetail(response: Response): Promise<string> {
  try {
    const data: unknown = await response.json()
    if (data && typeof data === 'object' && 'detail' in data) {
      const { detail } = data as { detail: unknown }
      // 422 from FastAPI has a list of field errors instead of a code.
      return typeof detail === 'string' ? detail : 'validation_error'
    }
  } catch {
    // Not JSON, e.g. a proxy error page.
  }
  return `http_${response.status}`
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = true } = options
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  const accessToken = auth ? tokens.access() : null
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`

  let response: Response
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new ApiError(0, 'network_error')
  }

  if (!response.ok) throw new ApiError(response.status, await readDetail(response))
  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}
