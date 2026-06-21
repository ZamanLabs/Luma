'use client'

import { createClient } from '@/utils/supabase/client'
import { useEffect, useCallback, useState, useRef } from 'react'
import { useTheme } from '../../ThemeContext'
import { animate } from 'animejs'

const todayStr = () => new Date().toISOString().slice(0, 10)
const fmtDate = (d: string) =>
  new Date(d + 'T12:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })

export default function JournalPage() {
  const supabase = createClient()
  const { theme } = useTheme()

  const [content, setContent] = useState('')
  const [date, setDate] = useState(todayStr())
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const headerRef = useRef<HTMLDivElement>(null)
  const navRef = useRef<HTMLDivElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)

  const runAnimations = useCallback(() => {
    setTimeout(() => {
      if (headerRef.current) animate(headerRef.current, { opacity: [0, 1], translateY: [16, 0], duration: 600, ease: 'outExpo' })
      if (navRef.current) animate(navRef.current, { opacity: [0, 1], translateY: [12, 0], duration: 600, delay: 100, ease: 'outExpo' })
      if (cardRef.current) animate(cardRef.current, { opacity: [0, 1], translateY: [20, 0], duration: 700, delay: 200, ease: 'outExpo' })
    }, 50)
  }, [])

  const loadEntry = useCallback(async (d: string, uid: string) => {
    setLoading(true)
    const { data } = await supabase.from('journal_entries').select('content').eq('user_id', uid).eq('date', d).single()
    setContent(data?.content || '')
    setLoading(false)
    runAnimations()
  }, [supabase, runAnimations])

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)
      await loadEntry(date, user.id)
    }
    init()
  }, [supabase, date, loadEntry])

  const saveEntry = useCallback(async (text: string, d: string, uid: string) => {
    setSaving(true)
    const now = Date.now()
    await supabase.from('journal_entries').upsert({ user_id: uid, content: text, date: d, updated_at: now, created_at: now }, { onConflict: 'user_id,date' })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }, [supabase])

  const handleChange = (text: string) => {
    setContent(text)
    setSaved(false)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (userId) debounceRef.current = setTimeout(() => saveEntry(text, date, userId), 1500)
  }

  const prevDate = () => { const d = new Date(date + 'T12:00'); d.setDate(d.getDate() - 1); setDate(d.toISOString().slice(0, 10)) }
  const nextDate = () => { const d = new Date(date + 'T12:00'); d.setDate(d.getDate() + 1); const nd = d.toISOString().slice(0, 10); if (nd <= todayStr()) setDate(nd) }

  const isToday = date === todayStr()

  return (
    <div style={{ padding: '20px 16px', maxWidth: 480, margin: '0 auto' }}>

      <div ref={headerRef} style={{ marginBottom: 20, opacity: 0 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: theme.accent, marginBottom: 2 }}>Journal</h1>
        <p style={{ fontSize: 12, color: theme.sub }}>Private. Just for you.</p>
      </div>

      <div ref={navRef} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, opacity: 0 }}>
        <button onClick={prevDate} style={{ background: 'transparent', border: `1px solid ${theme.border}`, borderRadius: 9, padding: '7px 14px', fontSize: 13, color: theme.muted, cursor: 'pointer' }}>←</button>
        <div style={{ flex: 1, textAlign: 'center', fontSize: 13, color: theme.txt }}>{isToday ? 'Today — ' : ''}{fmtDate(date)}</div>
        <button onClick={nextDate} disabled={isToday} style={{ background: 'transparent', border: `1px solid ${theme.border}`, borderRadius: 9, padding: '7px 14px', fontSize: 13, color: isToday ? theme.border : theme.muted, cursor: isToday ? 'default' : 'pointer' }}>→</button>
      </div>

      <div ref={cardRef} style={{ background: theme.c1, border: `1px solid ${theme.border}`, borderRadius: 16, padding: 18, opacity: 0 }}>
        {loading ? (
          <div style={{ color: theme.sub, fontSize: 13 }}>Loading...</div>
        ) : (
          <>
            <textarea
              value={content}
              onChange={e => handleChange(e.target.value)}
              placeholder={`What's on your mind today?\n\nWrite freely — this is just for you.`}
              rows={12}
              style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', color: theme.txt, fontSize: 15, lineHeight: 1.75, fontFamily: 'Georgia, serif', fontStyle: 'italic', resize: 'none', boxSizing: 'border-box' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingTop: 10, borderTop: `1px solid ${theme.border}` }}>
              <span style={{ fontSize: 11, color: theme.sub }}>{content.length} characters</span>
              <span style={{ fontSize: 12, color: saved ? theme.green : saving ? theme.muted : theme.sub }}>
                {saved ? '✓ Saved' : saving ? 'Saving...' : 'Auto-saves as you type'}
              </span>
            </div>
          </>
        )}
      </div>

      <div style={{ fontSize: 11, color: theme.sub, textAlign: 'center', marginTop: 12 }}>
        Use ← → to browse past entries
      </div>
    </div>
  )
}