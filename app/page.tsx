import { JarvisAgent } from "@/components/jarvis-agent"

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col p-4 md:p-8">
      <div className="container mx-auto max-w-4xl h-[calc(100vh-2rem)] md:h-[calc(100vh-4rem)]">
        <JarvisAgent />
      </div>
    </main>
  )
}
