# Luma — Improvements Roadmap

What's left, honestly. Ordered by leverage. Checkboxes reflect reality.

**Context:** A brutal self-review once put Luma at ~6/10 — "a stunning shell around a
thin product." The shell got filled: frictionless logging (incl. an AI estimator),
real cross-domain insight, a trust layer, and best-in-class visual craft. Current
honest rating: ~8.5/10 as a personal app. What remains is mostly robustness, the
mobile packaging, and a long tail of nice-to-haves.

---

## ✅ Done

- [x] Full visual redesign — design system, generative bloom hero, rings, bento, aurora, custom cursor
- [x] Responsive desktop layout (sidebar nav) + nav hover/active states
- [x] Settings demoted into a profile menu off the avatar
- [x] Medication reminders (in-app due/overdue/next + opt-in browser notifications while app is open)
- [x] **Frictionless logging** — quick-add chips, built-in common-foods search, workout presets + timer
- [x] **AI calorie estimator** — "Ask Claude" box (server-side Haiku) for messy/composite meals
- [x] **Trust layer** — toasts, undo-on-delete everywhere, error/retry on all saves, validation, onboarding
- [x] **Cross-domain insight** — `/dashboard/insights`: 30/90-day trends + plain-English correlations
- [x] **Journal upgrade** — markdown (write/preview), word count, full-text search
- [x] **Artistic leaps** — shared-element transitions, living world (parallax aurora + persistent ember), cinematic first-open
- [x] **Polish** — bloom hero + at-a-glance numbers, custom cursor opt-in, theme-tinted hero stage, RAF loops pause when hidden
- [x] Fixed double-login (proxy gating the OAuth callback) and the bloom glow rectangle
- [x] Partial a11y — bloom `aria-label`, ember `aria-hidden`, toast `aria-live`, micro-label contrast bump

---

## 📱 Ship as a mobile app  ·  _← ACTIVE: this is the goal now_

PWA first (reuses the whole codebase). Deployed on Vercel, so env/config live there.

- [x] **PWA install** — `manifest`, app icons (192/512 + maskable + apple-touch, rendered via `next/og`),
  `theme-color`, `apple-mobile-web-app-*` meta, `viewport-fit=cover` → installs to home screen, fullscreen
- [x] **Service worker** — safe (network-first navigations; never caches Supabase/auth) + offline fallback page
- [ ] **Web Push** — subscription + a server-side scheduler (Supabase Edge Function + cron) so med
  reminders fire when the app is closed (the half-feature today)
- [ ] (Optional, later) **Capacitor** wrap for App Store / Play Store — OAuth deep links, native push,
  Apple Developer ($99/yr) + Play Console ($25). Skip a React Native rewrite.

---

## 🧱 Robustness & trust  ·  _the "matters for real use" set_

- [ ] Verify Supabase **Row Level Security** on every table (food_logs, expenses, exercise_logs, pills,
  pills_taken, journal_entries, user_settings) — the scariest open gap for health+money data
- [ ] **Tests** — auth flow, the stale-while-revalidate cache, the undo paths
- [ ] **Error boundary** around the dashboard
- [ ] **Data export** (CSV / JSON) + a short privacy note
- [ ] Offline tolerance — queue writes when the network drops

---

## ⚙️ Configurability  ·  _kill the single-user assumptions_

- [ ] **Configurable currency** (Taka ৳ is hardcoded) + **units** (kcal/kJ, kg/lb, week start) — in the profile menu
- [ ] Remove the hardcoded fallback name ("Wakib")
- [ ] Custom expense categories

---

## ♿ Accessibility  ·  _partial — deepen it_

- [ ] Keyboard navigation + focus-visible states across nav, menus, forms
- [ ] Screen-reader pass on the dashboard
- [ ] Don't encode status by **color alone** (bloom warmth, ring colors) — add text/iconography
- [ ] Re-verify `prefers-reduced-motion` after the new transitions/aurora

---

## ✨ Feature depth  ·  _nice-to-have, optional_

- [ ] **Journal**: mood tagging (needs a `mood` column on `journal_entries`)
- [ ] **Nutrition**: macros (protein/carbs/fat), meal types, portion multipliers
- [ ] **Finance**: recurring expenses, income tracking, budget-by-category
- [ ] **Movement**: distance/steps, a weekly goal (so the tile earns a ring)
- [ ] **Meds**: "as needed" meds, supply/refill tracking, history adherence %
- [ ] "Day in Bloom" shareable keepsake card (the one unbuilt artistic piece)
- [ ] Search/jump across all logs

---

## 🛠 Engineering hygiene

- [ ] Fix the local ESLint config error (`Converting circular structure to JSON`)
- [ ] Extract repeated page logic (history nav, week-chart sync, optimistic CRUD) into shared hooks
- [ ] Loading skeletons instead of the single "Luma" pulse on first load

---

_Last updated: 2026-06-22_
