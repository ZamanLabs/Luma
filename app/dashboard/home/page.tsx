'use client'

import { createClient } from '@/utils/supabase/client'
import { useEffect, useCallback, useState, useRef } from 'react'
import { useTheme } from '../../ThemeContext'
import { useRouter } from 'next/navigation'
import { animate, stagger } from 'animejs'
import { Icon, Ring, WeekChart, tileStyle, lastNDays, useProfileMenu, serif, sans } from '../ui'
import { cacheGet, cacheSet } from '../cache'
import WeeklyReview from './WeeklyReview'
import Bloom, { type BloomInput } from './Bloom'

type Pill = { id: string; name: string; scheduled_time: string }
type Day = { date: string; value: number }
type Snapshot = {
  name: string; cg: number; bg: number; cals: number; spent: number
  mins: number; actsCount: number; pills: Pill[]; taken: string[]
  week: Day[]; weekCals: Day[]; foodCount: number; expenseToday: number
}

const todayStr = () => new Date().toISOString().slice(0, 10)
const thisMonth = () => new Date().toISOString().slice(0, 7)
const timeNow = () => new Date().toTimeString().slice(0, 5)

const greeting = () => {
  const h = new Date().getHours()
  if (h >= 5 && h < 12) return 'Good morning'
  if (h >= 12 && h < 17) return 'Good afternoon'
  if (h >= 17 && h < 22) return 'Good evening'
  return 'Still up,'
}

const isDue = (t: string) => {
  const [sh, sm] = t.split(':').map(Number)
  const [nh, nm] = timeNow().split(':').map(Number)
  const diff = (sh * 60 + sm) - (nh * 60 + nm)
  return diff >= -10 && diff <= 30
}

export default function HomePage() {
  const supabase = createClient()
  const { theme } = useTheme()
  const router = useRouter()
  const openMenu = useProfileMenu()

  const [loading, setLoading] = useState(true)
  const [calGoal, setCalGoal] = useState(2000)
  const [totalCals, setTotalCals] = useState(0)
  const [budget, setBudget] = useState(15000)
  const [totalSpent, setTotalSpent] = useState(0)
  const [totalMins, setTotalMins] = useState(0)
  const [actCount, setActCount] = useState(0)
  const [pills, setPills] = useState<Pill[]>([])
  const [takenIds, setTakenIds] = useState<string[]>([])
  const [userName, setUserName] = useState('')
  const [hovered, setHovered] = useState<string | null>(null)
  const [week, setWeek] = useState<Day[]>([])
  const [weekCals, setWeekCals] = useState<Day[]>([])
  const [foodCount, setFoodCount] = useState(0)
  const [expenseToday, setExpenseToday] = useState(0)

  const [dispCals, setDispCals] = useState(0)
  const [dispSpent, setDispSpent] = useState(0)
  const [dispMins, setDispMins] = useState(0)
  const [dispActs, setDispActs] = useState(0)
  const [dispPillsDone, setDispPillsDone] = useState(0)

  const calBarRef = useRef<HTMLDivElement>(null)
  const budgetBarRef = useRef<HTMLDivElement>(null)
  const pillsBarRef = useRef<HTMLDivElement>(null)
  const sectionsRef = useRef<HTMLDivElement>(null)
  const greetingRef = useRef<HTMLDivElement>(null)

  const loadAll = useCallback(async () => {
    const applyState = (d: Snapshot) => {
      setUserName(d.name); setCalGoal(d.cg); setBudget(d.bg)
      setTotalCals(d.cals); setTotalSpent(d.spent); setTotalMins(d.mins)
      setActCount(d.actsCount); setPills(d.pills); setTakenIds(d.taken); setWeek(d.week); setWeekCals(d.weekCals)
      setFoodCount(d.foodCount); setExpenseToday(d.expenseToday)
    }

    const pctOf = (a: number, b: number) => Math.min(100, Math.round(a / b * 100))

    // Full entrance: fade/stagger sections + count-up numbers + grow bars.
    const reveal = (d: Snapshot) => setTimeout(() => {
      if (greetingRef.current) animate(greetingRef.current, { opacity: [0, 1], translateY: [20, 0], duration: 700, ease: 'outExpo' })
      if (sectionsRef.current) animate(sectionsRef.current.querySelectorAll('.home-section'), { opacity: [0, 1], translateY: [24, 0], delay: stagger(100, { start: 200 }), duration: 700, ease: 'outExpo' })

      const cu = (to: number, dur: number, delay: number, set: (n: number) => void) => {
        const o = { val: 0 }
        animate(o, { val: { to }, duration: dur, delay, ease: 'outExpo', onUpdate: () => set(Math.round(o.val)) })
      }
      cu(d.cals, 1200, 300, setDispCals)
      cu(d.spent, 1200, 400, setDispSpent)
      cu(d.mins, 1000, 500, setDispMins)
      cu(d.actsCount, 800, 500, setDispActs)
      cu(d.taken.length, 800, 600, setDispPillsDone)

      const pillsPct = d.pills.length > 0 ? Math.round(d.taken.length / d.pills.length * 100) : 0
      if (calBarRef.current) animate(calBarRef.current, { width: ['0%', `${pctOf(d.cals, d.cg)}%`], duration: 1200, delay: 400, ease: 'outExpo' })
      if (budgetBarRef.current) animate(budgetBarRef.current, { width: ['0%', `${pctOf(d.spent, d.bg)}%`], duration: 1200, delay: 500, ease: 'outExpo' })
      if (pillsBarRef.current) animate(pillsBarRef.current, { width: ['0%', `${pillsPct}%`], duration: 1000, delay: 600, ease: 'outExpo' })
    }, 50)

    // Silent refresh after an instant cache render — just settle to final values.
    const syncFinal = (d: Snapshot) => {
      setDispCals(d.cals); setDispSpent(d.spent); setDispMins(d.mins)
      setDispActs(d.actsCount); setDispPillsDone(d.taken.length)
      const pillsPct = d.pills.length > 0 ? Math.round(d.taken.length / d.pills.length * 100) : 0
      if (calBarRef.current) animate(calBarRef.current, { width: `${pctOf(d.cals, d.cg)}%`, duration: 450, ease: 'outExpo' })
      if (budgetBarRef.current) animate(budgetBarRef.current, { width: `${pctOf(d.spent, d.bg)}%`, duration: 450, ease: 'outExpo' })
      if (pillsBarRef.current) animate(pillsBarRef.current, { width: `${pillsPct}%`, duration: 450, ease: 'outExpo' })
    }

    const cached = cacheGet<Snapshot>('home')
    if (cached) { applyState(cached); setLoading(false); reveal(cached) }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const days = lastNDays(7, todayStr())
    const [settings, foods, expenses, acts, pillData, takenData, weekActs, weekFoods] = await Promise.all([
      supabase.from('user_settings').select('calorie_goal, monthly_budget').eq('user_id', user.id).maybeSingle(),
      supabase.from('food_logs').select('calories').eq('user_id', user.id).eq('date', todayStr()),
      supabase.from('expenses').select('amount, date').eq('user_id', user.id).gte('date', thisMonth() + '-01'),
      supabase.from('exercise_logs').select('duration_minutes').eq('user_id', user.id).eq('date', todayStr()),
      supabase.from('pills').select('id, name, scheduled_time').eq('user_id', user.id).order('scheduled_time', { ascending: true }),
      supabase.from('pills_taken').select('pill_id').eq('user_id', user.id).eq('date_taken', todayStr()),
      supabase.from('exercise_logs').select('duration_minutes, date').eq('user_id', user.id).gte('date', days[0]).lte('date', days[6]),
      supabase.from('food_logs').select('calories, date').eq('user_id', user.id).gte('date', days[0]).lte('date', days[6]),
    ])

    const minsByDate: Record<string, number> = {}
    weekActs.data?.forEach((r: { duration_minutes: number; date: string }) => { minsByDate[r.date] = (minsByDate[r.date] || 0) + r.duration_minutes })
    const calsByDate: Record<string, number> = {}
    weekFoods.data?.forEach((r: { calories: number; date: string }) => { calsByDate[r.date] = (calsByDate[r.date] || 0) + r.calories })

    const snap: Snapshot = {
      name: user.user_metadata?.full_name?.split(' ')[0] || '',
      cg: settings.data?.calorie_goal || 2000,
      bg: settings.data?.monthly_budget || 15000,
      cals: foods.data?.reduce((s, f) => s + f.calories, 0) || 0,
      spent: expenses.data?.reduce((s, e) => s + e.amount, 0) || 0,
      mins: acts.data?.reduce((s, a) => s + a.duration_minutes, 0) || 0,
      actsCount: acts.data?.length || 0,
      pills: pillData.data || [],
      taken: takenData.data?.map((t: { pill_id: string }) => t.pill_id) || [],
      week: days.map(d => ({ date: d, value: minsByDate[d] || 0 })),
      weekCals: days.map(d => ({ date: d, value: calsByDate[d] || 0 })),
      foodCount: foods.data?.length || 0,
      expenseToday: expenses.data?.filter((e: { date: string }) => e.date === todayStr()).length || 0,
    }

    cacheSet('home', snap)
    applyState(snap)
    setLoading(false)
    if (cached) syncFinal(snap)
    else reveal(snap)
  }, [supabase])

  useEffect(() => { loadAll() }, [loadAll])

  const calPct = Math.min(100, Math.round(totalCals / calGoal * 100))
  const budgetPct = Math.min(100, Math.round(totalSpent / budget * 100))
  const moneyLeft = budget - totalSpent
  const calLeft = calGoal - totalCals
  const pillsDoneCount = takenIds.length
  const pillsTotal = pills.length
  const nextPill = pills.find(p => !takenIds.includes(p.id))
  const hasDue = pills.some(p => isDue(p.scheduled_time) && !takenIds.includes(p.id))
  const allDone = pillsTotal > 0 && pillsDoneCount === pillsTotal

  const label = {
    fontFamily: sans,
    fontSize: 10,
    letterSpacing: '0.16em',
    textTransform: 'uppercase' as const,
    color: theme.sub,
    fontWeight: 600,
  }

  const TileHead = ({ icon, name, accent }: { icon: string; name: string; accent: string }) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: 30, height: 30, borderRadius: 10, color: accent,
          background: `color-mix(in srgb, ${accent} 16%, transparent)`,
          border: `1px solid color-mix(in srgb, ${accent} 26%, transparent)`,
        }}><Icon name={icon} size={16} stroke={1.8} /></span>
        <span style={label}>{name}</span>
      </div>
      <span style={{ color: theme.muted, opacity: 0.45, display: 'flex' }}><Icon name="arrowRight" size={16} stroke={1.6} /></span>
    </div>
  )

  const dim = (id: string): React.CSSProperties => ({ opacity: hovered && hovered !== id ? 0.5 : 1, transition: 'opacity .25s, transform .25s, border-color .25s' })
  const hover = (id: string) => ({ onMouseEnter: () => setHovered(id), onMouseLeave: () => setHovered(null) })

  const nutColor = calLeft < 0 ? theme.red : theme.green
  const finColor = moneyLeft < 0 ? theme.red : budgetPct > 70 ? theme.accent : theme.green
  const medColor = allDone ? theme.green : hasDue ? theme.accent : theme.blue
  const pillsPct = pillsTotal > 0 ? Math.round(pillsDoneCount / pillsTotal * 100) : 0

  // Weekly calorie series with today reflecting live edits, for the hero sparkline.
  const calSeries = weekCals.map(d => d.date === todayStr() ? { ...d, value: totalCals } : d)
  // "Showed up" streak — days this week with any food or movement logged.
  const activeDays = week.map((d, i) => ({ date: d.date, active: d.value > 0 || (weekCals[i]?.value || 0) > 0 }))
  const streak = activeDays.filter(a => a.active).length

  // One-line smart insight for the masthead.
  const insight = (() => {
    if (calLeft < 0) return `${Math.abs(calLeft).toLocaleString()} kcal over goal today`
    const parts: string[] = []
    parts.push(totalCals > 0 ? `${calLeft.toLocaleString()} kcal to spare` : 'Nothing logged yet today')
    if (pillsTotal > 0 && !allDone) parts.push(`${pillsTotal - pillsDoneCount} dose${pillsTotal - pillsDoneCount > 1 ? 's' : ''} to take`)
    if (moneyLeft < 0) parts.push('over budget')
    else if (totalMins > 0) parts.push(`${totalMins} min moved`)
    return parts.join('  ·  ')
  })()

  const plainCard: React.CSSProperties = {
    background: `linear-gradient(170deg, ${theme.c1}, ${theme.bg})`,
    border: `1px solid ${theme.border}`, borderRadius: 24, padding: 18,
    boxShadow: `0 1px 0 color-mix(in srgb, ${theme.txt} 6%, transparent) inset, 0 16px 38px -22px rgba(0,0,0,0.32)`,
  }

  // The bloom: today's data, grown into a living form.
  const entries = foodCount + expenseToday + actCount + pillsDoneCount
  const onTrackScore = ((calLeft >= 0 ? 1 : 0) + (moneyLeft >= 0 ? 1 : 0) + (pillsTotal === 0 ? 1 : pillsDoneCount / pillsTotal)) / 3
  const bloomInput: BloomInput = {
    growth: Math.max(0.26, Math.min(1, entries / 8)),
    warmth: onTrackScore,
    motion: Math.min(1, totalMins / 60),
    petals: 11 + Math.min(20, entries * 2),
    seed: parseInt(todayStr().replace(/-/g, ''), 10) % 2147483647,
    // Warmth is a fixed gold so "on track" always reads warm, even on cool/light themes.
    green: theme.green, amber: '#e8a53a', off: theme.red, particle: theme.purple,
  }
  const tended = `${entries} ${entries === 1 ? 'thing' : 'things'} tended today`

  if (loading) return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: serif, fontSize: 26, color: theme.muted, letterSpacing: '0.04em' }}>
      <span style={{ animation: 'lumaPulse 1.8s ease-in-out infinite' }}>Luma</span>
    </div>
  )

  return (
    <div className="luma-home" style={{ padding: '40px 18px 24px', maxWidth: 540, margin: '0 auto', fontFamily: sans }}>

      <div ref={greetingRef} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 26, opacity: 0 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ ...label, marginBottom: 8 }}>{greeting()}</div>
          <div style={{ fontFamily: serif, fontSize: 52, fontWeight: 400, color: theme.txt, lineHeight: 0.95, letterSpacing: '-0.025em', marginBottom: 12 }}>
            {userName || 'Wakib'}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 13, color: theme.muted, flexWrap: 'wrap' }}>
            <span style={{ color: theme.sub }}>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
            <span style={{ width: 3, height: 3, borderRadius: 999, background: theme.sub, opacity: 0.6 }} />
            <span style={{ color: calLeft < 0 || moneyLeft < 0 ? theme.red : theme.muted }}>{insight}</span>
          </div>
        </div>
        <button className="luma-btn" onClick={openMenu} aria-label="Profile and settings" style={{
          width: 52, height: 52, borderRadius: '50%', flexShrink: 0, marginLeft: 14, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: serif, fontSize: 23, color: theme.accent,
          background: `linear-gradient(150deg, color-mix(in srgb, ${theme.accent} 28%, ${theme.c1}), ${theme.c1})`,
          border: `1px solid color-mix(in srgb, ${theme.accent} 34%, ${theme.border})`,
          boxShadow: `0 10px 26px -12px ${theme.accent}`,
        }}>{(userName || 'W').charAt(0).toUpperCase()}</button>
      </div>

      <div ref={sectionsRef} className="luma-bento" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 13 }}>

        {/* HERO — today's data, grown into a living bloom */}
        <div className="home-section b-wide" style={{
          position: 'relative', opacity: 0, borderRadius: 28, overflow: 'hidden',
          background: 'radial-gradient(125% 100% at 50% 28%, #0c0a07 0%, #050403 72%)',
          border: '1px solid rgba(255,255,255,0.07)',
          boxShadow: '0 30px 72px -34px rgba(0,0,0,0.9), inset 0 1px 0 rgba(255,255,255,0.05)',
        }}>
          <Bloom input={bloomInput} height={300} />
          <div style={{ position: 'absolute', top: 18, left: 22, right: 22, display: 'flex', justifyContent: 'space-between', alignItems: 'center', pointerEvents: 'none' }}>
            <span style={{ ...label, color: 'rgba(240,230,214,0.62)' }}>Today, in bloom</span>
            <span style={{ fontSize: 11, color: 'rgba(240,230,214,0.4)', fontFamily: sans }}>{tended}</span>
          </div>
          <div style={{ position: 'absolute', bottom: 20, left: 24, right: 24, textAlign: 'center', pointerEvents: 'none' }}>
            <span style={{ fontFamily: serif, fontSize: 18, fontStyle: 'italic', color: 'rgba(240,230,214,0.82)', lineHeight: 1.3 }}>{insight}</span>
          </div>
        </div>

        {/* Nutrition — ring tile */}
        <div className="home-section luma-card luma-tile" style={{ ...tileStyle(theme, nutColor), opacity: 0, ...dim('nutrition') }}
          onClick={() => router.push('/dashboard/nutrition')} {...hover('nutrition')}>
          <TileHead icon="nutrition" name="Eat" accent={nutColor} />
          <div style={{ display: 'flex', justifyContent: 'center', margin: '4px 0 2px' }}>
            <Ring size={104} stroke={10} pct={calPct} color={nutColor} track={theme.c2}>
              <span style={{ fontFamily: serif, fontSize: 22, color: calLeft < 0 ? theme.red : theme.txt, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{calLeft < 0 ? `+${Math.abs(calLeft).toLocaleString()}` : calLeft.toLocaleString()}</span>
              <span style={{ ...label, fontSize: 8.5, marginTop: 4 }}>{calLeft < 0 ? 'over' : 'left'}</span>
            </Ring>
          </div>
          <div style={{ fontSize: 11.5, color: theme.muted, textAlign: 'center', marginTop: 8 }}>
            {dispCals.toLocaleString()} of {calGoal.toLocaleString()} kcal
          </div>
        </div>

        {/* Finance — ring tile */}
        <div className="home-section luma-card luma-tile" style={{ ...tileStyle(theme, finColor), opacity: 0, ...dim('finance') }}
          onClick={() => router.push('/dashboard/finance')} {...hover('finance')}>
          <TileHead icon="finance" name="Money" accent={finColor} />
          <div style={{ display: 'flex', justifyContent: 'center', margin: '4px 0 2px' }}>
            <Ring size={104} stroke={10} pct={budgetPct} color={finColor} track={theme.c2}>
              <span style={{ fontFamily: serif, fontSize: 20, color: moneyLeft < 0 ? theme.red : theme.txt, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>৳{Math.abs(budget - dispSpent).toLocaleString()}</span>
              <span style={{ ...label, fontSize: 8.5, marginTop: 4 }}>{moneyLeft < 0 ? 'over' : 'left'}</span>
            </Ring>
          </div>
          <div style={{ fontSize: 11.5, color: theme.muted, textAlign: 'center', marginTop: 8 }}>
            ৳{dispSpent.toLocaleString()} spent
          </div>
        </div>

        {/* Medications — ring tile */}
        <div className="home-section luma-card luma-tile" style={{ ...tileStyle(theme, medColor), opacity: 0, ...dim('meds') }}
          onClick={() => router.push('/dashboard/meds')} {...hover('meds')}>
          <TileHead icon="meds" name="Meds" accent={medColor} />
          {pillsTotal === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 120, gap: 6, color: theme.sub }}>
              <Icon name="meds" size={26} stroke={1.4} />
              <span style={{ fontSize: 12, fontFamily: serif, fontStyle: 'italic' }}>None scheduled</span>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'center', margin: '4px 0 2px' }}>
                <Ring size={104} stroke={10} pct={pillsPct} color={medColor} track={theme.c2}>
                  <span style={{ fontFamily: serif, fontSize: 24, color: theme.txt, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{dispPillsDone}<span style={{ color: theme.sub, fontSize: 17 }}>/{pillsTotal}</span></span>
                  <span style={{ ...label, fontSize: 8.5, marginTop: 4 }}>taken</span>
                </Ring>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, fontSize: 11.5, marginTop: 8, color: medColor }}>
                {allDone ? <Icon name="check" size={13} stroke={2.2} /> : hasDue ? <Icon name="clock" size={12} stroke={1.9} /> : null}
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{allDone ? 'All taken' : hasDue ? 'Due now' : nextPill ? nextPill.scheduled_time : ''}</span>
              </div>
            </>
          )}
        </div>

        {/* Movement — compact tile */}
        <div className="home-section luma-card luma-tile" style={{ ...tileStyle(theme, theme.accent), opacity: 0, ...dim('exercise') }}
          onClick={() => router.push('/dashboard/exercise')} {...hover('exercise')}>
          <TileHead icon="move" name="Move" accent={theme.accent} />
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, margin: '6px 0 2px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
              <span style={{ fontFamily: serif, fontSize: 42, color: totalMins > 0 ? theme.txt : theme.sub, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{dispMins}</span>
              <span style={{ fontSize: 12, color: theme.muted }}>min</span>
            </div>
            <span style={{ ...label, fontSize: 8.5, marginTop: 5 }}>{dispActs} {actCount === 1 ? 'activity' : 'activities'}</span>
          </div>
          {week.some(d => d.value > 0) && (() => {
            const max = Math.max(...week.map(x => x.value), 1)
            return (
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 28, marginTop: 10 }}>
                {week.map(d => {
                  const today = d.date === todayStr()
                  return <div key={d.date} style={{ flex: 1, height: `${Math.max(10, (d.value / max) * 100)}%`, borderRadius: 3, background: today ? theme.accent : `color-mix(in srgb, ${theme.accent} 38%, ${theme.c2})`, boxShadow: today ? `0 0 8px -1px ${theme.accent}` : 'none' }} />
                })}
              </div>
            )
          })()}
        </div>

        {/* Streak — "showing up" consistency band */}
        <div className="home-section b-wide" style={{ ...plainCard, opacity: 0, display: 'flex', alignItems: 'center', gap: 22, flexWrap: 'wrap' }}>
          <div style={{ minWidth: 120 }}>
            <div style={{ ...label, marginBottom: 9 }}>Showing up</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
              <span style={{ fontFamily: serif, fontSize: 40, color: streak > 0 ? theme.accent : theme.sub, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{streak}</span>
              <span style={{ fontFamily: serif, fontSize: 24, color: theme.sub }}>/7</span>
              <span style={{ fontSize: 12, color: theme.muted, marginLeft: 6 }}>days this week</span>
            </div>
          </div>
          <div style={{ flex: 1, display: 'flex', gap: 8, minWidth: 220 }}>
            {activeDays.map(d => {
              const isToday = d.date === todayStr()
              return (
                <div key={d.date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    width: '100%', maxWidth: 40, aspectRatio: '1', borderRadius: 12,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: d.active ? `linear-gradient(150deg, ${theme.accent}, color-mix(in srgb, ${theme.accent} 62%, ${theme.bg}))` : theme.c2,
                    border: isToday ? `1.5px solid ${theme.accent}` : `1px solid ${theme.border}`,
                    boxShadow: d.active ? `0 6px 14px -6px ${theme.accent}` : 'none',
                    color: theme.bg,
                  }}>
                    {d.active && <Icon name="check" size={15} stroke={2.4} />}
                  </div>
                  <span style={{ fontFamily: sans, fontSize: 9.5, fontWeight: isToday ? 700 : 500, color: isToday ? theme.accent : theme.sub }}>
                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'][new Date(d.date + 'T12:00').getDay()]}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

      </div>

      <WeeklyReview t={theme} />
    </div>
  )
}