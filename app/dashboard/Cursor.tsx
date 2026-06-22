'use client'

import { useEffect, useRef } from 'react'

// A bespoke luminous cursor: a precise dot + a trailing ring that springs
// behind it and swells over interactive things. Desktop / fine-pointer only.
export default function Cursor({ accent }: { accent: string }) {
  const dot = useRef<HTMLDivElement>(null)
  const ring = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!window.matchMedia('(pointer: fine)').matches) return
    document.body.classList.add('luma-cursor-on')

    const s = { mx: innerWidth / 2, my: innerHeight / 2, rx: innerWidth / 2, ry: innerHeight / 2, active: false, down: false, over: false, hide: false }
    const interactive = 'a,button,[role="button"],.luma-tile,.luma-side-tab,.luma-tab,[data-cursor]'

    const onMove = (e: PointerEvent) => {
      s.mx = e.clientX; s.my = e.clientY; s.over = true
      const el = e.target as HTMLElement | null
      s.hide = /^(INPUT|TEXTAREA|SELECT)$/.test(el?.tagName || '')
      s.active = !s.hide && !!el?.closest?.(interactive)
    }
    const onDown = () => { s.down = true }
    const onUp = () => { s.down = false }
    const onLeave = () => { s.over = false }

    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('pointerdown', onDown)
    window.addEventListener('pointerup', onUp)
    document.addEventListener('mouseleave', onLeave)

    let raf = 0
    const loop = () => {
      s.rx += (s.mx - s.rx) * 0.2
      s.ry += (s.my - s.ry) * 0.2
      const shown = s.over && !s.hide
      if (dot.current) {
        dot.current.style.opacity = shown ? '1' : '0'
        dot.current.style.transform = `translate(${s.mx}px, ${s.my}px) translate(-50%,-50%) scale(${s.down ? 0.55 : 1})`
      }
      if (ring.current) {
        const sc = (s.active ? 1.9 : 1) * (s.down ? 0.82 : 1)
        ring.current.style.opacity = shown ? (s.active ? '1' : '0.55') : '0'
        ring.current.style.transform = `translate(${s.rx}px, ${s.ry}px) translate(-50%,-50%) scale(${sc})`
        ring.current.style.background = s.active ? `color-mix(in srgb, ${accent} 13%, transparent)` : 'transparent'
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(raf)
      document.body.classList.remove('luma-cursor-on')
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointerup', onUp)
      document.removeEventListener('mouseleave', onLeave)
    }
  }, [accent])

  return (
    <>
      <div ref={ring} className="luma-cur" style={{ width: 36, height: 36, border: `1.5px solid ${accent}`, opacity: 0, transition: 'background .25s ease, opacity .2s ease', boxShadow: `0 0 16px -3px ${accent}` }} />
      <div ref={dot} className="luma-cur" style={{ width: 7, height: 7, background: accent, opacity: 0, boxShadow: `0 0 10px ${accent}` }} />
    </>
  )
}
