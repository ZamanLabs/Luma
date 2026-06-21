'use client'

import { createClient } from '@/utils/supabase/client'
import { useEffect, useCallback, useState, useRef } from 'react'
import { useTheme } from '../../ThemeContext'
import { animate } from 'animejs'
import { styles, PageHeader, Icon, serif, sans } from '../ui'
import { cacheGet, cacheSet } from '../cache'

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
    const key = `journal:${uid}:${d}`
    const cached = cacheGet<string>(key)
    if (cached !== undefined) {
      setContent(cached); setLoading(false); runAnimations()
    } else {
      setLoading(true)
    }
    const { data } = await supabase.from('journal_entries').select('content').eq('user_id', uid).eq('date', d).single()
    const text = data?.content || ''
    cacheSet<string>(key, text)
    setContent(text)
    setLoading(false)
    if (cached === undefined) runAnimations()
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
    if (userId) cacheSet<string>(`journal:${userId}:${date}`, text)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (userId) debounceRef.current = setTimeout(() => saveEntry(text, date, userId), 1500)
  }

  const prevDate = () => { const d = new Date(date + 'T12:00'); d.setDate(d.getDate() - 1); setDate(d.toISOString().slice(0, 10)) }
  const nextDate = () => { const d = new Date(date + 'T12:00'); d.setDate(d.getDate() + 1); const nd = d.toISOString().slice(0, 10); if (nd <= todayStr()) setDate(nd) }

  const isToday = date === todayStr()

  const s = styles(theme)

  return (
    <div className="luma-page" style={s.page}>

      <div ref={headerRef} style={{ opacity: 0 }}>
        <PageHeader t={theme} eyebrow="Private · Just for you" title="Journal" />
      </div>

      <div ref={navRef} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, opacity: 0 }}>
        <button className="luma-icon-btn" onClick={prevDate} style={s.iconBtn}><Icon name="chevronLeft" size={16} /></button>
        <div style={{ flex: 1, textAlign: 'center', fontSize: 13, color: theme.txt, fontFamily: sans }}>{isToday ? 'Today — ' : ''}{fmtDate(date)}</div>
        <button className="luma-icon-btn" onClick={nextDate} disabled={isToday} style={{ ...s.iconBtn, opacity: isToday ? 0.35 : 1, cursor: isToday ? 'default' : 'pointer' }}><Icon name="chevronRight" size={16} /></button>
      </div>

      <div ref={cardRef} className="luma-card" style={{ ...s.card, padding: 24, opacity: 0 }}>
        {loading ? (
          <div style={{ color: theme.sub, fontSize: 13, fontFamily: sans }}>Loading...</div>
        ) : (
          <>
            <textarea
              value={content}
              onChange={e => handleChange(e.target.value)}
              placeholder={`What's on your mind today?\n\nWrite freely — this is just for you.`}
              rows={13}
              style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', color: theme.txt, fontSize: 18, lineHeight: 1.8, fontFamily: serif, resize: 'none', boxSizing: 'border-box' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTop: `1px solid ${theme.border}` }}>
              <span style={{ ...s.label, color: theme.sub }}>{content.length} characters</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: saved ? theme.green : saving ? theme.muted : theme.sub, fontFamily: sans }}>
                {saved ? <><Icon name="check" size={13} stroke={2.2} />Saved</> : saving ? 'Saving…' : 'Auto-saves as you type'}
              </span>
            </div>
          </>
        )}
      </div>

      <div style={{ ...s.label, color: theme.sub, textAlign: 'center', marginTop: 16, letterSpacing: '0.1em' }}>
        Use ← → to browse past entries
      </div>
    </div>
  )
}