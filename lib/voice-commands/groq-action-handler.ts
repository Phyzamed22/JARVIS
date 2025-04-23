import { chatWithGroq } from "../groq"
import { searchGoogle, openWebApp, openDesktopApp } from "../search-google"
import { spawn } from "child_process"
import path from "path"

/**
 * Interface for the structured action response from Groq
 */
interface ActionResponse {
  action: "search_google" | "open_web_app" | "open_desktop_app"
  params: {
    query?: string
    url?: string
    app_name?: string
  }
}

/**
 * Processes a voice command through Groq LLM to determine the action type
 * and executes the appropriate automation function.
 * 
 * @param command The voice command to process
 * @returns Object containing execution status and details
 */
export async function processVoiceCommandWithGroq(command: string): Promise<{ executed: boolean; action?: string; params?: any }> {
  try {
    // Prepare the prompt for Groq to extract action and parameters
    const prompt = `
    You are a smart assistant. Based on the user's input, return the action and required params.
    
    Actions:
    - "search_google" → requires: "query"
    - "open_web_app" → requires: "url"
    - "open_desktop_app" → requires: "app_name"
    
    Respond in JSON only.
    
    User: "${command}"
    `
    
    // Call Groq API
    const response = await chatWithGroq(
      [{ role: "user", content: prompt }],
      { temperature: 0.3, maxTokens: 500 }
    )
    
    if (response.error) {
      console.error("[Jarvis] Error from Groq API:", response.error)
      return { executed: false }
    }
    
    // Parse the JSON response
    try {
      const actionData = JSON.parse(response.text) as ActionResponse
      
      // Execute the appropriate action based on the response
      if (actionData.action === "search_google" && actionData.params.query) {
        await searchGoogle(actionData.params.query)
        return { 
          executed: true, 
          action: "search_google", 
          params: { query: actionData.params.query } 
        }
      } 
      else if (actionData.action === "open_web_app" && actionData.params.url) {
        await openWebApp(actionData.params.url)
        return { 
          executed: true, 
          action: "open_web_app", 
          params: { url: actionData.params.url } 
        }
      } 
      else if (actionData.action === "open_desktop_app" && actionData.params.app_name) {
        await openDesktopApp(actionData.params.app_name)
        return { 
          executed: true, 
          action: "open_desktop_app", 
          params: { app_name: actionData.params.app_name } 
        }
      }
      
      console.log("[Jarvis] No valid action found in Groq response")
      return { executed: false }
      
    } catch (parseError) {
      console.error("[Jarvis] Error parsing Groq response:", parseError)
      console.log("[Jarvis] Raw response:", response.text)
      return { executed: false }
    }
  } catch (error) {
    console.error("[Jarvis] Error processing voice command with Groq:", error)
    return { executed: false }
  }
}