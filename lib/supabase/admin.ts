import { createClient } from '@supabase/supabase-js'

// Admin client with service role key for server-side operations
// This bypasses Row Level Security - use with caution!
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
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
            console.error('Supabase admin fetch error:', error)
            throw error
          }
        },
      },
    }
  )
}
