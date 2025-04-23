// Utility to check environment variables
export function checkEnvironment() {
  const envVars = {
    GROQ_API_KEY: process.env.GROQ_API_KEY || process.env.NEXT_PUBLIC_GROQ_API_KEY,
    ELEVENLABS_API_KEY: process.env.ELEVENLABS_API_KEY,
    DATABASE_URL: process.env.DATABASE_URL,
  }

  const missingVars = Object.entries(envVars)
    .filter(([_, value]) => !value)
    .map(([key]) => key)

  return {
    isComplete: missingVars.length === 0,
    missingVars,
    availableVars: Object.keys(envVars).filter((key) => !!envVars[key as keyof typeof envVars]),
  }
}
