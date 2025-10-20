/**
 * Network utilities for handling connectivity issues
 */

export async function checkSupabaseConnection(url: string): Promise<boolean> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 3000)

    const response = await fetch(`${url}/rest/v1/`, {
      method: 'HEAD',
      signal: controller.signal,
    })

    clearTimeout(timeoutId)
    return response.ok || response.status === 401 // 401 is fine, means server is reachable
  } catch (error) {
    console.error('Supabase connection check failed:', error)
    return false
  }
}

export function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    retries?: number
    delay?: number
    onRetry?: (attempt: number, error: any) => void
  } = {}
): Promise<T> {
  const { retries = 2, delay = 1000, onRetry } = options

  return new Promise(async (resolve, reject) => {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const result = await fn()
        resolve(result)
        return
      } catch (error) {
        if (attempt === retries) {
          reject(error)
          return
        }

        if (onRetry) {
          onRetry(attempt + 1, error)
        }

        await new Promise((r) => setTimeout(r, delay * (attempt + 1)))
      }
    }
  })
}

export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage = 'Operation timed out'
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
    ),
  ])
}
