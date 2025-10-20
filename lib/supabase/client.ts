import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
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
            console.error('Supabase fetch error:', error)
            throw error
          }
        },
      },
    }
  )
}
