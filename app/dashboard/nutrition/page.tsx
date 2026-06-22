'use client'

import { createClient } from '@/utils/supabase/client'
import { useEffect, useCallback, useState, useRef } from 'react'
import { useTheme } from '../../ThemeContext'
import { animate, stagger } from 'animejs'
import { styles, PageHeader, CardLabel, Loader, EmptyState, WeekChart, Ring, lastNDays, Icon, serif, sans } from '../ui'
import { cacheGet, cacheSet } from '../cache'
import { COMMON_FOODS, type FoodRef } from '../foods'
import { useToast } from '../Toast'

type FoodLog = { id: string; name: string; calories: number; date: string; time: string }
type Day = { date: string; value: number }
type Cache = { foods: FoodLog[]; goal: number; week: Day[]; freq: FoodRef[] }

const todayStr = () => new Date().toISOString().slice(0, 10)
const timeNow = () => new Date().toTimeString().slice(0, 5)
const fmtDate = (d: string) => new Date(d + 'T12:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })

export default function NutritionPage() {
  const supabase = createClient()
  const { theme } = useTheme()
  const toast = useToast()

  const [foods, setFoods] = useState<FoodLog[]>([])
  const [calGoal, setCalGoal] = useState(2000)
  const [name, setName] = useState('')
  const [calories, setCalories] = useState('')
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [editingGoal, setEditingGoal] = useState(false)
  const [tmpGoal, setTmpGoal] = useState('')
  const [viewDate, setViewDate] = useState(todayStr())
  const [showHistory, setShowHistory] = useState(false)
  const [dispCals, setDispCals] = useState(0)
  const [week, setWeek] = useState<Day[]>([])
  const [frequent, setFrequent] = useState<FoodRef[]>([])
  const [focused, setFocused] = useState(false)

  const headerRef = useRef<HTMLDivElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const barRef = useRef<HTMLDivElement>(null)
  const formRef = useRef<HTMLDivElement>(null)

  const runAnimations = useCallback((cals: number, goal: number, items: FoodLog[]) => {
    setTimeout(() => {
      if (headerRef.current) animate(headerRef.current, { opacity: [0, 1], translateY: [16, 0], duration: 600, ease: 'outExpo' })
      if (cardRef.current) animate(cardRef.current, { opacity: [0, 1], translateY: [20, 0], duration: 600, delay: 100, ease: 'outExpo' })
      if (formRef.current) animate(formRef.current, { opacity: [0, 1], translateY: [20, 0], duration: 600, delay: 200, ease: 'outExpo' })

      const calsObj = { val: 0 }
      animate(calsObj, { val: { to: cals }, duration: 1100, delay: 150, ease: 'outExpo', onUpdate: () => setDispCals(Math.round(calsObj.val)) })

      if (barRef.current) {
        const pct = Math.min(100, Math.round(cals / goal * 100))
        animate(barRef.current, { width: ['0%', `${pct}%`], duration: 1100, delay: 200, ease: 'outExpo' })
      }

      if (listRef.current && items.length > 0) {
        animate(listRef.current.querySelectorAll('.food-item'), {
          opacity: [0, 1], translateX: [-12, 0],
          delay: stagger(60, { start: 300 }), duration: 500, ease: 'outExpo',
        })
      }
    }, 50)
  }, [])

  const loadData = useCallback(async (date: string, uid: string) => {
    const key = `nutrition:${uid}:${date}`
    const cached = cacheGet<Cache>(key)
    if (cached) {
      setCalGoal(cached.goal); setFoods(cached.foods); setWeek(cached.week); setFrequent(cached.freq || []); setLoading(false)
      runAnimations(cached.foods.reduce((s, f) => s + f.calories, 0), cached.goal, cached.foods)
    } else {
      setLoading(true)
    }

    const days = lastNDays(7, date)
    const monthAgo = lastNDays(30, todayStr())[0]
    const [settingsRes, logsRes, weekRes, recentRes] = await Promise.all([
      supabase.from('user_settings').select('calorie_goal').eq('user_id', uid).maybeSingle(),
      supabase.from('food_logs').select('*').eq('user_id', uid).eq('date', date).order('created_at', { ascending: true }),
      supabase.from('food_logs').select('calories, date').eq('user_id', uid).gte('date', days[0]).lte('date', days[6]),
      supabase.from('food_logs').select('name, calories').eq('user_id', uid).gte('date', monthAgo).order('created_at', { ascending: false }).limit(250),
    ])
    const goal = settingsRes.data?.calorie_goal || 2000
    const items = logsRes.data || []
    const byDate: Record<string, number> = {}
    weekRes.data?.forEach((r: { calories: number; date: string }) => { byDate[r.date] = (byDate[r.date] || 0) + r.calories })
    const weekData: Day[] = days.map(d => ({ date: d, value: byDate[d] || 0 }))

    // Most-logged foods from the last 30 days → quick-add chips (most recent kcal).
    const tally = new Map<string, { kcal: number; count: number }>()
    recentRes.data?.forEach((r: { name: string; calories: number }) => {
      const k = r.name.trim()
      const e = tally.get(k)
      if (e) e.count++
      else tally.set(k, { kcal: r.calories, count: 1 })
    })
    const freq: FoodRef[] = [...tally.entries()].sort((a, b) => b[1].count - a[1].count).slice(0, 8).map(([name, e]) => ({ name, kcal: e.kcal }))

    cacheSet<Cache>(key, { foods: items, goal, week: weekData, freq })
    setCalGoal(goal); setFoods(items); setWeek(weekData); setFrequent(freq)
    const cals = items.reduce((s, f) => s + f.calories, 0)
    const changed = !cached || items.length !== cached.foods.length || items.some((f, i) => f.id !== cached.foods[i]?.id)
    setLoading(false)
    if (changed) {
      runAnimations(cals, goal, items)
    } else {
      setDispCals(cals)
      if (barRef.current) animate(barRef.current, { width: `${Math.min(100, Math.round(cals / goal * 100))}%`, duration: 450, ease: 'outExpo' })
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

  const logFood = async (foodName: string, kcal: number) => {
    if (!foodName.trim() || !kcal || kcal <= 0 || !userId || viewDate !== todayStr()) return
    const now = Date.now()
    const entry = { user_id: userId, name: foodName.trim(), calories: Math.round(kcal), date: viewDate, time: timeNow(), updated_at: now, created_at: now }
    const { data, error } = await supabase.from('food_logs').insert(entry).select().single()
    if (error || !data) {
      toast.error("Couldn't save that meal", { onRetry: () => logFood(foodName, kcal) })
      return
    }
    const updated = [...foods, data]
    setFoods(updated)
    const total = updated.reduce((s, f) => s + f.calories, 0)
    setDispCals(total)
    syncWeekToday(updated, total)
    if (barRef.current) {
      const pct = Math.min(100, Math.round(total / calGoal * 100))
      animate(barRef.current, { width: [`${Math.min(100, Math.round((total - data.calories) / calGoal * 100))}%`, `${pct}%`], duration: 600, ease: 'outExpo' })
    }
  }

  const addFood = async () => {
    await logFood(name, parseInt(calories))
    setName(''); setCalories(''); setFocused(false)
  }

  // Quick-add suggestions while typing: your recents first, then the built-in list.
  const q = name.trim().toLowerCase()
  const suggestions: FoodRef[] = q.length >= 1
    ? [
        ...frequent.filter(f => f.name.toLowerCase().includes(q)),
        ...COMMON_FOODS.filter(f => f.name.toLowerCase().includes(q) && !frequent.some(fr => fr.name.toLowerCase() === f.name.toLowerCase())),
      ].slice(0, 6)
    : []

  const deleteFood = (id: string) => {
    if (viewDate !== todayStr()) return
    const idx = foods.findIndex(f => f.id === id)
    if (idx < 0) return
    const item = foods[idx]
    const updated = foods.filter(f => f.id !== id)
    const apply = (arr: FoodLog[]) => {
      setFoods(arr)
      const tt = arr.reduce((s, f) => s + f.calories, 0)
      setDispCals(tt); syncWeekToday(arr, tt)
    }
    const restore = () => apply([...updated.slice(0, idx), item, ...updated.slice(idx)])
    apply(updated)
    toast.undo('Meal removed', {
      onUndo: restore,
      onCommit: async () => {
        const { error } = await supabase.from('food_logs').delete().eq('id', id)
        if (error) { restore(); toast.error("Couldn't delete — restored it") }
      },
    })
  }

  // Keep the week chart's current-day bar + cache in step with optimistic edits.
  const syncWeekToday = (items: FoodLog[], total: number) => {
    const next = week.map(d => d.date === viewDate ? { ...d, value: total } : d)
    setWeek(next)
    if (userId) cacheSet<Cache>(`nutrition:${userId}:${viewDate}`, { foods: items, goal: calGoal, week: next, freq: frequent })
  }

  const saveGoal = async () => {
    const v = parseInt(tmpGoal)
    if (!v || !userId) return
    setCalGoal(v)
    await supabase.from('user_settings').upsert({ user_id: userId, calorie_goal: v, updated_at: Date.now() }, { onConflict: 'user_id' })
    setEditingGoal(false)
  }

  const prevDate = () => { const d = new Date(viewDate + 'T12:00'); d.setDate(d.getDate() - 1); setViewDate(d.toISOString().slice(0, 10)) }
  const nextDate = () => { const d = new Date(viewDate + 'T12:00'); d.setDate(d.getDate() + 1); const nd = d.toISOString().slice(0, 10); if (nd <= todayStr()) setViewDate(nd) }

  const isToday = viewDate === todayStr()
  const totalCals = foods.reduce((s, f) => s + f.calories, 0)
  const calLeft = calGoal - totalCals
  const pct = Math.min(100, Math.round(totalCals / calGoal * 100))
  const over = calLeft < 0

  const s = styles(theme)
  const inp = s.input

  if (loading) return <Loader t={theme} />

  return (
    <div className="luma-page" style={s.page}>

      <div ref={headerRef} style={{ opacity: 0 }}>
        <PageHeader t={theme} eyebrow="Nutrition" title={isToday ? 'Today' : fmtDate(viewDate)}
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

      <div ref={cardRef} className="luma-card" style={{ ...s.card, opacity: 0, display: 'flex', alignItems: 'center', gap: 22 }}>
        <Ring size={128} stroke={12} pct={pct} color={over ? theme.red : pct > 80 ? theme.accent : theme.green} track={theme.c2}>
          <span style={{ fontFamily: serif, fontSize: 32, color: theme.txt, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{dispCals.toLocaleString()}</span>
          <span style={{ ...s.label, fontSize: 9, marginTop: 5 }}>kcal eaten</span>
        </Ring>
        <div style={{ flex: 1, minWidth: 0 }}>
          <CardLabel t={theme} style={{ marginBottom: 10 }}>{isToday ? 'Calories' : fmtDate(viewDate)}</CardLabel>
          <div style={{ fontFamily: serif, fontSize: 38, color: over ? theme.red : theme.green, lineHeight: 1, letterSpacing: '-0.02em' }}>
            {over ? `+${Math.abs(calLeft).toLocaleString()}` : calLeft.toLocaleString()}
          </div>
          <div style={{ fontSize: 12.5, color: theme.muted, marginTop: 6 }}>{over ? 'kcal over goal' : 'kcal remaining'}</div>

          {isToday && (
            <div style={{ marginTop: 12 }}>
              {editingGoal ? (
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <input className="luma-input" value={tmpGoal} onChange={e => setTmpGoal(e.target.value)} type="number" style={{ ...inp, width: 78, padding: '7px 9px', fontSize: 13 }} />
                  <button className="luma-btn" onClick={saveGoal} style={{ ...s.primaryBtn, padding: '7px 12px', fontSize: 12 }}>Save</button>
                  <button className="luma-icon-btn" onClick={() => setEditingGoal(false)} style={s.iconBtn}><Icon name="x" size={14} /></button>
                </div>
              ) : (
                <div className="luma-link" onClick={() => { setTmpGoal(String(calGoal)); setEditingGoal(true) }}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12, color: theme.muted, fontFamily: sans }}>
                  <span style={{ ...s.label }}>Goal</span>
                  <span style={{ color: theme.accent, fontWeight: 600 }}>{calGoal.toLocaleString()}</span>
                  <Icon name="edit" size={12} />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {week.length > 0 && (
        <div className="luma-card" style={s.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 18 }}>
            <CardLabel t={theme} style={{ marginBottom: 0 }}>This Week</CardLabel>
            <span style={{ fontSize: 11.5, color: theme.muted, fontFamily: sans }}>
              avg <strong style={{ color: theme.txt, fontFamily: serif, fontSize: 15 }}>{Math.round(week.reduce((a, d) => a + d.value, 0) / 7).toLocaleString()}</strong> kcal
            </span>
          </div>
          <WeekChart t={theme} color={theme.green} goal={calGoal} data={week.map(d => d.date === viewDate ? { ...d, value: totalCals } : d)} />
        </div>
      )}

      {isToday && (
        <div ref={formRef} className="luma-card" style={{ ...s.card, opacity: 0 }}>
          <CardLabel t={theme}>Log Meal</CardLabel>

          {frequent.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ ...s.label, fontSize: 9, color: theme.sub, marginBottom: 9 }}>Frequent — tap to add</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                {frequent.map(f => (
                  <button key={f.name} className="luma-btn" onClick={() => logFood(f.name, f.kcal)} title={`Add ${f.name} · ${f.kcal} kcal`}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, maxWidth: 200, background: theme.c2, border: `1px solid ${theme.border}`, borderRadius: 999, padding: '7px 12px', cursor: 'pointer', fontFamily: sans, fontSize: 12.5, color: theme.txt }}>
                    <Icon name="plus" size={12} stroke={2.4} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
                    <span style={{ color: theme.accent, fontFamily: serif, fontSize: 14, fontVariantNumeric: 'tabular-nums' }}>{f.kcal}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div style={{ position: 'relative', marginBottom: 10 }}>
            <input className="luma-input" value={name}
              onChange={e => setName(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setTimeout(() => setFocused(false), 120)}
              placeholder="Search a food, or type your own"
              onKeyDown={e => e.key === 'Enter' && addFood()}
              style={{ ...inp, width: '100%', boxSizing: 'border-box' }} />
            {focused && suggestions.length > 0 && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 5,
                background: theme.c1, border: `1px solid ${theme.border}`, borderRadius: 12, overflow: 'hidden',
                boxShadow: `0 16px 40px -16px rgba(0,0,0,0.55)`,
              }}>
                {suggestions.map((sug, i) => (
                  <div key={sug.name} onMouseDown={() => { logFood(sug.name, sug.kcal); setName(''); setFocused(false) }}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '10px 13px', cursor: 'pointer', borderTop: i > 0 ? `1px solid ${theme.border}` : 'none', background: 'transparent' }}
                    onMouseEnter={e => (e.currentTarget.style.background = theme.c2)}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <span style={{ fontSize: 13.5, color: theme.txt, fontFamily: sans, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sug.name}</span>
                    <span style={{ flexShrink: 0, fontFamily: serif, fontSize: 15, color: theme.accent, fontVariantNumeric: 'tabular-nums' }}>{sug.kcal} <span style={{ fontFamily: sans, fontSize: 10, color: theme.sub }}>kcal</span></span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <input className="luma-input" value={calories} onChange={e => setCalories(e.target.value)} type="number" placeholder="Calories (kcal)" onKeyDown={e => e.key === 'Enter' && addFood()}
              style={{ ...inp, flex: 1 }} />
            <button className="luma-btn" onClick={addFood} style={{ ...s.primaryBtn, display: 'inline-flex', alignItems: 'center', gap: 6 }}><Icon name="plus" size={16} stroke={2} />Add</button>
          </div>
        </div>
      )}

      {foods.length > 0 ? (
        <div ref={listRef} className="luma-card" style={s.card}>
          <CardLabel t={theme}>{isToday ? "Today's Log" : 'Meals'}</CardLabel>
          {foods.map((f, i) => (
            <div key={f.id} className="food-item luma-row" style={{ display: 'flex', alignItems: 'center', padding: '11px 0', borderBottom: i < foods.length - 1 ? `1px solid ${theme.border}` : 'none', gap: 10, opacity: 0 }}>
              <div style={{ flex: 1, fontSize: 14, color: theme.txt, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: sans }}>{f.name}</div>
              <div style={{ fontFamily: serif, fontSize: 17, color: theme.muted, flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>{f.calories}</div>
              <div style={{ fontSize: 11, color: theme.sub, flexShrink: 0, fontFamily: sans, width: 38 }}>{f.time}</div>
              {isToday && <button className="luma-del luma-icon-btn" onClick={() => deleteFood(f.id)} style={{ ...s.iconBtn, width: 24, height: 24 }}><Icon name="x" size={13} /></button>}
            </div>
          ))}
          <div style={{ paddingTop: 12, fontSize: 13, color: theme.muted, borderTop: `1px solid ${theme.border}`, marginTop: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontFamily: sans }}>
            <span>{foods.length} {foods.length === 1 ? 'entry' : 'entries'}</span>
            <span>Total <strong style={{ color: theme.txt, fontFamily: serif, fontSize: 17, marginLeft: 4 }}>{totalCals.toLocaleString()}</strong> kcal</span>
          </div>
        </div>
      ) : (
        <EmptyState t={theme} icon="utensils" text={isToday ? 'No meals logged yet today.' : 'No meals logged on this day.'} />
      )}
    </div>
  )
}