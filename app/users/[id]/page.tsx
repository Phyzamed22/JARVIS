import { notFound } from "next/navigation"
import Link from "next/link"
import { getUserProfile, getUserInteractions, getCommandHistory, getCustomCommands } from "@/lib/db"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { UserProfileDetail } from "@/components/user-profile-detail"
import { UserInteractionsList } from "@/components/user-interactions-list"
import { CommandHistoryList } from "@/components/command-history-list"
import { CustomCommandsList } from "@/components/custom-commands-list"
import { ChevronLeft, AlertCircle } from "lucide-react"

interface UserDetailPageProps {
  params: {
    id: string
  }
}

export default async function UserDetailPage({ params }: UserDetailPageProps) {
  const userId = Number.parseInt(params.id)
  let profile = null
  let interactions = []
  let commandHistory = []
  let customCommands = []
  let databaseError = false

  try {
    profile = await getUserProfile(userId)

    if (!profile) {
      notFound()
    }

    interactions = await getUserInteractions(userId)
    commandHistory = await getCommandHistory(userId)
    customCommands = await getCustomCommands(userId)
  } catch (error) {
    console.error(`Error loading user data for ID ${userId}:`, error)
    databaseError = true
    // If we couldn't get the profile, we'll redirect to 404
    if (!profile) {
      notFound()
    }
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <Button asChild variant="ghost" size="sm" className="mb-4">
          <Link href="/">
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Link>
        </Button>

        <h1 className="text-3xl font-bold tracking-tight">{profile.name}'s Profile</h1>
        <p className="text-muted-foreground">User profile and interaction history</p>
      </div>

      {databaseError && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Database Connection Error</AlertTitle>
          <AlertDescription>
            Unable to connect to the database. Some data may be unavailable or showing sample data instead.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Profile Details</CardTitle>
              <CardDescription>Personal preferences and settings</CardDescription>
            </CardHeader>
            <CardContent>
              <UserProfileDetail profile={profile} />
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-2">
          <Tabs defaultValue="interactions">
            <TabsList className="grid grid-cols-3 mb-4">
              <TabsTrigger value="interactions">Interactions</TabsTrigger>
              <TabsTrigger value="commands">Command History</TabsTrigger>
              <TabsTrigger value="custom">Custom Commands</TabsTrigger>
            </TabsList>

            <TabsContent value="interactions">
              <Card>
                <CardHeader>
                  <CardTitle>Interaction History</CardTitle>
                  <CardDescription>Recent conversations with JARVIS</CardDescription>
                </CardHeader>
                <CardContent>
                  <UserInteractionsList interactions={interactions} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="commands">
              <Card>
                <CardHeader>
                  <CardTitle>Command History</CardTitle>
                  <CardDescription>Commands executed by this user</CardDescription>
                </CardHeader>
                <CardContent>
                  <CommandHistoryList commands={commandHistory} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="custom">
              <Card>
                <CardHeader>
                  <CardTitle>Custom Commands</CardTitle>
                  <CardDescription>User-defined custom commands</CardDescription>
                </CardHeader>
                <CardContent>
                  <CustomCommandsList commands={customCommands} />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
