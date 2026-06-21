'use client'

import { createClient } from '@/utils/supabase/client'
import { useEffect, useCallback, useState, useRef } from 'react'
import { useTheme } from '../../ThemeContext'
import { animate, stagger } from 'animejs'

type FoodLog = { id: string; name: string; calories: number; date: string; time: string }

const todayStr = () => new Date().toISOString().slice(0, 10)
const timeNow = () => new Date().toTimeString().slice(0, 5)
const fmtDate = (d: string) => new Date(d + 'T12:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })

export default function NutritionPage() {
  const supabase = createClient()
  const { theme } = useTheme()

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
    setLoading(true)
    const { data: settings } = await supabase.from('user_settings').select('calorie_goal').eq('user_id', uid).maybeSingle()
    if (settings) setCalGoal(settings.calorie_goal)
    const goal = settings?.calorie_goal || 2000
    const { data: logs } = await supabase.from('food_logs').select('*').eq('user_id', uid).eq('date', date).order('created_at', { ascending: true })
    const items = logs || []
    setFoods(items)
    setLoading(false)
    const cals = items.reduce((s, f) => s + f.calories, 0)
    runAnimations(cals, goal, items)
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

  const addFood = async () => {
    if (!name.trim() || !calories || !userId || viewDate !== todayStr()) return
    const now = Date.now()
    const entry = { user_id: userId, name: name.trim(), calories: parseInt(calories), date: viewDate, time: timeNow(), updated_at: now, created_at: now }
    const { data } = await supabase.from('food_logs').insert(entry).select().single()
    if (data) {
      const updated = [...foods, data]
      setFoods(updated)
      setDispCals(updated.reduce((s, f) => s + f.calories, 0))
      if (barRef.current) {
        const pct = Math.min(100, Math.round(updated.reduce((s, f) => s + f.calories, 0) / calGoal * 100))
        animate(barRef.current, { width: [`${Math.min(100, Math.round((updated.reduce((s,f)=>s+f.calories,0)-data.calories)/calGoal*100))}%`, `${pct}%`], duration: 600, ease: 'outExpo' })
      }
    }
    setName(''); setCalories('')
  }

  const deleteFood = async (id: string) => {
    if (viewDate !== todayStr()) return
    await supabase.from('food_logs').delete().eq('id', id)
    const updated = foods.filter(f => f.id !== id)
    setFoods(updated)
    setDispCals(updated.reduce((s, f) => s + f.calories, 0))
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

  const inp = { background: theme.c2, border: `1px solid ${theme.border}`, borderRadius: 10, padding: '10px 12px', color: theme.txt, fontSize: 14, outline: 'none' } as const
  const card = { background: theme.c1, border: `1px solid ${theme.border}`, borderRadius: 16, padding: 18, marginBottom: 14 } as const

  if (loading) return <div style={{ padding: 24, color: theme.muted }}>Loading...</div>

  return (
    <div style={{ padding: '20px 16px', maxWidth: 480, margin: '0 auto' }}>

      <div ref={headerRef} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, opacity: 0 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: theme.accent, marginBottom: 2 }}>Nutrition</h1>
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

      <div ref={cardRef} style={{ ...card, opacity: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: theme.txt, marginBottom: 4 }}>{isToday ? "Today's Calories" : fmtDate(viewDate)}</div>
            {!editingGoal && isToday ? (
              <div style={{ fontSize: 12, color: theme.muted }}>
                Goal: <span style={{ color: theme.accent }}>{calGoal.toLocaleString()} kcal</span>
                <span onClick={() => { setTmpGoal(String(calGoal)); setEditingGoal(true) }} style={{ cursor: 'pointer', color: theme.sub, marginLeft: 8, fontSize: 11 }}>✎ edit</span>
              </div>
            ) : editingGoal ? (
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 4 }}>
                <input value={tmpGoal} onChange={e => setTmpGoal(e.target.value)} type="number" style={{ ...inp, width: 80, padding: '4px 8px', fontSize: 12 }} />
                <button onClick={saveGoal} style={{ background: theme.accent, border: 'none', borderRadius: 8, padding: '4px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer', color: theme.bg }}>Save</button>
                <button onClick={() => setEditingGoal(false)} style={{ background: 'transparent', border: `1px solid ${theme.border}`, borderRadius: 8, padding: '4px 8px', fontSize: 12, color: theme.muted, cursor: 'pointer' }}>✕</button>
              </div>
            ) : (
              <div style={{ fontSize: 12, color: theme.muted }}>Goal: <span style={{ color: theme.accent }}>{calGoal.toLocaleString()} kcal</span></div>
            )}
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 32, fontWeight: 700, color: over ? theme.red : theme.accent, lineHeight: 1 }}>{dispCals.toLocaleString()}</div>
            <div style={{ fontSize: 11, color: theme.muted, marginTop: 2 }}>kcal eaten</div>
          </div>
        </div>
        <div style={{ background: theme.c2, borderRadius: 6, height: 7, overflow: 'hidden', marginBottom: 8 }}>
          <div ref={barRef} style={{ height: '100%', borderRadius: 6, width: '0%', background: pct > 100 ? theme.red : pct > 80 ? theme.accent : theme.green }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: theme.muted }}>
          <span>{pct}% of goal</span>
          <span style={{ color: over ? theme.red : theme.green, fontWeight: 500 }}>
            {over ? `${Math.abs(calLeft).toLocaleString()} kcal over` : `${calLeft.toLocaleString()} kcal left`}
          </span>
        </div>
      </div>

      {isToday && (
        <div ref={formRef} style={{ ...card, opacity: 0 }}>
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.8px', color: theme.sub, marginBottom: 10 }}>Log Meal</div>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Food or meal name" onKeyDown={e => e.key === 'Enter' && addFood()}
            style={{ ...inp, width: '100%', marginBottom: 10, boxSizing: 'border-box' }} />
          <div style={{ display: 'flex', gap: 8 }}>
            <input value={calories} onChange={e => setCalories(e.target.value)} type="number" placeholder="Calories (kcal)" onKeyDown={e => e.key === 'Enter' && addFood()}
              style={{ ...inp, flex: 1 }} />
            <button onClick={addFood} style={{ background: theme.accent, border: 'none', borderRadius: 10, padding: '10px 20px', fontSize: 14, fontWeight: 700, cursor: 'pointer', color: theme.bg }}>Add</button>
          </div>
        </div>
      )}

      {foods.length > 0 ? (
        <div ref={listRef} style={card}>
          <div style={{ fontSize: 15, fontWeight: 600, color: theme.txt, marginBottom: 14 }}>{isToday ? "Today's Log" : 'Meals'}</div>
          {foods.map((f, i) => (
            <div key={f.id} className="food-item" style={{ display: 'flex', alignItems: 'center', padding: '9px 0', borderBottom: i < foods.length - 1 ? `1px solid ${theme.border}` : 'none', gap: 8, opacity: 0 }}>
              <div style={{ flex: 1, fontSize: 14, color: theme.txt, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</div>
              <div style={{ fontSize: 13, color: theme.muted, flexShrink: 0 }}>{f.calories} kcal</div>
              <div style={{ fontSize: 11, color: theme.sub, flexShrink: 0 }}>{f.time}</div>
              {isToday && <button onClick={() => deleteFood(f.id)} style={{ background: 'transparent', border: `1px solid ${theme.border}`, color: theme.sub, borderRadius: 7, padding: '3px 8px', fontSize: 11, cursor: 'pointer' }}>✕</button>}
            </div>
          ))}
          <div style={{ paddingTop: 10, fontSize: 13, color: theme.muted, borderTop: `1px solid ${theme.border}`, marginTop: 4, display: 'flex', justifyContent: 'space-between' }}>
            <span>{foods.length} {foods.length === 1 ? 'entry' : 'entries'}</span>
            <span>Total: <strong style={{ color: theme.txt }}>{totalCals.toLocaleString()} kcal</strong></span>
          </div>
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '36px 0', color: theme.sub }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>🍽️</div>
          <div style={{ fontSize: 13 }}>{isToday ? 'No meals logged yet today.' : 'No meals logged on this day.'}</div>
        </div>
      )}
    </div>
  )
}