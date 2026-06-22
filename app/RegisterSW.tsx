'use client'

import { useEffect } from 'react'

// Registers the service worker so Luma is installable and works offline.
// Safe to run everywhere — the SW itself never caches auth/API responses.
export default function RegisterSW() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    const register = () =>
      navigator.serviceWorker
        .register('/sw.js', { scope: '/', updateViaCache: 'none' })
        .catch(() => {})
    if (document.readyState === 'complete') register()
    else {
      window.addEventListener('load', register, { once: true })
      return () => window.removeEventListener('load', register)
    }
  }, [])
  return null
}
