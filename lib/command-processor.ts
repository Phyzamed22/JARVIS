import { getAIService } from "./ai-service"
import { addMessage } from "./conversation-service"
import { getAISettings, saveAISettings, resetAISettings, getModelName } from "./settings-service"
import { getVoiceSettings, saveVoiceSettings, resetVoiceSettings } from "./voice-settings-service"
import { getVoiceService } from "./voice-service"
import { getSearchService } from "./search-service"
import { getSearchHistoryService } from "./search-history-service"

// Command types
export type CommandAction = (params?: string) => Promise<string | void> | string | void

export interface Command {
  name: string
  triggers: string[]
  action: CommandAction
  description: string
}

export class CommandProcessor {
  private commands: Command[] = []

  constructor() {
    // Register default commands
    this.registerDefaultCommands()

    // Register search commands
    this.registerCommand({
      name: 'search',
      description: 'Search the web using Google',
      triggers: ['browse google', 'google', 'search for', 'search', 'find information about', 'look up'],
      action: async (query) => {
        if (!query) {
          return 'What would you like to search for?'
        }

        try {
          const searchService = new SearchService()
          const response = await searchService.search(query)

          if (response.error) {
            return `Sorry, I couldn't search for that. ${response.error}`
          }

          // Format the search results into a readable response
          const results = response.results.map((result, index) => 
            `${index + 1}. ${result.title}\n${result.snippet}\n${result.link}\n`
          ).join('\n')

          return `Here's what I found for "${query}":\n\n${results}`
        } catch (error) {
          console.error('Error performing search:', error)
          return 'Sorry, I encountered an error while searching. Please try again.'
        }
      }
    })
  }

  // Register a new command
  public registerCommand(command: Command): void {
    this.commands.push(command)
  }

  // Process a text command
  public async processCommand(text: string): Promise<{ response: string; executed: boolean; isAI: boolean }> {
    const lowerText = text.toLowerCase().trim()

    // Add the user's message to conversation history
    addMessage("user", text)

    // Check if the text matches any command triggers
    for (const command of this.commands) {
      for (const trigger of command.triggers) {
        if (lowerText.includes(trigger.toLowerCase())) {
          try {
            // Extract parameters (text after the trigger)
            const triggerIndex = lowerText.indexOf(trigger.toLowerCase())
            const params = lowerText.substring(triggerIndex + trigger.length).trim()

            // Execute the command
            const result = await command.action(params)
            const response = typeof result === "string" ? result : `Executed command: ${command.name}`

            // Add the command response to conversation history
            addMessage("assistant", response)

            return {
              response,
              executed: true,
              isAI: false,
            }
          } catch (error) {
            console.error(`Error executing command ${command.name}:`, error)
            const errorResponse = `Error executing command: ${command.name}`

            // Add the error response to conversation history
            addMessage("assistant", errorResponse)

            return {
              response: errorResponse,
              executed: false,
              isAI: false,
            }
          }
        }
      }
    }

    // No command matched, use AI fallback
    return this.getAIResponse(text)
  }

  // Stream a command response
  public streamCommand(
    text: string,
    onChunk: (chunk: string) => void,
    onComplete: (result: { response: string; executed: boolean; isAI: boolean }) => void,
    onError: (error: string) => void,
  ): () => void {
    const lowerText = text.toLowerCase().trim()

    // Add the user's message to conversation history
    addMessage("user", text)

    // Check if the text matches any command triggers
    for (const command of this.commands) {
      for (const trigger of command.triggers) {
        if (lowerText.includes(trigger.toLowerCase())) {
          try {
            // Extract parameters (text after the trigger)
            const triggerIndex = lowerText.indexOf(trigger.toLowerCase())
            const params = lowerText.substring(triggerIndex + trigger.length).trim()

            // Execute the command
            const resultPromise = command.action(params)

            // Handle both synchronous and asynchronous results
            Promise.resolve(resultPromise)
              .then((result) => {
                const response = typeof result === "string" ? result : `Executed command: ${command.name}`

                // For commands, we don't have streaming, so we send the full response as one chunk
                onChunk(response)

                // Add the command response to conversation history
                addMessage("assistant", response)

                onComplete({
                  response,
                  executed: true,
                  isAI: false,
                })
              })
              .catch((error) => {
                console.error(`Error executing command ${command.name}:`, error)
                const errorResponse = `Error executing command: ${command.name}`

                // Add the error response to conversation history
                addMessage("assistant", errorResponse)

                onError(errorResponse)
                onComplete({
                  response: errorResponse,
                  executed: false,
                  isAI: false,
                })
              })

            // Return a no-op abort function since commands don't support aborting
            return () => {}
          } catch (error) {
            console.error(`Error executing command ${command.name}:`, error)
            const errorResponse = `Error executing command: ${command.name}`

            // Add the error response to conversation history
            addMessage("assistant", errorResponse)

            onError(errorResponse)
            onComplete({
              response: errorResponse,
              executed: false,
              isAI: false,
            })

            return () => {}
          }
        }
      }
    }

    // No command matched, use AI fallback with streaming
    return this.streamAIResponse(
      text,
      onChunk,
      (response) => {
        onComplete({
          response,
          executed: true,
          isAI: true,
        })
      },
      onError,
    )
  }

  // Get a response from the AI
  private async getAIResponse(text: string): Promise<{ response: string; executed: boolean; isAI: boolean }> {
    const aiService = getAIService()

    if (!aiService.isConfigured()) {
      const response = "I'm sorry, I don't understand that command. AI capabilities are not configured."

      // Add the response to conversation history
      addMessage("assistant", response)

      return {
        response,
        executed: false,
        isAI: false,
      }
    }

    try {
      const aiResponse = await aiService.getResponse(text)

      if (aiResponse.error) {
        return {
          response: aiResponse.text,
          executed: false,
          isAI: true,
        }
      }

      return {
        response: aiResponse.text,
        executed: true,
        isAI: true,
      }
    } catch (error) {
      console.error("Error getting AI response:", error)
      const errorResponse =
        "I apologize, but I encountered an error while processing your request. Please try again later."

      // Add the error response to conversation history
      addMessage("assistant", errorResponse)

      return {
        response: errorResponse,
        executed: false,
        isAI: true,
      }
    }
  }

  // Stream a response from the AI
  private streamAIResponse(
    text: string,
    onChunk: (chunk: string) => void,
    onComplete: (fullText: string) => void,
    onError: (error: string) => void,
  ): () => void {
    const aiService = getAIService()

    if (!aiService.isConfigured()) {
      const response = "I'm sorry, I don't understand that command. AI capabilities are not configured."

      // Add the response to conversation history
      addMessage("assistant", response)

      onChunk(response)
      onComplete(response)

      return () => {}
    }

    // Use the streaming API
    return aiService.streamResponse(text, onChunk, onComplete, (error) => {
      console.error("Error streaming AI response:", error)
      const errorResponse =
        "I apologize, but I encountered an error while processing your request. Please try again later."

      // Add the error response to conversation history
      addMessage("assistant", errorResponse)

      onError(errorResponse)
      onComplete(errorResponse)
    })
  }

  // Get all available commands
  public getCommands(): Command[] {
    return [...this.commands]
  }

  // Register default commands
  private registerDefaultCommands(): void {
    // Voice commands
    this.registerCommand({
      name: "Voice Settings",
      triggers: ["voice settings", "show voice settings", "get voice settings"],
      action: () => {
        const settings = getVoiceSettings()
        return `Current Voice Settings:
- Recognition Enabled: ${settings.recognitionEnabled ? "Yes" : "No"}
- Recognition Language: ${settings.recognitionLanguage}
- Continuous Listening: ${settings.continuousListening ? "Enabled" : "Disabled"}
- Auto Stop After Silence: ${settings.autoStopAfterSilence ? "Enabled" : "Disabled"}
- Wake Word: ${settings.wakeWordEnabled ? settings.wakeWord : "Disabled"}
- Synthesis Enabled: ${settings.synthesisEnabled ? "Yes" : "No"}
- Voice Rate: ${settings.synthesisRate.toFixed(1)}x
- Voice Pitch: ${settings.synthesisPitch.toFixed(1)}
- Voice Volume: ${Math.round(settings.synthesisVolume * 100)}%

You can adjust these settings in the Voice Settings panel.`
      },
      description: "Shows current voice settings",
    })

    this.registerCommand({
      name: "Toggle Voice Recognition",
      triggers: [
        "toggle voice recognition",
        "turn recognition on",
        "turn recognition off",
        "enable recognition",
        "disable recognition",
      ],
      action: (params) => {
        const settings = getVoiceSettings()
        const newValue =
          params?.toLowerCase().includes("on") || params?.toLowerCase().includes("enable")
            ? true
            : params?.toLowerCase().includes("off") || params?.toLowerCase().includes("disable")
              ? false
              : !settings.recognitionEnabled

        saveVoiceSettings({ recognitionEnabled: newValue })
        return `Voice recognition ${newValue ? "enabled" : "disabled"}.`
      },
      description: "Toggles voice recognition on/off",
    })

    this.registerCommand({
      name: "Toggle Voice Synthesis",
      triggers: ["toggle voice synthesis", "turn voice on", "turn voice off", "enable voice", "disable voice"],
      action: (params) => {
        const settings = getVoiceSettings()
        const newValue =
          params?.toLowerCase().includes("on") || params?.toLowerCase().includes("enable")
            ? true
            : params?.toLowerCase().includes("off") || params?.toLowerCase().includes("disable")
              ? false
              : !settings.synthesisEnabled

        saveVoiceSettings({ synthesisEnabled: newValue })
        return `Voice synthesis ${newValue ? "enabled" : "disabled"}.`
      },
      description: "Toggles voice synthesis on/off",
    })

    this.registerCommand({
      name: "Set Voice Language",
      triggers: ["set voice language", "change voice language", "set recognition language"],
      action: (params) => {
        if (!params) {
          return "Please specify a language code (e.g., en-US, fr-FR, es-ES)."
        }

        const langCode = params.toLowerCase().trim()
        saveVoiceSettings({ recognitionLanguage: langCode })
        return `Voice language set to ${langCode}.`
      },
      description: "Changes the voice recognition language",
    })

    this.registerCommand({
      name: "Toggle Continuous Listening",
      triggers: ["toggle continuous listening", "enable continuous listening", "disable continuous listening"],
      action: (params) => {
        const settings = getVoiceSettings()
        const newValue = params?.toLowerCase().includes("enable")
          ? true
          : params?.toLowerCase().includes("disable")
            ? false
            : !settings.continuousListening

        saveVoiceSettings({ continuousListening: newValue })
        return `Continuous listening mode ${newValue ? "enabled" : "disabled"}.`
      },
      description: "Toggles continuous listening mode",
    })

    this.registerCommand({
      name: "Start Continuous Listening",
      triggers: ["start continuous listening", "begin continuous listening", "listen continuously"],
      action: () => {
        const voiceService = getVoiceService()
        if (!voiceService) {
          return "Voice service is not available."
        }

        // Enable continuous listening in settings
        saveVoiceSettings({ continuousListening: true })

        // Start continuous listening
        const started = voiceService.startContinuousListening()
        if (started) {
          return "Continuous listening mode started. I'll listen until you tell me to stop."
        } else {
          return "Failed to start continuous listening. Please check your browser permissions."
        }
      },
      description: "Starts continuous listening mode",
    })

    this.registerCommand({
      name: "Stop Listening",
      triggers: ["stop listening", "stop continuous listening", "end listening"],
      action: () => {
        const voiceService = getVoiceService()
        if (!voiceService) {
          return "Voice service is not available."
        }

        voiceService.stopListening()
        return "I've stopped listening."
      },
      description: "Stops voice recognition",
    })

    this.registerCommand({
      name: "Reset Voice Settings",
      triggers: ["reset voice settings", "default voice settings"],
      action: () => {
        resetVoiceSettings()
        return "Voice settings have been reset to defaults."
      },
      description: "Resets voice settings to defaults",
    })

    // AI Settings commands
    this.registerCommand({
      name: "AI Settings",
      triggers: ["ai settings", "show ai settings", "get ai settings"],
      action: () => {
        const settings = getAISettings()
        return `Current AI Settings:
- Model: ${getModelName(settings.model)}
- Temperature: ${settings.temperature.toFixed(1)}
- Max Tokens: ${settings.maxTokens}
- Response Style: ${settings.responseStyle}
- Voice Enabled: ${settings.voiceEnabled ? "Yes" : "No"}
- Voice Rate: ${settings.voiceRate.toFixed(1)}x
- Voice Pitch: ${settings.voicePitch.toFixed(1)}

You can adjust these settings in the AI Settings panel.`
      },
      description: "Shows current AI settings",
    })

    this.registerCommand({
      name: "Set Response Style",
      triggers: ["set response style", "change response style"],
      action: (params) => {
        if (!params) {
          return "Please specify a response style: concise, balanced, or detailed."
        }

        const style = params.toLowerCase().trim()
        if (["concise", "balanced", "detailed"].includes(style)) {
          const settings = getAISettings()
          saveAISettings({ ...settings, responseStyle: style as any })
          return `Response style set to ${style}.`
        } else {
          return "Invalid response style. Please choose from: concise, balanced, or detailed."
        }
      },
      description: "Changes the AI response style",
    })

    this.registerCommand({
      name: "Toggle Voice",
      triggers: ["toggle voice", "turn voice on", "turn voice off", "enable voice", "disable voice"],
      action: (params) => {
        const settings = getAISettings()
        const newVoiceEnabled =
          params?.toLowerCase().includes("on") || params?.toLowerCase().includes("enable")
            ? true
            : params?.toLowerCase().includes("off") || params?.toLowerCase().includes("disable")
              ? false
              : !settings.voiceEnabled

        saveAISettings({ ...settings, voiceEnabled: newVoiceEnabled })
        return `Voice output ${newVoiceEnabled ? "enabled" : "disabled"}.`
      },
      description: "Toggles voice output on/off",
    })

    this.registerCommand({
      name: "Reset AI Settings",
      triggers: ["reset ai settings", "default ai settings"],
      action: () => {
        resetAISettings()
        return "AI settings have been reset to defaults."
      },
      description: "Resets AI settings to defaults",
    })

    // Clear conversation command
    this.registerCommand({
      name: "Clear Conversation",
      triggers: ["clear conversation", "clear history", "forget conversation", "start new conversation"],
      action: () => {
        const { clearConversationHistory } = require("./conversation-service")
        clearConversationHistory()
        return "I've cleared our conversation history. What would you like to talk about now?"
      },
      description: "Clears the conversation history",
    })

    // Time command
    this.registerCommand({
      name: "Time",
      triggers: ["what time is it", "tell me the time", "current time"],
      action: () => {
        const now = new Date()
        return `The current time is ${now.toLocaleTimeString()}.`
      },
      description: "Tells you the current time",
    })

    // Date command
    this.registerCommand({
      name: "Date",
      triggers: ["what day is it", "what is the date", "tell me the date", "current date"],
      action: () => {
        const now = new Date()
        return `Today is ${now.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}.`
      },
      description: "Tells you the current date",
    })

    // Greeting command
    this.registerCommand({
      name: "Greeting",
      triggers: ["hello", "hi jarvis", "hey jarvis", "greetings"],
      action: () => {
        const greetings = [
          "Hello, I am JARVIS. How can I assist you today?",
          "At your service, sir.",
          "Hello. All systems are operational.",
          "Greetings. How may I help you?",
        ]
        return greetings[Math.floor(Math.random() * greetings.length)]
      },
      description: "Greets you",
    })

    // System status command
    this.registerCommand({
      name: "System Status",
      triggers: ["system status", "status report", "how are you"],
      action: () => {
        return "All systems are functioning normally. CPU usage is optimal, and no security threats detected."
      },
      description: "Provides a system status report",
    })

    // Weather command (simulated)
    this.registerCommand({
      name: "Weather",
      triggers: ["what's the weather", "weather forecast", "is it going to rain"],
      action: () => {
        return "I'm sorry, I don't have access to real weather data at the moment. This would require an API integration."
      },
      description: "Provides weather information (simulated)",
    })

    // Open website command
    this.registerCommand({
      name: "Open Website",
      triggers: ["open website", "go to website", "navigate to"],
      action: (params) => {
        if (!params) {
          return "Please specify a website to open."
        }

        // Extract the website from params
        let website = params.replace(/^(https?:\/\/)?(www\.)?/, "")

        if (!website.includes(".")) {
          website += ".com"
        }

        const url = `https://${website}`
        window.open(url, "_blank")

        return `Opening ${website}`
      },
      description: "Opens a specified website",
    })

    // Help command
    this.registerCommand({
      name: "Help",
      triggers: ["help", "what can you do", "list commands", "show commands"],
      action: () => {
        const commandList = this.commands.map((cmd) => `${cmd.name}: ${cmd.description}`).join("\n")
        const aiService = getAIService()
        const aiStatus = aiService.isConfigured()
          ? "I can also answer general questions using my AI capabilities."
          : "AI capabilities are not configured, so I can only respond to specific commands."

        return `Here are the commands I can execute:\n${commandList}\n\n${aiStatus}`
      },
      description: "Lists all available commands",
    })

    // AI capabilities command
    this.registerCommand({
      name: "AI Capabilities",
      triggers: ["ai capabilities", "are you ai", "are you intelligent"],
      action: () => {
        const aiService = getAIService()
        if (aiService.isConfigured()) {
          return "Yes, I am powered by Groq's LLaMA 3 70B model, which allows me to understand and respond to a wide range of questions and requests beyond my pre-programmed commands. I also maintain conversation history to provide more contextual responses."
        } else {
          return "I have limited AI capabilities at the moment as my AI integration is not configured."
        }
      },
      description: "Explains AI capabilities",
    })

    // Search commands
    this.registerCommand({
      name: "Search",
      triggers: ["search for", "search", "look up", "find information about", "google"],
      action: async (params) => {
        if (!params) {
          return "Please specify what you'd like to search for."
        }

        const searchService = getSearchService()
        if (!searchService.isConfigured()) {
          return "Search functionality is not configured. Please add a SERPAPI_KEY to your environment variables."
        }

        try {
          // Save to search history
          const historyService = getSearchHistoryService()
          historyService.addToHistory(params)

          const answer = await searchService.getAnswer(params)
          return answer
        } catch (error) {
          console.error("Error executing search command:", error)
          return `I encountered an error while searching for "${params}". Please try again later.`
        }
      },
      description: "Searches the web for information",
    })

    this.registerCommand({
      name: "Web Search",
      triggers: ["web search", "show search results for", "show results for"],
      action: async (params) => {
        if (!params) {
          return "Please specify what you'd like to search for."
        }

        const searchService = getSearchService()
        if (!searchService.isConfigured()) {
          return "Search functionality is not configured. Please add a SERPAPI_KEY to your environment variables."
        }

        try {
          // Save to search history
          const historyService = getSearchHistoryService()
          historyService.addToHistory(params)

          const searchResponse = await searchService.search(params)

          if (searchResponse.error || searchResponse.results.length === 0) {
            return `I couldn't find information about "${params}". ${searchResponse.error || "No results found."}`
          }

          // Format the results as text
          const formattedResults = searchResponse.results
            .map((result, index) => `${index + 1}. ${result.title}\n   ${result.snippet}\n   ${result.link}`)
            .join("\n\n")

          return `Search results for "${params}":\n\n${formattedResults}`
        } catch (error) {
          console.error("Error executing web search command:", error)
          return `I encountered an error while searching for "${params}". Please try again later.`
        }
      },
      description: "Shows detailed web search results",
    })

    // NEW: Specialized search voice commands

    // Open search page command
    this.registerCommand({
      name: "Open Search Page",
      triggers: ["open search", "go to search", "search page", "open search page"],
      action: () => {
        if (typeof window !== "undefined") {
          window.location.href = "/search"
          return "Opening the search page."
        }
        return "I couldn't open the search page."
      },
      description: "Opens the search page",
    })

    // Search history command
    this.registerCommand({
      name: "Search History",
      triggers: ["search history", "show my searches", "recent searches", "what have I searched for"],
      action: () => {
        const historyService = getSearchHistoryService()
        const history = historyService.getSearchHistory()

        if (history.length === 0) {
          return "You don't have any recent searches."
        }

        const formattedHistory = history
          .slice(0, 5)
          .map((item, index) => {
            const date = new Date(item.timestamp)
            return `${index + 1}. "${item.query}" - ${date.toLocaleString()}`
          })
          .join("\n")

        return `Here are your recent searches:\n\n${formattedHistory}\n\nYou can view all your searches on the search page.`
      },
      description: "Shows your recent search history",
    })

    // Clear search history command
    this.registerCommand({
      name: "Clear Search History",
      triggers: ["clear search history", "delete my searches", "forget my searches"],
      action: () => {
        const historyService = getSearchHistoryService()
        historyService.clearHistory()
        return "I've cleared your search history."
      },
      description: "Clears your search history",
    })

    // Quick search commands for specific topics
    this.registerCommand({
      name: "News Search",
      triggers: ["news about", "search news", "find news", "latest news on", "what's happening with"],
      action: async (params) => {
        if (!params) {
          return "Please specify what news you'd like to search for."
        }

        const searchService = getSearchService()
        if (!searchService.isConfigured()) {
          return "Search functionality is not configured. Please add a SERPAPI_KEY to your environment variables."
        }

        try {
          // Add "news" to the query to focus on news results
          const newsQuery = `${params} news latest updates`

          // Save to search history
          const historyService = getSearchHistoryService()
          historyService.addToHistory(newsQuery)

          const answer = await searchService.getAnswer(newsQuery)
          return `Here's the latest news about ${params}:\n\n${answer}`
        } catch (error) {
          console.error("Error executing news search command:", error)
          return `I encountered an error while searching for news about "${params}". Please try again later.`
        }
      },
      description: "Searches for latest news on a topic",
    })

    // Definition search
    this.registerCommand({
      name: "Definition Search",
      triggers: ["define", "what is", "what are", "definition of", "meaning of", "tell me about"],
      action: async (params) => {
        if (!params) {
          return "Please specify what you'd like me to define."
        }

        const searchService = getSearchService()
        if (!searchService.isConfigured()) {
          return "Search functionality is not configured. Please add a SERPAPI_KEY to your environment variables."
        }

        try {
          // Formulate a definition query
          const definitionQuery = `define ${params} meaning definition`

          // Save to search history
          const historyService = getSearchHistoryService()
          historyService.addToHistory(definitionQuery)

          const answer = await searchService.getAnswer(definitionQuery)
          return answer
        } catch (error) {
          console.error("Error executing definition search command:", error)
          return `I encountered an error while searching for the definition of "${params}". Please try again later.`
        }
      },
      description: "Searches for definitions and explanations",
    })

    // How-to search
    this.registerCommand({
      name: "How-To Search",
      triggers: ["how to", "how do I", "steps to", "guide for", "tutorial for"],
      action: async (params) => {
        if (!params) {
          return "Please specify what you'd like to learn how to do."
        }

        const searchService = getSearchService()
        if (!searchService.isConfigured()) {
          return "Search functionality is not configured. Please add a SERPAPI_KEY to your environment variables."
        }

        try {
          // Formulate a how-to query
          const howToQuery = `how to ${params} step by step guide`

          // Save to search history
          const historyService = getSearchHistoryService()
          historyService.addToHistory(howToQuery)

          const answer = await searchService.getAnswer(howToQuery)
          return `Here's how to ${params}:\n\n${answer}`
        } catch (error) {
          console.error("Error executing how-to search command:", error)
          return `I encountered an error while searching for how to "${params}". Please try again later.`
        }
      },
      description: "Searches for how-to guides and tutorials",
    })

    // Compare search
    this.registerCommand({
      name: "Comparison Search",
      triggers: ["compare", "difference between", "versus", "vs", "which is better"],
      action: async (params) => {
        if (!params) {
          return "Please specify what you'd like to compare."
        }

        const searchService = getSearchService()
        if (!searchService.isConfigured()) {
          return "Search functionality is not configured. Please add a SERPAPI_KEY to your environment variables."
        }

        try {
          // Formulate a comparison query
          const comparisonQuery = `compare ${params} differences similarities`

          // Save to search history
          const historyService = getSearchHistoryService()
          historyService.addToHistory(comparisonQuery)

          const answer = await searchService.getAnswer(comparisonQuery)
          return `Here's a comparison of ${params}:\n\n${answer}`
        } catch (error) {
          console.error("Error executing comparison search command:", error)
          return `I encountered an error while comparing "${params}". Please try again later.`
        }
      },
      description: "Compares different items or concepts",
    })

    // Quick facts search
    this.registerCommand({
      name: "Quick Facts",
      triggers: ["quick facts about", "facts on", "tell me facts about", "interesting facts about"],
      action: async (params) => {
        if (!params) {
          return "Please specify what you'd like to learn facts about."
        }

        const searchService = getSearchService()
        if (!searchService.isConfigured()) {
          return "Search functionality is not configured. Please add a SERPAPI_KEY to your environment variables."
        }

        try {
          // Formulate a facts query
          const factsQuery = `interesting facts about ${params}`

          // Save to search history
          const historyService = getSearchHistoryService()
          historyService.addToHistory(factsQuery)

          const answer = await searchService.getAnswer(factsQuery)
          return `Here are some facts about ${params}:\n\n${answer}`
        } catch (error) {
          console.error("Error executing facts search command:", error)
          return `I encountered an error while searching for facts about "${params}". Please try again later.`
        }
      },
      description: "Provides interesting facts about a topic",
    })

    // Search and summarize
    this.registerCommand({
      name: "Summarize Topic",
      triggers: ["summarize", "give me a summary of", "brief overview of", "tldr"],
      action: async (params) => {
        if (!params) {
          return "Please specify what you'd like me to summarize."
        }

        const searchService = getSearchService()
        if (!searchService.isConfigured()) {
          return "Search functionality is not configured. Please add a SERPAPI_KEY to your environment variables."
        }

        try {
          // Formulate a summary query
          const summaryQuery = `${params} summary overview`

          // Save to search history
          const historyService = getSearchHistoryService()
          historyService.addToHistory(summaryQuery)

          const answer = await searchService.getAnswer(summaryQuery)
          return `Here's a summary of ${params}:\n\n${answer}`
        } catch (error) {
          console.error("Error executing summary search command:", error)
          return `I encountered an error while summarizing "${params}". Please try again later.`
        }
      },
      description: "Provides a summary of a topic",
    })

    // Search for reviews
    this.registerCommand({
      name: "Product Reviews",
      triggers: ["reviews for", "review of", "what do people think of", "is it good"],
      action: async (params) => {
        if (!params) {
          return "Please specify what product you'd like reviews for."
        }

        const searchService = getSearchService()
        if (!searchService.isConfigured()) {
          return "Search functionality is not configured. Please add a SERPAPI_KEY to your environment variables."
        }

        try {
          // Formulate a review query
          const reviewQuery = `${params} reviews ratings pros cons`

          // Save to search history
          const historyService = getSearchHistoryService()
          historyService.addToHistory(reviewQuery)

          const answer = await searchService.getAnswer(reviewQuery)
          return `Here are reviews for ${params}:\n\n${answer}`
        } catch (error) {
          console.error("Error executing review search command:", error)
          return `I encountered an error while searching for reviews of "${params}". Please try again later.`
        }
      },
      description: "Searches for product reviews and ratings",
    })

    // Conversational mode commands
    this.registerCommand({
      name: "Start Conversational Mode",
      triggers: [
        "start conversational mode",
        "enable conversational mode",
        "let's have a conversation",
        "talk to me",
        "let's chat",
        "conversation mode",
      ],
      action: () => {
        const voiceService = getVoiceService()
        if (!voiceService) {
          return "Voice service is not available."
        }

        const voiceSettings = getVoiceSettings()

        // Enable conversational mode in settings if not already enabled
        if (!voiceSettings.conversationalMode) {
          saveVoiceSettings({ conversationalMode: true })
        }

        // Start conversational mode
        const started = voiceService.startConversationalMode()
        if (started) {
          return "I've started conversational mode. You can speak naturally, and I'll respond. Just let me know what you need."
        } else {
          return "Failed to start conversational mode. Please check your browser permissions."
        }
      },
      description: "Starts conversational mode for natural back-and-forth conversation",
    })

    this.registerCommand({
      name: "End Conversation",
      triggers: [
        "end conversation",
        "stop conversation",
        "exit conversational mode",
        "disable conversational mode",
        "stop talking",
        "end chat",
      ],
      action: () => {
        const voiceService = getVoiceService()
        if (!voiceService) {
          return "Voice service is not available."
        }

        // If in conversational mode, stop it
        if (voiceService.getIsConversationalMode()) {
          voiceService.stopListening()
          return "I've ended our conversation. Let me know if you need anything else."
        } else {
          return "We're not currently in conversational mode."
        }
      },
      description: "Ends the current conversation",
    })

    // Wake word commands
    this.registerCommand({
      name: "Start Wake Word Detection",
      triggers: ["start wake word detection", "enable wake word", "listen for wake word", "activate wake word"],
      action: () => {
        const voiceService = getVoiceService()
        if (!voiceService) {
          return "Voice service is not available."
        }

        const settings = getVoiceSettings()

        // Enable wake word detection in settings if not already enabled
        if (!settings.wakeWordEnabled) {
          saveVoiceSettings({ wakeWordEnabled: true })
        }

        // Don't start if already listening or in conversational mode
        if (voiceService.getIsListening() || voiceService.getIsConversationalMode()) {
          return "Please stop active listening or conversation mode first before starting wake word detection."
        }

        // Start wake word detection
        const started = voiceService.startWakeWordDetection()
        if (started) {
          return `Wake word detection started. I'm now listening for "${settings.wakeWord}".`
        } else {
          return "Failed to start wake word detection. Please check your browser permissions."
        }
      },
      description: "Starts wake word detection mode",
    })

    this.registerCommand({
      name: "Stop Wake Word Detection",
      triggers: ["stop wake word detection", "disable wake word", "stop listening for wake word"],
      action: () => {
        const voiceService = getVoiceService()
        if (!voiceService) {
          return "Voice service is not available."
        }

        // If wake word detection is active, stop it
        if (voiceService.getIsWakeWordDetectionActive()) {
          voiceService.stopWakeWordDetection()
          return "Wake word detection stopped. I'm no longer listening for the wake word."
        } else {
          return "Wake word detection is not currently active."
        }
      },
      description: "Stops wake word detection mode",
    })

    this.registerCommand({
      name: "Change Wake Word",
      triggers: ["change wake word", "set wake word", "new wake word"],
      action: (params) => {
        if (!params) {
          return "Please specify a new wake word."
        }

        const newWakeWord = params.trim()
        if (newWakeWord.length < 2) {
          return "Wake word must be at least 2 characters long."
        }

        // Update the wake word in settings
        const settings = getVoiceSettings()
        saveVoiceSettings({
          wakeWord: newWakeWord,
          wakeWordEnabled: true, // Also enable wake word detection
        })

        // Restart wake word detection if it was active
        const voiceService = getVoiceService()
        if (voiceService && voiceService.getIsWakeWordDetectionActive()) {
          voiceService.stopWakeWordDetection()
          setTimeout(() => {
            voiceService.startWakeWordDetection()
          }, 300)
        }

        return `Wake word changed to "${newWakeWord}". You can now activate me by saying this word.`
      },
      description: "Changes the wake word",
    })
  }
}

// Create a singleton instance
let commandProcessorInstance: CommandProcessor | null = null

// Get the command processor instance
export function getCommandProcessor(): CommandProcessor {
  if (!commandProcessorInstance) {
    commandProcessorInstance = new CommandProcessor()
  }
  return commandProcessorInstance
}
