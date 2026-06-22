'use client'

import { useEffect, useRef } from 'react'

const mulberry = (a: number) => () => {
  a |= 0; a = a + 0x6D2B79F5 | 0
  let t = Math.imul(a ^ a >>> 15, 1 | a)
  t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t
  return ((t ^ t >>> 14) >>> 0) / 4294967296
}

// A tiny, cheap, always-present bloom — the brand mark, alive. Pauses when hidden.
export default function Ember({ size = 34 }: { size?: number }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const cv = ref.current
    if (!cv) return
    const ctx = cv.getContext('2d')
    if (!ctx) return
    const d = window.devicePixelRatio || 1
    cv.width = size * d; cv.height = size * d
    ctx.setTransform(d, 0, 0, d, 0, 0)

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const rnd = mulberry(7)
    const sparks = Array.from({ length: 14 }, () => ({ a: rnd() * 6.28, r: 0.35 + rnd() * 0.6, sp: 0.3 + rnd() * 1, ph: rnd() * 6.28, sz: 0.5 + rnd() * 1.2 }))
    const cx = size / 2, cy = size / 2
    const t0 = performance.now()
    let raf = 0

    const draw = (now: number) => {
      const t = (now - t0) / 1000
      ctx.clearRect(0, 0, size, size)
      ctx.globalCompositeOperation = 'lighter'
      const breathe = reduce ? 1 : 1 + Math.sin(t * 1.2) * 0.08

      const cr = size * 0.18 * breathe
      const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, cr * 2.6)
      core.addColorStop(0, 'rgba(255,242,214,0.95)')
      core.addColorStop(0.4, 'rgba(232,165,58,0.5)')
      core.addColorStop(1, 'rgba(232,165,58,0)')
      ctx.fillStyle = core
      ctx.beginPath(); ctx.arc(cx, cy, cr * 2.6, 0, 6.29); ctx.fill()

      for (const s of sparks) {
        const orbit = size * 0.16 + s.r * size * 0.22
        const a = s.a + (reduce ? 0 : t * s.sp * 0.5)
        const px = cx + Math.cos(a) * orbit, py = cy + Math.sin(a) * orbit
        const tw = 0.4 + 0.6 * Math.abs(Math.sin(t * s.sp * 2 + s.ph))
        const col = s.r > 0.62 ? '114,176,124' : '232,165,58'
        ctx.fillStyle = `rgba(${col},${0.6 * tw})`
        ctx.beginPath(); ctx.arc(px, py, s.sz, 0, 6.29); ctx.fill()
      }

      ctx.globalCompositeOperation = 'source-over'
      if (!reduce && !document.hidden) raf = requestAnimationFrame(draw)
    }

    if (reduce) draw(performance.now())
    else raf = requestAnimationFrame(draw)

    const onVis = () => { if (!document.hidden && !reduce) { cancelAnimationFrame(raf); raf = requestAnimationFrame(draw) } }
    document.addEventListener('visibilitychange', onVis)
    return () => { cancelAnimationFrame(raf); document.removeEventListener('visibilitychange', onVis) }
  }, [size])

  return <canvas ref={ref} aria-hidden="true" style={{ width: size, height: size, display: 'block' }} />
}
