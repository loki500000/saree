import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
            supabaseResponse = NextResponse.next({
              request,
            })
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            )
          },
        },
        global: {
          fetch: async (url, options = {}) => {
            // Add timeout to all Supabase requests
            const controller = new AbortController()
            const timeoutId = setTimeout(() => controller.abort(), 60000) // 60 second timeout

            try {
              const response = await fetch(url, {
                ...options,
                signal: controller.signal,
              })
              clearTimeout(timeoutId)
              return response
            } catch (error) {
              clearTimeout(timeoutId)
              throw error
            }
          },
        },
      }
    )

    // Refresh session if expired - required for Server Components
    // Use a timeout-wrapped approach
    const { data: { user }, error } = await Promise.race([
      supabase.auth.getUser(),
      new Promise<{ data: { user: null }, error: Error }>((_, reject) =>
        setTimeout(() => reject(new Error('Auth timeout')), 60000)
      ),
    ]).catch((err) => {
      console.error('Middleware auth error:', err.message)
      return { data: { user: null }, error: err }
    })

    // Protected routes
    const protectedPaths = ['/admin', '/store']
    const isProtectedPath = protectedPaths.some(path => request.nextUrl.pathname.startsWith(path))

    if (isProtectedPath && !user) {
      // Redirect to login if accessing protected route without authentication
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = '/login'
      redirectUrl.searchParams.set('redirect', request.nextUrl.pathname)
      return NextResponse.redirect(redirectUrl)
    }

    return supabaseResponse
  } catch (error) {
    // On network errors, allow request to continue but log the error
    console.error('Middleware error:', error)

    // For protected paths, redirect to login on error
    const protectedPaths = ['/admin', '/store']
    const isProtectedPath = protectedPaths.some(path => request.nextUrl.pathname.startsWith(path))

    if (isProtectedPath) {
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = '/login'
      redirectUrl.searchParams.set('redirect', request.nextUrl.pathname)
      redirectUrl.searchParams.set('error', 'connection')
      return NextResponse.redirect(redirectUrl)
    }

    return supabaseResponse
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
