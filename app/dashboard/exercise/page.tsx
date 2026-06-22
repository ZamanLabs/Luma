'use client'

import { createClient } from '@/utils/supabase/client'
import { useEffect, useCallback, useState, useRef } from 'react'
import { useTheme } from '../../ThemeContext'
import { animate, stagger } from 'animejs'
import { styles, PageHeader, CardLabel, Loader, EmptyState, WeekChart, lastNDays, Icon, serif, sans } from '../ui'
import { cacheGet, cacheSet } from '../cache'
import { useToast } from '../Toast'

type ExerciseLog = { id: string; type: string; duration_minutes: number; notes: string; date: string; time: string }
type Day = { date: string; value: number }
type Cache = { acts: ExerciseLog[]; week: Day[] }

const EX_TYPES = ['🚶 Walk', '🏃 Jog', '🏋️ Gym', '🚴 Cycling', '🧘 Yoga', '🏊 Swim', '⚽ Sport', 'Other']
const PRESETS: { type: string; mins: number }[] = [
  { type: '🚶 Walk', mins: 30 },
  { type: '🏃 Jog', mins: 20 },
  { type: '🏋️ Gym', mins: 45 },
  { type: '🚴 Cycling', mins: 30 },
  { type: '🧘 Yoga', mins: 20 },
]
const todayStr = () => new Date().toISOString().slice(0, 10)
const timeNow = () => new Date().toTimeString().slice(0, 5)
const fmtDate = (d: string) => new Date(d + 'T12:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
const fmtTimer = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

export default function ExercisePage() {
  const supabase = createClient()
  const { theme } = useTheme()
  const toast = useToast()

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
  const [week, setWeek] = useState<Day[]>([])
  const [timerOn, setTimerOn] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

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
    const key = `exercise:${uid}:${date}`
    const cached = cacheGet<Cache>(key)
    if (cached) {
      setActs(cached.acts); setWeek(cached.week); setLoading(false)
      runAnimations(cached.acts)
    } else {
      setLoading(true)
      setDispMins(0); setDispActs(0)
    }

    const days = lastNDays(7, date)
    const [logsRes, weekRes] = await Promise.all([
      supabase.from('exercise_logs').select('*').eq('user_id', uid).eq('date', date).order('created_at', { ascending: true }),
      supabase.from('exercise_logs').select('duration_minutes, date').eq('user_id', uid).gte('date', days[0]).lte('date', days[6]),
    ])
    const items = logsRes.data || []
    const byDate: Record<string, number> = {}
    weekRes.data?.forEach((r: { duration_minutes: number; date: string }) => { byDate[r.date] = (byDate[r.date] || 0) + r.duration_minutes })
    const weekData: Day[] = days.map(d => ({ date: d, value: byDate[d] || 0 }))

    cacheSet<Cache>(key, { acts: items, week: weekData })
    setActs(items); setWeek(weekData)
    const changed = !cached || items.length !== cached.acts.length || items.some((a, i) => a.id !== cached.acts[i]?.id)
    setLoading(false)
    if (changed) {
      runAnimations(items)
    } else {
      setDispMins(items.reduce((s, a) => s + a.duration_minutes, 0))
      setDispActs(items.length)
    }
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

  const logActivity = async (t: string, mins: number, n: string) => {
    if (!mins || mins <= 0 || !userId || viewDate !== todayStr()) return
    const now = Date.now()
    const entry = { user_id: userId, type: t, duration_minutes: Math.round(mins), notes: n.trim(), date: viewDate, time: timeNow(), updated_at: now, created_at: now }
    const { data, error } = await supabase.from('exercise_logs').insert(entry).select().single()
    if (error || !data) {
      toast.error("Couldn't save that activity", { onRetry: () => logActivity(t, mins, n) })
      return
    }
    const next = [...acts, data]
    setActs(next)
    setDispMins(prev => prev + data.duration_minutes)
    setDispActs(prev => prev + 1)
    adjustWeek(data.date, data.duration_minutes, next)
  }

  const addActivity = async () => {
    await logActivity(type, parseInt(duration), notes)
    setDuration(''); setNotes('')
  }

  // Start/stop timer — logs the selected activity type with the elapsed minutes.
  const startTimer = () => {
    setTimerOn(true); setElapsed(0)
    if (timerRef.current) clearInterval(timerRef.current)
    const start = Date.now()
    timerRef.current = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 1000)
  }
  const stopTimer = async () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    const mins = Math.max(1, Math.round(elapsed / 60))
    setTimerOn(false); setElapsed(0)
    await logActivity(type, mins, '')
  }
  const cancelTimer = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    setTimerOn(false); setElapsed(0)
  }
  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current) }, [])

  const deleteActivity = (id: string) => {
    if (viewDate !== todayStr()) return
    const idx = acts.findIndex(a => a.id === id)
    if (idx < 0) return
    const item = acts[idx]
    const next = acts.filter(a => a.id !== id)
    setActs(next)
    setDispMins(prev => prev - item.duration_minutes)
    setDispActs(prev => prev - 1)
    adjustWeek(item.date, -item.duration_minutes, next)
    const restore = () => {
      const r = [...next.slice(0, idx), item, ...next.slice(idx)]
      setActs(r)
      setDispMins(prev => prev + item.duration_minutes)
      setDispActs(prev => prev + 1)
      adjustWeek(item.date, item.duration_minutes, r)
    }
    toast.undo('Activity removed', {
      onUndo: restore,
      onCommit: async () => {
        const { error } = await supabase.from('exercise_logs').delete().eq('id', id)
        if (error) { restore(); toast.error("Couldn't delete — restored it") }
      },
    })
  }

  const adjustWeek = (date: string, delta: number, items: ExerciseLog[]) => {
    const next = week.map(d => d.date === date ? { ...d, value: Math.max(0, d.value + delta) } : d)
    setWeek(next)
    if (userId) cacheSet<Cache>(`exercise:${userId}:${viewDate}`, { acts: items, week: next })
  }

  const prevDate = () => { const d = new Date(viewDate + 'T12:00'); d.setDate(d.getDate() - 1); setViewDate(d.toISOString().slice(0, 10)) }
  const nextDate = () => { const d = new Date(viewDate + 'T12:00'); d.setDate(d.getDate() + 1); const nd = d.toISOString().slice(0, 10); if (nd <= todayStr()) setViewDate(nd) }

  const isToday = viewDate === todayStr()
  const totalMins = acts.reduce((s, a) => s + a.duration_minutes, 0)

  const s = styles(theme)
  const inp = s.input

  if (loading) return <Loader t={theme} />

  return (
    <div className="luma-page" style={s.page}>

      <div ref={headerRef} style={{ opacity: 0 }}>
        <PageHeader t={theme} eyebrow="Movement" title={isToday ? 'Today' : fmtDate(viewDate)}
          right={
            <button className="luma-ghost" onClick={() => { setShowHistory(!showHistory); if (showHistory) setViewDate(todayStr()) }}
              style={{ ...s.ghostBtn, ...(showHistory ? { borderColor: theme.accent, color: theme.accent } : {}) }}>
              <Icon name={showHistory ? 'arrowRight' : 'calendar'} size={14} />
              {showHistory ? 'Today' : 'History'}
            </button>
          } />
      </div>

      {showHistory && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <button className="luma-icon-btn" onClick={prevDate} style={s.iconBtn}><Icon name="chevronLeft" size={16} /></button>
          <div style={{ flex: 1, textAlign: 'center', fontSize: 13, color: theme.txt, fontWeight: 500, fontFamily: sans }}>{isToday ? 'Today' : fmtDate(viewDate)}</div>
          <button className="luma-icon-btn" onClick={nextDate} disabled={isToday} style={{ ...s.iconBtn, opacity: isToday ? 0.35 : 1, cursor: isToday ? 'default' : 'pointer' }}><Icon name="chevronRight" size={16} /></button>
        </div>
      )}

      <div ref={statsRef} style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
        {[
          { val: dispActs, label: 'Activities', color: theme.blue },
          { val: dispMins, label: 'Minutes', color: theme.green },
          { val: (totalMins / 60).toFixed(1), label: 'Hours', color: theme.accent },
        ].map(st => (
          <div key={st.label} className="stat-box luma-card" style={{ flex: 1, background: `linear-gradient(170deg, ${theme.c1}, ${theme.bg})`, border: `1px solid ${theme.border}`, borderRadius: 18, padding: '16px 10px', textAlign: 'center', opacity: 0, boxShadow: `0 18px 40px -28px rgba(0,0,0,0.7)` }}>
            <div style={{ fontSize: 34, color: st.color, lineHeight: 1, fontFamily: serif, fontVariantNumeric: 'tabular-nums' }}>{st.val}</div>
            <div style={{ ...s.label, fontSize: 9.5, marginTop: 7 }}>{st.label}</div>
          </div>
        ))}
      </div>

      {week.length > 0 && (
        <div className="luma-card" style={s.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 18 }}>
            <CardLabel t={theme} style={{ marginBottom: 0 }}>This Week</CardLabel>
            <span style={{ fontSize: 11.5, color: theme.muted, fontFamily: sans }}>
              total <strong style={{ color: theme.txt, fontFamily: serif, fontSize: 15 }}>{week.reduce((a, d) => a + d.value, 0)}</strong> min
            </span>
          </div>
          <WeekChart t={theme} color={theme.green} data={week.map(d => d.date === viewDate ? { ...d, value: totalMins } : d)} fmt={v => Math.round(v) + 'm'} />
        </div>
      )}

      {isToday && (
        <div ref={formRef} className="luma-card" style={{ ...s.card, opacity: 0 }}>
          <CardLabel t={theme}>Log Activity</CardLabel>

          <div style={{ marginBottom: 14 }}>
            <div style={{ ...s.label, fontSize: 9, color: theme.sub, marginBottom: 9 }}>Quick log — tap to add</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
              {PRESETS.map(p => (
                <button key={p.type} className="luma-btn" onClick={() => logActivity(p.type, p.mins, '')} title={`Log ${p.type} · ${p.mins} min`}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: theme.c2, border: `1px solid ${theme.border}`, borderRadius: 999, padding: '7px 12px', cursor: 'pointer', fontFamily: sans, fontSize: 12.5, color: theme.txt }}>
                  <span>{p.type}</span>
                  <span style={{ color: theme.accent, fontFamily: serif, fontSize: 14, fontVariantNumeric: 'tabular-nums' }}>{p.mins}m</span>
                </button>
              ))}
            </div>
          </div>

          {/* Timer */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, padding: '12px 14px', borderRadius: 14, background: theme.c2, border: `1px solid ${timerOn ? theme.accent : theme.border}` }}>
            <Icon name="clock" size={18} stroke={1.8} />
            {timerOn ? (
              <>
                <span style={{ fontFamily: serif, fontSize: 26, color: theme.accent, fontVariantNumeric: 'tabular-nums', minWidth: 64 }}>{fmtTimer(elapsed)}</span>
                <span style={{ fontSize: 12, color: theme.muted, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{type}</span>
                <button className="luma-btn" onClick={stopTimer} style={{ ...s.primaryBtn, padding: '9px 16px', fontSize: 12.5 }}>Stop &amp; log</button>
                <button className="luma-icon-btn" onClick={cancelTimer} style={s.iconBtn}><Icon name="x" size={14} /></button>
              </>
            ) : (
              <>
                <span style={{ fontSize: 12.5, color: theme.muted, flex: 1, fontFamily: sans }}>Time a workout — logs as <span style={{ color: theme.txt }}>{type}</span></span>
                <button className="luma-btn" onClick={startTimer} style={{ ...s.ghostBtn, borderColor: theme.accent, color: theme.accent }}>Start timer</button>
              </>
            )}
          </div>

          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <select className="luma-input" value={type} onChange={e => setType(e.target.value)} style={{ ...inp, flex: 1, cursor: 'pointer' }}>
              {EX_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
            <input className="luma-input" value={duration} onChange={e => setDuration(e.target.value)} type="number" placeholder="mins" style={{ ...inp, width: 84 }} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input className="luma-input" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes (optional)" onKeyDown={e => e.key === 'Enter' && addActivity()} style={{ ...inp, flex: 1 }} />
            <button className="luma-btn" onClick={addActivity} style={{ ...s.primaryBtn, display: 'inline-flex', alignItems: 'center', gap: 6 }}><Icon name="plus" size={16} stroke={2} />Log</button>
          </div>
        </div>
      )}

      {acts.length > 0 ? (
        <div ref={listRef} className="luma-card" style={s.card}>
          <CardLabel t={theme}>{isToday ? "Today's Activities" : fmtDate(viewDate)}</CardLabel>
          {acts.map((a, i) => (
            <div key={a.id} className="act-item luma-row" style={{ display: 'flex', alignItems: 'center', padding: '11px 0', borderBottom: i < acts.length - 1 ? `1px solid ${theme.border}` : 'none', gap: 9, opacity: 0 }}>
              <span style={s.chip(theme.blue)}>{a.type}</span>
              <div style={{ flex: 1, fontSize: 13, color: theme.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: sans }}>{a.notes}</div>
              <div style={{ fontFamily: serif, fontSize: 17, color: theme.muted, flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>{a.duration_minutes}<span style={{ fontFamily: sans, fontSize: 11, marginLeft: 2 }}>m</span></div>
              <div style={{ fontSize: 11, color: theme.sub, flexShrink: 0, fontFamily: sans, width: 38 }}>{a.time}</div>
              {isToday && <button className="luma-del luma-icon-btn" onClick={() => deleteActivity(a.id)} style={{ ...s.iconBtn, width: 24, height: 24 }}><Icon name="x" size={13} /></button>}
            </div>
          ))}
        </div>
      ) : (
        <EmptyState t={theme} icon="move" text={isToday ? 'No activities logged today.' : 'No activities on this day.'} hint={isToday ? 'Every movement counts.' : undefined} />
      )}
    </div>
  )
}