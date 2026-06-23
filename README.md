<div align="center">

# Luma

### Tend your days.

A quiet, beautiful place for the five things a life is made of —
**food, money, movement, meds, and the words in between.**

<br>

[![Built with Claude](https://img.shields.io/badge/built%20entirely%20with-Claude-d9a441?style=for-the-badge&labelColor=0e0c09)](https://claude.com/claude-code)

[![Next.js](https://img.shields.io/badge/Next.js-16-000000?style=flat-square&logo=next.js)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-149eca?style=flat-square&logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Supabase](https://img.shields.io/badge/Supabase-Postgres-3fcf8e?style=flat-square&logo=supabase&logoColor=white)](https://supabase.com)
[![PWA](https://img.shields.io/badge/PWA-installable-5a0fc8?style=flat-square&logo=pwa&logoColor=white)](#install-it-on-your-phone)

</div>

---

## An experiment, written entirely by Claude

> **This is my first Claude-only build.** Every line of Luma — the code, the
> design system, the generative art, the copy, and this README — was written by
> **[Claude](https://claude.com/claude-code)** through conversation. I never
> hand-wrote a line of it. I described what I wanted, pushed back when it was
> ugly or wrong, and Claude built, debugged, and refined until it became this.

It started plain and ended up, honestly, kind of gorgeous. Luma is the result
of that back-and-forth: a real, working, installable app — and a small record of
what building *with* a capable model can produce when you treat it like a
collaborator instead of an autocomplete.

It is **personal software**, made mostly for myself. Not a product, not a
startup — just a calm daily companion that happens to be open for anyone to read,
fork, and learn from.

---

## What it does

Luma tracks five domains in one place, so the connections between them become visible.

| Domain | What you log | The payoff |
| --- | --- | --- |
| **Nutrition** | Meals & calories | One-tap re-logging, a built-in food list, daily goal ring |
| **Finance** | Expenses by category | Monthly budget ring, recent-expense quick chips |
| **Movement** | Workouts & minutes | Quick presets + a built-in start/stop timer |
| **Meds** | Doses & schedules | Due / Overdue timeline, adherence ring, optional reminders |
| **Journal** | Daily writing | Markdown, live word count, full-text search across entries |

And then it ties them together:

- **Cross-domain insights** — a dedicated trends view (30 / 90-day) that surfaces
  plain-English patterns no single-purpose tracker can, e.g. *"you spend more on
  days you don't move"* or *"adherence dips on weekends."*
- **Weekly review** — this week vs last across every domain, with one honest takeaway.

---

## The part you'll actually notice — it's beautiful

Luma is built around an **editorial aesthetic**: Cormorant Garamond serif numerals
against DM Sans, a hand-drawn line-icon set, generous whitespace, and not a single
emoji in the interface.

- **A living "bloom."** The home screen grows a generative `<canvas>` seeded by
  your actual day — petals are the entries you've logged, the core glow is how
  full the day is, particles drift with your movement, and its warmth shifts as you
  stay on-track. It eases in, leans toward your cursor, pauses when the tab is
  hidden, and collapses to a single still frame if you prefer reduced motion.
- **Six themes.** Four dark — *Midnight, Nord, Sage, Crimson* — and two light —
  *Paper, Snow* — each a fully retuned palette, switchable from the profile menu.
- **A world that breathes.** A time-of-day aurora drifts behind everything with
  subtle cursor/scroll parallax; a tiny ember glows in the sidebar.
- **Considered motion.** Shared-element transitions morph the rings between pages
  (View Transitions API), a once-a-day cinematic intro, an optional bespoke cursor,
  and toasts with undo on every delete.
- **Instant everything.** A stale-while-revalidate cache makes tab switches
  immediate, and data silently refreshes when you return to the app — no reload.

---

## Built to be trusted with real life

- **Frictionless logging** — recent/frequent quick-add chips, search-as-you-type
  over common foods (including Bangladeshi staples), workout presets + timer.
- **A trust layer** — undo-on-delete everywhere, error/retry on every save,
  input validation, and a first-run onboarding that sets your goals.
- **Installable** — a real PWA: add it to your home screen, launch fullscreen,
  works offline-tolerant. *(Closed-app push reminders are the next milestone.)*
- **Yours** — auth-gated per user, your data scoped to you in Postgres.

---

## Tech stack

| Layer | Choice |
| --- | --- |
| Framework | **Next.js 16** (App Router, Turbopack, `proxy.ts` middleware) |
| UI | **React 19**, **TypeScript 5**, a custom inline-style design system + theme context |
| Styling | **Tailwind 4** (PostCSS) for resets; theming via CSS custom properties + `color-mix()` |
| Animation | **anime.js v4** + hand-written `<canvas>` generative art |
| Backend | **Supabase** — Postgres, Auth (Google OAuth), Row-Level Security |
| Platform feats | View Transitions API, Web App Manifest + Service Worker (PWA) |
| Hosting | **Vercel** |
| **Author** | **Claude** (via Claude Code) — 100% of the code |

---

## Project structure

```
app/
├─ page.tsx                  # entry → redirects into the app
├─ layout.tsx                # root: metadata, PWA meta, SW registration
├─ theme.ts                  # the six themes
├─ Bloom.tsx                 # the generative canvas "bloom"
├─ manifest.ts               # PWA manifest
├─ icon-*/  apple-icon.tsx   # app icons, rendered to PNG via next/og
├─ login/                    # Google OAuth sign-in
├─ auth/callback/            # OAuth code exchange
└─ dashboard/
   ├─ layout.tsx             # persistent frame: nav, aurora, cursor, toasts
   ├─ ui.tsx                 # shared design system (cards, rings, icons, charts)
   ├─ hooks.ts               # live-refresh on focus + clock tick
   ├─ cache.ts               # stale-while-revalidate cache
   ├─ home/                  # bento dashboard + bloom hero + weekly review
   ├─ nutrition/  finance/  exercise/  meds/  journal/  insights/
   ├─ Toast.tsx  Cursor.tsx  Ember.tsx  Intro.tsx  VT.tsx
proxy.ts                     # auth gate (Next 16's renamed middleware)
```

---

## Getting started

### Prerequisites
- Node 18+ and a package manager (npm / pnpm / bun)
- A free [Supabase](https://supabase.com) project
- A Google OAuth client (configured as a provider in Supabase Auth)

### 1. Clone & install
```bash
git clone https://github.com/ZamanLabs/Luma.git
cd Luma
npm install
```

### 2. Environment
Create `.env.local`:
```bash
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Database
Luma expects these tables in Supabase (all with **Row-Level Security** scoping
rows to `auth.uid()`):

| Table | Key columns |
| --- | --- |
| `user_settings` | `user_id`, `calorie_goal`, `monthly_budget` |
| `food_logs` | `user_id`, `name`, `calories`, `date`, `time` |
| `expenses` | `user_id`, `name`, `amount`, `category`, `date` |
| `exercise_logs` | `user_id`, `type`, `duration_minutes`, `notes`, `date`, `time` |
| `pills` | `user_id`, `name`, `scheduled_time` |
| `pills_taken` | `user_id`, `pill_id`, `date_taken` |
| `journal_entries` | `user_id`, `date`, `content` |

### 4. Run
```bash
npm run dev      # http://localhost:3000
npm run build    # production build
```

---

## Install it on your phone

Luma is a Progressive Web App. Once deployed over HTTPS:

- **Android / Chrome** — open the site, then *Install app* (or ⋮ → *Add to Home screen*).
- **iOS / Safari** — Share → *Add to Home Screen*.

It launches fullscreen with its own icon, like a native app — no app store required.

---

## Roadmap

The honest, in-progress backlog lives in **[IMPROVEMENTS.md](IMPROVEMENTS.md)**.
Headline next steps: **Web Push** for closed-app medication reminders, configurable
currency / units, data export, and a deeper accessibility pass.

---

## A note on the experiment

Luma is shared in the spirit it was made — openly, and a little proudly. If you're
curious what it looks like to build a complete, polished app *with* Claude rather
than *by hand*, the git history is the whole story: messy first drafts, brutal
self-reviews, dead ends (an AI calorie estimator that got built and then removed
when no free tier panned out), and a lot of "make it prettier."

Fork it, read it, take what's useful.

<div align="center">
<br>

**Designed and built entirely with [Claude](https://claude.com/claude-code).**

<sub>A personal experiment by <a href="https://github.com/ZamanLabs">ZamanLabs</a> · MIT — no warranty, do as you like.</sub>

</div>
