'use client'

import { createClient } from '@/utils/supabase/client'
import { useEffect, useCallback, useState, useRef } from 'react'
import { useTheme } from '../../ThemeContext'
import { animate, stagger } from 'animejs'
import { styles, PageHeader, CardLabel, Loader, EmptyState, Ring, Icon, serif, sans } from '../ui'
import { cacheGet, cacheSet } from '../cache'
import { useToast } from '../Toast'
import { VT } from '../VT'

type MedCache = { pills: Pill[]; taken: string[] }

type Pill = { id: string; name: string; scheduled_time: string }
type PillTaken = { pill_id: string }

const todayStr = () => new Date().toISOString().slice(0, 10)
const timeNow = () => new Date().toTimeString().slice(0, 5)
const fmtDate = (d: string) => new Date(d + 'T12:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })

export default function MedsPage() {
  const supabase = createClient()
  const { theme } = useTheme()
  const toast = useToast()

  const [pills, setPills] = useState<Pill[]>([])
  const [taken, setTaken] = useState<string[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [pillName, setPillName] = useState('')
  const [pillTime, setPillTime] = useState('')
  const [viewDate, setViewDate] = useState(todayStr())
  const [showHistory, setShowHistory] = useState(false)
  const [notify, setNotify] = useState(false)
  const timers = useRef<number[]>([])

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
    const key = `meds:${uid}:${date}`
    const cached = cacheGet<MedCache>(key)
    if (cached) {
      setPills(cached.pills); setTaken(cached.taken); setLoading(false)
      runAnimations(cached.pills, cached.taken)
    } else {
      setLoading(true)
    }

    const [pillRes, takenRes] = await Promise.all([
      supabase.from('pills').select('*').eq('user_id', uid).order('scheduled_time', { ascending: true }),
      supabase.from('pills_taken').select('pill_id').eq('user_id', uid).eq('date_taken', date),
    ])
    const pillsList = pillRes.data || []
    const takenList = takenRes.data?.map((t: PillTaken) => t.pill_id) || []

    cacheSet<MedCache>(key, { pills: pillsList, taken: takenList })
    setPills(pillsList)
    setTaken(takenList)
    setLoading(false)
    const changed = !cached
      || pillsList.length !== cached.pills.length
      || pillsList.some((p, i) => p.id !== cached.pills[i]?.id)
      || takenList.length !== cached.taken.length
    if (changed) runAnimations(pillsList, takenList)
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
    const { data, error } = await supabase.from('pills').insert({ user_id: userId, name: pillName.trim(), scheduled_time: pillTime, updated_at: now, created_at: now }).select().single()
    if (error || !data) { toast.error("Couldn't add that medication"); return }
    const next = [...pills, data].sort((a, b) => a.scheduled_time.localeCompare(b.scheduled_time))
    setPills(next)
    syncCache(next, taken)
    setPillName(''); setPillTime('')
  }

  const deletePill = (id: string) => {
    const idx = pills.findIndex(p => p.id === id)
    if (idx < 0) return
    const item = pills[idx]
    const wasTaken = taken.includes(id)
    const nextPills = pills.filter(p => p.id !== id)
    const nextTaken = taken.filter(t => t !== id)
    setPills(nextPills); setTaken(nextTaken); syncCache(nextPills, nextTaken)
    const restore = () => {
      const rp = [...nextPills.slice(0, idx), item, ...nextPills.slice(idx)]
      const rt = wasTaken ? [...nextTaken, id] : nextTaken
      setPills(rp); setTaken(rt); syncCache(rp, rt)
    }
    toast.undo('Medication removed', {
      onUndo: restore,
      onCommit: async () => {
        const { error } = await supabase.from('pills').delete().eq('id', id)
        await supabase.from('pills_taken').delete().eq('pill_id', id)
        if (error) { restore(); toast.error("Couldn't delete — restored it") }
      },
    })
  }

  const toggleTaken = async (pillId: string) => {
    if (!userId || viewDate !== todayStr()) return
    const wasTaken = taken.includes(pillId)
    const prev = taken
    const nextTaken = wasTaken ? taken.filter(t => t !== pillId) : [...taken, pillId]
    setTaken(nextTaken)
    syncCache(pills, nextTaken)
    const { error } = wasTaken
      ? await supabase.from('pills_taken').delete().eq('pill_id', pillId).eq('user_id', userId).eq('date_taken', viewDate)
      : await supabase.from('pills_taken').insert({ user_id: userId, pill_id: pillId, date_taken: viewDate, updated_at: Date.now(), created_at: Date.now() })
    if (error) {
      setTaken(prev); syncCache(pills, prev)
      toast.error(wasTaken ? "Couldn't update that dose" : "Couldn't mark dose as taken")
    }
  }

  const syncCache = (p: Pill[], t: string[]) => {
    if (userId) cacheSet<MedCache>(`meds:${userId}:${viewDate}`, { pills: p, taken: t })
  }

  // ---- Reminders (best-effort, fire while the app is open) ----
  useEffect(() => { setNotify(localStorage.getItem('luma-med-notify') === '1') }, [])

  const scheduleNotifs = useCallback(() => {
    timers.current.forEach(clearTimeout)
    timers.current = []
    if (!notify || typeof Notification === 'undefined' || Notification.permission !== 'granted') return
    if (viewDate !== todayStr()) return
    const [nh, nm] = timeNow().split(':').map(Number)
    const nowMin = nh * 60 + nm
    pills.forEach(p => {
      if (taken.includes(p.id)) return
      const [h, m] = p.scheduled_time.split(':').map(Number)
      const delayMin = (h * 60 + m) - nowMin
      if (delayMin > 0 && delayMin <= 16 * 60) {
        const id = window.setTimeout(() => {
          new Notification('Time for your medication', { body: `${p.name} · ${p.scheduled_time}` })
        }, delayMin * 60 * 1000)
        timers.current.push(id)
      }
    })
  }, [notify, pills, taken, viewDate])

  useEffect(() => {
    scheduleNotifs()
    return () => { timers.current.forEach(clearTimeout); timers.current = [] }
  }, [scheduleNotifs])

  const toggleNotify = async () => {
    if (notify) {
      setNotify(false); localStorage.setItem('luma-med-notify', '0')
      return
    }
    if (typeof Notification === 'undefined') { alert('This browser does not support notifications.'); return }
    const perm = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission()
    if (perm !== 'granted') return
    setNotify(true); localStorage.setItem('luma-med-notify', '1')
    new Notification('Reminders on', { body: 'Luma will nudge you at dose times while it’s open.' })
  }

  const prevDate = () => { const d = new Date(viewDate + 'T12:00'); d.setDate(d.getDate() - 1); setViewDate(d.toISOString().slice(0, 10)) }
  const nextDate = () => { const d = new Date(viewDate + 'T12:00'); d.setDate(d.getDate() + 1); const nd = d.toISOString().slice(0, 10); if (nd <= todayStr()) setViewDate(nd) }

  const isToday = viewDate === todayStr()
  const pillsDone = pills.filter(p => taken.includes(p.id)).length
  const allDone = pills.length > 0 && pillsDone === pills.length

  type DoseState = 'taken' | 'due' | 'overdue' | 'upcoming' | 'past'
  const doseState = (p: Pill): DoseState => {
    if (taken.includes(p.id)) return 'taken'
    if (!isToday) return 'past'
    const [h, m] = p.scheduled_time.split(':').map(Number)
    const [nh, nm] = timeNow().split(':').map(Number)
    const diff = (h * 60 + m) - (nh * 60 + nm)
    if (diff >= -10 && diff <= 30) return 'due'
    if (diff < -10) return 'overdue'
    return 'upcoming'
  }
  const overdueCount = pills.filter(p => doseState(p) === 'overdue').length
  const nextId = pills.find(p => doseState(p) === 'upcoming')?.id

  const s = styles(theme)
  const inp = s.input

  if (loading) return <Loader t={theme} />

  return (
    <div className="luma-page" style={s.page}>

      <div ref={headerRef} style={{ opacity: 0 }}>
        <PageHeader t={theme} eyebrow="Medications" title={isToday ? 'Today' : fmtDate(viewDate)}
          right={
            <div style={{ display: 'flex', gap: 8 }}>
              {isToday && pills.length > 0 && (
                <button className="luma-ghost" onClick={toggleNotify} aria-label="Toggle reminders"
                  style={{ ...s.ghostBtn, padding: '8px 11px', ...(notify ? { borderColor: theme.accent, color: theme.accent } : {}) }}>
                  <Icon name={notify ? 'bell' : 'bellOff'} size={15} />
                </button>
              )}
              <button className="luma-ghost" onClick={() => { setShowHistory(!showHistory); if (showHistory) setViewDate(todayStr()) }}
                style={{ ...s.ghostBtn, ...(showHistory ? { borderColor: theme.accent, color: theme.accent } : {}) }}>
                <Icon name={showHistory ? 'arrowRight' : 'calendar'} size={14} />
                {showHistory ? 'Today' : 'History'}
              </button>
            </div>
          } />
      </div>

      {showHistory && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <button className="luma-icon-btn" onClick={prevDate} style={s.iconBtn}><Icon name="chevronLeft" size={16} /></button>
          <div style={{ flex: 1, textAlign: 'center', fontSize: 13, color: theme.txt, fontWeight: 500, fontFamily: sans }}>{isToday ? 'Today' : fmtDate(viewDate)}</div>
          <button className="luma-icon-btn" onClick={nextDate} disabled={isToday} style={{ ...s.iconBtn, opacity: isToday ? 0.35 : 1, cursor: isToday ? 'default' : 'pointer' }}><Icon name="chevronRight" size={16} /></button>
        </div>
      )}

      {pills.length > 0 && (
        <div ref={pillsCardRef} className="luma-card" style={{ ...s.card, opacity: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 20, paddingBottom: 20, borderBottom: `1px solid ${theme.border}` }}>
            <VT name="vt-ring-med">
              <Ring size={106} stroke={11} pct={pills.length ? Math.round(pillsDone / pills.length * 100) : 0} color={allDone ? theme.green : overdueCount > 0 ? theme.red : theme.accent} track={theme.c2}>
                <span style={{ fontFamily: serif, fontSize: 26, color: theme.txt, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{pillsDone}<span style={{ color: theme.sub, fontSize: 18 }}>/{pills.length}</span></span>
                <span style={{ ...s.label, fontSize: 9, marginTop: 4 }}>taken</span>
              </Ring>
            </VT>
            <div style={{ flex: 1, minWidth: 0 }}>
              <CardLabel t={theme} style={{ marginBottom: 8 }}>{isToday ? 'Today' : fmtDate(viewDate)}</CardLabel>
              <div style={{ fontFamily: serif, fontSize: 30, color: allDone ? theme.green : overdueCount > 0 ? theme.red : theme.txt, lineHeight: 1, letterSpacing: '-0.02em' }}>
                {allDone ? 'All done' : overdueCount > 0 ? `${overdueCount} overdue` : `${pills.length - pillsDone} left`}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: allDone ? theme.green : overdueCount > 0 ? theme.red : theme.muted, marginTop: 8 }}>
                {allDone ? <Icon name="check" size={14} stroke={2.2} /> : <Icon name={notify && isToday ? 'bell' : 'clock'} size={13} stroke={1.8} />}
                <span>
                  {allDone ? 'Every dose taken today'
                    : overdueCount > 0 ? `${overdueCount} dose${overdueCount > 1 ? 's' : ''} past due`
                    : !isToday ? 'Past schedule'
                    : notify ? 'Reminders on while Luma is open'
                    : 'Tap a dose to mark it taken'}
                </span>
              </div>
            </div>
          </div>
          <div ref={listRef}>
            {pills.map((p, i) => {
              const st = doseState(p)
              const isTaken = st === 'taken'
              const ringColor = st === 'overdue' ? theme.red : st === 'due' ? theme.accent : theme.border
              const active = st === 'due' || st === 'overdue'
              return (
                <div key={p.id} className="pill-item luma-row" style={{ display: 'flex', alignItems: 'center', padding: '12px 0', borderBottom: i < pills.length - 1 ? `1px solid ${theme.border}` : 'none', gap: 13, opacity: 0 }}>
                  <div onClick={() => toggleTaken(p.id)} style={{
                    width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                    cursor: isToday ? 'pointer' : 'default',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: isTaken ? 'none' : `2px solid ${ringColor}`,
                    background: isTaken ? `linear-gradient(135deg, ${theme.green}, color-mix(in srgb, ${theme.green} 70%, ${theme.bg}))` : 'transparent',
                    boxShadow: active ? `0 0 0 4px color-mix(in srgb, ${ringColor} 22%, transparent)` : isTaken ? `0 4px 12px -4px ${theme.green}` : 'none',
                    transition: 'all .2s',
                  }}>
                    {isTaken && <span style={{ color: theme.bg, display: 'flex' }}><Icon name="check" size={15} stroke={2.6} /></span>}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14.5, color: isTaken ? theme.sub : theme.txt, textDecoration: isTaken ? 'line-through' : 'none', fontFamily: sans }}>{p.name}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: theme.muted, marginTop: 2 }}>
                      <Icon name="clock" size={11} stroke={1.7} />{p.scheduled_time}
                    </div>
                  </div>
                  {st === 'due' && <span style={s.chip(theme.accent)}>Due now</span>}
                  {st === 'overdue' && <span style={s.chip(theme.red)}>Overdue</span>}
                  {st === 'upcoming' && p.id === nextId && <span style={{ ...s.chip(theme.blue), background: 'transparent' }}>Next</span>}
                  {isToday && <button className="luma-del luma-icon-btn" onClick={() => deletePill(p.id)} style={{ ...s.iconBtn, width: 24, height: 24 }}><Icon name="x" size={13} /></button>}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {isToday && (
        <div ref={formRef} className="luma-card" style={{ ...s.card, opacity: 0 }}>
          <CardLabel t={theme}>Add Medication</CardLabel>
          <input className="luma-input" value={pillName} onChange={e => setPillName(e.target.value)} placeholder="Medication name" style={{ ...inp, width: '100%', marginBottom: 10, boxSizing: 'border-box' }} />
          <div style={{ display: 'flex', gap: 8 }}>
            <input className="luma-input" value={pillTime} onChange={e => setPillTime(e.target.value)} type="time" style={{ ...inp, flex: 1 }} />
            <button className="luma-btn" onClick={addPill} style={{ ...s.primaryBtn, display: 'inline-flex', alignItems: 'center', gap: 6 }}><Icon name="plus" size={16} stroke={2} />Add</button>
          </div>
          <div style={{ fontSize: 11, color: theme.sub, marginTop: 10, fontFamily: sans, lineHeight: 1.5 }}>
            Tap the <Icon name="bell" size={11} style={{ display: 'inline', verticalAlign: '-1px' }} /> to get nudged at dose times while Luma is open. Doses turn <span style={{ color: theme.accent }}>Due now</span> within 30 min and <span style={{ color: theme.red }}>Overdue</span> after.
          </div>
        </div>
      )}

      {pills.length === 0 && (
        <EmptyState t={theme} icon="meds" text="No medications added yet." />
      )}
    </div>
  )
}