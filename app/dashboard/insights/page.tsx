'use client'

import { createClient } from '@/utils/supabase/client'
import { useEffect, useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTheme } from '../../ThemeContext'
import type { Theme } from '../../theme'
import { styles, PageHeader, CardLabel, Loader, Icon, lastNDays, serif, sans } from '../ui'
import { cacheGet, cacheSet } from '../cache'

const todayStr = () => new Date().toISOString().slice(0, 10)
const RANGES = [{ label: '30 days', days: 30 }, { label: '90 days', days: 90 }]
const mean = (a: number[]) => (a.length ? a.reduce((s, n) => s + n, 0) / a.length : 0)
const isWeekend = (d: string) => { const g = new Date(d + 'T12:00').getDay(); return g === 0 || g === 6 }

type Series = { date: string; value: number }[]
type Insights = {
  days: number
  cal: Series; spend: Series; move: Series; adh: Series
  calAvg: number; spendTotal: number; spendAvg: number; moveTotal: number; moveAvg: number; adhAvg: number
  calTrend: number; spendTrend: number; moveTrend: number
  loggedDays: number; totalDays: number
  patterns: { icon: string; text: string }[]
}

// % difference between the second half and first half of a series (within-range trend).
const halfTrend = (s: Series) => {
  const h = Math.floor(s.length / 2)
  const a = mean(s.slice(0, h).map(x => x.value))
  const b = mean(s.slice(h).map(x => x.value))
  return a > 0 ? Math.round(((b - a) / a) * 100) : b > 0 ? 100 : 0
}

function compute(days: number, byDate: { cal: Record<string, number>; spend: Record<string, number>; move: Record<string, number>; taken: Record<string, number> }, pillCount: number): Insights {
  const dates = lastNDays(days, todayStr())
  const cal: Series = dates.map(d => ({ date: d, value: byDate.cal[d] || 0 }))
  const spend: Series = dates.map(d => ({ date: d, value: byDate.spend[d] || 0 }))
  const move: Series = dates.map(d => ({ date: d, value: byDate.move[d] || 0 }))
  const adh: Series = dates.map(d => ({ date: d, value: pillCount > 0 ? Math.min(100, Math.round(((byDate.taken[d] || 0) / pillCount) * 100)) : 0 }))

  const calDaysLogged = cal.filter(d => d.value > 0)
  const patterns: { icon: string; text: string }[] = []

  // 1. Movement ↔ spending
  const activeSpend = dates.filter(d => (byDate.move[d] || 0) > 0).map(d => byDate.spend[d] || 0)
  const sedSpend = dates.filter(d => (byDate.move[d] || 0) === 0).map(d => byDate.spend[d] || 0)
  if (activeSpend.length >= 3 && sedSpend.length >= 3) {
    const a = mean(activeSpend), s = mean(sedSpend)
    if (s > 0 && Math.abs(a - s) / s >= 0.15) {
      const diff = Math.round(Math.abs(((a - s) / s) * 100))
      patterns.push({ icon: 'move', text: a < s ? `On days you move, you spend ${diff}% less — ৳${Math.round(s - a).toLocaleString()} lower on average.` : `On days you move, you spend ${diff}% more on average.` })
    }
  }

  // 2. Weekend vs weekday spending
  const wkndSpend = mean(dates.filter(isWeekend).map(d => byDate.spend[d] || 0))
  const wkdaySpend = mean(dates.filter(d => !isWeekend(d)).map(d => byDate.spend[d] || 0))
  if (wkdaySpend > 0 && Math.abs(wkndSpend - wkdaySpend) / wkdaySpend >= 0.2) {
    const diff = Math.round(Math.abs(((wkndSpend - wkdaySpend) / wkdaySpend) * 100))
    patterns.push({ icon: 'finance', text: wkndSpend > wkdaySpend ? `Weekends cost more — you spend ${diff}% above your weekday average.` : `You spend ${diff}% less on weekends than weekdays.` })
  }

  // 3. Weekend vs weekday eating
  const wkndCal = mean(dates.filter(d => isWeekend(d) && (byDate.cal[d] || 0) > 0).map(d => byDate.cal[d] || 0))
  const wkdayCal = mean(dates.filter(d => !isWeekend(d) && (byDate.cal[d] || 0) > 0).map(d => byDate.cal[d] || 0))
  if (wkdayCal > 0 && (wkndCal - wkdayCal) / wkdayCal >= 0.12) {
    patterns.push({ icon: 'nutrition', text: `You eat ${Math.round(((wkndCal - wkdayCal) / wkdayCal) * 100)}% more on weekends than weekdays.` })
  }

  // 4. Consistency
  const loggedDays = new Set([...calDaysLogged.map(d => d.date), ...move.filter(d => d.value > 0).map(d => d.date), ...spend.filter(d => d.value > 0).map(d => d.date)]).size
  if (loggedDays > 0) patterns.push({ icon: 'check', text: `You logged something on ${loggedDays} of the last ${days} days (${Math.round((loggedDays / days) * 100)}%).` })

  // 5. Movement trend callout
  const mvT = halfTrend(move)
  if (Math.abs(mvT) >= 25) patterns.push({ icon: 'trend', text: mvT > 0 ? `Movement is trending up ${mvT}% across this period.` : `Movement is trending down ${Math.abs(mvT)}% — worth a nudge.` })

  return {
    days, cal, spend, move, adh,
    calAvg: Math.round(mean(calDaysLogged.map(d => d.value))),
    spendTotal: Math.round(spend.reduce((s, d) => s + d.value, 0)),
    spendAvg: Math.round(mean(spend.map(d => d.value))),
    moveTotal: move.reduce((s, d) => s + d.value, 0),
    moveAvg: Math.round(mean(move.map(d => d.value))),
    adhAvg: pillCount > 0 ? Math.round(mean(adh.map(d => d.value))) : 0,
    calTrend: halfTrend(cal), spendTrend: halfTrend(spend), moveTrend: mvT,
    loggedDays, totalDays: days,
    patterns: patterns.slice(0, 4),
  }
}

// Compress a long daily series into ~weekly buckets so the chart stays readable.
function bucketed(s: Series): number[] {
  if (s.length <= 34) return s.map(d => d.value)
  const out: number[] = []
  for (let i = 0; i < s.length; i += 7) out.push(s.slice(i, i + 7).reduce((a, d) => a + d.value, 0))
  return out
}

function TrendBars({ t, values, color }: { t: Theme; values: number[]; color: string }) {
  const max = Math.max(...values, 1)
  const avg = mean(values)
  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-end', gap: values.length > 34 ? 3 : 2, height: 56, marginTop: 12 }}>
      {avg > 0 && <div style={{ position: 'absolute', left: 0, right: 0, bottom: `${(avg / max) * 100}%`, borderTop: `1px dashed color-mix(in srgb, ${t.muted} 55%, transparent)`, opacity: 0.6 }} />}
      {values.map((v, i) => (
        <div key={i} style={{ flex: 1, height: `${Math.max(2, (v / max) * 100)}%`, minHeight: 2, borderRadius: 2, background: i === values.length - 1 ? color : `color-mix(in srgb, ${color} 42%, ${t.c2})` }} />
      ))}
    </div>
  )
}

export default function InsightsPage() {
  const supabase = createClient()
  const { theme } = useTheme()
  const router = useRouter()
  const [range, setRange] = useState(30)
  const [data, setData] = useState<Insights | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async (days: number) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const key = `insights:${user.id}:${days}`
    const cached = cacheGet<Insights>(key)
    if (cached) { setData(cached); setLoading(false) } else setLoading(true)

    const dates = lastNDays(days, todayStr())
    const lo = dates[0], hi = dates[days - 1]
    const [foods, exps, acts, pillsRes, takenRes] = await Promise.all([
      supabase.from('food_logs').select('calories, date').eq('user_id', user.id).gte('date', lo).lte('date', hi),
      supabase.from('expenses').select('amount, date').eq('user_id', user.id).gte('date', lo).lte('date', hi),
      supabase.from('exercise_logs').select('duration_minutes, date').eq('user_id', user.id).gte('date', lo).lte('date', hi),
      supabase.from('pills').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('pills_taken').select('date_taken').eq('user_id', user.id).gte('date_taken', lo).lte('date_taken', hi),
    ])
    const byDate = { cal: {} as Record<string, number>, spend: {} as Record<string, number>, move: {} as Record<string, number>, taken: {} as Record<string, number> }
    foods.data?.forEach((r: { calories: number; date: string }) => { byDate.cal[r.date] = (byDate.cal[r.date] || 0) + r.calories })
    exps.data?.forEach((r: { amount: number; date: string }) => { byDate.spend[r.date] = (byDate.spend[r.date] || 0) + r.amount })
    acts.data?.forEach((r: { duration_minutes: number; date: string }) => { byDate.move[r.date] = (byDate.move[r.date] || 0) + r.duration_minutes })
    takenRes.data?.forEach((r: { date_taken: string }) => { byDate.taken[r.date_taken] = (byDate.taken[r.date_taken] || 0) + 1 })

    const result = compute(days, byDate, pillsRes.count || 0)
    cacheSet(key, result)
    setData(result)
    setLoading(false)
  }, [supabase])

  useEffect(() => { load(range) }, [range, load])

  const s = styles(theme)
  if (loading && !data) return <Loader t={theme} />

  const TrendCard = ({ name, big, sub, trend, goodDir, color, values }: { name: string; big: string; sub: string; trend: number; goodDir: 'up' | 'down' | 'none'; color: string; values: number[] }) => {
    const up = trend > 0
    const tcolor = goodDir === 'none' || trend === 0 ? theme.muted : (up === (goodDir === 'up')) ? theme.green : theme.red
    return (
      <div className="luma-card" style={{ ...s.card, marginBottom: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <CardLabel t={theme} style={{ marginBottom: 0 }}>{name}</CardLabel>
          {trend !== 0 && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, fontSize: 11.5, fontWeight: 600, color: tcolor, fontFamily: sans }}>
              <Icon name="chevronRight" size={11} stroke={2.4} style={{ transform: up ? 'rotate(-90deg)' : 'rotate(90deg)' }} />{Math.abs(trend)}%
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 10 }}>
          <span style={{ fontFamily: serif, fontSize: 32, color: theme.txt, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{big}</span>
          <span style={{ fontSize: 12, color: theme.muted, fontFamily: sans }}>{sub}</span>
        </div>
        <TrendBars t={theme} values={values} color={color} />
      </div>
    )
  }

  return (
    <div className="luma-page" style={s.page}>
      <PageHeader t={theme} eyebrow="Patterns across your life" title="Insights"
        right={
          <button className="luma-ghost" onClick={() => router.push('/dashboard/home')} style={s.ghostBtn}>
            <Icon name="arrowRight" size={14} style={{ transform: 'rotate(180deg)' }} />Home
          </button>
        } />

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {RANGES.map(r => (
          <button key={r.days} className="luma-btn" onClick={() => setRange(r.days)} style={{
            ...s.ghostBtn, padding: '8px 16px',
            ...(range === r.days ? { borderColor: theme.accent, color: theme.accent, background: `color-mix(in srgb, ${theme.accent} 12%, transparent)` } : {}),
          }}>Last {r.label}</button>
        ))}
      </div>

      {data && (
        <>
          {data.patterns.length > 0 && (
            <div className="luma-card" style={s.card}>
              <CardLabel t={theme}>What we noticed</CardLabel>
              {data.patterns.map((p, i) => (
                <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '11px 0', borderTop: i > 0 ? `1px solid ${theme.border}` : 'none' }}>
                  <span style={{ color: theme.accent, display: 'flex', marginTop: 2, flexShrink: 0 }}><Icon name={p.icon} size={16} stroke={1.8} /></span>
                  <span style={{ fontSize: 14, color: theme.txt, lineHeight: 1.45, fontFamily: serif, fontStyle: 'italic' }}>{p.text}</span>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 13 }}>
            <TrendCard name="Calories / day" big={data.calAvg.toLocaleString()} sub="avg eaten" trend={data.calTrend} goodDir="none" color={theme.green} values={bucketed(data.cal)} />
            <TrendCard name="Spending" big={'৳' + data.spendTotal.toLocaleString()} sub={`৳${data.spendAvg}/day`} trend={data.spendTrend} goodDir="down" color={theme.accent} values={bucketed(data.spend)} />
            <TrendCard name="Movement" big={data.moveTotal.toLocaleString()} sub={`${data.moveAvg} min/day`} trend={data.moveTrend} goodDir="up" color={theme.blue} values={bucketed(data.move)} />
            <TrendCard name="Adherence" big={data.adhAvg + '%'} sub="avg meds taken" trend={0} goodDir="up" color={theme.purple} values={bucketed(data.adh)} />
          </div>

          <div style={{ ...s.label, color: theme.sub, textAlign: 'center', marginTop: 20, letterSpacing: '0.12em' }}>
            Logged on {data.loggedDays} of {data.totalDays} days
          </div>
        </>
      )}
    </div>
  )
}
