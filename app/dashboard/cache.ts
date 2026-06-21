// Session-scoped in-memory cache so navigating between dashboard tabs is
// instant (stale-while-revalidate): a revisited tab renders cached data
// immediately while a fresh fetch revalidates in the background. Cleared on
// a full page reload — it only needs to survive client-side navigation.
const store = new Map<string, unknown>()

export function cacheGet<T>(key: string): T | undefined {
  return store.get(key) as T | undefined
}

export function cacheSet<T>(key: string, value: T): void {
  store.set(key, value)
}
