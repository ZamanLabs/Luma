'use client'

import { createClient } from '@/utils/supabase/client'
import { useEffect, useCallback, useState, useRef } from 'react'
import { useTheme } from '../../ThemeContext'
import { animate, stagger } from 'animejs'

type Pill = { id: string; name: string; scheduled_time: string }
type PillTaken = { pill_id: string }

const todayStr = () => new Date().toISOString().slice(0, 10)
const timeNow = () => new Date().toTimeString().slice(0, 5)
const fmtDate = (d: string) => new Date(d + 'T12:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })

const isDue = (t: string) => {
  const [sh, sm] = t.split(':').map(Number)
  const [nh, nm] = timeNow().split(':').map(Number)
  const diff = (sh * 60 + sm) - (nh * 60 + nm)
  return diff >= -10 && diff <= 30
}

export default function MedsPage() {
  const supabase = createClient()
  const { theme } = useTheme()

  const [pills, setPills] = useState<Pill[]>([])
  const [taken, setTaken] = useState<string[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [pillName, setPillName] = useState('')
  const [pillTime, setPillTime] = useState('')
  const [viewDate, setViewDate] = useState(todayStr())
  const [showHistory, setShowHistory] = useState(false)

  const headerRef = useRef<HTMLDivElement>(null)
  const pillsCardRef = useRef<HTMLDivElement>(null)
  const formRef = useRef<HTMLDivElement>(null)
  const barRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const runAnimations = useCallback((pillsList: Pill[], takenList: string[]) => {
    setTimeout(() => {
      if (headerRef.current) animate(headerRef.current, { opacity: [0, 1], translateY: [16, 0], duration: 600, ease: 'outExpo' })
      if (pillsCardRef.current) animate(pillsCardRef.current, { opacity: [0, 1], translateY: [20, 0], duration: 600, delay: 100, ease: 'outExpo' })
      if (formRef.current) animate(formRef.current, { opacity: [0, 1], translateY: [20, 0], duration: 600, delay: 200, ease: 'outExpo' })

      if (barRef.current && pillsList.length > 0) {
        const pct = Math.round(takenList.length / pillsList.length * 100)
        animate(barRef.current, { width: ['0%', `${pct}%`], duration: 1000, delay: 200, ease: 'outExpo' })
      }

      if (listRef.current && pillsList.length > 0) {
        animate(listRef.current.querySelectorAll('.pill-item'), {
          opacity: [0, 1], translateX: [-12, 0],
          delay: stagger(80, { start: 250 }), duration: 500, ease: 'outExpo',
        })
      }
    }, 50)
  }, [])

  const loadData = useCallback(async (date: string, uid: string) => {
    setLoading(true)
    const { data: pillData } = await supabase.from('pills').select('*').eq('user_id', uid).order('scheduled_time', { ascending: true })
    const { data: takenData } = await supabase.from('pills_taken').select('pill_id').eq('user_id', uid).eq('date_taken', date)
    const pillsList = pillData || []
    const takenList = takenData?.map((t: PillTaken) => t.pill_id) || []
    setPills(pillsList)
    setTaken(takenList)
    setLoading(false)
    runAnimations(pillsList, takenList)
  }, [supabase, runAnimations])

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)
      await loadData(viewDate, user.id)
    }
    init()
  }, [supabase, viewDate, loadData])

  const addPill = async () => {
    if (!pillName.trim() || !pillTime || !userId) return
    const now = Date.now()
    const { data } = await supabase.from('pills').insert({ user_id: userId, name: pillName.trim(), scheduled_time: pillTime, updated_at: now, created_at: now }).select().single()
    if (data) setPills(prev => [...prev, data].sort((a, b) => a.scheduled_time.localeCompare(b.scheduled_time)))
    setPillName(''); setPillTime('')
  }

  const deletePill = async (id: string) => {
    await supabase.from('pills').delete().eq('id', id)
    await supabase.from('pills_taken').delete().eq('pill_id', id)
    setPills(prev => prev.filter(p => p.id !== id))
    setTaken(prev => prev.filter(t => t !== id))
  }

  const toggleTaken = async (pillId: string) => {
    if (!userId || viewDate !== todayStr()) return
    if (taken.includes(pillId)) {
      await supabase.from('pills_taken').delete().eq('pill_id', pillId).eq('user_id', userId).eq('date_taken', viewDate)
      setTaken(prev => prev.filter(t => t !== pillId))
    } else {
      const now = Date.now()
      await supabase.from('pills_taken').insert({ user_id: userId, pill_id: pillId, date_taken: viewDate, updated_at: now, created_at: now })
      setTaken(prev => [...prev, pillId])
    }
  }

  const prevDate = () => { const d = new Date(viewDate + 'T12:00'); d.setDate(d.getDate() - 1); setViewDate(d.toISOString().slice(0, 10)) }
  const nextDate = () => { const d = new Date(viewDate + 'T12:00'); d.setDate(d.getDate() + 1); const nd = d.toISOString().slice(0, 10); if (nd <= todayStr()) setViewDate(nd) }

  const isToday = viewDate === todayStr()
  const pillsDone = pills.filter(p => taken.includes(p.id)).length
  const allDone = pills.length > 0 && pillsDone === pills.length

  const inp = { background: theme.c2, border: `1px solid ${theme.border}`, borderRadius: 10, padding: '10px 12px', color: theme.txt, fontSize: 14, outline: 'none' } as const
  const card = { background: theme.c1, border: `1px solid ${theme.border}`, borderRadius: 16, padding: 18, marginBottom: 14 } as const

  if (loading) return <div style={{ padding: 24, color: theme.muted }}>Loading...</div>

  return (
    <div style={{ padding: '20px 16px', maxWidth: 480, margin: '0 auto' }}>

      <div ref={headerRef} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, opacity: 0 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: theme.accent, marginBottom: 2 }}>Medications</h1>
          <p style={{ fontSize: 12, color: theme.sub }}>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
        </div>
        <button onClick={() => { setShowHistory(!showHistory); if (showHistory) setViewDate(todayStr()) }}
          style={{ background: showHistory ? theme.accent + '22' : 'transparent', border: `1px solid ${showHistory ? theme.accent : theme.border}`, borderRadius: 9, padding: '6px 12px', fontSize: 12, color: showHistory ? theme.accent : theme.muted, cursor: 'pointer' }}>
          {showHistory ? 'Back to Today' : '📅 History'}
        </button>
      </div>

      {showHistory && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <button onClick={prevDate} style={{ background: 'transparent', border: `1px solid ${theme.border}`, borderRadius: 9, padding: '7px 14px', fontSize: 13, color: theme.muted, cursor: 'pointer' }}>←</button>
          <div style={{ flex: 1, textAlign: 'center', fontSize: 13, color: theme.txt, fontWeight: 500 }}>{isToday ? 'Today' : fmtDate(viewDate)}</div>
          <button onClick={nextDate} disabled={isToday} style={{ background: 'transparent', border: `1px solid ${theme.border}`, borderRadius: 9, padding: '7px 14px', fontSize: 13, color: isToday ? theme.border : theme.muted, cursor: isToday ? 'default' : 'pointer' }}>→</button>
        </div>
      )}

      {pills.length > 0 && (
        <div ref={pillsCardRef} style={{ ...card, opacity: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: theme.txt }}>
              {allDone && isToday ? '✅ All taken!' : isToday ? "Today's Medications" : fmtDate(viewDate)}
            </div>
            <div style={{ fontSize: 13, color: theme.muted }}>
              <span style={{ color: allDone ? theme.green : theme.txt, fontWeight: 600 }}>{pillsDone}</span>/{pills.length} taken
            </div>
          </div>
          <div style={{ background: theme.c2, borderRadius: 6, height: 7, overflow: 'hidden', marginBottom: 16 }}>
            <div ref={barRef} style={{ height: '100%', borderRadius: 6, width: '0%', background: allDone ? theme.green : theme.accent }} />
          </div>
          <div ref={listRef}>
            {pills.map((p, i) => {
              const isTaken = taken.includes(p.id)
              const due = isToday && isDue(p.scheduled_time) && !isTaken
              return (
                <div key={p.id} className="pill-item" style={{ display: 'flex', alignItems: 'center', padding: '11px 0', borderBottom: i < pills.length - 1 ? `1px solid ${theme.border}` : 'none', gap: 12, opacity: 0 }}>
                  <div onClick={() => toggleTaken(p.id)} style={{
                    width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                    cursor: isToday ? 'pointer' : 'default',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: isTaken ? 'none' : due ? `2px solid ${theme.accent}` : `2px solid ${theme.border}`,
                    background: isTaken ? theme.green : 'transparent',
                    boxShadow: due ? `0 0 0 3px ${theme.accent}33` : 'none',
                    transition: 'all .2s',
                  }}>
                    {isTaken && <span style={{ color: theme.bg, fontSize: 13 }}>✓</span>}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, color: isTaken ? theme.sub : theme.txt, textDecoration: isTaken ? 'line-through' : 'none' }}>{p.name}</div>
                    <div style={{ fontSize: 11, color: theme.muted, marginTop: 1 }}>{p.scheduled_time}</div>
                  </div>
                  {due && <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6, fontWeight: 600, background: theme.accent + '22', color: theme.accent, flexShrink: 0 }}>Due Now</span>}
                  {isToday && <button onClick={() => deletePill(p.id)} style={{ background: 'transparent', border: `1px solid ${theme.border}`, color: theme.sub, borderRadius: 7, padding: '3px 8px', fontSize: 11, cursor: 'pointer' }}>✕</button>}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {isToday && (
        <div ref={formRef} style={{ ...card, opacity: 0 }}>
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.8px', color: theme.sub, marginBottom: 10 }}>Add Medication</div>
          <input value={pillName} onChange={e => setPillName(e.target.value)} placeholder="Medication name" style={{ ...inp, width: '100%', marginBottom: 10, boxSizing: 'border-box' }} />
          <div style={{ display: 'flex', gap: 8 }}>
            <input value={pillTime} onChange={e => setPillTime(e.target.value)} type="time" style={{ ...inp, flex: 1 }} />
            <button onClick={addPill} style={{ background: theme.accent, border: 'none', borderRadius: 10, padding: '10px 20px', fontSize: 14, fontWeight: 700, cursor: 'pointer', color: theme.bg }}>Add</button>
          </div>
          <div style={{ fontSize: 11, color: theme.sub, marginTop: 8 }}>Medications with &quot;Due Now&quot; appear 30 minutes before scheduled time.</div>
        </div>
      )}

      {pills.length === 0 && (
        <div style={{ textAlign: 'center', padding: '36px 0', color: theme.sub }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>💊</div>
          <div style={{ fontSize: 13 }}>No medications added yet.</div>
        </div>
      )}
    </div>
  )
}