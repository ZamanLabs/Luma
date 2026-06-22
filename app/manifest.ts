import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'Luma — Personal Tracker',
    short_name: 'Luma',
    description: 'Tend your days — food, money, movement, meds, and journal in one quiet place.',
    start_url: '/dashboard/home',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#0f0e0c',
    theme_color: '#0f0e0c',
    categories: ['health', 'lifestyle', 'productivity'],
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
