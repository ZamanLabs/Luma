'use client'

import { createClient } from '@/utils/supabase/client'
import { useEffect, useCallback, useState, useRef } from 'react'
import { useTheme } from '../../ThemeContext'
import { animate, stagger } from 'animejs'

type Expense = { id: string; name: string; amount: number; category: string; date: string }

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
    setLoading(true)
    setDispSpent(0)
    const { data: settings } = await supabase.from('user_settings').select('monthly_budget').eq('user_id', uid).maybeSingle()
    const bg = settings?.monthly_budget || 15000
    if (settings) setBudget(bg)
    const { data: logs } = await supabase.from('expenses').select('*').eq('user_id', uid)
      .gte('date', m + '-01').lte('date', m + '-31').order('created_at', { ascending: false })
    const items = logs || []
    setExpenses(items)
    setLoading(false)
    const spent = items.reduce((s, e) => s + e.amount, 0)
    runAnimations(spent, bg, items)
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
    if (data) setExpenses(prev => [data, ...prev])
    setName(''); setAmount('')
  }

  const deleteExpense = async (id: string) => {
    await supabase.from('expenses').delete().eq('id', id)
    setExpenses(prev => prev.filter(e => e.id !== id))
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

  const inp = { background: theme.c2, border: `1px solid ${theme.border}`, borderRadius: 10, padding: '10px 12px', color: theme.txt, fontSize: 14, outline: 'none' } as const
  const card = { background: theme.c1, border: `1px solid ${theme.border}`, borderRadius: 16, padding: 18, marginBottom: 14 } as const

  if (loading) return <div style={{ padding: 24, color: theme.muted }}>Loading...</div>

  return (
    <div style={{ padding: '20px 16px', maxWidth: 480, margin: '0 auto' }}>

      <div ref={headerRef} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, opacity: 0 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: theme.accent, marginBottom: 2 }}>Finance</h1>
          <p style={{ fontSize: 12, color: theme.sub }}>{fmtMonth(viewMonth)}</p>
        </div>
        <button onClick={() => { setShowHistory(!showHistory); if (showHistory) setViewMonth(new Date().toISOString().slice(0, 7)) }}
          style={{ background: showHistory ? theme.accent + '22' : 'transparent', border: `1px solid ${showHistory ? theme.accent : theme.border}`, borderRadius: 9, padding: '6px 12px', fontSize: 12, color: showHistory ? theme.accent : theme.muted, cursor: 'pointer' }}>
          {showHistory ? 'Back to Now' : '📅 History'}
        </button>
      </div>

      {showHistory && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <button onClick={prevMonth} style={{ background: 'transparent', border: `1px solid ${theme.border}`, borderRadius: 9, padding: '7px 14px', fontSize: 13, color: theme.muted, cursor: 'pointer' }}>←</button>
          <div style={{ flex: 1, textAlign: 'center', fontSize: 13, color: theme.txt, fontWeight: 500 }}>{fmtMonth(viewMonth)}</div>
          <button onClick={nextMonth} disabled={isCurrentMonth} style={{ background: 'transparent', border: `1px solid ${theme.border}`, borderRadius: 9, padding: '7px 14px', fontSize: 13, color: isCurrentMonth ? theme.border : theme.muted, cursor: isCurrentMonth ? 'default' : 'pointer' }}>→</button>
        </div>
      )}

      <div ref={summaryRef} style={{ ...card, opacity: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: theme.txt, marginBottom: 4 }}>{isCurrentMonth ? 'Monthly Budget' : fmtMonth(viewMonth)}</div>
            {!editingBudget && isCurrentMonth ? (
              <div style={{ fontSize: 12, color: theme.muted }}>
                Budget: <span style={{ color: theme.accent }}>৳{budget.toLocaleString()}</span>
                <span onClick={() => { setTmpBudget(String(budget)); setEditingBudget(true) }} style={{ cursor: 'pointer', color: theme.sub, marginLeft: 8, fontSize: 11 }}>✎ edit</span>
              </div>
            ) : editingBudget ? (
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 4 }}>
                <input value={tmpBudget} onChange={e => setTmpBudget(e.target.value)} type="number" style={{ ...inp, width: 100, padding: '4px 8px', fontSize: 12 }} />
                <button onClick={saveBudget} style={{ background: theme.accent, border: 'none', borderRadius: 8, padding: '4px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer', color: theme.bg }}>Save</button>
                <button onClick={() => setEditingBudget(false)} style={{ background: 'transparent', border: `1px solid ${theme.border}`, borderRadius: 8, padding: '4px 8px', fontSize: 12, color: theme.muted, cursor: 'pointer' }}>✕</button>
              </div>
            ) : (
              <div style={{ fontSize: 12, color: theme.muted }}>Budget: <span style={{ color: theme.accent }}>৳{budget.toLocaleString()}</span></div>
            )}
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 32, fontWeight: 700, color: over ? theme.red : theme.green, lineHeight: 1 }}>৳{Math.abs(moneyLeft).toLocaleString()}</div>
            <div style={{ fontSize: 11, color: theme.muted, marginTop: 2 }}>{over ? 'over budget' : 'remaining'}</div>
          </div>
        </div>
        <div style={{ background: theme.c2, borderRadius: 6, height: 7, overflow: 'hidden', marginBottom: 8 }}>
          <div ref={barRef} style={{ height: '100%', borderRadius: 6, width: '0%', background: pct > 90 ? theme.red : pct > 70 ? theme.accent : theme.green }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: theme.muted }}>
          <span>{pct}% spent</span>
          <span>Spent: <strong style={{ color: theme.txt }}>৳{dispSpent.toLocaleString()}</strong></span>
        </div>
      </div>

      {byCategory.length > 0 && (
        <div ref={catRef} style={{ ...card, opacity: 0 }}>
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.8px', color: theme.sub, marginBottom: 12 }}>By Category</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {byCategory.map(({ cat, amt }) => (
              <div key={cat} className="cat-cell" style={{ background: theme.c2, borderRadius: 10, padding: '8px 12px', flex: '1', minWidth: 80, opacity: 0 }}>
                <div style={{ fontSize: 11, color: CAT_COLORS[cat], marginBottom: 2 }}>{cat}</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: theme.txt }}>৳{amt.toLocaleString()}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {isCurrentMonth && (
        <div ref={formRef} style={{ ...card, opacity: 0 }}>
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.8px', color: theme.sub, marginBottom: 10 }}>Add Expense</div>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="What did you spend on?"
            style={{ ...inp, width: '100%', marginBottom: 10, boxSizing: 'border-box' }} />
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <input value={amount} onChange={e => setAmount(e.target.value)} type="number" placeholder="Amount (৳)" onKeyDown={e => e.key === 'Enter' && addExpense()}
              style={{ ...inp, flex: 1 }} />
            <select value={category} onChange={e => setCategory(e.target.value)} style={{ ...inp, cursor: 'pointer' }}>
              {CATS.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <button onClick={addExpense} style={{ width: '100%', background: theme.accent, border: 'none', borderRadius: 10, padding: '10px 0', fontSize: 14, fontWeight: 700, cursor: 'pointer', color: theme.bg }}>Add Expense</button>
        </div>
      )}

      {expenses.length > 0 ? (
        <div ref={listRef} style={card}>
          <div style={{ fontSize: 15, fontWeight: 600, color: theme.txt, marginBottom: 14 }}>{isCurrentMonth ? 'This Month' : fmtMonth(viewMonth)}</div>
          {expenses.map((e, i) => (
            <div key={e.id} className="exp-item" style={{ display: 'flex', alignItems: 'center', padding: '9px 0', borderBottom: i < expenses.length - 1 ? `1px solid ${theme.border}` : 'none', gap: 8, opacity: 0 }}>
              <div style={{ flex: 1, fontSize: 14, color: theme.txt, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.name}</div>
              <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, fontWeight: 600, background: CAT_COLORS[e.category] + '22', color: CAT_COLORS[e.category], flexShrink: 0 }}>{e.category}</span>
              <div style={{ fontSize: 13, color: theme.muted, flexShrink: 0 }}>৳{e.amount.toLocaleString()}</div>
              {isCurrentMonth && <button onClick={() => deleteExpense(e.id)} style={{ background: 'transparent', border: `1px solid ${theme.border}`, color: theme.sub, borderRadius: 7, padding: '3px 8px', fontSize: 11, cursor: 'pointer' }}>✕</button>}
            </div>
          ))}
          <div style={{ paddingTop: 10, fontSize: 13, color: theme.muted, borderTop: `1px solid ${theme.border}`, marginTop: 4, display: 'flex', justifyContent: 'space-between' }}>
            <span>{expenses.length} {expenses.length === 1 ? 'expense' : 'expenses'}</span>
            <span>Total: <strong style={{ color: theme.txt }}>৳{totalSpent.toLocaleString()}</strong></span>
          </div>
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '36px 0', color: theme.sub }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>💳</div>
          <div style={{ fontSize: 13 }}>{isCurrentMonth ? 'No expenses this month yet.' : 'No expenses this month.'}</div>
        </div>
      )}
    </div>
  )
}