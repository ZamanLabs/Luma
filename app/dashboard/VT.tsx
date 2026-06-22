'use client'

import * as React from 'react'

// React's <ViewTransition> ships in the App Router's bundled React but isn't in
// the public @types yet, so we grab it off the namespace with a typed cast and
// fall back to a plain passthrough if it's unavailable (SSR / flag off / Safari).
type VTProps = {
  name?: string
  share?: string
  enter?: string
  exit?: string
  default?: string
  children: React.ReactNode
}
const RVT = (React as unknown as { ViewTransition?: React.ComponentType<VTProps> }).ViewTransition

/** Names a shared element so it morphs across route navigations. */
export function VT({ name, children }: { name: string; children: React.ReactNode }) {
  if (!RVT) return <>{children}</>
  return <RVT name={name}>{children}</RVT>
}
