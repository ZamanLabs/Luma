'use client'

import { createClient } from '@/utils/supabase/client'
import { useEffect, useState } from 'react'
import type { Theme } from '../../theme'
import { Icon, lastNDays, serif, sans } from '../ui'
import { cacheGet, cacheSet } from '../cache'

const todayStr = () => new Date().toISOString().slice(0, 10)

type Metric = { now: number; prev: number }
type ReviewData = { cals: Metric; spend: Metric; move: Metric; adh: Metric; logged: number }

const sumWindow = (rows: { date: string; v: number }[] | undefined, dates: Set<string>) =>
  (rows || []).reduce((s, r) => (dates.has(r.date) ? s + r.v : s), 0)

const pctChange = (now: number, prev: number) =>
  prev > 0 ? Math.round(((now - prev) / prev) * 100) : now > 0 ? 100 : 0

export default function WeeklyReview({ t, onOpen }: { t: Theme; onOpen?: () => void }) {
  const supabase = createClient()
  const [d, setD] = useState<ReviewData | null>(null)

  useEffect(() => {
    let alive = true
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const key = `review:${user.id}`
      const cached = cacheGet<ReviewData>(key)
      if (cached && alive) setD(cached)

      const days = lastNDays(14, todayStr())
      const prevSet = new Set(days.slice(0, 7))
      const nowSet = new Set(days.slice(7))
      const lo = days[0], hi = days[13]

      const [foods, exps, acts, pillsRes, takenRes] = await Promise.all([
        supabase.from('food_logs').select('calories, date').eq('user_id', user.id).gte('date', lo).lte('date', hi),
        supabase.from('expenses').select('amount, date').eq('user_id', user.id).gte('date', lo).lte('date', hi),
        supabase.from('exercise_logs').select('duration_minutes, date').eq('user_id', user.id).gte('date', lo).lte('date', hi),
        supabase.from('pills').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('pills_taken').select('date_taken').eq('user_id', user.id).gte('date_taken', lo).lte('date_taken', hi),
      ])

      const fRows = foods.data?.map((r: { calories: number; date: string }) => ({ date: r.date, v: r.calories }))
      const eRows = exps.data?.map((r: { amount: number; date: string }) => ({ date: r.date, v: r.amount }))
      const aRows = acts.data?.map((r: { duration_minutes: number; date: string }) => ({ date: r.date, v: r.duration_minutes }))
      const tRows = takenRes.data?.map((r: { date_taken: string }) => ({ date: r.date_taken, v: 1 }))
      const pillCount = pillsRes.count || 0
      const expected = pillCount * 7

      const data: ReviewData = {
        cals: { now: sumWindow(fRows, nowSet), prev: sumWindow(fRows, prevSet) },
        spend: { now: sumWindow(eRows, nowSet), prev: sumWindow(eRows, prevSet) },
        move: { now: sumWindow(aRows, nowSet), prev: sumWindow(aRows, prevSet) },
        adh: {
          now: expected ? Math.round((sumWindow(tRows, nowSet) / expected) * 100) : 0,
          prev: expected ? Math.round((sumWindow(tRows, prevSet) / expected) * 100) : 0,
        },
        logged: (fRows?.length || 0) + (eRows?.length || 0) + (aRows?.length || 0),
      }
      if (!alive) return
      setD(data)
      cacheSet(key, data)
    })()
    return () => { alive = false }
  }, [supabase])

  if (!d || d.logged === 0) return null

  const label: React.CSSProperties = { fontFamily: sans, fontSize: 10, fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', color: t.sub }

  // One plain-English insight — prefer a cross-domain pattern, else the biggest single move.
  const calP = pctChange(d.cals.now, d.cals.prev)
  const spP = pctChange(d.spend.now, d.spend.prev)
  const mvP = pctChange(d.move.now, d.move.prev)
  const insight = (() => {
    if (mvP <= -25 && spP >= 20) return `You moved ${Math.abs(mvP)}% less and spent ${spP}% more than last week.`
    if (calP >= 20 && mvP <= -25) return `You ate ${calP}% more but moved ${Math.abs(mvP)}% less than last week.`
    if (mvP >= 30 && spP <= -15) return `You moved ${mvP}% more and spent ${Math.abs(spP)}% less — strong week.`
    if (d.adh.now >= 90 && d.move.now > d.move.prev) return `Meds on track at ${d.adh.now}% and movement up — nice consistency.`
    const cands = [
      { p: spP, s: spP >= 0 ? `Spending is up ${spP}% from last week.` : `Spending is down ${Math.abs(spP)}% from last week.` },
      { p: mvP, s: mvP >= 0 ? `Movement is up ${mvP}% from last week.` : `Movement is down ${Math.abs(mvP)}% from last week.` },
      { p: calP, s: calP >= 0 ? `You're eating ${calP}% more than last week.` : `You're eating ${Math.abs(calP)}% less than last week.` },
    ].filter(c => Math.abs(c.p) >= 8).sort((a, b) => Math.abs(b.p) - Math.abs(a.p))
    return cands[0]?.s || 'A steady week — close to your last.'
  })()

  // direction: 'up'/'down' colored by whether the change is good for that metric
  const Stat = ({ name, value, metric, goodDir }: { name: string; value: string; metric: Metric; goodDir: 'up' | 'down' | 'none' }) => {
    const p = pctChange(metric.now, metric.prev)
    const up = p > 0
    const color = goodDir === 'none' || p === 0 ? t.muted : (up === (goodDir === 'up')) ? t.green : t.red
    return (
      <div style={{ flex: '1 1 calc(50% - 6px)', minWidth: 120, background: t.c2, border: `1px solid ${t.border}`, borderRadius: 14, padding: '12px 14px' }}>
        <div style={{ ...label, fontSize: 9, marginBottom: 7 }}>{name}</div>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
          <span style={{ fontFamily: serif, fontSize: 22, color: t.txt, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{value}</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, fontSize: 11.5, fontWeight: 600, color, fontFamily: sans }}>
            {p !== 0 && <Icon name={up ? 'chevronRight' : 'chevronRight'} size={11} stroke={2.2} style={{ transform: up ? 'rotate(-90deg)' : 'rotate(90deg)' }} />}
            {p === 0 ? '–' : `${Math.abs(p)}%`}
          </span>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      marginTop: 13,
      background: `linear-gradient(170deg, ${t.c1}, ${t.bg})`,
      border: `1px solid ${t.border}`, borderRadius: 24, padding: 20,
      boxShadow: `0 1px 0 color-mix(in srgb, ${t.txt} 6%, transparent) inset, 0 16px 38px -22px rgba(0,0,0,0.32)`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 16 }}>
        <span style={{ color: t.accent, display: 'flex' }}><Icon name="trend" size={15} stroke={1.8} /></span>
        <span style={label}>Weekly review</span>
        <span style={{ fontSize: 11, color: t.sub, marginLeft: 'auto' }}>vs last week</span>
      </div>

      <div style={{
        fontFamily: serif, fontSize: 21, color: t.txt, lineHeight: 1.3, letterSpacing: '-0.01em',
        marginBottom: 18, fontStyle: 'italic',
      }}>
        {insight}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
        <Stat name="Calories / day" value={Math.round(d.cals.now / 7).toLocaleString()} metric={d.cals} goodDir="none" />
        <Stat name="Spent" value={'৳' + Math.round(d.spend.now).toLocaleString()} metric={d.spend} goodDir="down" />
        <Stat name="Movement" value={d.move.now + ' min'} metric={d.move} goodDir="up" />
        <Stat name="Meds adherence" value={d.adh.now + '%'} metric={d.adh} goodDir="up" />
      </div>

      {onOpen && (
        <button onClick={onOpen} className="luma-link" style={{
          marginTop: 16, background: 'transparent', border: 'none', cursor: 'pointer', padding: 0,
          display: 'inline-flex', alignItems: 'center', gap: 6, color: t.accent, fontFamily: sans, fontSize: 12.5, fontWeight: 600,
        }}>
          See trends &amp; patterns <Icon name="arrowRight" size={14} />
        </button>
      )}
    </div>
  )
}
