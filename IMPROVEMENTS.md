# Luma — Improvements Roadmap

A living list of what's left to make Luma a product people rely on daily, not just a
beautiful demo. Ordered by leverage. Checkboxes track status.

**Context:** After a heavy visual redesign, a brutal self-review put Luma at ~6/10 —
"a stunning shell around a thin product." The visual craft is strong; what's left is
mostly unglamorous product + robustness work.

---

## ✅ Already done

- [x] Full visual redesign — design system, generative bloom hero, rings, bento, aurora, custom cursor
- [x] Responsive desktop layout (sidebar nav)
- [x] Settings demoted into a profile menu off the avatar
- [x] Medication reminders (in-app due/overdue/next + opt-in browser notifications while app is open)
- [x] Cross-domain **weekly** review card (this week vs last week + one insight)
- [x] **Frictionless logging** — recent/frequent quick-add chips, built-in common-foods search, workout presets + start/stop timer
- [x] **Trust layer** — toasts, undo-on-delete everywhere, error/retry on all saves, input validation, first-run onboarding
- [x] Fixed double-login (proxy was gating the OAuth callback) and the bloom glow rectangle

---

## 🔜 Next up (high leverage)

### 1. Real cross-domain insight  ·  _the actual differentiator_
The whole premise of one app for food + money + movement + meds is connections no
single-purpose tracker can make. Today there's only a 7-day view and one weekly line.

- [ ] **Trends view** with selectable ranges (week / month / 3 months) per metric
- [ ] Long-term charts (calories, spend, movement, adherence) beyond 7 days
- [ ] At least one **genuine correlation** surfaced in plain English, e.g.
  _"You spend ~30% more on days you don't move"_ or _"Adherence drops on weekends"_
- [ ] A dedicated "Insights" surface (or expand the weekly review) — monthly summary + streak history
- [ ] Goal coaching: trend-aware nudges ("you're trending 200 kcal over your average")

### 2. Make the art earn its keep  ·  _form should not fight function_
The bloom is gorgeous but conveys little at a glance; some effects cost usability/battery.

- [ ] Pair the bloom hero with a compact **at-a-glance summary** (the rings it replaced were more useful)
- [ ] Make the **custom cursor opt-in** (toggle in the profile menu) — hiding the native cursor is divisive
- [ ] **Tint the dark hero stage** to the active theme on Snow/Paper (pure black looks alien on light themes)
- [ ] **Pause animation loops** (bloom, cursor) when the tab is hidden or the bloom is scrolled offscreen — `IntersectionObserver` + `visibilitychange`
- [ ] Consider a "reduce effects" preference for low-power devices

---

## 🧱 Robustness & reach

### Closed-app medication reminders
Current reminders only fire while a tab is open — half a feature for a med tracker.

- [ ] Convert to a **PWA** (manifest + service worker)
- [ ] **Web Push** subscription + a server-side scheduler (e.g. Supabase Edge Function + cron) to deliver reminders when the app is closed
- [ ] Permission UX + per-medication reminder toggles

### Configurability (kill the single-user assumptions)
- [ ] **Configurable currency** (Taka ৳ is hardcoded throughout) — live in the profile menu
- [ ] **Units** — kcal/kJ, kg/lb, week-start day
- [ ] Remove hardcoded fallback name ("Wakib"); derive from auth or onboarding
- [ ] Custom expense categories

### Data ownership & trust
- [ ] **Export** (CSV / JSON) — important for a personal health+finance app
- [ ] Verify Supabase **Row Level Security** on every table (food_logs, expenses, exercise_logs, pills, pills_taken, journal_entries, user_settings)
- [ ] A short privacy note (where data lives, that it's yours)
- [ ] Offline tolerance — queue writes when the network drops

---

## ♿ Accessibility

- [ ] Audit contrast on micro-labels (10px uppercase `sub`/`muted` text fails WCAG in places)
- [ ] Don't encode status by **color alone** (bloom warmth, ring colors) — add text/iconography
- [ ] Canvas (`Bloom`) needs a meaningful text alternative / `aria-label`
- [ ] Verify full keyboard navigation + focus-visible states across nav, menus, forms
- [ ] Screen-reader pass on the dashboard; ensure toasts announce via `aria-live`
- [ ] Respect `prefers-reduced-motion` everywhere (mostly done; re-verify after new effects)

---

## ✨ Feature depth (nice-to-have)

- [ ] **Journal**: markdown / light rich text, word count, search across entries, mood tagging
- [ ] **Nutrition**: macros (protein/carbs/fat), meal types (breakfast/lunch/dinner), portion multipliers on the built-in foods
- [ ] **Finance**: recurring expenses, income tracking, budget-by-category
- [ ] **Movement**: distance/steps, weekly movement goal (so the tile can have a ring)
- [ ] **Meds**: "as needed" meds, supply/refill tracking, history adherence %
- [ ] Search/jump across all logs

---

## 🛠 Engineering hygiene

- [ ] Tests — at least the auth flow, the cache/stale-while-revalidate logic, and the undo paths
- [ ] Fix the local ESLint config error (`Converting circular structure to JSON`)
- [ ] Extract repeated page logic (history nav, week-chart sync, optimistic CRUD) into shared hooks
- [ ] Error boundary around the dashboard
- [ ] Loading skeletons instead of the single "Luma" pulse on first load

---

_Last updated: 2026-06-22_
