"use client"

import { useEffect, useRef, useState } from "react"
import { useToast } from "@/components/ui/use-toast"
import { getVoiceSettings } from "@/lib/voice-settings-service"
import { 
  initializeLiveKit, 
  getLiveKitClient, 
  getLiveKitServer, 
  getVoiceActivityDetection, 
  getWakeWordDetection,
  disconnectLiveKit
} from "@/lib/livekit"

interface VoiceProviderLiveKitProps {
  onSpeechStart?: () => void
  onSpeechEnd?: (transcript: string) => void
  onWakeWord?: () => void
  onInterruption?: (transcript: string) => void
  onVolumeChange?: (volume: number) => void
  isListening?: boolean
  isSpeaking?: boolean
  userId?: string
}

export function VoiceProviderLiveKit({
  onSpeechStart,
  onSpeechEnd,
  onWakeWord,
  onInterruption,
  onVolumeChange,
  isListening = false,
  isSpeaking = false,
  userId = "default-user",
}: VoiceProviderLiveKitProps) {
  // State
  const [isInitialized, setIsInitialized] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [roomName, setRoomName] = useState<string>("") 
  const [wakeWordActive, setWakeWordActive] = useState(false)
  const [currentVolume, setCurrentVolume] = useState(0)
  
  // Refs
  const livekitClientRef = useRef(getLiveKitClient())
  const vadRef = useRef(getVoiceActivityDetection())
  const wakeWordRef = useRef(getWakeWordDetection({ userId }))
  const speechRecognitionRef = useRef<SpeechRecognition | null>(null)
  const transcriptRef = useRef<string>("") 
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const micStreamRef = useRef<MediaStream | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  
  const { toast } = useToast()

  // Initialize LiveKit and speech recognition
  useEffect(() => {
    const settings = getVoiceSettings()
    
    const initVoice = async () => {
      try {
        // Initialize LiveKit
        const initialized = await initializeLiveKit(userId)
        if (!initialized) {
          console.warn("LiveKit initialization failed or is disabled in settings")
          setIsInitialized(false)
          return
        }
        
        setIsInitialized(true)
        setIsConnected(true)
        setRoomName(`${settings.livekitRoomPrefix || 'jarvis'}-${userId}`)
        
        // Initialize Web Speech API for transcription
        if (typeof window !== "undefined") {
          const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
          if (SpeechRecognition) {
            speechRecognitionRef.current = new SpeechRecognition()
            speechRecognitionRef.current.continuous = true
            speechRecognitionRef.current.interimResults = true
            speechRecognitionRef.current.lang = settings.recognitionLanguage || "en-US"
            
            speechRecognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
              if (!event.results || event.results.length === 0) return
              
              const result = event.results[event.resultIndex]
              if (!result) return
              
              const transcript = result[0].transcript
              const confidence = result[0].confidence
              const isFinal = result.isFinal
              
              transcriptRef.current = transcript
              
              // Check for wake word if enabled
              if (wakeWordActive && wakeWordRef.current) {
                const detected = wakeWordRef.current.processTranscript(transcript, confidence)
                if (detected) {
                  setWakeWordActive(false)
                  onWakeWord?.()
                }
              }
              
              // If final result and we're listening, send the transcript
              if (isFinal && isListening) {
                onSpeechEnd?.(transcript)
              }
              
              // If speaking and interruption is enabled, this might be an interruption
              if (isSpeaking && settings.livekitInterruptionEnabled) {
                onInterruption?.(transcript)
              }
            }
            
            speechRecognitionRef.current.onerror = (event: SpeechRecognitionErrorEvent) => {
              console.error("Speech recognition error:", event.error)
              if (event.error !== "no-speech") {
                toast({
                  title: "Speech Recognition Error",
                  description: `Error: ${event.error}. Please try again.`,
                  variant: "destructive",
                })
              }
            }
            
            // Start speech recognition if listening is enabled
            if (isListening) {
              startSpeechRecognition()
            }
          } else {
            toast({
              title: "Speech Recognition Not Supported",
              description: "Your browser doesn't support speech recognition. Please try Chrome or Edge.",
              variant: "destructive",
            })
          }
        }
        
        // Setup audio monitoring for volume visualization
        setupAudioMonitoring()
        
        // Start wake word detection if enabled
        if (settings.wakeWordEnabled) {
          startWakeWordDetection()
        }
      } catch (error) {
        console.error("Error initializing voice provider:", error)
        toast({
          title: "Voice Provider Error",
          description: "Could not initialize voice capabilities. Please try again.",
          variant: "destructive",
        })
      }
    }
    
    initVoice()
    
    // Cleanup function
    return () => {
      cleanupResources()
    }
  }, [userId, toast])
  
  // Handle changes in listening state
  useEffect(() => {
    if (isInitialized) {
      if (isListening) {
        startSpeechRecognition()
      } else {
        stopSpeechRecognition()
      }
    }
  }, [isListening, isInitialized])
  
  // Handle changes in speaking state
  useEffect(() => {
    // If we're speaking, make sure we're monitoring for interruptions
    if (isInitialized && isSpeaking) {
      const settings = getVoiceSettings()
      if (settings.livekitInterruptionEnabled) {
        startSpeechRecognition()
      }
    }
  }, [isSpeaking, isInitialized])
  
  // Setup audio monitoring for volume visualization and VAD
  const setupAudioMonitoring = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.warn("getUserMedia not supported")
        return
      }
      
      // Stop any existing stream
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach((track) => track.stop())
      }
      
      // Get microphone access with optimized settings
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          // Add latency hint to reduce processing delay
          latency: 0.01,
          sampleRate: 44100, // Higher sample rate for better quality
          channelCount: 1, // Mono is sufficient and more efficient
        },
      })
      micStreamRef.current = stream
      
      // Setup audio context and analyser
      try {
        // Check if AudioContext exists and is not closed
        if (!audioContextRef.current || audioContextRef.current.state === "closed") {
          // Create audio context with lower latency settings
          const contextOptions = {
            latencyHint: 'interactive',
            sampleRate: 44100
          }
          audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)(contextOptions)
        } else if (audioContextRef.current.state === "suspended") {
          await audioContextRef.current.resume()
        }
        
        const analyser = audioContextRef.current.createAnalyser()
        analyserRef.current = analyser
        // Reduce FFT size for faster processing
        analyser.fftSize = 512 // Smaller buffer size reduces latency
        analyser.smoothingTimeConstant = 0.3 // Less smoothing for faster response
        
        const source = audioContextRef.current.createMediaStreamSource(stream)
        source.connect(analyser)
        
        // Start monitoring volume with optimized buffer
        const dataArray = new Uint8Array(analyser.frequencyBinCount)
        
        const updateVolume = () => {
          if (!analyserRef.current) return
          
          analyserRef.current.getByteFrequencyData(dataArray)
          
          // Calculate RMS volume with optimization
          let sum = 0
          // Process only a subset of the data for efficiency
          const stride = 2 // Skip every other sample
          for (let i = 0; i < dataArray.length; i += stride) {
            sum += dataArray[i] * dataArray[i]
          }
          const samplesProcessed = Math.ceil(dataArray.length / stride)
          const rms = Math.sqrt(sum / samplesProcessed)
          const normalizedVolume = rms / 128 // Normalize to 0-1
          
          setCurrentVolume(normalizedVolume)
          onVolumeChange?.(normalizedVolume)
          
          // Process audio data with VAD if available
          if (vadRef.current && isListening) {
            const audioData = new Float32Array(analyser.frequencyBinCount)
            analyserRef.current.getFloatTimeDomainData(audioData)
            
            const isSpeaking = vadRef.current.processAudioData(audioData)
            if (isSpeaking) {
              onSpeechStart?.()
            }
          }
          
          animationFrameRef.current = requestAnimationFrame(updateVolume)
        }
        
        updateVolume()
      } catch (error) {
        console.error("Error setting up audio context:", error)
        toast({
          title: "Audio Processing Error",
          description: "There was an error setting up audio processing. Please refresh the page.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error setting up audio monitoring:", error)
      toast({
        title: "Microphone Access Error",
        description: "Could not access your microphone. Please check permissions and try again.",
        variant: "destructive",
      })
    }
  }
  
  // Start speech recognition
  const startSpeechRecognition = () => {
    if (!speechRecognitionRef.current) return
    
    try {
      speechRecognitionRef.current.start()
      console.log("Speech recognition started")
    } catch (error) {
      console.error("Error starting speech recognition:", error)
    }
  }
  
  // Stop speech recognition
  const stopSpeechRecognition = () => {
    if (!speechRecognitionRef.current) return
    
    try {
      speechRecognitionRef.current.stop()
      console.log("Speech recognition stopped")
    } catch (error) {
      console.error("Error stopping speech recognition:", error)
    }
  }
  
  // Start wake word detection
  const startWakeWordDetection = () => {
    if (!wakeWordRef.current) return
    
    wakeWordRef.current.setOnWakeWord(() => {
      onWakeWord?.()
    })
    
    wakeWordRef.current.start()
    setWakeWordActive(true)
    console.log("Wake word detection started")
  }
  
  // Stop wake word detection
  const stopWakeWordDetection = () => {
    if (!wakeWordRef.current) return
    
    wakeWordRef.current.stop()
    setWakeWordActive(false)
    console.log("Wake word detection stopped")
  }
  
  // Cleanup resources
  const cleanupResources = () => {
    // Stop speech recognition
    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.stop()
      } catch (e) {
        console.error("Error stopping speech recognition", e)
      }
    }
    
    // Stop audio monitoring
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((track) => track.stop())
      micStreamRef.current = null
    }
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }
    
    // Disconnect from LiveKit
    disconnectLiveKit()
    
    setIsInitialized(false)
    setIsConnected(false)
  }
  
  return (
    <div className="voice-provider-livekit">
      {/* Optional UI elements for debugging */}
      {process.env.NODE_ENV === "development" && (
        <div className="fixed bottom-4 right-4 bg-black/80 text-white p-2 rounded-md text-xs z-50">
          <div>LiveKit: {isConnected ? "Connected" : "Disconnected"}</div>
          <div>Room: {roomName}</div>
          <div>Wake Word: {wakeWordActive ? "Active" : "Inactive"}</div>
          <div>Volume: {Math.floor(currentVolume * 100)}%</div>
        </div>
      )}
    </div>
  )
}