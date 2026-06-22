'use client'

import { useEffect, useRef } from 'react'

export type BloomInput = {
  growth: number   // 0..1 — how much of today is logged (fullness)
  warmth: number   // 0..1 — on-track (1 = calm gold/green, 0 = restless/red)
  motion: number   // 0..1 — movement energy (orbit speed + particles)
  petals: number   // petal count, from entries logged
  seed: number     // per-day seed so today's form is stable but unique
  green: string; amber: string; off: string; particle: string
}

const toRgb = (hex: string): [number, number, number] => {
  const h = hex.replace('#', '')
  const f = h.length === 3 ? h.split('').map(c => c + c).join('') : h
  const n = parseInt(f, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const mulberry = (a: number) => () => {
  a |= 0; a = a + 0x6D2B79F5 | 0
  let t = Math.imul(a ^ a >>> 15, 1 | a)
  t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t
  return ((t ^ t >>> 14) >>> 0) / 4294967296
}

export default function Bloom({ input, height = 320 }: { input: BloomInput; height?: number }) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const target = useRef(input)
  target.current = input
  const cur = useRef({ growth: 0, warmth: input.warmth, motion: input.motion })

  useEffect(() => {
    const canvas = canvasRef.current, wrap = wrapRef.current
    if (!canvas || !wrap) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let W = wrap.clientWidth || 320
    const H = height
    const resize = () => {
      W = wrap.clientWidth || 320
      const d = window.devicePixelRatio || 1
      canvas.width = W * d; canvas.height = H * d
      canvas.style.width = W + 'px'; canvas.style.height = H + 'px'
      ctx.setTransform(d, 0, 0, d, 0, 0)
    }
    resize()
    const ro = new ResizeObserver(resize); ro.observe(wrap)

    const rnd = mulberry(input.seed || 1)
    const parts = Array.from({ length: 190 }, () => ({ r: 0.15 + rnd() * 0.9, a: rnd() * Math.PI * 2, ph: rnd() * Math.PI * 2, sp: 0.12 + rnd() * 0.8, sz: 0.5 + rnd() * 2.1, kind: rnd() }))
    const jit = Array.from({ length: 48 }, () => rnd())
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    // The bloom leans toward the cursor — the login spotlight, brought into the hero.
    const ptr = { x: 0, y: 0, active: false }
    const lean = { x: 0, y: 0 }
    const onPtr = (e: PointerEvent) => { const r = canvas.getBoundingClientRect(); ptr.x = e.clientX - r.left - W / 2; ptr.y = e.clientY - r.top - H / 2; ptr.active = true }
    const onPtrLeave = () => { ptr.active = false }
    if (!reduce) { wrap.addEventListener('pointermove', onPtr, { passive: true }); wrap.addEventListener('pointerleave', onPtrLeave) }

    const t0 = performance.now()
    let raf = 0

    const draw = (tms: number) => {
      const t = (tms - t0) / 1000
      const tg = target.current
      const c = cur.current
      c.growth = lerp(c.growth, tg.growth, 0.06)
      c.warmth = lerp(c.warmth, tg.warmth, 0.05)
      c.motion = lerp(c.motion, tg.motion, 0.05)
      const v = c.growth, warm = c.warmth, mo = c.motion
      const restless = 1 - warm

      const g = toRgb(tg.green), am = toRgb(tg.amber), off = toRgb(tg.off), pc = toRgb(tg.particle)
      const petalCol = [
        Math.round(lerp(g[0], off[0], restless * 0.85)),
        Math.round(lerp(g[1], off[1], restless * 0.85)),
        Math.round(lerp(g[2], off[2], restless * 0.85)),
      ].join(',')
      const amberCol = am.join(',')

      const tx = ptr.active ? Math.max(-32, Math.min(32, ptr.x * 0.13)) : 0
      const ty = ptr.active ? Math.max(-24, Math.min(24, ptr.y * 0.13)) : 0
      lean.x += (tx - lean.x) * 0.06; lean.y += (ty - lean.y) * 0.06
      const cx = W / 2 + lean.x, cy = H / 2 + lean.y
      const R = Math.min(W, H)
      ctx.clearRect(0, 0, W, H)
      ctx.globalCompositeOperation = 'lighter'

      // Glow field — fills the whole stage so the void reads as a lit room, not black.
      const halo = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.hypot(W, H) * 0.55)
      halo.addColorStop(0, `rgba(${amberCol},${(0.10 + v * 0.12) * (0.4 + warm * 0.6)})`)
      halo.addColorStop(0.35, `rgba(${petalCol},${0.05 + v * 0.05})`)
      halo.addColorStop(0.75, `rgba(${petalCol},0.02)`)
      halo.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = halo; ctx.fillRect(0, 0, W, H)

      const tremor = reduce ? 0 : restless * (Math.sin(t * 9) * 0.5 + Math.sin(t * 13.7) * 0.5) * 7
      const breathe = reduce ? 1 : 1 + Math.sin(t * 0.9) * 0.022
      const rot = reduce ? 0 : t * (0.05 + mo * 0.13)
      const maxLen = R * 0.4
      const petals = Math.max(6, Math.round(tg.petals))

      for (let layer = 3; layer >= 0; layer--) {
        for (let i = 0; i < petals; i++) {
          const j = jit[i % jit.length]
          const ang = (i / petals) * Math.PI * 2 + rot * (1 + layer * 0.15) + layer * 0.22 + j * 0.6 * restless
          const wob = reduce ? 0 : Math.sin(t * 0.8 + i + layer) * 4
          const len = (maxLen * (0.4 + v * 0.6) - layer * maxLen * 0.11 + wob + tremor * j) * breathe * (0.72 + j * 0.55)
          const wid = 9 + v * 16 - layer * 2.2
          const amber = i % 5 === 0
          const col = amber ? amberCol : petalCol
          const alpha = Math.max(0, (amber ? 0.11 : 0.08) * warm + 0.04 + v * 0.05 - layer * 0.012)
          ctx.save(); ctx.translate(cx, cy); ctx.rotate(ang)
          ctx.beginPath(); ctx.moveTo(0, 0)
          const L = Math.max(8, len)
          ctx.quadraticCurveTo(wid, -L * 0.5, 0, -L)
          ctx.quadraticCurveTo(-wid, -L * 0.5, 0, 0); ctx.closePath()
          const lg = ctx.createLinearGradient(0, 0, 0, -L)
          lg.addColorStop(0, `rgba(${col},0)`)
          lg.addColorStop(0.45, `rgba(${col},${alpha})`)
          lg.addColorStop(1, `rgba(${col},0)`)
          ctx.fillStyle = lg; ctx.fill(); ctx.restore()
        }
      }

      const coreR = (15 + v * 18) * breathe
      const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR * 2.8)
      core.addColorStop(0, `rgba(255,242,214,${0.6 + v * 0.35})`)
      core.addColorStop(0.4, `rgba(${amberCol},${(0.3 + v * 0.25) * (0.5 + warm * 0.5) + 0.1})`)
      core.addColorStop(1, `rgba(${amberCol},0)`)
      ctx.fillStyle = core; ctx.beginPath(); ctx.arc(cx, cy, coreR * 2.8, 0, Math.PI * 2); ctx.fill()

      const pcount = Math.round(Math.max(0.18, v) * parts.length)
      for (let i = 0; i < pcount; i++) {
        const p = parts[i]
        const orbit = R * 0.16 + p.r * R * 0.33
        const dir = p.r < 0.5 ? 1 : -1
        const a = p.a + (reduce ? 0 : t * p.sp * (0.2 + mo * 0.6) * dir)
        const px = cx + Math.cos(a) * orbit * breathe
        const py = cy + Math.sin(a) * orbit * breathe
        const tw = 0.4 + 0.6 * Math.abs(Math.sin(t * p.sp * 2 + p.ph))
        const hue = p.kind < 0.18 ? amberCol : p.kind > 0.85 ? pc.join(',') : petalCol
        ctx.fillStyle = `rgba(${hue},${0.5 * tw * Math.min(1, v + 0.2)})`
        ctx.beginPath(); ctx.arc(px, py, p.sz * (0.6 + v * 0.6), 0, Math.PI * 2); ctx.fill()
      }

      ctx.globalCompositeOperation = 'source-over'
      if (!reduce) raf = requestAnimationFrame(draw)
    }

    if (reduce) {
      cur.current = { growth: target.current.growth, warmth: target.current.warmth, motion: target.current.motion }
      draw(performance.now())
    } else {
      raf = requestAnimationFrame(draw)
    }

    return () => {
      cancelAnimationFrame(raf); ro.disconnect()
      wrap.removeEventListener('pointermove', onPtr); wrap.removeEventListener('pointerleave', onPtrLeave)
    }
  }, [height, input.seed])

  return <div ref={wrapRef} style={{ width: '100%', height }}><canvas ref={canvasRef} /></div>
}
