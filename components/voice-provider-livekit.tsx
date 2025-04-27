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

// Audio processing constants for noise cancellation
const NOISE_REDUCTION_AMOUNT = 0.7 // Amount of noise reduction (0-1)
const ECHO_CANCELLATION_STRENGTH = 0.8 // Strength of echo cancellation (0-1)
const AUDIO_DUCKING_AMOUNT = 0.85 // Amount to reduce mic sensitivity during playback (0-1)

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
  const [isDucking, setIsDucking] = useState(false) // Track if audio ducking is active
  
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
  const gainNodeRef = useRef<GainNode | null>(null) // Gain node for audio ducking
  const noiseReducerRef = useRef<any>(null) // Noise reducer node
  const echoCancellationRef = useRef<boolean>(false) // Track if echo cancellation is active
  
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
      
      // Apply audio ducking when Jarvis is speaking to reduce mic sensitivity
      applyAudioDucking(true)
    } else {
      // Remove audio ducking when Jarvis stops speaking
      applyAudioDucking(false)
    }
  }, [isSpeaking, isInitialized])
  
  // Apply audio ducking to reduce microphone sensitivity during playback
  const applyAudioDucking = (enable: boolean) => {
    if (!gainNodeRef.current || !audioContextRef.current) return
    
    setIsDucking(enable)
    
    // When Jarvis is speaking, reduce microphone sensitivity
    if (enable) {
      // Gradually reduce gain to avoid abrupt changes
      const now = audioContextRef.current.currentTime
      gainNodeRef.current.gain.cancelScheduledValues(now)
      gainNodeRef.current.gain.setValueAtTime(gainNodeRef.current.gain.value, now)
      gainNodeRef.current.gain.linearRampToValueAtTime(1 - AUDIO_DUCKING_AMOUNT, now + 0.1)
      
      // Increase VAD threshold during speech to prevent false triggers
      if (vadRef.current) {
        vadRef.current.adjustThreshold(0.15) // Higher threshold during playback
      }
      
      // Enable stronger echo cancellation during playback
      echoCancellationRef.current = true
    } else {
      // Gradually restore gain when Jarvis stops speaking
      const now = audioContextRef.current.currentTime
      gainNodeRef.current.gain.cancelScheduledValues(now)
      gainNodeRef.current.gain.setValueAtTime(gainNodeRef.current.gain.value, now)
      gainNodeRef.current.gain.linearRampToValueAtTime(1.0, now + 0.2)
      
      // Restore normal VAD threshold
      if (vadRef.current) {
        vadRef.current.adjustThreshold(0.08) // Normal threshold
      }
      
      // Return to normal echo cancellation
      echoCancellationRef.current = false
    }
  }
  
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
          sampleRate: 48000, // Higher sample rate for better quality
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
        
        // Create advanced audio processing chain for noise cancellation
        
        // 1. Create gain node for audio ducking
        const gainNode = audioContextRef.current.createGain()
        gainNodeRef.current = gainNode
        gainNode.gain.value = 1.0 // Start with normal gain
        
        // 2. Add noise reduction if Web Audio API supports it
        let processedOutput: AudioNode = source
        if (audioContextRef.current.createDynamicsCompressor) {
          // Create dynamics compressor for noise reduction
          const compressor = audioContextRef.current.createDynamicsCompressor()
          compressor.threshold.value = -50 + (NOISE_REDUCTION_AMOUNT * 20) // Adjust threshold based on noise reduction amount
          compressor.knee.value = 40 * NOISE_REDUCTION_AMOUNT
          compressor.ratio.value = 12
          compressor.attack.value = 0
          compressor.release.value = 0.25
          
          // Connect source to compressor
          source.connect(compressor)
          processedOutput = compressor
          noiseReducerRef.current = compressor
        } else {
          // If compressor not available, connect source directly to gain node
          source.connect(gainNode)
        }
        
        // 3. Connect to gain node for audio ducking (if not already connected)
        if (processedOutput !== source) {
          processedOutput.connect(gainNode)
        }
        
        // 4. Connect to analyser for visualization and VAD
        gainNode.connect(analyser)
        
        // Start monitoring volume with optimized buffer and reduced latency
        const dataArray = new Uint8Array(analyser.frequencyBinCount)
        
        // Create a connection quality monitor
        let connectionQuality = 'good'
        let lastConnectionCheck = Date.now()
        const connectionCheckInterval = 5000 // Check every 5 seconds
        
        const updateVolume = () => {
          if (!analyserRef.current) return
          
          // Get frequency data for volume visualization
          analyserRef.current.getByteFrequencyData(dataArray)
          
          // Calculate RMS volume with optimization
          let sum = 0
          // Process only a subset of the data for efficiency
          const stride = 4 // Skip more samples for even faster processing
          for (let i = 0; i < dataArray.length; i += stride) {
            sum += dataArray[i] * dataArray[i]
          }
          const samplesProcessed = Math.ceil(dataArray.length / stride)
          const rms = Math.sqrt(sum / samplesProcessed)
          const normalizedVolume = rms / 128 // Normalize to 0-1
          
          setCurrentVolume(normalizedVolume)
          onVolumeChange?.(normalizedVolume)
          
          // Process audio data with VAD if available
          if (vadRef.current && isListening && !isDucking) { // Don't process VAD during ducking
            const audioData = new Float32Array(analyser.frequencyBinCount)
            analyserRef.current.getFloatTimeDomainData(audioData)
            
            const isSpeaking = vadRef.current.processAudioData(audioData)
            if (isSpeaking) {
              onSpeechStart?.()
            }
          }
          
          // Check connection quality periodically
          const now = Date.now()
          if (now - lastConnectionCheck > connectionCheckInterval) {
            lastConnectionCheck = now
            
            // Get connection quality from LiveKit client
            if (livekitClientRef.current) {
              // Safely check if getConnectionQuality method exists
              const quality = livekitClientRef.current.getConnectionQuality ? 
                livekitClientRef.current.getConnectionQuality() : 'good'
              
              // Adjust audio processing based on connection quality
              if (quality !== connectionQuality) {
                connectionQuality = quality
                
                if (quality === 'poor') {
                  // Reduce audio quality to maintain low latency
                  if (analyserRef.current) {
                    analyserRef.current.fftSize = 256 // Smallest FFT size for lowest latency
                    analyserRef.current.smoothingTimeConstant = 0.1 // Less smoothing
                  }
                  
                  // Increase VAD threshold to reduce false positives
                  if (vadRef.current) {
                    vadRef.current.adjustThreshold(0.12)
                  }
                } else if (quality === 'good' || quality === 'excellent') {
                  // Restore normal audio quality
                  if (analyserRef.current) {
                    analyserRef.current.fftSize = 512
                    analyserRef.current.smoothingTimeConstant = 0.2
                  }
                  
                  // Restore normal VAD threshold
                  if (vadRef.current && !isDucking) {
                    vadRef.current.adjustThreshold(0.08)
                  }
                }
              }
            }
          }
          
          // Use optimized animation frame timing
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
          <div>Audio Ducking: {isDucking ? "Active" : "Inactive"}</div>
          <div>Echo Cancellation: {echoCancellationRef.current ? "Enhanced" : "Normal"}</div>
          <div>Listening: {isListening ? "Yes" : "No"}</div>
          <div>Speaking: {isSpeaking ? "Yes" : "No"}</div>
        </div>
      )}
    </div>
  )
}