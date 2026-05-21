const STORAGE_KEY = 'ntv_dl_tokens'

function getTokenMap(): Record<string, string> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Record<string, string>) : {}
  } catch {
    return {}
  }
}

export function getDownloadToken(trackId: string): string | null {
  return getTokenMap()[trackId] ?? null
}

export function saveDownloadToken(trackId: string, token: string): void {
  if (typeof window === 'undefined') return
  const map = getTokenMap()
  map[trackId] = token
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
}
