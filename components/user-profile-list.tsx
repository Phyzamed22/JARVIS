import Link from "next/link"
import type { UserProfile } from "@/lib/db"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

interface UserProfileListProps {
  profiles: UserProfile[]
}

export function UserProfileList({ profiles }: UserProfileListProps) {
  if (profiles.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No user profiles found. Create a new profile to get started.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {profiles.map((profile) => (
        <Card key={profile.id} className="hover:bg-accent/50 transition-colors">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {profile.name.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{profile.name}</h3>
                    <Badge variant="outline">{profile.tone}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{profile.interaction_count} interactions</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {profile.likes.slice(0, 3).map((like, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {like}
                      </Badge>
                    ))}
                    {profile.likes.length > 3 && (
                      <Badge variant="secondary" className="text-xs">
                        +{profile.likes.length - 3} more
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link href={`/users/${profile.id}`}>View Profile</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
