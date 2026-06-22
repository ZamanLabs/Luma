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
const fmtShort = (d: string) => new Date(d + 'T12:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
const wordCount = (s: string) => (s.trim() ? s.trim().split(/\s+/).length : 0)

const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
// Minimal, safe markdown: headings, bold, italic, inline code, bullet lists.
function mdToHtml(src: string): string {
  const inline = (s: string) => s
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
  const lines = escapeHtml(src).split('\n')
  let html = '', inList = false
  const closeList = () => { if (inList) { html += '</ul>'; inList = false } }
  for (const line of lines) {
    if (/^###\s+/.test(line)) { closeList(); html += `<h3>${inline(line.replace(/^###\s+/, ''))}</h3>` }
    else if (/^##\s+/.test(line)) { closeList(); html += `<h2>${inline(line.replace(/^##\s+/, ''))}</h2>` }
    else if (/^#\s+/.test(line)) { closeList(); html += `<h1>${inline(line.replace(/^#\s+/, ''))}</h1>` }
    else if (/^[-*]\s+/.test(line)) { if (!inList) { html += '<ul>'; inList = true } html += `<li>${inline(line.replace(/^[-*]\s+/, ''))}</li>` }
    else if (line.trim() === '') { closeList(); html += '<br/>' }
    else { closeList(); html += `<p>${inline(line)}</p>` }
  }
  closeList()
  return html
}

export default function JournalPage() {
  const supabase = createClient()
  const { theme } = useTheme()

  const [content, setContent] = useState('')
  const [date, setDate] = useState(todayStr())
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [mode, setMode] = useState<'write' | 'preview'>('write')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<{ date: string; content: string }[]>([])
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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

  const runSearch = async (q: string) => {
    if (!userId || q.trim().length < 2) { setResults([]); return }
    const { data } = await supabase.from('journal_entries').select('date, content').eq('user_id', userId).ilike('content', `%${q.trim()}%`).order('date', { ascending: false }).limit(20)
    setResults((data || []).filter((r: { content: string }) => r.content?.trim()))
  }
  const onSearch = (q: string) => {
    setQuery(q)
    if (searchRef.current) clearTimeout(searchRef.current)
    searchRef.current = setTimeout(() => runSearch(q), 300)
  }
  const openResult = (d: string) => { setQuery(''); setResults([]); setMode('write'); setDate(d) }
  const snippet = (text: string, q: string) => {
    const i = text.toLowerCase().indexOf(q.trim().toLowerCase())
    if (i < 0) return text.slice(0, 90).trim() + (text.length > 90 ? '…' : '')
    const start = Math.max(0, i - 28)
    return (start > 0 ? '…' : '') + text.slice(start, start + 96).replace(/\n/g, ' ').trim() + '…'
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

      {/* Search across entries */}
      <div style={{ position: 'relative', marginBottom: 14 }}>
        <span style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: theme.sub, display: 'flex' }}><Icon name="search" size={16} /></span>
        <input className="luma-input" value={query} onChange={e => onSearch(e.target.value)} placeholder="Search past entries…"
          style={{ ...s.input, width: '100%', boxSizing: 'border-box', paddingLeft: 38 }} />
        {query.trim().length >= 2 && (
          <div style={{ marginTop: 10 }}>
            {results.length === 0 ? (
              <div style={{ fontSize: 13, color: theme.sub, fontFamily: sans, padding: '8px 4px' }}>No entries match &ldquo;{query.trim()}&rdquo;.</div>
            ) : results.map(r => (
              <div key={r.date} onClick={() => openResult(r.date)} className="luma-row" style={{ cursor: 'pointer', padding: '11px 12px', borderRadius: 12, border: `1px solid ${theme.border}`, marginBottom: 8, background: theme.c1 }}>
                <div style={{ fontSize: 12, color: theme.accent, fontFamily: sans, fontWeight: 600, marginBottom: 4 }}>{fmtShort(r.date)}</div>
                <div style={{ fontSize: 13, color: theme.muted, fontFamily: serif, fontStyle: 'italic', lineHeight: 1.4 }}>{snippet(r.content, query)}</div>
              </div>
            ))}
          </div>
        )}
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
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
              <div style={{ display: 'inline-flex', background: theme.c2, border: `1px solid ${theme.border}`, borderRadius: 10, padding: 3, gap: 2 }}>
                {(['write', 'preview'] as const).map(m => (
                  <button key={m} onClick={() => setMode(m)} style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5, border: 'none', cursor: 'pointer',
                    borderRadius: 8, padding: '6px 12px', fontFamily: sans, fontSize: 12, fontWeight: 600,
                    background: mode === m ? theme.c3 : 'transparent', color: mode === m ? theme.txt : theme.sub,
                  }}>
                    <Icon name={m === 'write' ? 'edit' : 'eye'} size={13} />{m === 'write' ? 'Write' : 'Preview'}
                  </button>
                ))}
              </div>
            </div>

            {mode === 'write' ? (
              <textarea
                value={content}
                onChange={e => handleChange(e.target.value)}
                placeholder={`What's on your mind today?\n\nWrite freely — **bold**, *italic*, # headings and - lists all work.`}
                rows={13}
                style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', color: theme.txt, fontSize: 18, lineHeight: 1.8, fontFamily: serif, resize: 'none', boxSizing: 'border-box' }}
              />
            ) : (
              <div className="luma-md" style={{ minHeight: 280, color: theme.txt, fontFamily: serif, fontSize: 18, lineHeight: 1.8 }}>
                {content.trim()
                  ? <div dangerouslySetInnerHTML={{ __html: mdToHtml(content) }} />
                  : <span style={{ color: theme.sub, fontStyle: 'italic' }}>Nothing written yet.</span>}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTop: `1px solid ${theme.border}` }}>
              <span style={{ ...s.label, color: theme.sub }}>{wordCount(content)} words · {content.length} chars</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: saved ? theme.green : saving ? theme.muted : theme.sub, fontFamily: sans }}>
                {saved ? <><Icon name="check" size={13} stroke={2.2} />Saved</> : saving ? 'Saving…' : 'Auto-saves as you type'}
              </span>
            </div>
          </>
        )}
      </div>

      <div style={{ ...s.label, color: theme.sub, textAlign: 'center', marginTop: 16, letterSpacing: '0.1em' }}>
        Markdown supported · ← → to browse entries
      </div>
    </div>
  )
}