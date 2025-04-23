/**
 * Retry a function with exponential backoff
 * @param fn The function to retry
 * @param options Retry options
 * @returns The result of the function
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number
    initialDelay?: number
    maxDelay?: number
    factor?: number
    onRetry?: (error: Error, attempt: number, delay: number) => void
  } = {},
): Promise<T> {
  const { maxRetries = 3, initialDelay = 500, maxDelay = 10000, factor = 2, onRetry = () => {} } = options

  let attempt = 0
  let delay = initialDelay

  while (true) {
    try {
      return await fn()
    } catch (error) {
      attempt++

      if (attempt > maxRetries) {
        throw error
      }

      // Calculate next delay with exponential backoff
      delay = Math.min(delay * factor, maxDelay)

      // Add some randomness to prevent all clients retrying at the same time
      const jitter = Math.random() * 0.3 + 0.85 // between 0.85 and 1.15
      const actualDelay = Math.floor(delay * jitter)

      // Call the onRetry callback
      if (error instanceof Error) {
        onRetry(error, attempt, actualDelay)
      }

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, actualDelay))
    }
  }
}
