import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <h1 className="text-4xl font-bold">404</h1>
      <p className="text-xl mt-2">Page not found</p>
      <p className="text-muted-foreground mt-1 text-center">
        The page you are looking for doesn't exist or has been moved.
      </p>
      <Button asChild className="mt-6">
        <Link href="/">Return to Dashboard</Link>
      </Button>
    </div>
  )
}
