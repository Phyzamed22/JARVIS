import { searchGoogle, openWebApp, openDesktopApp } from "../search-google"

/**
 * Processes voice commands for automation actions using Python.
 * Handles Google searches, opening web apps, and launching desktop applications.
 */
export async function handleAutomationCommand(text: string): Promise<{ executed: boolean; action?: string; params?: any }> {
  const lowerText = text.toLowerCase().trim()
  
  // Check for Google search commands
  const searchTriggers = [
    "search for",
    "search",
    "google",
    "look up",
    "find information about"
  ]
  
  for (const trigger of searchTriggers) {
    if (lowerText.startsWith(trigger)) {
      const query = text.slice(trigger.length).trim()
      if (query) {
        try {
          await searchGoogle(query)
          return { 
            executed: true, 
            action: "search_google", 
            params: { query } 
          }
        } catch (error) {
          console.error("[Jarvis] Error executing search:", error)
          return { executed: false }
        }
      }
    }
  }
  
  // Check for web app opening commands
  const webAppTriggers = [
    "open",
    "launch",
    "go to",
    "navigate to"
  ]
  
  const webAppKeywords = [
    { name: "gmail", url: "https://mail.google.com" },
    { name: "google drive", url: "https://drive.google.com" },
    { name: "youtube", url: "https://youtube.com" },
    { name: "google docs", url: "https://docs.google.com" },
    { name: "google sheets", url: "https://sheets.google.com" },
    { name: "google calendar", url: "https://calendar.google.com" },
    { name: "twitter", url: "https://twitter.com" },
    { name: "facebook", url: "https://facebook.com" },
    { name: "instagram", url: "https://instagram.com" },
    { name: "linkedin", url: "https://linkedin.com" },
    { name: "github", url: "https://github.com" },
    { name: "amazon", url: "https://amazon.com" },
    { name: "netflix", url: "https://netflix.com" },
    { name: "spotify web", url: "https://open.spotify.com" }
  ]
  
  for (const trigger of webAppTriggers) {
    if (lowerText.startsWith(trigger)) {
      const remainingText = lowerText.slice(trigger.length).trim()
      
      // Check if it's a web app (contains "in browser" or matches known web apps)
      const isWebApp = remainingText.includes("in browser") || 
                      webAppKeywords.some(app => remainingText.includes(app.name))
      
      if (isWebApp) {
        // Find which web app to open
        const webApp = webAppKeywords.find(app => remainingText.includes(app.name))
        
        if (webApp) {
          try {
            await openWebApp(webApp.url)
            return { 
              executed: true, 
              action: "open_web_app", 
              params: { url: webApp.url } 
            }
          } catch (error) {
            console.error("[Jarvis] Error opening web app:", error)
            return { executed: false }
          }
        }
      }
    }
  }
  
  // Check for desktop app launching commands
  const desktopAppTriggers = [
    "launch",
    "open",
    "start",
    "run"
  ]
  
  const desktopApps = [
    "notepad",
    "calculator",
    "spotify",
    "vscode",
    "visual studio code",
    "file explorer",
    "explorer",
    "word",
    "excel",
    "powerpoint"
  ]
  
  for (const trigger of desktopAppTriggers) {
    if (lowerText.startsWith(trigger)) {
      const remainingText = lowerText.slice(trigger.length).trim()
      
      // Check if it's a desktop app
      const desktopApp = desktopApps.find(app => remainingText.includes(app))
      
      if (desktopApp) {
        try {
          await openDesktopApp(desktopApp)
          return { 
            executed: true, 
            action: "open_desktop_app", 
            params: { app_name: desktopApp } 
          }
        } catch (error) {
          console.error("[Jarvis] Error launching desktop app:", error)
          return { executed: false }
        }
      }
    }
  }
  
  // No automation command matched
  return { executed: false }
}