"use client"

import { useState, useEffect } from "react"
import { getUserProfileService, type UserProfile } from "@/lib/user-profile-service"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { PlusCircle, X, Save, Coffee, Briefcase, ListTodo, Heart, ThumbsDown } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

export function UserProfileSetup() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [newLike, setNewLike] = useState("")
  const [newDislike, setNewDislike] = useState("")
  const [newProject, setNewProject] = useState({ name: "", description: "" })
  const [newTask, setNewTask] = useState({ description: "", project: "" })
  const [activeTab, setActiveTab] = useState("basic")
  const { toast } = useToast()

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const profileService = getUserProfileService()
        const userProfile = await profileService.getCurrentProfile()
        setProfile(userProfile)
      } catch (error) {
        console.error("Error loading user profile:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadProfile()
  }, [])

  const handleSaveProfile = async () => {
    if (!profile) return

    try {
      const profileService = getUserProfileService()
      await profileService.updateProfile(profile)

      toast({
        title: "Profile saved",
        description: "Your profile has been updated successfully.",
      })
    } catch (error) {
      console.error("Error saving profile:", error)

      toast({
        title: "Error saving profile",
        description: "There was an error saving your profile. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleAddLike = () => {
    if (!newLike.trim() || !profile) return

    const updatedLikes = [...(profile.likes || []), newLike.trim()]
    setProfile({ ...profile, likes: updatedLikes })
    setNewLike("")
  }

  const handleRemoveLike = (like: string) => {
    if (!profile) return

    const updatedLikes = (profile.likes || []).filter((item) => item !== like)
    setProfile({ ...profile, likes: updatedLikes })
  }

  const handleAddDislike = () => {
    if (!newDislike.trim() || !profile) return

    const updatedDislikes = [...(profile.dislikes || []), newDislike.trim()]
    setProfile({ ...profile, dislikes: updatedDislikes })
    setNewDislike("")
  }

  const handleRemoveDislike = (dislike: string) => {
    if (!profile) return

    const updatedDislikes = (profile.dislikes || []).filter((item) => item !== dislike)
    setProfile({ ...profile, dislikes: updatedDislikes })
  }

  const handleAddProject = async () => {
    if (!newProject.name.trim() || !profile) return

    try {
      const profileService = getUserProfileService()
      await profileService.addProject(newProject.name, newProject.description)

      // Refresh profile
      const updatedProfile = await profileService.getCurrentProfile()
      setProfile(updatedProfile)

      setNewProject({ name: "", description: "" })

      toast({
        title: "Project added",
        description: `Project "${newProject.name}" has been added.`,
      })
    } catch (error) {
      console.error("Error adding project:", error)

      toast({
        title: "Error adding project",
        description: "There was an error adding your project. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleAddTask = async () => {
    if (!newTask.description.trim() || !profile) return

    try {
      const profileService = getUserProfileService()
      await profileService.addTask(newTask.description, newTask.project || undefined)

      // Refresh profile
      const updatedProfile = await profileService.getCurrentProfile()
      setProfile(updatedProfile)

      setNewTask({ description: "", project: "" })

      toast({
        title: "Task added",
        description: `Task "${newTask.description}" has been added.`,
      })
    } catch (error) {
      console.error("Error adding task:", error)

      toast({
        title: "Error adding task",
        description: "There was an error adding your task. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleAddCoffee = async () => {
    if (!profile) return

    try {
      const profileService = getUserProfileService()
      await profileService.updateCaffeineIntake(1)

      // Refresh profile
      const updatedProfile = await profileService.getCurrentProfile()
      setProfile(updatedProfile)

      toast({
        title: "Caffeine tracked",
        description: "Added one cup of coffee to your daily intake.",
      })
    } catch (error) {
      console.error("Error updating caffeine intake:", error)
    }
  }

  if (isLoading) {
    return (
      <div className="glass-card p-6 animate-pulse">
        <div className="h-8 w-1/3 bg-primary/20 rounded mb-4"></div>
        <div className="h-4 w-full bg-primary/10 rounded mb-2"></div>
        <div className="h-4 w-2/3 bg-primary/10 rounded mb-4"></div>
        <div className="h-10 w-full bg-primary/20 rounded"></div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="glass-card p-6">
        <p className="text-red-400">Error loading profile. Please refresh the page.</p>
      </div>
    )
  }

  return (
    <Card className="glass-card border-none shadow-none bg-transparent">
      <CardHeader>
        <CardTitle className="text-xl font-semibold text-primary flex items-center">User Profile</CardTitle>
        <CardDescription>
          Personalize JARVIS to make it your own. The more JARVIS knows about you, the more helpful it can be.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-4 mb-4">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="preferences">Preferences</TabsTrigger>
            <TabsTrigger value="projects">Projects</TabsTrigger>
            <TabsTrigger value="stats">Stats</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Your Name</Label>
              <Input
                id="name"
                value={profile.name || ""}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                placeholder="What should JARVIS call you?"
                className="bg-background/50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tone">Preferred Tone</Label>
              <select
                id="tone"
                value={profile.tone || "casual"}
                onChange={(e) => setProfile({ ...profile, tone: e.target.value })}
                className="w-full p-2 rounded-md bg-background/50 border border-primary/30"
              >
                <option value="casual">Casual & Friendly</option>
                <option value="professional">Professional & Formal</option>
                <option value="enthusiastic">Enthusiastic & Energetic</option>
                <option value="witty">Witty & Humorous</option>
                <option value="sarcastic">Sarcastic & Playful</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center">
                <Heart className="h-4 w-4 mr-1" /> Things You Like
              </Label>
              <div className="flex flex-wrap gap-2 mb-2">
                {(profile.likes || []).map((like) => (
                  <Badge key={like} variant="secondary" className="flex items-center gap-1">
                    {like}
                    <button onClick={() => handleRemoveLike(like)} className="ml-1 text-gray-400 hover:text-red-400">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={newLike}
                  onChange={(e) => setNewLike(e.target.value)}
                  placeholder="Add something you like"
                  className="bg-background/50"
                  onKeyDown={(e) => e.key === "Enter" && handleAddLike()}
                />
                <Button onClick={handleAddLike} size="sm" variant="outline">
                  <PlusCircle className="h-4 w-4 mr-1" /> Add
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center">
                <ThumbsDown className="h-4 w-4 mr-1" /> Things You Dislike
              </Label>
              <div className="flex flex-wrap gap-2 mb-2">
                {(profile.dislikes || []).map((dislike) => (
                  <Badge key={dislike} variant="secondary" className="flex items-center gap-1">
                    {dislike}
                    <button
                      onClick={() => handleRemoveDislike(dislike)}
                      className="ml-1 text-gray-400 hover:text-red-400"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={newDislike}
                  onChange={(e) => setNewDislike(e.target.value)}
                  placeholder="Add something you dislike"
                  className="bg-background/50"
                  onKeyDown={(e) => e.key === "Enter" && handleAddDislike()}
                />
                <Button onClick={handleAddDislike} size="sm" variant="outline">
                  <PlusCircle className="h-4 w-4 mr-1" /> Add
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="preferences" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="theme">Theme Preference</Label>
              <select
                id="theme"
                value={profile.preferences?.theme || "dark"}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    preferences: { ...(profile.preferences || {}), theme: e.target.value },
                  })
                }
                className="w-full p-2 rounded-md bg-background/50 border border-primary/30"
              >
                <option value="dark">Dark Theme</option>
                <option value="light">Light Theme</option>
                <option value="system">System Default</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notification_level">Notification Level</Label>
              <select
                id="notification_level"
                value={profile.preferences?.notification_level || "medium"}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    preferences: { ...(profile.preferences || {}), notification_level: e.target.value },
                  })
                }
                className="w-full p-2 rounded-md bg-background/50 border border-primary/30"
              >
                <option value="low">Low - Essential notifications only</option>
                <option value="medium">Medium - Important notifications</option>
                <option value="high">High - All notifications</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="work_hours">Work Hours</Label>
              <div className="flex gap-2">
                <select
                  id="work_hours_start"
                  value={profile.preferences?.work_hours_start || "9"}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      preferences: { ...(profile.preferences || {}), work_hours_start: e.target.value },
                    })
                  }
                  className="w-1/2 p-2 rounded-md bg-background/50 border border-primary/30"
                >
                  {Array.from({ length: 24 }).map((_, i) => (
                    <option key={i} value={i}>
                      {i}:00
                    </option>
                  ))}
                </select>
                <span className="flex items-center">to</span>
                <select
                  id="work_hours_end"
                  value={profile.preferences?.work_hours_end || "17"}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      preferences: { ...(profile.preferences || {}), work_hours_end: e.target.value },
                    })
                  }
                  className="w-1/2 p-2 rounded-md bg-background/50 border border-primary/30"
                >
                  {Array.from({ length: 24 }).map((_, i) => (
                    <option key={i} value={i}>
                      {i}:00
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="projects" className="space-y-4">
            <div className="space-y-2">
              <Label className="flex items-center">
                <Briefcase className="h-4 w-4 mr-1" /> Your Projects
              </Label>
              <div className="space-y-2 mb-4">
                {Object.entries(profile.projects || {}).length > 0 ? (
                  Object.entries(profile.projects || {}).map(([name, details]: [string, any]) => (
                    <div key={name} className="p-3 rounded-md bg-background/30 border border-primary/20">
                      <h4 className="font-medium text-primary">{name}</h4>
                      <p className="text-sm text-gray-400">{details.description || "No description"}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-400 text-sm">No projects added yet. Add your first project below.</p>
                )}
              </div>

              <div className="space-y-2 p-3 rounded-md bg-background/20 border border-dashed border-primary/30">
                <Label htmlFor="project_name">New Project</Label>
                <Input
                  id="project_name"
                  value={newProject.name}
                  onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                  placeholder="Project name"
                  className="bg-background/50 mb-2"
                />
                <Textarea
                  id="project_description"
                  value={newProject.description}
                  onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                  placeholder="Project description"
                  className="bg-background/50 mb-2"
                  rows={3}
                />
                <Button onClick={handleAddProject} className="w-full">
                  <PlusCircle className="h-4 w-4 mr-1" /> Add Project
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center">
                <ListTodo className="h-4 w-4 mr-1" /> Your Tasks
              </Label>
              <div className="space-y-2 mb-4">
                {Object.entries(profile.ongoing_tasks || {}).length > 0 ? (
                  Object.entries(profile.ongoing_tasks || {})
                    .filter(([_, task]: [string, any]) => !task.completed)
                    .map(([id, task]: [string, any]) => (
                      <div key={id} className="p-3 rounded-md bg-background/30 border border-primary/20">
                        <h4 className="font-medium text-primary">{task.description}</h4>
                        <p className="text-sm text-gray-400">Project: {task.project || "Default"}</p>
                      </div>
                    ))
                ) : (
                  <p className="text-gray-400 text-sm">No active tasks. Add your first task below.</p>
                )}
              </div>

              <div className="space-y-2 p-3 rounded-md bg-background/20 border border-dashed border-primary/30">
                <Label htmlFor="task_description">New Task</Label>
                <Input
                  id="task_description"
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  placeholder="Task description"
                  className="bg-background/50 mb-2"
                />
                <Label htmlFor="task_project">Project (optional)</Label>
                <select
                  id="task_project"
                  value={newTask.project}
                  onChange={(e) => setNewTask({ ...newTask, project: e.target.value })}
                  className="w-full p-2 rounded-md bg-background/50 border border-primary/30 mb-2"
                >
                  <option value="">Default</option>
                  {Object.keys(profile.projects || {}).map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
                <Button onClick={handleAddTask} className="w-full">
                  <PlusCircle className="h-4 w-4 mr-1" /> Add Task
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="stats" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-md bg-background/30 border border-primary/20">
                <h3 className="text-lg font-medium text-primary flex items-center">
                  <Coffee className="h-5 w-5 mr-2" /> Caffeine Tracker
                </h3>
                <p className="text-3xl font-bold mt-2">{profile.caffeine_intake?.today || 0}</p>
                <p className="text-sm text-gray-400">cups today</p>
                <Button onClick={handleAddCoffee} variant="outline" size="sm" className="mt-2">
                  <Coffee className="h-4 w-4 mr-1" /> Add Cup
                </Button>
              </div>

              <div className="p-4 rounded-md bg-background/30 border border-primary/20">
                <h3 className="text-lg font-medium text-primary flex items-center">
                  <ListTodo className="h-5 w-5 mr-2" /> Productivity
                </h3>
                <p className="text-3xl font-bold mt-2">{profile.productivity_stats?.tasks_completed || 0}</p>
                <p className="text-sm text-gray-400">tasks completed</p>
              </div>
            </div>

            <div className="p-4 rounded-md bg-background/30 border border-primary/20">
              <h3 className="text-lg font-medium text-primary">Interaction History</h3>
              <p className="text-3xl font-bold mt-2">{profile.interaction_count || 0}</p>
              <p className="text-sm text-gray-400">total interactions with JARVIS</p>
              {profile.last_interaction && (
                <p className="text-sm mt-2">Last interaction: {new Date(profile.last_interaction).toLocaleString()}</p>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="flex justify-end">
        <Button onClick={handleSaveProfile} className="flex items-center">
          <Save className="h-4 w-4 mr-1" /> Save Profile
        </Button>
      </CardFooter>
    </Card>
  )
}
