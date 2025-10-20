import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
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
            console.error('Supabase server fetch error:', error)
            throw error
          }
        },
      },
    }
  )
}
