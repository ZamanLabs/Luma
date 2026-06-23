import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

const SYSTEM = `You estimate calories for food, including messy, composite, and South Asian / Bangladeshi meals. Account for cooking oil and realistic portions, and multiply when a quantity is given.

Return each eaten item with a short name (under 30 characters) and an integer kcal value. "total" must equal the sum of the item kcal values. "note" is one short caveat, or an empty string. Estimate confidently; never refuse.`

// Gemini's free tier (Google AI Studio key) covers personal use easily.
// Pinned to a stable Flash model — bump this string to upgrade.
const MODEL = 'gemini-2.0-flash'
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`

// Force structured JSON output so we never have to scrape prose.
const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    items: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: { name: { type: 'STRING' }, kcal: { type: 'INTEGER' } },
        required: ['name', 'kcal'],
      },
    },
    total: { type: 'INTEGER' },
    note: { type: 'STRING' },
  },
  required: ['items', 'total', 'note'],
}

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

  try {
    const res = await fetch(`${ENDPOINT}?key=${process.env.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM }] },
        contents: [{ role: 'user', parts: [{ text }] }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 600,
          responseMimeType: 'application/json',
          responseSchema: RESPONSE_SCHEMA,
        },
      }),
    })
    if (!res.ok) throw new Error(`Gemini ${res.status}`)

    const data = await res.json()
    const raw: string = (data?.candidates?.[0]?.content?.parts ?? [])
      .map((p: { text?: string }) => p?.text ?? '')
      .join('')
    const parsed = JSON.parse(raw)

    const items: Item[] = Array.isArray(parsed.items)
      ? parsed.items
          .filter((i: unknown): i is { name: unknown; kcal: unknown } => !!i && typeof i === 'object')
          .map((i: { name: unknown; kcal: unknown }) => ({ name: String(i.name).slice(0, 40), kcal: Math.max(0, Math.round(Number(i.kcal) || 0)) }))
          .filter((i: Item) => i.name && i.name !== 'undefined')
      : []
    const total = Math.max(0, Math.round(Number(parsed.total) || items.reduce((s, i) => s + i.kcal, 0)))
    const note = typeof parsed.note === 'string' ? parsed.note.slice(0, 160) : ''

    return NextResponse.json({ items, total, note })
  } catch {
    return NextResponse.json({ error: 'Couldn’t estimate that — try rephrasing.' }, { status: 502 })
  }
}
