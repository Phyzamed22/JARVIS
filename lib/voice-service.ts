// Type definitions for Web Speech API
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList
  resultIndex: number
  interpretation: any
}

interface SpeechRecognitionResultList {
  [index: number]: SpeechRecognitionResult
  length: number
}

interface SpeechRecognitionResult {
  [index: number]: SpeechRecognitionAlternative
  length: number
  isFinal: boolean
}

interface SpeechRecognitionAlternative {
  transcript: string
  confidence: number
}

// Define the SpeechRecognition type
declare global {
  interface Window {
    SpeechRecognition: any
    webkitSpeechRecognition: any
    mozSpeechRecognition: any
    msSpeechRecognition: any
  }
}

import { getVoiceSettings, getVoiceByName } from "./voice-settings-service"

// Voice service class
export class VoiceService {
  private recognition: any
  private wakeWordRecognition: any
  private isListening = false
  private continuousListeningActive = false
  private conversationalModeActive = false
  private wakeWordListeningActive = false
  private silenceTimer: ReturnType<typeof setTimeout> | null = null
  private conversationSilenceTimer: ReturnType<typeof setTimeout> | null = null
  private wakeWordDetector: any = null
  private onResultCallback: ((text: string, isFinal: boolean) => void) | null = null
  private onEndCallback: (() => void) | null = null
  private onErrorCallback: ((error: any) => void) | null = null
  private onWakeWordCallback: (() => void) | null = null
  private onSilenceCallback: (() => void) | null = null
  private synthesis: SpeechSynthesis
  private audioContext: AudioContext | null = null
  private audioEffectsNode: any = null
  private currentUtterance: SpeechSynthesisUtterance | null = null
  private isSpeaking = false
  private lastUserQuery = ""
  private conversationActive = false
  private wakeWordConfidenceThreshold = 0.6 // Confidence threshold for wake word detection

  constructor() {
    // Initialize speech recognition
    const SpeechRecognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition ||
      window.mozSpeechRecognition ||
      window.msSpeechRecognition

    if (SpeechRecognition) {
      // Main recognition instance for commands and conversation
      this.recognition = new SpeechRecognition()
      this.configureRecognition(this.recognition)

      this.recognition.onresult = this.handleResult.bind(this)
      this.recognition.onend = this.handleEnd.bind(this)
      this.recognition.onerror = this.handleError.bind(this)

      // Separate recognition instance for wake word detection
      this.wakeWordRecognition = new SpeechRecognition()
      this.configureWakeWordRecognition(this.wakeWordRecognition)

      this.wakeWordRecognition.onresult = this.handleWakeWordResult.bind(this)
      this.wakeWordRecognition.onend = this.handleWakeWordEnd.bind(this)
      this.wakeWordRecognition.onerror = this.handleWakeWordError.bind(this)
    } else {
      console.error("Speech recognition not supported in this browser")
    }

    // Initialize speech synthesis
    this.synthesis = window.speechSynthesis

    // Initialize audio context for effects (if supported)
    if (typeof window !== "undefined" && window.AudioContext) {
      try {
        this.audioContext = new AudioContext()
      } catch (error) {
        console.error("AudioContext not supported:", error)
      }
    }
  }

  // Configure recognition based on settings
  private configureRecognition(recognitionInstance: any): void {
    if (!recognitionInstance) return

    const settings = getVoiceSettings()

    recognitionInstance.continuous = settings.continuousListening || this.conversationalModeActive
    recognitionInstance.interimResults = true
    recognitionInstance.lang = settings.recognitionLanguage
  }

  // Configure wake word recognition
  private configureWakeWordRecognition(recognitionInstance: any): void {
    if (!recognitionInstance) return

    const settings = getVoiceSettings()

    // Wake word recognition should always be continuous
    recognitionInstance.continuous = true
    recognitionInstance.interimResults = true
    recognitionInstance.lang = settings.recognitionLanguage

    // Set a shorter max speech time for wake word detection to conserve resources
    recognitionInstance.maxAlternatives = 1
  }

  // Check if speech recognition is supported
  public isSupported(): boolean {
    return !!this.recognition
  }

  // Start listening
  public startListening(): boolean {
    if (!this.isSupported()) {
      return false
    }

    const settings = getVoiceSettings()

    // Don't start if recognition is disabled in settings
    if (!settings.recognitionEnabled) {
      return false
    }

    // Update configuration before starting
    this.configureRecognition(this.recognition)

    try {
      this.recognition.start()
      this.isListening = true

      // Set up auto-stop after silence if enabled
      if (settings.autoStopAfterSilence) {
        this.setupSilenceDetection(settings.silenceThreshold)
      }

      return true
    } catch (error) {
      console.error("Error starting speech recognition:", error)
      return false
    }
  }

  // Start continuous listening mode
  public startContinuousListening(): boolean {
    if (!this.isSupported()) {
      return false
    }

    const settings = getVoiceSettings()

    // Don't start if recognition is disabled in settings
    if (!settings.recognitionEnabled) {
      return false
    }

    // Force continuous mode
    this.recognition.continuous = true

    try {
      this.recognition.start()
      this.isListening = true
      this.continuousListeningActive = true
      return true
    } catch (error) {
      console.error("Error starting continuous listening:", error)
      return false
    }
  }

  // Start conversational mode
  public startConversationalMode(): boolean {
    if (!this.isSupported()) {
      return false
    }

    const settings = getVoiceSettings()

    // Don't start if recognition is disabled in settings
    if (!settings.recognitionEnabled) {
      return false
    }

    // Force continuous mode and set conversational mode flag
    this.recognition.continuous = true
    this.conversationalModeActive = true
    this.conversationActive = true

    try {
      this.recognition.start()
      this.isListening = true
      this.continuousListeningActive = true
      return true
    } catch (error) {
      console.error("Error starting conversational mode:", error)
      this.conversationalModeActive = false
      this.conversationActive = false
      return false
    }
  }

  // Start wake word detection
  public startWakeWordDetection(): boolean {
    if (!this.isSupported()) {
      return false
    }

    const settings = getVoiceSettings()

    // Don't start if recognition or wake word is disabled in settings
    if (!settings.recognitionEnabled || !settings.wakeWordEnabled) {
      return false
    }

    // Configure and start wake word recognition
    this.configureWakeWordRecognition(this.wakeWordRecognition)

    try {
      this.wakeWordRecognition.start()
      this.wakeWordListeningActive = true
      console.log("Wake word detection started, listening for:", settings.wakeWord)
      return true
    } catch (error) {
      console.error("Error starting wake word detection:", error)
      this.wakeWordListeningActive = false
      return false
    }
  }

  // Stop listening
  public stopListening(): void {
    if (this.isListening && this.isSupported()) {
      try {
        this.recognition.stop()
        this.isListening = false
        this.continuousListeningActive = false
        this.conversationalModeActive = false
        this.conversationActive = false

        // Clear any silence detection timer
        if (this.silenceTimer) {
          clearTimeout(this.silenceTimer)
          this.silenceTimer = null
        }

        // Clear conversation silence timer
        if (this.conversationSilenceTimer) {
          clearTimeout(this.conversationSilenceTimer)
          this.conversationSilenceTimer = null
        }
      } catch (error) {
        console.error("Error stopping speech recognition:", error)
      }
    }
  }

  // Stop wake word detection
  public stopWakeWordDetection(): void {
    if (this.wakeWordListeningActive && this.isSupported()) {
      try {
        this.wakeWordRecognition.stop()
        this.wakeWordListeningActive = false
        console.log("Wake word detection stopped")
      } catch (error) {
        console.error("Error stopping wake word detection:", error)
      }
    }
  }

  // Setup silence detection to auto-stop listening
  private setupSilenceDetection(threshold: number): void {
    // Clear any existing timer
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer)
    }

    // Set up a timer that will stop listening after the threshold of silence
    this.silenceTimer = setTimeout(() => {
      // Only stop if we're not in continuous or conversational mode
      if (this.isListening && !this.continuousListeningActive && !this.conversationalModeActive) {
        this.stopListening()
      }
    }, threshold * 1000)
  }

  // Setup conversation silence detection
  private setupConversationSilenceDetection(threshold: number): void {
    // Clear any existing timer
    if (this.conversationSilenceTimer) {
      clearTimeout(this.conversationSilenceTimer)
    }

    // Only set up if we're in conversational mode and not speaking
    if (!this.conversationalModeActive || this.isSpeaking) {
      return
    }

    // Set up a timer that will trigger the silence callback after the threshold
    this.conversationSilenceTimer = setTimeout(() => {
      if (this.conversationalModeActive && this.onSilenceCallback && !this.isSpeaking) {
        this.onSilenceCallback()
      }
    }, threshold * 1000)
  }

  // Reset silence detection timer (called when speech is detected)
  private resetSilenceDetection(): void {
    const settings = getVoiceSettings()

    if (settings.autoStopAfterSilence && this.isListening) {
      this.setupSilenceDetection(settings.silenceThreshold)
    }

    // Also reset conversation silence detection
    if (this.conversationalModeActive) {
      this.setupConversationSilenceDetection(5) // 5 seconds of silence in conversation mode
    }
  }

  // Check if currently listening
  public getIsListening(): boolean {
    return this.isListening
  }

  // Check if in continuous listening mode
  public getIsContinuousListening(): boolean {
    return this.continuousListeningActive
  }

  // Check if in conversational mode
  public getIsConversationalMode(): boolean {
    return this.conversationalModeActive
  }

  // Check if wake word detection is active
  public getIsWakeWordDetectionActive(): boolean {
    return this.wakeWordListeningActive
  }

  // Check if conversation is active
  public getIsConversationActive(): boolean {
    return this.conversationActive
  }

  // Set conversation active state
  public setConversationActive(active: boolean): void {
    this.conversationActive = active
  }

  // Get last user query
  public getLastUserQuery(): string {
    return this.lastUserQuery
  }

  // Set last user query
  public setLastUserQuery(query: string): void {
    this.lastUserQuery = query
  }

  // Set callback for speech recognition results
  public onResult(callback: (text: string, isFinal: boolean) => void): void {
    this.onResultCallback = callback
  }

  // Set callback for when speech recognition ends
  public onEnd(callback: () => void): void {
    this.onEndCallback = callback
  }

  // Set callback for speech recognition errors
  public onError(callback: (error: any) => void): void {
    this.onErrorCallback = callback
  }

  // Set callback for wake word detection
  public onWakeWord(callback: () => void): void {
    this.onWakeWordCallback = callback
  }

  // Set callback for silence detection in conversation mode
  public onSilence(callback: () => void): void {
    this.onSilenceCallback = callback
  }

  // Pre-initialize synthesis settings
  private initializeSynthesis(): SpeechSynthesisUtterance | null {
    if (!this.synthesis) {
      console.error("Speech synthesis not supported in this browser")
      return null
    }

    const settings = getVoiceSettings()
    if (!settings.synthesisEnabled) return null

    const utterance = new SpeechSynthesisUtterance()
    utterance.lang = settings.recognitionLanguage
    utterance.rate = settings.synthesisRate
    utterance.pitch = settings.synthesisPitch
    utterance.volume = settings.synthesisVolume

    const voice = getVoiceByName(settings.synthesisVoice)
    if (voice) utterance.voice = voice

    return utterance
  }

  // Speak text using speech synthesis
  public speak(text: string, onEnd?: () => void): void {
    // Get pre-initialized utterance
    const utterance = this.initializeSynthesis()
    if (!utterance) {
      if (onEnd) onEnd()
      return
    }

    // Cancel any ongoing speech
    this.stopSpeaking()

    // Set speaking state
    this.isSpeaking = true

    // Set the text
    utterance.text = text
    this.currentUtterance = utterance

    // Set up end callback
    utterance.onend = () => {
      this.isSpeaking = false

      // If in conversational mode, reset the silence timer after speaking
      if (this.conversationalModeActive) {
        this.setupConversationSilenceDetection(5) // 5 seconds of silence after speaking
      }

      if (onEnd) onEnd()
    }

    // Apply audio effects if enabled and supported
    if (this.audioContext && (settings.audioEffects.echo || settings.audioEffects.reverb)) {
      this.applyAudioEffects(utterance, settings.audioEffects)
    } else {
      // Standard speech without effects
      this.synthesis.speak(utterance)
    }
  }

  // Stop any ongoing speech
  public stopSpeaking(): void {
    if (this.synthesis) {
      this.synthesis.cancel()
      this.currentUtterance = null
      this.isSpeaking = false
    }
  }

  // Check if currently speaking
  public getIsSpeaking(): boolean {
    return this.isSpeaking
  }

  // Apply audio effects to speech synthesis
  private applyAudioEffects(utterance: SpeechSynthesisUtterance, effects: { echo: boolean; reverb: boolean }): void {
    // This is a simplified implementation
    // In a real implementation, you would need to use the Web Audio API to create
    // audio nodes for echo and reverb effects, which is quite complex

    // For now, we'll just add a note to the console and speak normally
    console.log("Audio effects requested but not fully implemented:", effects)
    this.synthesis.speak(utterance)
  }

  // Handle speech recognition results
  private async handleResult(event: SpeechRecognitionEvent): Promise<void> {
    if (!event.results) return

    const result = event.results[event.resultIndex]
    if (!result) return

    const transcript = result[0].transcript
    const isFinal = result.isFinal

    // Reset silence detection since we received speech
    this.resetSilenceDetection()

    // Check for wake word if enabled
    const settings = getVoiceSettings()
    if (settings.wakeWordEnabled && isFinal && transcript.toLowerCase().includes(settings.wakeWord.toLowerCase())) {
      if (this.onWakeWordCallback) {
        this.onWakeWordCallback()
      }
    }

    if (this.onResultCallback) {
      this.onResultCallback(transcript, isFinal)
    }

    // If final result and in conversational mode, store the query
    if (isFinal && this.conversationalModeActive) {
      this.lastUserQuery = transcript
      
      // Handle Google search commands
      if (transcript.toLowerCase().startsWith('search for') || 
          transcript.toLowerCase().startsWith('google')) {
        const query = transcript.toLowerCase().startsWith('search for') ? 
          transcript.slice('search for'.length).trim() : 
          transcript.slice('google'.length).trim()
          
        if (query) {
          const { searchGoogle } = await import('./search-google')
          await searchGoogle(query)
        }
      }
    }
  }

  // Handle wake word recognition results
  private handleWakeWordResult(event: SpeechRecognitionEvent): void {
    if (!event.results) return

    const result = event.results[event.resultIndex]
    if (!result) return

    const transcript = result[0].transcript.toLowerCase()
    const confidence = result[0].confidence
    const isFinal = result.isFinal

    // Only process final results for wake word detection
    if (!isFinal) return

    const settings = getVoiceSettings()
    const wakeWord = settings.wakeWord.toLowerCase()

    // Check if the transcript contains the wake word with sufficient confidence
    if (transcript.includes(wakeWord) && confidence >= this.wakeWordConfidenceThreshold) {
      console.log(`Wake word detected: "${transcript}" (confidence: ${confidence.toFixed(2)})`)

      // Stop wake word detection
      this.stopWakeWordDetection()

      // Trigger the wake word callback
      if (this.onWakeWordCallback) {
        this.onWakeWordCallback()
      }
    }
  }

  // Handle speech recognition end
  private handleEnd(): void {
    this.isListening = false

    // If in continuous or conversational mode, restart listening
    if (this.continuousListeningActive || this.conversationalModeActive) {
      try {
        this.recognition.start()
        this.isListening = true
      } catch (error) {
        console.error("Error restarting continuous recognition:", error)
        this.continuousListeningActive = false
        this.conversationalModeActive = false
      }
    }

    if (this.onEndCallback) {
      this.onEndCallback()
    }
  }

  // Handle wake word recognition end
  private handleWakeWordEnd(): void {
    this.wakeWordListeningActive = false

    // Automatically restart wake word detection if it was active
    if (getVoiceSettings().wakeWordEnabled) {
      try {
        // Small delay to prevent rapid restarts
        setTimeout(() => {
          if (!this.isListening && !this.conversationalModeActive) {
            this.startWakeWordDetection()
          }
        }, 300)
      } catch (error) {
        console.error("Error restarting wake word detection:", error)
      }
    }
  }

  // Handle speech recognition errors
  private handleError(event: any): void {
    this.isListening = false
    this.continuousListeningActive = false
    this.conversationalModeActive = false

    if (this.onErrorCallback) {
      this.onErrorCallback(event)
    }
  }

  // Handle wake word recognition errors
  private handleWakeWordError(event: any): void {
    this.wakeWordListeningActive = false
    console.error("Wake word detection error:", event)

    // Restart wake word detection after errors (except no-speech errors)
    if (event.error !== "no-speech" && getVoiceSettings().wakeWordEnabled) {
      setTimeout(() => {
        if (!this.isListening && !this.conversationalModeActive) {
          this.startWakeWordDetection()
        }
      }, 1000)
    }
  }
}

// Create a singleton instance
let voiceServiceInstance: VoiceService | null = null

// Get the voice service instance
export function getVoiceService(): VoiceService | null {
  if (typeof window !== "undefined") {
    if (!voiceServiceInstance) {
      voiceServiceInstance = new VoiceService()
    }
    return voiceServiceInstance
  }
  return null
}
