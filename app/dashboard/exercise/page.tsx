'use client'

import { createClient } from '@/utils/supabase/client'
import { useEffect, useCallback, useState, useRef } from 'react'
import { useTheme } from '../../ThemeContext'
import { animate, stagger } from 'animejs'

type ExerciseLog = { id: string; type: string; duration_minutes: number; notes: string; date: string; time: string }

const EX_TYPES = ['🚶 Walk', '🏃 Jog', '🏋️ Gym', '🚴 Cycling', '🧘 Yoga', '🏊 Swim', '⚽ Sport', 'Other']
const todayStr = () => new Date().toISOString().slice(0, 10)
const timeNow = () => new Date().toTimeString().slice(0, 5)
const fmtDate = (d: string) => new Date(d + 'T12:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })

export default function ExercisePage() {
  const supabase = createClient()
  const { theme } = useTheme()

  const [acts, setActs] = useState<ExerciseLog[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [type, setType] = useState('🚶 Walk')
  const [duration, setDuration] = useState('')
  const [notes, setNotes] = useState('')
  const [viewDate, setViewDate] = useState(todayStr())
  const [showHistory, setShowHistory] = useState(false)
  const [dispMins, setDispMins] = useState(0)
  const [dispActs, setDispActs] = useState(0)

  const headerRef = useRef<HTMLDivElement>(null)
  const statsRef = useRef<HTMLDivElement>(null)
  const formRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const runAnimations = useCallback((items: ExerciseLog[]) => {
    setTimeout(() => {
      if (headerRef.current) animate(headerRef.current, { opacity: [0, 1], translateY: [16, 0], duration: 600, ease: 'outExpo' })

      if (statsRef.current) {
        animate(statsRef.current.querySelectorAll('.stat-box'), {
          opacity: [0, 1], translateY: [16, 0], scale: [0.95, 1],
          delay: stagger(80), duration: 600, ease: 'outExpo',
        })
      }

      if (formRef.current) animate(formRef.current, { opacity: [0, 1], translateY: [20, 0], duration: 600, delay: 300, ease: 'outExpo' })

      const mins = items.reduce((s, a) => s + a.duration_minutes, 0)
      const minsObj = { val: 0 }
      animate(minsObj, { val: { to: mins }, duration: 1000, delay: 100, ease: 'outExpo', onUpdate: () => setDispMins(Math.round(minsObj.val)) })

      const actsObj = { val: 0 }
      animate(actsObj, { val: { to: items.length }, duration: 800, delay: 150, ease: 'outExpo', onUpdate: () => setDispActs(Math.round(actsObj.val)) })

      if (listRef.current && items.length > 0) {
        animate(listRef.current.querySelectorAll('.act-item'), {
          opacity: [0, 1], translateX: [-12, 0],
          delay: stagger(60, { start: 350 }), duration: 500, ease: 'outExpo',
        })
      }
    }, 50)
  }, [])

  const loadData = useCallback(async (date: string, uid: string) => {
    setLoading(true)
    setDispMins(0); setDispActs(0)
    const { data } = await supabase.from('exercise_logs').select('*').eq('user_id', uid).eq('date', date).order('created_at', { ascending: true })
    const items = data || []
    setActs(items)
    setLoading(false)
    runAnimations(items)
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

  const addActivity = async () => {
    if (!duration || !userId || viewDate !== todayStr()) return
    const now = Date.now()
    const entry = { user_id: userId, type, duration_minutes: parseInt(duration), notes: notes.trim(), date: viewDate, time: timeNow(), updated_at: now, created_at: now }
    const { data } = await supabase.from('exercise_logs').insert(entry).select().single()
    if (data) {
      setActs(prev => [...prev, data])
      setDispMins(prev => prev + data.duration_minutes)
      setDispActs(prev => prev + 1)
    }
    setDuration(''); setNotes('')
  }

  const deleteActivity = async (id: string) => {
    if (viewDate !== todayStr()) return
    await supabase.from('exercise_logs').delete().eq('id', id)
    setActs(prev => prev.filter(a => a.id !== id))
  }

  const prevDate = () => { const d = new Date(viewDate + 'T12:00'); d.setDate(d.getDate() - 1); setViewDate(d.toISOString().slice(0, 10)) }
  const nextDate = () => { const d = new Date(viewDate + 'T12:00'); d.setDate(d.getDate() + 1); const nd = d.toISOString().slice(0, 10); if (nd <= todayStr()) setViewDate(nd) }

  const isToday = viewDate === todayStr()
  const totalMins = acts.reduce((s, a) => s + a.duration_minutes, 0)

  const inp = { background: theme.c2, border: `1px solid ${theme.border}`, borderRadius: 10, padding: '10px 12px', color: theme.txt, fontSize: 14, outline: 'none' } as const
  const card = { background: theme.c1, border: `1px solid ${theme.border}`, borderRadius: 16, padding: 18, marginBottom: 14 } as const

  if (loading) return <div style={{ padding: 24, color: theme.muted }}>Loading...</div>

  return (
    <div style={{ padding: '20px 16px', maxWidth: 480, margin: '0 auto' }}>

      <div ref={headerRef} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, opacity: 0 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: theme.accent, marginBottom: 2 }}>Movement</h1>
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

      <div ref={statsRef} style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
        {[
          { val: dispActs, label: 'Activities', color: theme.blue },
          { val: dispMins, label: 'Minutes', color: theme.green },
          { val: (totalMins / 60).toFixed(1), label: 'Hours', color: theme.accent },
        ].map(s => (
          <div key={s.label} className="stat-box" style={{ flex: 1, background: theme.c1, border: `1px solid ${theme.border}`, borderRadius: 14, padding: '12px 10px', textAlign: 'center', opacity: 0 }}>
            <div style={{ fontSize: 26, fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.val}</div>
            <div style={{ fontSize: 10, color: theme.sub, marginTop: 4, textTransform: 'uppercase', letterSpacing: '.5px' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {isToday && (
        <div ref={formRef} style={{ ...card, opacity: 0 }}>
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.8px', color: theme.sub, marginBottom: 10 }}>Log Activity</div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <select value={type} onChange={e => setType(e.target.value)} style={{ ...inp, flex: 1, cursor: 'pointer' }}>
              {EX_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
            <input value={duration} onChange={e => setDuration(e.target.value)} type="number" placeholder="mins" style={{ ...inp, width: 80 }} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes (optional)" onKeyDown={e => e.key === 'Enter' && addActivity()} style={{ ...inp, flex: 1 }} />
            <button onClick={addActivity} style={{ background: theme.accent, border: 'none', borderRadius: 10, padding: '10px 20px', fontSize: 14, fontWeight: 700, cursor: 'pointer', color: theme.bg }}>Log</button>
          </div>
        </div>
      )}

      {acts.length > 0 ? (
        <div ref={listRef} style={card}>
          <div style={{ fontSize: 15, fontWeight: 600, color: theme.txt, marginBottom: 14 }}>{isToday ? "Today's Activities" : fmtDate(viewDate)}</div>
          {acts.map((a, i) => (
            <div key={a.id} className="act-item" style={{ display: 'flex', alignItems: 'center', padding: '9px 0', borderBottom: i < acts.length - 1 ? `1px solid ${theme.border}` : 'none', gap: 8, opacity: 0 }}>
              <span style={{ fontSize: 11, padding: '3px 9px', borderRadius: 7, fontWeight: 500, background: theme.blue + '22', color: theme.blue, flexShrink: 0 }}>{a.type}</span>
              <div style={{ flex: 1, fontSize: 13, color: theme.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.notes}</div>
              <div style={{ fontSize: 13, color: theme.muted, flexShrink: 0 }}>{a.duration_minutes} min</div>
              <div style={{ fontSize: 11, color: theme.sub, flexShrink: 0 }}>{a.time}</div>
              {isToday && <button onClick={() => deleteActivity(a.id)} style={{ background: 'transparent', border: `1px solid ${theme.border}`, color: theme.sub, borderRadius: 7, padding: '3px 8px', fontSize: 11, cursor: 'pointer' }}>✕</button>}
            </div>
          ))}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '36px 0', color: theme.sub }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>🏃</div>
          <div style={{ fontSize: 13 }}>{isToday ? 'No activities logged today.' : 'No activities on this day.'}</div>
          {isToday && <div style={{ fontSize: 12, marginTop: 4 }}>Every movement counts.</div>}
        </div>
      )}
    </div>
  )
}