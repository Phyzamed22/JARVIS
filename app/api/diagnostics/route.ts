import { type NextRequest, NextResponse } from "next/server"
import { checkEnvironment } from "@/lib/env-check"

export async function GET(request: NextRequest) {
  const env = checkEnvironment()

  return NextResponse.json({
    environment: {
      isComplete: env.isComplete,
      missingVars: env.missingVars,
      availableVars: env.availableVars,
    },
    runtime: {
      node: process.version,
      platform: process.platform,
    },
    timestamp: new Date().toISOString(),
  })
}
