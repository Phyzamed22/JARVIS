"use client"

import { Room, RoomEvent, LocalParticipant, RemoteParticipant, Track, AudioTrack, ConnectionState } from 'livekit-client'
import { AccessToken } from 'livekit-server-sdk'
import { getVoiceSettings } from './voice-settings-service'

// LiveKit client instance
let livekitClient: Room | null = null

// Voice Activity Detection (VAD) instance
let voiceActivityDetection: any = null

// Wake Word Detection instance
let wakeWordDetection: any = null

// Initialize LiveKit with user ID
export async function initializeLiveKit(userId: string): Promise<boolean> {
  try {
    const settings = getVoiceSettings()
    
    if (!settings.livekitEnabled) {
      console.log('LiveKit is disabled in settings')
      return false
    }
    
    // Check if we have the required environment variables
    // First try to get from settings, then directly from env variables as fallback
    // For cloud-hosted LiveKit server
    const serverUrl = settings.livekitServerUrl || process.env.NEXT_PUBLIC_LIVEKIT_URL || 'wss://yourproject.livekit.cloud'
    const apiKey = settings.livekitApiKey || process.env.NEXT_PUBLIC_LIVEKIT_API_KEY
    const apiSecret = settings.livekitApiSecret || process.env.NEXT_PUBLIC_LIVEKIT_API_SECRET
    
    if (!serverUrl || !apiKey || !apiSecret) {
      console.error('Missing LiveKit configuration. Please check your environment variables.')
      return false
    }
    
    // Update settings with environment variables if needed
    if (!settings.livekitServerUrl && serverUrl) {
      settings.livekitServerUrl = serverUrl
    }
    if (!settings.livekitApiKey && apiKey) {
      settings.livekitApiKey = apiKey
    }
    if (!settings.livekitApiSecret && apiSecret) {
      settings.livekitApiSecret = apiSecret
    }
    
    // Create a new Room instance if it doesn't exist
    if (!livekitClient) {
      livekitClient = new Room({
        // Enable adaptive streaming for better performance
        adaptiveStream: true,
        // Enable dynacast for optimized SFU routing
        dynacast: true,
        // Audio settings can be configured via audioOutput or audioCaptureDefaults
        // but not with audioOptimizationMode as it's not a valid property
      })
      
      // Set up event listeners
      setupRoomEventListeners(livekitClient)
    }
    
    // Generate room name based on user ID and settings
    const roomName = `${settings.livekitRoomPrefix || 'jarvis'}-${userId}`
    
    // Create token for authentication
    const token = await createToken(roomName, userId)
    if (!token) {
      console.error('Failed to create LiveKit token')
      return false
    }
    
    // Connect to the LiveKit room with cloud server URL
    console.log(`Connecting to LiveKit cloud server at: ${settings.livekitServerUrl}`)
    try {
      await livekitClient.connect(settings.livekitServerUrl, token, {
        autoSubscribe: true, // Automatically subscribe to other participants' tracks
        // Use maxRetries for reconnection attempts
        maxRetries: 3,
        // Note: timeoutMs is not a valid option in InternalRoomConnectOptions
      })
      console.log('Successfully connected to LiveKit cloud server')
    } catch (connectionError) {
      console.error('Failed to connect to LiveKit cloud server:', connectionError)
      throw connectionError
    }
    
    // Initialize Voice Activity Detection
    initializeVAD(settings.livekitVadSensitivity)
    
    // Initialize Wake Word Detection if enabled
    if (settings.wakeWordEnabled) {
      initializeWakeWordDetection(settings.wakeWord, settings.wakeWordSensitivity)
    }
    
    return true
  } catch (error) {
    console.error('Error initializing LiveKit:', error)
    return false
  }
}

// Create a LiveKit token for cloud-hosted server
async function createToken(roomName: string, userId: string): Promise<string | null> {
  try {
    const settings = getVoiceSettings()
    
    // Get API key and secret from settings or environment variables
    const apiKey = settings.livekitApiKey || process.env.NEXT_PUBLIC_LIVEKIT_API_KEY || ''
    const apiSecret = settings.livekitApiSecret || process.env.NEXT_PUBLIC_LIVEKIT_API_SECRET || ''
    
    if (!apiKey || !apiSecret) {
      console.error('Missing LiveKit API key or secret')
      return null
    }
    
    console.log('Creating LiveKit token for cloud server')
    
    // Create a new AccessToken with TTL (time-to-live) of 24 hours
    const token = new AccessToken(
      apiKey,
      apiSecret,
      {
        identity: userId,
        name: `JARVIS User ${userId}`,
        ttl: 60 * 60 * 24, // 24 hours in seconds
      }
    )
    
    // Grant permissions to the room
    token.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true, // Can publish audio/video
      canSubscribe: true, // Can subscribe to other participants
      canPublishData: true, // Can publish data
    })
    
    const jwt = token.toJwt()
    console.log('LiveKit token created successfully')
    return jwt
  } catch (error) {
    console.error('Error creating LiveKit token:', error)
    return null
  }
}

// Set up event listeners for the LiveKit room
function setupRoomEventListeners(room: Room) {
  // Connection state changes
  room.on(RoomEvent.ConnectionStateChanged, (state: ConnectionState) => {
    console.log('LiveKit connection state changed:', state)
  })
  
  // When connected to the room
  room.on(RoomEvent.Connected, () => {
    console.log('Connected to LiveKit room:', room.name)
  })
  
  // When disconnected from the room
  room.on(RoomEvent.Disconnected, () => {
    console.log('Disconnected from LiveKit room')
  })
  
  // When a new participant joins
  room.on(RoomEvent.ParticipantConnected, (participant: RemoteParticipant) => {
    console.log('Participant joined:', participant.identity)
  })
  
  // When a participant leaves
  room.on(RoomEvent.ParticipantDisconnected, (participant: RemoteParticipant) => {
    console.log('Participant left:', participant.identity)
  })
  
  // When a new track is published
  room.on(RoomEvent.TrackPublished, (publication, participant) => {
    console.log('Track published:', publication.kind, 'by', participant.identity)
  })
  
  // Error handling
  room.on(RoomEvent.MediaDevicesError, (error: Error) => {
    console.error('Media device error:', error)
  })
}

// Initialize Voice Activity Detection
function initializeVAD(sensitivity: number = 0.5) {
  // Simple VAD implementation using audio processing
  voiceActivityDetection = {
    sensitivity,
    isActive: false,
    volumeThreshold: 0.05 + (1 - sensitivity) * 0.1, // Adjust threshold based on sensitivity
    consecutiveFramesThreshold: Math.floor(5 * sensitivity) + 2, // More sensitive = fewer frames needed
    consecutiveFramesAboveThreshold: 0,
    consecutiveFramesBelowThreshold: 0,
    silenceThreshold: 10, // Number of consecutive silent frames to consider speech ended
    
    // Process audio data to detect voice activity
    processAudioData(audioData: Float32Array): boolean {
      // Calculate RMS volume from audio data
      let sum = 0
      for (let i = 0; i < audioData.length; i++) {
        sum += audioData[i] * audioData[i]
      }
      const rms = Math.sqrt(sum / audioData.length)
      
      // Check if volume is above threshold
      if (rms > this.volumeThreshold) {
        this.consecutiveFramesAboveThreshold++
        this.consecutiveFramesBelowThreshold = 0
        
        // If we have enough consecutive frames above threshold, consider it speech
        if (!this.isActive && this.consecutiveFramesAboveThreshold >= this.consecutiveFramesThreshold) {
          this.isActive = true
          return true // Speech started
        }
      } else {
        this.consecutiveFramesBelowThreshold++
        this.consecutiveFramesAboveThreshold = 0
        
        // If we have enough consecutive frames below threshold, consider it silence
        if (this.isActive && this.consecutiveFramesBelowThreshold >= this.silenceThreshold) {
          this.isActive = false
          return false // Speech ended
        }
      }
      
      return this.isActive
    },
    
    // Reset the VAD state
    reset() {
      this.isActive = false
      this.consecutiveFramesAboveThreshold = 0
      this.consecutiveFramesBelowThreshold = 0
    },
    
    // Set the sensitivity
    setSensitivity(newSensitivity: number) {
      this.sensitivity = newSensitivity
      this.volumeThreshold = 0.05 + (1 - newSensitivity) * 0.1
      this.consecutiveFramesThreshold = Math.floor(5 * newSensitivity) + 2
    }
  }
  
  return voiceActivityDetection
}

// Initialize Wake Word Detection
function initializeWakeWordDetection(wakeWord: string, sensitivity: string) {
  // Convert sensitivity string to numeric threshold
  let confidenceThreshold = 0.6 // Default (medium)
  if (sensitivity === 'low') confidenceThreshold = 0.8
  if (sensitivity === 'high') confidenceThreshold = 0.4
  
  wakeWordDetection = {
    wakeWord: wakeWord.toLowerCase(),
    confidenceThreshold,
    isActive: false,
    onWakeWordCallback: null,
    
    // Process transcript to detect wake word
    processTranscript(transcript: string, confidence: number = 0.7): boolean {
      if (!this.isActive || !transcript) return false
      
      const normalizedTranscript = transcript.toLowerCase()
      
      // Check if transcript contains wake word with sufficient confidence
      if (normalizedTranscript.includes(this.wakeWord) && confidence >= this.confidenceThreshold) {
        console.log(`Wake word detected: "${transcript}" (confidence: ${confidence.toFixed(2)})`)
        
        // Call the callback if set
        if (this.onWakeWordCallback) {
          this.onWakeWordCallback()
        }
        
        return true
      }
      
      return false
    },
    
    // Set the callback for wake word detection
    setOnWakeWord(callback: () => void) {
      this.onWakeWordCallback = callback
    },
    
    // Start wake word detection
    start() {
      this.isActive = true
    },
    
    // Stop wake word detection
    stop() {
      this.isActive = false
    },
    
    // Check if wake word detection is active
    isListening() {
      return this.isActive
    }
  }
  
  return wakeWordDetection
}

// Get the LiveKit client instance
export function getLiveKitClient(): Room | null {
  return livekitClient
}

// Get the LiveKit server instance (for server-side operations)
export function getLiveKitServer() {
  return {
    createToken,
  }
}

// Get the Voice Activity Detection instance
export function getVoiceActivityDetection() {
  return voiceActivityDetection
}

// Get the Wake Word Detection instance
export function getWakeWordDetection({ userId }: { userId: string }) {
  // Initialize if not already done
  if (!wakeWordDetection) {
    const settings = getVoiceSettings()
    initializeWakeWordDetection(settings.wakeWord, settings.wakeWordSensitivity)
  }
  
  return wakeWordDetection
}

// Disconnect from LiveKit
export function disconnectLiveKit() {
  if (livekitClient) {
    livekitClient.disconnect()
    livekitClient = null
  }
  
  // Reset VAD and wake word detection
  if (voiceActivityDetection) {
    voiceActivityDetection.reset()
  }
  
  if (wakeWordDetection) {
    wakeWordDetection.stop()
  }
}

// Update the default voice settings with LiveKit cloud configuration
export function updateLiveKitSettings({
  enabled = true,
  serverUrl = 'wss://yourproject.livekit.cloud', // Default to cloud-hosted server
  apiKey,
  apiSecret,
  roomPrefix = 'jarvis',
  vadSensitivity = 0.7,
  interruptionEnabled = true,
}: {
  enabled?: boolean
  serverUrl?: string
  apiKey?: string
  apiSecret?: string
  roomPrefix?: string
  vadSensitivity?: number
  interruptionEnabled?: boolean
}) {
  const settings = getVoiceSettings()
  
  // Ensure we're using the cloud-hosted server URL if not specified
  const effectiveServerUrl = serverUrl || settings.livekitServerUrl || 'wss://yourproject.livekit.cloud'
  
  console.log(`Updating LiveKit settings to use cloud server: ${effectiveServerUrl}`)
  
  const updatedSettings = {
    ...settings,
    livekitEnabled: enabled,
    livekitServerUrl: effectiveServerUrl,
    livekitApiKey: apiKey || settings.livekitApiKey,
    livekitApiSecret: apiSecret || settings.livekitApiSecret,
    livekitRoomPrefix: roomPrefix || settings.livekitRoomPrefix,
    livekitVadSensitivity: vadSensitivity || settings.livekitVadSensitivity,
    livekitInterruptionEnabled: interruptionEnabled
  }
  
  // Log configuration (without sensitive data)
  console.log(`LiveKit cloud configuration updated: Server=${effectiveServerUrl}, Room Prefix=${updatedSettings.livekitRoomPrefix}`)
  
  // Update voice settings
  return updatedSettings
}