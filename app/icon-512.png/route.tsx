import { ImageResponse } from 'next/og'
import { emblem } from '@/utils/emblem'

export const dynamic = 'force-static'

export function GET() {
  return new ImageResponse(emblem(512), { width: 512, height: 512 })
}
