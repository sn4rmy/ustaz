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

interface AuthHooks {
  // Gets a new access token for the refresh token; throws if it's no longer valid.
  refresh: (refreshToken: string) => Promise<string>
  // Called when the session can't be restored, so the app can show the login page.
  onSessionExpired: () => void
}

let authHooks: AuthHooks | null = null

export function configureAuth(hooks: AuthHooks | null): void {
  authHooks = hooks
}

// Parallel requests that all got 401 share one refresh call.
let refreshing: Promise<boolean> | null = null

function refreshAccessToken(): Promise<boolean> {
  const refreshToken = tokens.refresh()
  if (!authHooks || !refreshToken) return Promise.resolve(false)
  const hooks = authHooks
  refreshing ??= hooks
    .refresh(refreshToken)
    .then((accessToken) => {
      tokens.saveAccess(accessToken)
      return true
    })
    .catch(() => false)
    .finally(() => {
      refreshing = null
    })
  return refreshing
}

function expireSession(): void {
  tokens.clear()
  authHooks?.onSessionExpired()
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

async function send(path: string, options: RequestOptions): Promise<Response> {
  const { method = 'GET', body, auth = true } = options
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  const accessToken = auth ? tokens.access() : null
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`
  try {
    return await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new ApiError(0, 'network_error')
  }
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const auth = options.auth ?? true
  let response = await send(path, options)

  if (response.status === 401 && auth) {
    const detail = await readDetail(response)
    // The access token lives 30 minutes: get a new one and repeat the request once.
    if (detail === 'invalid_token' && (await refreshAccessToken())) {
      response = await send(path, options)
    } else {
      expireSession()
      throw new ApiError(401, detail)
    }
    if (response.status === 401) {
      const retryDetail = await readDetail(response)
      expireSession()
      throw new ApiError(401, retryDetail)
    }
  }

  if (!response.ok) throw new ApiError(response.status, await readDetail(response))
  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}
