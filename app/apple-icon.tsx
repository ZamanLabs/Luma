import { ImageResponse } from 'next/og'
import { emblem } from '@/utils/emblem'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  // iOS masks to a rounded rect itself, so render the full-bleed (non-maskable) mark.
  return new ImageResponse(emblem(180), { ...size })
}
