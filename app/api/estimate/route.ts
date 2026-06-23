import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

const SYSTEM = `You estimate calories for food, including messy, composite, and South Asian / Bangladeshi meals. Account for cooking oil and realistic portions, and multiply when a quantity is given.

Respond with ONLY a JSON object — no markdown, no prose — of this exact shape:
{"items":[{"name":"short item name","kcal":<integer>}],"total":<integer>,"note":"one short caveat, or empty string"}

Keep each item name under 30 characters. "total" must equal the sum of the item kcal values. Estimate confidently; never refuse.`

// Free-tier quotas are PER MODEL, so if one is exhausted we fall through to the
// next. Both defaults are non-thinking Flash models (cheap, fast, reliable JSON).
// Set GEMINI_MODEL to pin a single model.
const MODELS = process.env.GEMINI_MODEL
  ? [process.env.GEMINI_MODEL]
  : ['gemini-2.0-flash-lite', 'gemini-2.0-flash']

const url = (model: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`

type Item = { name: string; kcal: number }

export async function POST(request: Request) {
  // Only logged-in users — and the API key never leaves the server.
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })
  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: 'AI estimate isn’t set up yet — add GEMINI_API_KEY to your env.' }, { status: 503 })
  }

  let text = ''
  try { text = String((await request.json())?.text ?? '').slice(0, 400).trim() } catch {}
  if (!text) return NextResponse.json({ error: 'Describe what you ate.' }, { status: 400 })

  const body = JSON.stringify({
    systemInstruction: { parts: [{ text: SYSTEM }] },
    contents: [{ role: 'user', parts: [{ text }] }],
    generationConfig: { temperature: 0.3, maxOutputTokens: 800, responseMimeType: 'application/json' },
  })

  let quotaHit = false
  for (const model of MODELS) {
    let res: Response
    try {
      res = await fetch(url(model), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body })
    } catch (e) {
      console.error('[estimate] fetch failed', model, e)
      return NextResponse.json({ error: 'Couldn’t reach the AI service — try again.' }, { status: 502 })
    }

    // Quotas are per-model — on a rate/quota limit, try the next model.
    if (res.status === 429) {
      quotaHit = true
      console.error('[estimate] 429 quota on', model)
      continue
    }

    if (!res.ok) {
      const detail = await res.text().catch(() => '')
      console.error('[estimate] Gemini HTTP', res.status, model, detail.slice(0, 400))
      let msg = `AI service error (${res.status}).`
      try { const j = JSON.parse(detail); if (j?.error?.message) msg = `AI error: ${String(j.error.message).slice(0, 160)}` } catch {}
      return NextResponse.json({ error: msg }, { status: 502 })
    }

    try {
      const data = await res.json()
      const cand = data?.candidates?.[0]
      const raw: string = (cand?.content?.parts ?? []).map((p: { text?: string }) => p?.text ?? '').join('')
      if (!raw) {
        const reason = cand?.finishReason || data?.promptFeedback?.blockReason || 'empty response'
        console.error('[estimate] empty', model, JSON.stringify(data).slice(0, 400))
        return NextResponse.json({ error: `AI returned nothing (${reason}).` }, { status: 502 })
      }

      const start = raw.indexOf('{'), end = raw.lastIndexOf('}')
      const parsed = JSON.parse(start >= 0 && end > start ? raw.slice(start, end + 1) : raw)

      const items: Item[] = Array.isArray(parsed.items)
        ? parsed.items
            .filter((i: unknown): i is { name: unknown; kcal: unknown } => !!i && typeof i === 'object')
            .map((i: { name: unknown; kcal: unknown }) => ({ name: String(i.name).slice(0, 40), kcal: Math.max(0, Math.round(Number(i.kcal) || 0)) }))
            .filter((i: Item) => i.name && i.name !== 'undefined')
        : []
      const total = Math.max(0, Math.round(Number(parsed.total) || items.reduce((s, i) => s + i.kcal, 0)))
      const note = typeof parsed.note === 'string' ? parsed.note.slice(0, 160) : ''

      return NextResponse.json({ items, total, note })
    } catch (e) {
      console.error('[estimate] parse failed', model, e)
      return NextResponse.json({ error: 'Couldn’t read the AI response — try again.' }, { status: 502 })
    }
  }

  // Every model returned a quota/rate limit.
  if (quotaHit) {
    return NextResponse.json(
      { error: 'Gemini’s free quota is unavailable for your key right now — enable billing in Google AI Studio (pennies for personal use) or use the food search below. The rest of Luma works fine.' },
      { status: 429 },
    )
  }
  return NextResponse.json({ error: 'Couldn’t estimate that — try again.' }, { status: 502 })
}
