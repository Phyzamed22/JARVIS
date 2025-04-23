import React from "react"
import { formatDistanceToNow } from "date-fns"
import type { UserProfile } from "@/lib/db"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

interface UserProfileDetailProps {
  profile: UserProfile
}

export function UserProfileDetail({ profile }: UserProfileDetailProps) {
  const preferences = profile.preferences || {}

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center text-center">
        <Avatar className="h-24 w-24 mb-4">
          <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
            {profile.name.substring(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <h2 className="text-2xl font-bold">{profile.name}</h2>
        <Badge className="mt-2">{profile.tone}</Badge>

        {profile.last_interaction && (
          <p className="text-sm text-muted-foreground mt-2">
            Last seen {formatDistanceToNow(new Date(profile.last_interaction), { addSuffix: true })}
          </p>
        )}
      </div>

      <Separator />

      <div>
        <h3 className="font-medium mb-2">Preferences</h3>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="text-muted-foreground">Theme</div>
          <div className="text-right">{preferences.theme || "Default"}</div>

          <div className="text-muted-foreground">Notifications</div>
          <div className="text-right">{preferences.notification_level || "Medium"}</div>

          <div className="text-muted-foreground">Work Hours</div>
          <div className="text-right">
            {preferences.work_hours_start || "9"} - {preferences.work_hours_end || "17"}
          </div>

          <div className="text-muted-foreground">Focus Mode</div>
          <div className="text-right">{preferences.focus_mode ? "Enabled" : "Disabled"}</div>

          <div className="text-muted-foreground">AI Model</div>
          <div className="text-right">{preferences.preferred_ai_model || "Default"}</div>
        </div>
      </div>

      <Separator />

      <div>
        <h3 className="font-medium mb-2">Likes</h3>
        <div className="flex flex-wrap gap-1">
          {profile.likes.map((like, i) => (
            <Badge key={i} variant="secondary">
              {like}
            </Badge>
          ))}
        </div>
      </div>

      <div>
        <h3 className="font-medium mb-2">Dislikes</h3>
        <div className="flex flex-wrap gap-1">
          {profile.dislikes.map((dislike, i) => (
            <Badge key={i} variant="outline">
              {dislike}
            </Badge>
          ))}
        </div>
      </div>

      {profile.productivity_stats && (
        <>
          <Separator />

          <div>
            <h3 className="font-medium mb-2">Productivity Stats</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {Object.entries(profile.productivity_stats).map(([key, value]) => (
                <React.Fragment key={key}>
                  <div className="text-muted-foreground">
                    {key
                      .split("_")
                      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                      .join(" ")}
                  </div>
                  <div className="text-right">{value}</div>
                </React.Fragment>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
