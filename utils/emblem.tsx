import type { ReactElement } from 'react'

// The Luma app-icon mark, rendered to PNG by next/og for the manifest + apple icon.
// Kept Satori-safe: solid fills + a linear gradient, no radial-gradient/blur filters.
export function emblem(size: number, opts: { maskable?: boolean } = {}): ReactElement {
  const ring = opts.maskable ? 0.56 : 0.68
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0e0c09' }}>
      <div style={{
        width: size * ring, height: size * ring, borderRadius: 9999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(135deg, #f2b54e, #cf8327)',
        boxShadow: `0 0 ${size * 0.13}px ${size * 0.02}px rgba(232,165,58,0.55)`,
      }}>
        <div style={{ fontSize: size * 0.42, fontWeight: 700, color: '#0e0c09', marginTop: -size * 0.03, fontFamily: 'Georgia, serif' }}>L</div>
      </div>
    </div>
  )
}
