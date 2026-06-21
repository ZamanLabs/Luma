'use client'

import { createClient } from '@/utils/supabase/client'
import { useEffect, useCallback, useState, useRef } from 'react'
import { useTheme } from '../../ThemeContext'
import { animate, stagger } from 'animejs'
import { styles, PageHeader, CardLabel, Loader, EmptyState, WeekChart, Ring, lastNDays, Icon, serif, sans } from '../ui'
import { cacheGet, cacheSet } from '../cache'

type Expense = { id: string; name: string; amount: number; category: string; date: string }
type Day = { date: string; value: number }
type Cache = { expenses: Expense[]; budget: number; week: Day[] }

const CATS = ['Necessity', 'Optional', 'Entertainment', 'Health', 'Transport', 'Other']
const todayStr = () => new Date().toISOString().slice(0, 10)
const fmtMonth = (m: string) => new Date(m + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

export default function FinancePage() {
  const supabase = createClient()
  const { theme } = useTheme()

  const CAT_COLORS: Record<string, string> = {
    Necessity: theme.green, Optional: theme.blue,
    Entertainment: theme.purple, Health: theme.accent,
    Transport: theme.red, Other: theme.muted,
  }

  const [expenses, setExpenses] = useState<Expense[]>([])
  const [budget, setBudget] = useState(15000)
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('Necessity')
  const [editingBudget, setEditingBudget] = useState(false)
  const [tmpBudget, setTmpBudget] = useState('')
  const [viewMonth, setViewMonth] = useState(new Date().toISOString().slice(0, 7))
  const [showHistory, setShowHistory] = useState(false)
  const [dispSpent, setDispSpent] = useState(0)
  const [week, setWeek] = useState<Day[]>([])

  const headerRef = useRef<HTMLDivElement>(null)
  const summaryRef = useRef<HTMLDivElement>(null)
  const catRef = useRef<HTMLDivElement>(null)
  const formRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const barRef = useRef<HTMLDivElement>(null)

  const runAnimations = useCallback((spent: number, bg: number, items: Expense[]) => {
    setTimeout(() => {
      if (headerRef.current) animate(headerRef.current, { opacity: [0, 1], translateY: [16, 0], duration: 600, ease: 'outExpo' })
      if (summaryRef.current) animate(summaryRef.current, { opacity: [0, 1], translateY: [20, 0], duration: 600, delay: 100, ease: 'outExpo' })
      if (catRef.current) animate(catRef.current, { opacity: [0, 1], translateY: [20, 0], duration: 600, delay: 150, ease: 'outExpo' })
      if (formRef.current) animate(formRef.current, { opacity: [0, 1], translateY: [20, 0], duration: 600, delay: 200, ease: 'outExpo' })

      const spentObj = { val: 0 }
      animate(spentObj, { val: { to: spent }, duration: 1100, delay: 150, ease: 'outExpo', onUpdate: () => setDispSpent(Math.round(spentObj.val)) })

      if (barRef.current) {
        const pct = Math.min(100, Math.round(spent / bg * 100))
        animate(barRef.current, { width: ['0%', `${pct}%`], duration: 1100, delay: 200, ease: 'outExpo' })
      }

      if (catRef.current) {
        animate(catRef.current.querySelectorAll('.cat-cell'), {
          opacity: [0, 1], scale: [0.9, 1],
          delay: stagger(60, { start: 200 }), duration: 500, ease: 'outExpo',
        })
      }

      if (listRef.current && items.length > 0) {
        animate(listRef.current.querySelectorAll('.exp-item'), {
          opacity: [0, 1], translateX: [-12, 0],
          delay: stagger(50, { start: 350 }), duration: 500, ease: 'outExpo',
        })
      }
    }, 50)
  }, [])

  const loadData = useCallback(async (m: string, uid: string) => {
    const key = `finance:${uid}:${m}`
    const cached = cacheGet<Cache>(key)
    if (cached) {
      setBudget(cached.budget); setExpenses(cached.expenses); setWeek(cached.week); setLoading(false)
      runAnimations(cached.expenses.reduce((s, e) => s + e.amount, 0), cached.budget, cached.expenses)
    } else {
      setLoading(true)
      setDispSpent(0)
    }

    const days = lastNDays(7, todayStr())
    const [settingsRes, logsRes, weekRes] = await Promise.all([
      supabase.from('user_settings').select('monthly_budget').eq('user_id', uid).maybeSingle(),
      supabase.from('expenses').select('*').eq('user_id', uid).gte('date', m + '-01').lte('date', m + '-31').order('created_at', { ascending: false }),
      supabase.from('expenses').select('amount, date').eq('user_id', uid).gte('date', days[0]).lte('date', days[6]),
    ])
    const bg = settingsRes.data?.monthly_budget || 15000
    const items = logsRes.data || []
    const byDate: Record<string, number> = {}
    weekRes.data?.forEach((r: { amount: number; date: string }) => { byDate[r.date] = (byDate[r.date] || 0) + r.amount })
    const weekData: Day[] = days.map(d => ({ date: d, value: byDate[d] || 0 }))

    cacheSet<Cache>(key, { expenses: items, budget: bg, week: weekData })
    setBudget(bg); setExpenses(items); setWeek(weekData)
    const spent = items.reduce((s, e) => s + e.amount, 0)
    const changed = !cached || items.length !== cached.expenses.length || items.some((e, i) => e.id !== cached.expenses[i]?.id)
    setLoading(false)
    if (changed) {
      runAnimations(spent, bg, items)
    } else {
      setDispSpent(spent)
      if (barRef.current) animate(barRef.current, { width: `${Math.min(100, Math.round(spent / bg * 100))}%`, duration: 450, ease: 'outExpo' })
    }
  }, [supabase, runAnimations])

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)
      await loadData(viewMonth, user.id)
    }
    init()
  }, [supabase, viewMonth, loadData])

  const addExpense = async () => {
    if (!name.trim() || !amount || !userId) return
    const now = Date.now()
    const entry = { user_id: userId, name: name.trim(), amount: parseFloat(amount), category, date: todayStr(), updated_at: now, created_at: now }
    const { data } = await supabase.from('expenses').insert(entry).select().single()
    if (data) {
      const next = [data, ...expenses]
      setExpenses(next)
      adjustWeek(data.date, data.amount, next)
    }
    setName(''); setAmount('')
  }

  const deleteExpense = async (id: string) => {
    const removed = expenses.find(e => e.id === id)
    await supabase.from('expenses').delete().eq('id', id)
    const next = expenses.filter(e => e.id !== id)
    setExpenses(next)
    if (removed) adjustWeek(removed.date, -removed.amount, next)
  }

  // Apply an optimistic delta to the matching day of the week chart + cache.
  const adjustWeek = (date: string, delta: number, items: Expense[]) => {
    const next = week.map(d => d.date === date ? { ...d, value: Math.max(0, d.value + delta) } : d)
    setWeek(next)
    if (userId) cacheSet<Cache>(`finance:${userId}:${viewMonth}`, { expenses: items, budget, week: next })
  }

  const saveBudget = async () => {
    const v = parseFloat(tmpBudget)
    if (!v || !userId) return
    setBudget(v)
    await supabase.from('user_settings').upsert({ user_id: userId, monthly_budget: v, updated_at: Date.now() }, { onConflict: 'user_id' })
    setEditingBudget(false)
  }

  const prevMonth = () => { const d = new Date(viewMonth + '-01'); d.setMonth(d.getMonth() - 1); setViewMonth(d.toISOString().slice(0, 7)) }
  const nextMonth = () => { const d = new Date(viewMonth + '-01'); d.setMonth(d.getMonth() + 1); const nm = d.toISOString().slice(0, 7); if (nm <= new Date().toISOString().slice(0, 7)) setViewMonth(nm) }

  const isCurrentMonth = viewMonth === new Date().toISOString().slice(0, 7)
  const totalSpent = expenses.reduce((s, e) => s + e.amount, 0)
  const moneyLeft = budget - totalSpent
  const pct = Math.min(100, Math.round(totalSpent / budget * 100))
  const over = moneyLeft < 0
  const byCategory = CATS.map(cat => ({ cat, amt: expenses.filter(e => e.category === cat).reduce((s, e) => s + e.amount, 0) })).filter(c => c.amt > 0)

  const s = styles(theme)
  const inp = s.input

  if (loading) return <Loader t={theme} />

  return (
    <div style={s.page}>

      <div ref={headerRef} style={{ opacity: 0 }}>
        <PageHeader t={theme} eyebrow="Finance" title={fmtMonth(viewMonth)}
          right={
            <button className="luma-ghost" onClick={() => { setShowHistory(!showHistory); if (showHistory) setViewMonth(new Date().toISOString().slice(0, 7)) }}
              style={{ ...s.ghostBtn, ...(showHistory ? { borderColor: theme.accent, color: theme.accent } : {}) }}>
              <Icon name={showHistory ? 'arrowRight' : 'calendar'} size={14} />
              {showHistory ? 'Now' : 'History'}
            </button>
          } />
      </div>

      {showHistory && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <button className="luma-icon-btn" onClick={prevMonth} style={s.iconBtn}><Icon name="chevronLeft" size={16} /></button>
          <div style={{ flex: 1, textAlign: 'center', fontSize: 13, color: theme.txt, fontWeight: 500, fontFamily: sans }}>{fmtMonth(viewMonth)}</div>
          <button className="luma-icon-btn" onClick={nextMonth} disabled={isCurrentMonth} style={{ ...s.iconBtn, opacity: isCurrentMonth ? 0.35 : 1, cursor: isCurrentMonth ? 'default' : 'pointer' }}><Icon name="chevronRight" size={16} /></button>
        </div>
      )}

      <div ref={summaryRef} className="luma-card" style={{ ...s.card, opacity: 0, display: 'flex', alignItems: 'center', gap: 22 }}>
        <Ring size={128} stroke={12} pct={pct} color={pct > 90 ? theme.red : pct > 70 ? theme.accent : theme.green} track={theme.c2}>
          <span style={{ fontFamily: serif, fontSize: 26, color: theme.txt, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{pct}%</span>
          <span style={{ ...s.label, fontSize: 9, marginTop: 5 }}>spent</span>
        </Ring>
        <div style={{ flex: 1, minWidth: 0 }}>
          <CardLabel t={theme} style={{ marginBottom: 10 }}>{over ? 'Over Budget' : 'Remaining'}</CardLabel>
          <div style={{ fontFamily: serif, fontSize: 38, color: over ? theme.red : theme.green, lineHeight: 1, letterSpacing: '-0.02em' }}>
            ৳{Math.abs(moneyLeft).toLocaleString()}
          </div>
          <div style={{ fontSize: 12.5, color: theme.muted, marginTop: 6 }}>
            ৳{dispSpent.toLocaleString()} of ৳{budget.toLocaleString()}
          </div>

          {isCurrentMonth && (
            <div style={{ marginTop: 12 }}>
              {editingBudget ? (
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <input className="luma-input" value={tmpBudget} onChange={e => setTmpBudget(e.target.value)} type="number" style={{ ...inp, width: 96, padding: '7px 9px', fontSize: 13 }} />
                  <button className="luma-btn" onClick={saveBudget} style={{ ...s.primaryBtn, padding: '7px 12px', fontSize: 12 }}>Save</button>
                  <button className="luma-icon-btn" onClick={() => setEditingBudget(false)} style={s.iconBtn}><Icon name="x" size={14} /></button>
                </div>
              ) : (
                <div className="luma-link" onClick={() => { setTmpBudget(String(budget)); setEditingBudget(true) }}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12, color: theme.muted, fontFamily: sans }}>
                  <span style={{ ...s.label }}>Budget</span>
                  <span style={{ color: theme.accent, fontWeight: 600 }}>৳{budget.toLocaleString()}</span>
                  <Icon name="edit" size={12} />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {isCurrentMonth && week.length > 0 && (
        <div className="luma-card" style={s.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 18 }}>
            <CardLabel t={theme} style={{ marginBottom: 0 }}>Last 7 Days</CardLabel>
            <span style={{ fontSize: 11.5, color: theme.muted, fontFamily: sans }}>
              total <strong style={{ color: theme.txt, fontFamily: serif, fontSize: 15 }}>৳{week.reduce((a, d) => a + d.value, 0).toLocaleString()}</strong>
            </span>
          </div>
          <WeekChart t={theme} color={theme.accent} data={week} fmt={v => '৳' + Math.round(v).toLocaleString()} />
        </div>
      )}

      {byCategory.length > 0 && (
        <div ref={catRef} className="luma-card" style={{ ...s.card, opacity: 0 }}>
          <CardLabel t={theme}>By Category</CardLabel>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {byCategory.map(({ cat, amt }) => (
              <div key={cat} className="cat-cell" style={{ background: theme.c2, border: `1px solid ${theme.border}`, borderRadius: 14, padding: '11px 14px', flex: '1', minWidth: 88, opacity: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <span style={{ width: 7, height: 7, borderRadius: 999, background: CAT_COLORS[cat], flexShrink: 0 }} />
                  <span style={{ fontSize: 11, color: theme.muted, fontFamily: sans }}>{cat}</span>
                </div>
                <div style={{ fontSize: 20, color: theme.txt, fontFamily: serif, fontVariantNumeric: 'tabular-nums' }}>৳{amt.toLocaleString()}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {isCurrentMonth && (
        <div ref={formRef} className="luma-card" style={{ ...s.card, opacity: 0 }}>
          <CardLabel t={theme}>Add Expense</CardLabel>
          <input className="luma-input" value={name} onChange={e => setName(e.target.value)} placeholder="What did you spend on?"
            style={{ ...inp, width: '100%', marginBottom: 10, boxSizing: 'border-box' }} />
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <input className="luma-input" value={amount} onChange={e => setAmount(e.target.value)} type="number" placeholder="Amount (৳)" onKeyDown={e => e.key === 'Enter' && addExpense()}
              style={{ ...inp, flex: 1 }} />
            <select className="luma-input" value={category} onChange={e => setCategory(e.target.value)} style={{ ...inp, cursor: 'pointer' }}>
              {CATS.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <button className="luma-btn" onClick={addExpense} style={{ ...s.primaryBtn, width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}><Icon name="plus" size={16} stroke={2} />Add Expense</button>
        </div>
      )}

      {expenses.length > 0 ? (
        <div ref={listRef} className="luma-card" style={s.card}>
          <CardLabel t={theme}>{isCurrentMonth ? 'This Month' : fmtMonth(viewMonth)}</CardLabel>
          {expenses.map((e, i) => (
            <div key={e.id} className="exp-item luma-row" style={{ display: 'flex', alignItems: 'center', padding: '11px 0', borderBottom: i < expenses.length - 1 ? `1px solid ${theme.border}` : 'none', gap: 9, opacity: 0 }}>
              <div style={{ flex: 1, fontSize: 14, color: theme.txt, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: sans }}>{e.name}</div>
              <span style={s.chip(CAT_COLORS[e.category])}>{e.category}</span>
              <div style={{ fontFamily: serif, fontSize: 17, color: theme.muted, flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>৳{e.amount.toLocaleString()}</div>
              {isCurrentMonth && <button className="luma-del luma-icon-btn" onClick={() => deleteExpense(e.id)} style={{ ...s.iconBtn, width: 24, height: 24 }}><Icon name="x" size={13} /></button>}
            </div>
          ))}
          <div style={{ paddingTop: 12, fontSize: 13, color: theme.muted, borderTop: `1px solid ${theme.border}`, marginTop: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontFamily: sans }}>
            <span>{expenses.length} {expenses.length === 1 ? 'expense' : 'expenses'}</span>
            <span>Total <strong style={{ color: theme.txt, fontFamily: serif, fontSize: 17, marginLeft: 4 }}>৳{totalSpent.toLocaleString()}</strong></span>
          </div>
        </div>
      ) : (
        <EmptyState t={theme} icon="finance" text={isCurrentMonth ? 'No expenses this month yet.' : 'No expenses this month.'} />
      )}
    </div>
  )
}