// Type definitions for Web Speech API
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList
  resultIndex: number
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

export class SpeechRecognitionService {
  private recognition: any
  private isListening = false
  private onResultCallback: ((text: string, isFinal: boolean) => void) | null = null
  private onEndCallback: (() => void) | null = null
  private onErrorCallback: ((error: any) => void) | null = null

  constructor() {
    // Initialize speech recognition
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        window.SpeechRecognition ||
        window.webkitSpeechRecognition ||
        window.mozSpeechRecognition ||
        window.msSpeechRecognition

      if (SpeechRecognition) {
        this.recognition = new SpeechRecognition()
        this.configureRecognition()
      } else {
        console.error("Speech recognition not supported in this browser")
      }
    }
  }

  // Configure recognition settings
  private configureRecognition(): void {
    if (!this.recognition) return

    this.recognition.continuous = false
    this.recognition.interimResults = true
    this.recognition.lang = "en-US"

    this.recognition.onresult = this.handleResult.bind(this)
    this.recognition.onend = this.handleEnd.bind(this)
    this.recognition.onerror = this.handleError.bind(this)
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

    try {
      this.recognition.start()
      this.isListening = true
      return true
    } catch (error) {
      console.error("Error starting speech recognition:", error)
      return false
    }
  }

  // Stop listening
  public stopListening(): void {
    if (this.isListening && this.isSupported()) {
      try {
        this.recognition.stop()
        this.isListening = false
      } catch (error) {
        console.error("Error stopping speech recognition:", error)
      }
    }
  }

  // Check if currently listening
  public getIsListening(): boolean {
    return this.isListening
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

  // Handle speech recognition results
  private handleResult(event: SpeechRecognitionEvent): void {
    if (!event.results) return

    const result = event.results[event.resultIndex]
    if (!result) return

    const transcript = result[0].transcript
    const isFinal = result.isFinal

    if (this.onResultCallback) {
      this.onResultCallback(transcript, isFinal)
    }
  }

  // Handle speech recognition end
  private handleEnd(): void {
    this.isListening = false

    if (this.onEndCallback) {
      this.onEndCallback()
    }
  }

  // Handle speech recognition errors
  private handleError(event: any): void {
    this.isListening = false

    if (this.onErrorCallback) {
      this.onErrorCallback(event)
    }
  }
}

// Create a singleton instance
let speechRecognitionServiceInstance: SpeechRecognitionService | null = null

// Get the speech recognition service instance
export function getSpeechRecognitionService(): SpeechRecognitionService | null {
  if (typeof window !== "undefined") {
    if (!speechRecognitionServiceInstance) {
      speechRecognitionServiceInstance = new SpeechRecognitionService()
    }
    return speechRecognitionServiceInstance
  }
  return null
}
