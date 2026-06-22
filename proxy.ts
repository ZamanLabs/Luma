import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  console.log('proxy running:', request.nextUrl.pathname)
  
  let proxyResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          proxyResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            proxyResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname
  // Never gate the OAuth callback — it must run to exchange the code for a session.
  // Also keep the PWA assets public so the manifest, icons, and service worker
  // resolve for logged-out users (otherwise they'd redirect to /login as HTML).
  const isPublic =
    path.startsWith('/login') ||
    path.startsWith('/auth') ||
    path.startsWith('/icon') ||
    path.startsWith('/apple-icon') ||
    path === '/sw.js' ||
    path === '/manifest.webmanifest' ||
    path === '/offline.html'

  if (!user && !isPublic) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return proxyResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.webmanifest|offline.html|icon-192.png|icon-512.png|icon-maskable.png|apple-icon).*)',
  ],
}