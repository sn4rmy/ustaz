import type { TokenPair } from './types'

const ACCESS_KEY = 'ustaz_access_token'
const REFRESH_KEY = 'ustaz_refresh_token'

// localStorage can throw in private mode or with blocked site data.
function read(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function write(key: string, value: string | null): void {
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, value)
  } catch {
    // The session then lives only until the page is reloaded.
  }
}

export const tokens = {
  access: () => read(ACCESS_KEY),
  refresh: () => read(REFRESH_KEY),
  save(pair: Pick<TokenPair, 'access_token' | 'refresh_token'>) {
    write(ACCESS_KEY, pair.access_token)
    write(REFRESH_KEY, pair.refresh_token)
  },
  saveAccess(accessToken: string) {
    write(ACCESS_KEY, accessToken)
  },
  clear() {
    write(ACCESS_KEY, null)
    write(REFRESH_KEY, null)
  },
}
