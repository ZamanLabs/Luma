'use client'

import { createClient } from '@/utils/supabase/client'
import { useEffect, useCallback, useState, useRef } from 'react'
import { useTheme } from '../../ThemeContext'
import { useRouter } from 'next/navigation'
import { animate, stagger } from 'animejs'

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

const FONTS = `
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400&family=DM+Sans:wght@300;400;500&display=swap');
`

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
  const [pills, setPills] = useState<{ id: string; name: string; scheduled_time: string }[]>([])
  const [takenIds, setTakenIds] = useState<string[]>([])
  const [userName, setUserName] = useState('')
  const [hovered, setHovered] = useState<string | null>(null)

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
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setUserName(user.user_metadata?.full_name?.split(' ')[0] || '')

    const [settings, foods, expenses, acts, pillData, takenData] = await Promise.all([
      supabase.from('user_settings').select('calorie_goal, monthly_budget').eq('user_id', user.id).maybeSingle(),
      supabase.from('food_logs').select('calories').eq('user_id', user.id).eq('date', todayStr()),
      supabase.from('expenses').select('amount').eq('user_id', user.id).gte('date', thisMonth() + '-01'),
      supabase.from('exercise_logs').select('duration_minutes').eq('user_id', user.id).eq('date', todayStr()),
      supabase.from('pills').select('id, name, scheduled_time').eq('user_id', user.id).order('scheduled_time', { ascending: true }),
      supabase.from('pills_taken').select('pill_id').eq('user_id', user.id).eq('date_taken', todayStr()),
    ])

    const cg = settings.data?.calorie_goal || 2000
    const bg = settings.data?.monthly_budget || 15000
    const cals = foods.data?.reduce((s, f) => s + f.calories, 0) || 0
    const spent = expenses.data?.reduce((s, e) => s + e.amount, 0) || 0
    const mins = acts.data?.reduce((s, a) => s + a.duration_minutes, 0) || 0
    const actsCount = acts.data?.length || 0
    const pillsList = pillData.data || []
    const takenList = takenData.data?.map((t: { pill_id: string }) => t.pill_id) || []

    setCalGoal(cg)
    setBudget(bg)
    setTotalCals(cals)
    setTotalSpent(spent)
    setTotalMins(mins)
    setActCount(actsCount)
    setPills(pillsList)
    setTakenIds(takenList)
    setLoading(false)

    setTimeout(() => {
      if (greetingRef.current) {
        animate(greetingRef.current, {
          opacity: [0, 1],
          translateY: [20, 0],
          duration: 700,
          ease: 'outExpo',
        })
      }

      if (sectionsRef.current) {
        animate(
          sectionsRef.current.querySelectorAll('.home-section'),
          {
            opacity: [0, 1],
            translateY: [24, 0],
            delay: stagger(100, { start: 200 }),
            duration: 700,
            ease: 'outExpo',
          }
        )
      }

      const calsObj = { val: 0 }
      animate(calsObj, {
        val: { to: cals },
        duration: 1200,
        delay: 300,
        ease: 'outExpo',
        onUpdate: () => setDispCals(Math.round(calsObj.val)),
      })

      const spentObj = { val: 0 }
      animate(spentObj, {
        val: { to: spent },
        duration: 1200,
        delay: 400,
        ease: 'outExpo',
        onUpdate: () => setDispSpent(Math.round(spentObj.val)),
      })

      const minsObj = { val: 0 }
      animate(minsObj, {
        val: { to: mins },
        duration: 1000,
        delay: 500,
        ease: 'outExpo',
        onUpdate: () => setDispMins(Math.round(minsObj.val)),
      })

      const actsObj = { val: 0 }
      animate(actsObj, {
        val: { to: actsCount },
        duration: 800,
        delay: 500,
        ease: 'outExpo',
        onUpdate: () => setDispActs(Math.round(actsObj.val)),
      })

      const pillsObj = { val: 0 }
      animate(pillsObj, {
        val: { to: takenList.length },
        duration: 800,
        delay: 600,
        ease: 'outExpo',
        onUpdate: () => setDispPillsDone(Math.round(pillsObj.val)),
      })

      const calPct = Math.min(100, Math.round(cals / cg * 100))
      const budgetPct = Math.min(100, Math.round(spent / bg * 100))
      const pillsPct = pillsList.length > 0 ? Math.round(takenList.length / pillsList.length * 100) : 0

      if (calBarRef.current) {
        animate(calBarRef.current, {
          width: ['0%', `${calPct}%`],
          duration: 1200,
          delay: 400,
          ease: 'outExpo',
        })
      }
      if (budgetBarRef.current) {
        animate(budgetBarRef.current, {
          width: ['0%', `${budgetPct}%`],
          duration: 1200,
          delay: 500,
          ease: 'outExpo',
        })
      }
      if (pillsBarRef.current) {
        animate(pillsBarRef.current, {
          width: ['0%', `${pillsPct}%`],
          duration: 1000,
          delay: 600,
          ease: 'outExpo',
        })
      }
    }, 50)
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
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 10,
    letterSpacing: '0.12em',
    textTransform: 'uppercase' as const,
    color: theme.sub,
    fontWeight: 500,
  }

  const bigNum = {
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: 68,
    fontWeight: 300,
    lineHeight: 1,
    fontVariantNumeric: 'tabular-nums',
    letterSpacing: '-0.02em',
  }

  const unit = {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 13,
    color: theme.muted,
    fontWeight: 300,
    marginLeft: 6,
    alignSelf: 'flex-end' as const,
    paddingBottom: 10,
  }

  const section = (id: string) => ({
    padding: '28px 0',
    borderBottom: `1px solid ${theme.border}`,
    cursor: 'pointer',
    transition: 'opacity .2s',
    opacity: hovered && hovered !== id ? 0.4 : 1,
  })

  if (loading) return (
    <>
      <style>{FONTS}</style>
      <div style={{ padding: 24, color: theme.muted, fontFamily: "'DM Sans', sans-serif", fontSize: 13 }}>Loading...</div>
    </>
  )

  return (
    <>
      <style>{FONTS}</style>
      <div style={{ padding: '32px 24px', maxWidth: 480, margin: '0 auto', fontFamily: "'DM Sans', sans-serif" }}>

        <div ref={greetingRef} style={{ marginBottom: 40, opacity: 0 }}>
          <div style={{ ...label, marginBottom: 4 }}>{greeting()}</div>
          <div style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 42, fontWeight: 300, color: theme.txt,
            lineHeight: 1.1, letterSpacing: '-0.02em', marginBottom: 6,
          }}>
            {userName || 'Wakib'}
          </div>
          <div style={{ fontSize: 12, color: theme.sub, fontWeight: 300 }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </div>
        </div>

        <div ref={sectionsRef}>

          {/* Nutrition */}
          <div
            className="home-section"
            style={{ ...section('nutrition'), opacity: 0 }}
            onClick={() => router.push('/dashboard/nutrition')}
            onMouseEnter={() => setHovered('nutrition')}
            onMouseLeave={() => setHovered(null)}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <div style={{ ...label, marginBottom: 16 }}>Nutrition</div>
                <div style={{ display: 'flex', alignItems: 'flex-end', marginBottom: 16 }}>
                  <span style={{ ...bigNum, color: calLeft < 0 ? theme.red : theme.txt }}>{dispCals.toLocaleString()}</span>
                  <span style={unit}>kcal eaten</span>
                </div>
                <div style={{ background: theme.c2, borderRadius: 2, height: 3, overflow: 'hidden', marginBottom: 8, maxWidth: 200 }}>
                  <div ref={calBarRef} style={{ height: '100%', borderRadius: 2, width: '0%', background: calPct > 100 ? theme.red : calPct > 80 ? theme.accent : theme.green }} />
                </div>
                <div style={{ fontSize: 12, color: calLeft < 0 ? theme.red : theme.green }}>
                  {calLeft < 0 ? `${Math.abs(calLeft).toLocaleString()} kcal over` : `${calLeft.toLocaleString()} kcal remaining`}
                </div>
              </div>
              <div style={{ fontSize: 18, opacity: .25, alignSelf: 'center' }}>→</div>
            </div>
          </div>

          {/* Finance */}
          <div
            className="home-section"
            style={{ ...section('finance'), opacity: 0 }}
            onClick={() => router.push('/dashboard/finance')}
            onMouseEnter={() => setHovered('finance')}
            onMouseLeave={() => setHovered(null)}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <div style={{ ...label, marginBottom: 16 }}>Finance</div>
                <div style={{ display: 'flex', alignItems: 'flex-end', marginBottom: 16 }}>
                  <span style={{ ...bigNum, color: moneyLeft < 0 ? theme.red : theme.txt }}>
                    ৳{Math.abs(budget - dispSpent).toLocaleString()}
                  </span>
                  <span style={unit}>{moneyLeft < 0 ? 'over budget' : 'remaining'}</span>
                </div>
                <div style={{ background: theme.c2, borderRadius: 2, height: 3, overflow: 'hidden', marginBottom: 8, maxWidth: 200 }}>
                  <div ref={budgetBarRef} style={{ height: '100%', borderRadius: 2, width: '0%', background: budgetPct > 90 ? theme.red : budgetPct > 70 ? theme.accent : theme.green }} />
                </div>
                <div style={{ fontSize: 12, color: theme.muted }}>
                  ৳{dispSpent.toLocaleString()} of ৳{budget.toLocaleString()} spent
                </div>
              </div>
              <div style={{ fontSize: 18, opacity: .25, alignSelf: 'center' }}>→</div>
            </div>
          </div>

          {/* Exercise */}
          <div
            className="home-section"
            style={{ ...section('exercise'), opacity: 0 }}
            onClick={() => router.push('/dashboard/exercise')}
            onMouseEnter={() => setHovered('exercise')}
            onMouseLeave={() => setHovered(null)}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <div style={{ ...label, marginBottom: 16 }}>Movement</div>
                <div style={{ display: 'flex', alignItems: 'flex-end', marginBottom: 10, gap: 32 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                    <span style={{ ...bigNum, color: totalMins > 0 ? theme.txt : theme.sub }}>{dispMins}</span>
                    <span style={unit}>min</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                    <span style={{ ...bigNum, fontSize: 40, color: actCount > 0 ? theme.txt : theme.sub }}>{dispActs}</span>
                    <span style={unit}>activities</span>
                  </div>
                </div>
                <div style={{ fontSize: 12, color: theme.muted }}>
                  {totalMins === 0 ? 'No movement logged today' : `${(totalMins / 60).toFixed(1)} hours total`}
                </div>
              </div>
              <div style={{ fontSize: 18, opacity: .25, alignSelf: 'center' }}>→</div>
            </div>
          </div>

          {/* Medications */}
          <div
            className="home-section"
            style={{ ...section('meds'), borderBottom: 'none', opacity: 0 }}
            onClick={() => router.push('/dashboard/meds')}
            onMouseEnter={() => setHovered('meds')}
            onMouseLeave={() => setHovered(null)}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <div style={{ ...label, marginBottom: 16 }}>Medications</div>
                {pillsTotal === 0 ? (
                  <div style={{ fontSize: 15, color: theme.sub, fontWeight: 300 }}>No medications scheduled</div>
                ) : (
                  <>
                    <div style={{ display: 'flex', alignItems: 'flex-end', marginBottom: 12, gap: 2 }}>
                      <span style={{ ...bigNum, color: allDone ? theme.green : hasDue ? theme.accent : theme.txt }}>{dispPillsDone}</span>
                      <span style={{ ...bigNum, fontSize: 40, color: theme.sub, margin: '0 4px', paddingBottom: 8 }}>/</span>
                      <span style={{ ...bigNum, fontSize: 40, color: theme.sub, paddingBottom: 8 }}>{pillsTotal}</span>
                      <span style={unit}>taken</span>
                    </div>
                    <div style={{ background: theme.c2, borderRadius: 2, height: 3, overflow: 'hidden', marginBottom: 8, maxWidth: 200 }}>
                      <div ref={pillsBarRef} style={{ height: '100%', borderRadius: 2, width: '0%', background: allDone ? theme.green : theme.accent }} />
                    </div>
                    <div style={{ fontSize: 12, color: allDone ? theme.green : hasDue ? theme.accent : theme.muted }}>
                      {allDone ? '✓ All medications taken' : hasDue ? '⚡ Due now' : nextPill ? `Next: ${nextPill.name} at ${nextPill.scheduled_time}` : ''}
                    </div>
                  </>
                )}
              </div>
              <div style={{ fontSize: 18, opacity: .25, alignSelf: 'center' }}>→</div>
            </div>
          </div>

        </div>
      </div>
    </>
  )
}