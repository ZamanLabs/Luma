'use client'

import { createClient } from '@/utils/supabase/client'
import { useEffect, useCallback, useState, useRef } from 'react'
import { useTheme } from '../../ThemeContext'
import { useRouter } from 'next/navigation'
import { animate, stagger } from 'animejs'
import { Icon, Ring, WeekChart, tileStyle, lastNDays, serif, sans } from '../ui'
import { cacheGet, cacheSet } from '../cache'

type Pill = { id: string; name: string; scheduled_time: string }
type Day = { date: string; value: number }
type Snapshot = {
  name: string; cg: number; bg: number; cals: number; spent: number
  mins: number; actsCount: number; pills: Pill[]; taken: string[]; week: Day[]
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
      setActCount(d.actsCount); setPills(d.pills); setTakenIds(d.taken); setWeek(d.week)
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
    const [settings, foods, expenses, acts, pillData, takenData, weekActs] = await Promise.all([
      supabase.from('user_settings').select('calorie_goal, monthly_budget').eq('user_id', user.id).maybeSingle(),
      supabase.from('food_logs').select('calories').eq('user_id', user.id).eq('date', todayStr()),
      supabase.from('expenses').select('amount').eq('user_id', user.id).gte('date', thisMonth() + '-01'),
      supabase.from('exercise_logs').select('duration_minutes').eq('user_id', user.id).eq('date', todayStr()),
      supabase.from('pills').select('id, name, scheduled_time').eq('user_id', user.id).order('scheduled_time', { ascending: true }),
      supabase.from('pills_taken').select('pill_id').eq('user_id', user.id).eq('date_taken', todayStr()),
      supabase.from('exercise_logs').select('duration_minutes, date').eq('user_id', user.id).gte('date', days[0]).lte('date', days[6]),
    ])

    const byDate: Record<string, number> = {}
    weekActs.data?.forEach((r: { duration_minutes: number; date: string }) => { byDate[r.date] = (byDate[r.date] || 0) + r.duration_minutes })

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
      week: days.map(d => ({ date: d, value: byDate[d] || 0 })),
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

  if (loading) return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: serif, fontSize: 26, color: theme.muted, letterSpacing: '0.04em' }}>
      <span style={{ animation: 'lumaPulse 1.8s ease-in-out infinite' }}>Luma</span>
    </div>
  )

  return (
    <div className="luma-home" style={{ padding: '40px 18px 24px', maxWidth: 540, margin: '0 auto', fontFamily: sans }}>

      <div ref={greetingRef} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 30, opacity: 0 }}>
        <div>
          <div style={{ ...label, marginBottom: 8 }}>{greeting()}</div>
          <div style={{ fontFamily: serif, fontSize: 46, fontWeight: 400, color: theme.txt, lineHeight: 1.0, letterSpacing: '-0.02em', marginBottom: 9 }}>
            {userName || 'Wakib'}
          </div>
          <div style={{ fontSize: 12.5, color: theme.sub, fontWeight: 400 }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </div>
        </div>
        <div style={{
          width: 50, height: 50, borderRadius: '50%', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: serif, fontSize: 22, color: theme.accent,
          background: `linear-gradient(150deg, color-mix(in srgb, ${theme.accent} 26%, ${theme.c1}), ${theme.c1})`,
          border: `1px solid color-mix(in srgb, ${theme.accent} 32%, ${theme.border})`,
          boxShadow: `0 8px 22px -12px ${theme.accent}`,
        }}>{(userName || 'W').charAt(0).toUpperCase()}</div>
      </div>

      <div ref={sectionsRef} className="luma-bento" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 13 }}>

        {/* Nutrition — hero ring */}
        <div className="home-section luma-card b-span2" style={{ ...tileStyle(theme, nutColor), opacity: 0, display: 'flex', alignItems: 'center', gap: 20, ...dim('nutrition') }}
          onClick={() => router.push('/dashboard/nutrition')} {...hover('nutrition')}>
          <Ring size={118} stroke={11} pct={calPct} color={nutColor} track={theme.c2}>
            <span style={{ fontFamily: serif, fontSize: 30, color: theme.txt, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{dispCals.toLocaleString()}</span>
            <span style={{ ...label, fontSize: 9, marginTop: 4 }}>kcal</span>
          </Ring>
          <div style={{ flex: 1 }}>
            <TileHead icon="nutrition" name="Nutrition" accent={nutColor} />
            <div style={{ fontFamily: serif, fontSize: 34, color: nutColor, lineHeight: 1, letterSpacing: '-0.02em' }}>
              {calLeft < 0 ? `${Math.abs(calLeft).toLocaleString()}` : calLeft.toLocaleString()}
            </div>
            <div style={{ fontSize: 12.5, color: theme.muted, marginTop: 6 }}>
              {calLeft < 0 ? 'kcal over goal' : `kcal left of ${calGoal.toLocaleString()}`}
            </div>
          </div>
        </div>

        {/* Finance — ring tile */}
        <div className="home-section luma-card" style={{ ...tileStyle(theme, finColor), opacity: 0, ...dim('finance') }}
          onClick={() => router.push('/dashboard/finance')} {...hover('finance')}>
          <TileHead icon="finance" name="Finance" accent={finColor} />
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
        <div className="home-section luma-card" style={{ ...tileStyle(theme, medColor), opacity: 0, ...dim('meds') }}
          onClick={() => router.push('/dashboard/meds')} {...hover('meds')}>
          <TileHead icon="meds" name="Meds" accent={medColor} />
          {pillsTotal === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 138, gap: 6, color: theme.sub }}>
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

        {/* Movement — wide tile with week bars */}
        <div className="home-section luma-card b-wide" style={{ ...tileStyle(theme, theme.accent), opacity: 0, ...dim('exercise') }}
          onClick={() => router.push('/dashboard/exercise')} {...hover('exercise')}>
          <TileHead icon="move" name="Movement" accent={theme.accent} />
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 22, marginBottom: week.some(d => d.value > 0) ? 18 : 0 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <span style={{ fontFamily: serif, fontSize: 40, color: totalMins > 0 ? theme.txt : theme.sub, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{dispMins}</span>
              <span style={{ fontSize: 12.5, color: theme.muted }}>min</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <span style={{ fontFamily: serif, fontSize: 28, color: actCount > 0 ? theme.txt : theme.sub, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{dispActs}</span>
              <span style={{ fontSize: 12.5, color: theme.muted }}>{actCount === 1 ? 'activity' : 'activities'}</span>
            </div>
            <div style={{ flex: 1 }} />
            <div style={{ fontSize: 11.5, color: theme.muted, paddingBottom: 4 }}>{totalMins === 0 ? 'Nothing yet today' : `${(totalMins / 60).toFixed(1)} h total`}</div>
          </div>
          {week.some(d => d.value > 0) && (
            <WeekChart t={theme} color={theme.accent} data={week} fmt={v => Math.round(v) + 'm'} />
          )}
        </div>

      </div>
    </div>
  )
}