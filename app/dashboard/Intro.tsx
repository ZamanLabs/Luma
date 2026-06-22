'use client'

import { useEffect, useRef, useState } from 'react'
import { animate } from 'animejs'
import Bloom, { type BloomInput } from '../Bloom'
import { serif, sans } from './ui'

const todayStr = () => new Date().toISOString().slice(0, 10)
const greeting = () => {
  const h = new Date().getHours()
  if (h >= 5 && h < 12) return 'Good morning'
  if (h >= 12 && h < 17) return 'Good afternoon'
  if (h >= 17 && h < 22) return 'Good evening'
  return 'Still up'
}

// A once-a-day cinematic entrance: a seed of light grows into your bloom,
// then dissolves to reveal the dashboard. Instant on later visits.
export default function Intro() {
  const [show, setShow] = useState(false)
  const overlayRef = useRef<HTMLDivElement>(null)
  const wordRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let played = true
    try { played = localStorage.getItem('luma-intro') === todayStr() } catch {}
    if (played || reduce) return
    try { localStorage.setItem('luma-intro', todayStr()) } catch {}
    setShow(true)
  }, [])

  useEffect(() => {
    if (!show) return
    const tWord = setTimeout(() => {
      if (wordRef.current) animate(wordRef.current, { opacity: [0, 1], translateY: [16, 0], duration: 1000, ease: 'outExpo' })
    }, 650)
    const tOut = setTimeout(() => {
      if (overlayRef.current) animate(overlayRef.current, { opacity: [1, 0], duration: 750, ease: 'inOutQuad' })
      setTimeout(() => setShow(false), 760)
    }, 2200)
    return () => { clearTimeout(tWord); clearTimeout(tOut) }
  }, [show])

  if (!show) return null

  const bloom: BloomInput = {
    growth: 0.94, warmth: 1, motion: 0.5, petals: 24,
    seed: parseInt(todayStr().replace(/-/g, ''), 10) % 2147483647,
    green: '#72b07c', amber: '#e8a53a', off: '#c95f52', particle: '#9b7fc9',
  }

  return (
    <div ref={overlayRef} style={{
      position: 'fixed', inset: 0, zIndex: 300,
      background: 'radial-gradient(130% 90% at 50% 42%, #0c0a07 0%, #040302 75%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{ width: 'min(560px, 92vw)' }}>
        <Bloom input={bloom} height={300} />
      </div>
      <div ref={wordRef} style={{ opacity: 0, marginTop: -18, textAlign: 'center' }}>
        <div style={{ fontFamily: serif, fontSize: 52, color: '#f4ecdd', letterSpacing: '-0.03em', lineHeight: 1, textShadow: '0 0 50px rgba(232,165,58,0.3)' }}>Luma</div>
        <div style={{ fontFamily: sans, fontSize: 11, letterSpacing: '0.24em', textTransform: 'uppercase', color: 'rgba(240,230,214,0.42)', marginTop: 10, fontWeight: 500 }}>{greeting()}</div>
      </div>
    </div>
  )
}
