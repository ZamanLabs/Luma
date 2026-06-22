import { createClient } from '@/utils/supabase/server'
import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'

const SYSTEM = `You estimate calories for food, including messy, composite, and South Asian / Bangladeshi meals. Account for cooking oil and realistic portions, and multiply when a quantity is given.

Respond with ONLY a JSON object — no markdown, no prose — of this exact shape:
{"items":[{"name":"short item name","kcal":<integer>}],"total":<integer>,"note":"one short caveat, or empty string"}

Keep each item name under 30 characters. "total" must equal the sum of the item kcal values. Estimate confidently; never refuse.`

type Item = { name: string; kcal: number }

export async function POST(request: Request) {
  // Only logged-in users — and the API key never leaves the server.
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'AI estimate isn’t set up yet — add ANTHROPIC_API_KEY to .env.local.' }, { status: 503 })
  }

  let text = ''
  try { text = String((await request.json())?.text ?? '').slice(0, 400).trim() } catch {}
  if (!text) return NextResponse.json({ error: 'Describe what you ate.' }, { status: 400 })

  try {
    const client = new Anthropic() // reads ANTHROPIC_API_KEY from the environment
    const msg = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 600,
      system: SYSTEM,
      messages: [{ role: 'user', content: text }],
    })

    const raw = msg.content.map(b => (b.type === 'text' ? b.text : '')).join('')
    const start = raw.indexOf('{'), end = raw.lastIndexOf('}')
    const parsed = JSON.parse(raw.slice(start, end + 1))

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
