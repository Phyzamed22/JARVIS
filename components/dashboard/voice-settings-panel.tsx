"use client"

import { useState, useEffect } from "react"
import { Save, RotateCcw, Volume2, VolumeX, Mic, MicOff, AlertTriangle, MessageSquare, Ear } from "lucide-react"
import {
  type VoiceSettings,
  defaultVoiceSettings,
  getVoiceSettings,
  saveVoiceSettings,
  resetVoiceSettings,
  recognitionLanguages,
  getAvailableVoices,
} from "@/lib/voice-settings-service"
import { getVoiceService } from "@/lib/voice-service"
import { useToast } from "@/components/ui/use-toast"

export function VoiceSettingsPanel() {
  const [settings, setSettings] = useState<VoiceSettings>(defaultVoiceSettings)
  const [isEditing, setIsEditing] = useState(false)
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([])
  const [isVoiceSupported, setIsVoiceSupported] = useState(false)
  const [isWakeWordActive, setIsWakeWordActive] = useState(false)
  const { toast } = useToast()

  // Load settings and check voice support on component mount
  useEffect(() => {
    const userSettings = getVoiceSettings()
    setSettings(userSettings)

    // Check voice support
    const voiceService = getVoiceService()
    setIsVoiceSupported(!!voiceService && voiceService.isSupported())

    // Check if wake word detection is active
    if (voiceService) {
      setIsWakeWordActive(voiceService.getIsWakeWordDetectionActive())
    }

    // Load available voices
    if (typeof window !== "undefined" && window.speechSynthesis) {
      // Some browsers need a small delay to load voices
      setTimeout(() => {
        const voices = getAvailableVoices()
        setAvailableVoices(voices)
      }, 100)

      // Handle voices changed event
      window.speechSynthesis.onvoiceschanged = () => {
        const voices = getAvailableVoices()
        setAvailableVoices(voices)
      }
    }
  }, [])

  // Handle settings change
  const handleChange = (field: string, value: any) => {
    setSettings((prev) => {
      // Handle nested fields (like audioEffects.echo)
      if (field.includes(".")) {
        const [parent, child] = field.split(".")
        return {
          ...prev,
          [parent]: {
            ...prev[parent],
            [child]: value,
          },
        }
      }

      // Handle regular fields
      return {
        ...prev,
        [field]: value,
      }
    })
    setIsEditing(true)
  }

  // Save settings
  const handleSave = () => {
    saveVoiceSettings(settings)
    setIsEditing(false)

    // Update wake word detection if needed
    const voiceService = getVoiceService()
    if (voiceService) {
      // If wake word is enabled but not active, start it
      if (
        settings.wakeWordEnabled &&
        !voiceService.getIsWakeWordDetectionActive() &&
        !voiceService.getIsListening() &&
        !voiceService.getIsConversationalMode()
      ) {
        voiceService.startWakeWordDetection()
        setIsWakeWordActive(true)
      }
      // If wake word is disabled but active, stop it
      else if (!settings.wakeWordEnabled && voiceService.getIsWakeWordDetectionActive()) {
        voiceService.stopWakeWordDetection()
        setIsWakeWordActive(false)
      }
    }

    toast({
      title: "Voice Settings Saved",
      description: "Your voice settings have been updated.",
    })
  }

  // Reset settings to defaults
  const handleReset = () => {
    const defaultSettings = resetVoiceSettings()
    setSettings(defaultSettings)
    setIsEditing(false)

    // Stop wake word detection if it's active
    const voiceService = getVoiceService()
    if (voiceService && voiceService.getIsWakeWordDetectionActive()) {
      voiceService.stopWakeWordDetection()
      setIsWakeWordActive(false)
    }

    toast({
      title: "Voice Settings Reset",
      description: "Your voice settings have been reset to defaults.",
    })
  }

  // Test voice synthesis
  const handleTestVoice = () => {
    const voiceService = getVoiceService()
    if (voiceService) {
      voiceService.speak("Hello, I am JARVIS. This is a test of my voice synthesis capabilities.")
    }
  }

  // Toggle wake word detection
  const toggleWakeWordDetection = () => {
    const voiceService = getVoiceService()
    if (!voiceService) return

    if (isWakeWordActive) {
      voiceService.stopWakeWordDetection()
      setIsWakeWordActive(false)
      toast({
        title: "Wake Word Detection Stopped",
        description: "I'm no longer listening for the wake word.",
      })
    } else {
      if (voiceService.getIsListening() || voiceService.getIsConversationalMode()) {
        toast({
          title: "Cannot Start Wake Word Detection",
          description: "Please stop active listening or conversation mode first.",
          variant: "destructive",
        })
        return
      }

      const started = voiceService.startWakeWordDetection()
      if (started) {
        setIsWakeWordActive(true)
        toast({
          title: "Wake Word Detection Started",
          description: `I'm now listening for the wake word "${settings.wakeWord}".`,
        })
      } else {
        toast({
          title: "Wake Word Detection Failed",
          description: "Could not start wake word detection. Please check your browser permissions.",
          variant: "destructive",
        })
      }
    }
  }

  if (!isVoiceSupported) {
    return (
      <div className="h-full overflow-hidden flex flex-col">
        <div className="bg-red-900/30 border-red-600/30 text-red-200 px-4 py-3 rounded mb-4 border">
          <p className="flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2" />
            <strong>Voice Not Supported:</strong> Your browser does not support the Web Speech API. Please try using
            Chrome, Edge, or Safari.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-hidden flex flex-col">
      <div className="flex-1 overflow-y-auto pr-2">
        <div className="space-y-6">
          {/* Voice Recognition Section */}
          <div className="glass-card p-4 rounded-md">
            <h3 className="text-lg font-medium text-primary mb-4 flex items-center">
              <Mic className="h-5 w-5 mr-2" />
              Voice Recognition Settings
            </h3>

            {/* Enable/Disable Recognition */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-gray-300">Enable Voice Recognition</label>
                <button
                  onClick={() => handleChange("recognitionEnabled", !settings.recognitionEnabled)}
                  className={`p-1.5 rounded-md ${
                    settings.recognitionEnabled ? "bg-primary/20 text-primary" : "bg-gray-700/50 text-gray-400"
                  }`}
                >
                  {settings.recognitionEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                </button>
              </div>

              {settings.recognitionEnabled && (
                <>
                  {/* Recognition Language */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-300">Recognition Language</label>
                    <select
                      value={settings.recognitionLanguage}
                      onChange={(e) => handleChange("recognitionLanguage", e.target.value)}
                      className="w-full bg-background/50 border border-primary/30 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-primary/50 text-gray-100"
                    >
                      {recognitionLanguages.map((lang) => (
                        <option key={lang.code} value={lang.code}>
                          {lang.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Continuous Listening */}
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="continuousListening"
                      checked={settings.continuousListening}
                      onChange={(e) => handleChange("continuousListening", e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <label htmlFor="continuousListening" className="ml-2 text-sm text-gray-300">
                      Enable continuous listening mode
                    </label>
                  </div>

                  {/* Auto Stop After Silence */}
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="autoStopAfterSilence"
                      checked={settings.autoStopAfterSilence}
                      onChange={(e) => handleChange("autoStopAfterSilence", e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <label htmlFor="autoStopAfterSilence" className="ml-2 text-sm text-gray-300">
                      Automatically stop listening after silence
                    </label>
                  </div>

                  {/* Silence Threshold */}
                  {settings.autoStopAfterSilence && (
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <label className="text-sm font-medium text-gray-300">Silence Threshold</label>
                        <span className="text-xs text-gray-400">{settings.silenceThreshold} seconds</span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="10"
                        step="1"
                        value={settings.silenceThreshold}
                        onChange={(e) => handleChange("silenceThreshold", Number.parseInt(e.target.value))}
                        className="w-full h-2 bg-background/50 rounded-lg appearance-none cursor-pointer accent-primary"
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Wake Word Detection Section */}
          <div className="glass-card p-4 rounded-md">
            <h3 className="text-lg font-medium text-primary mb-4 flex items-center">
              <Ear className="h-5 w-5 mr-2" />
              Wake Word Detection
            </h3>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-gray-300">Enable Wake Word Detection</label>
                <button
                  onClick={() => handleChange("wakeWordEnabled", !settings.wakeWordEnabled)}
                  className={`p-1.5 rounded-md ${
                    settings.wakeWordEnabled ? "bg-primary/20 text-primary" : "bg-gray-700/50 text-gray-400"
                  }`}
                >
                  {settings.wakeWordEnabled ? <Ear className="h-4 w-4" /> : <Ear className="h-4 w-4 opacity-50" />}
                </button>
              </div>

              {settings.wakeWordEnabled && (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-300">Wake Word</label>
                    <input
                      type="text"
                      value={settings.wakeWord}
                      onChange={(e) => handleChange("wakeWord", e.target.value)}
                      className="w-full bg-background/50 border border-primary/30 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-primary/50 text-gray-100"
                      placeholder="e.g., jarvis, hey jarvis"
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      The word or phrase that will activate JARVIS. Keep it short and distinctive.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-300">Wake Word Sensitivity</label>
                    <select
                      value={settings.wakeWordSensitivity}
                      onChange={(e) => handleChange("wakeWordSensitivity", e.target.value)}
                      className="w-full bg-background/50 border border-primary/30 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-primary/50 text-gray-100"
                    >
                      <option value="low">Low (Fewer false activations, may miss some commands)</option>
                      <option value="medium">Medium (Balanced sensitivity)</option>
                      <option value="high">High (More responsive, may have false activations)</option>
                    </select>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="wakeWordAutoStart"
                      checked={settings.wakeWordAutoStart}
                      onChange={(e) => handleChange("wakeWordAutoStart", e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <label htmlFor="wakeWordAutoStart" className="ml-2 text-sm text-gray-300">
                      Automatically start wake word detection on page load
                    </label>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="wakeWordStartConversation"
                      checked={settings.wakeWordStartConversation}
                      onChange={(e) => handleChange("wakeWordStartConversation", e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <label htmlFor="wakeWordStartConversation" className="ml-2 text-sm text-gray-300">
                      Start conversational mode after wake word detection
                    </label>
                  </div>

                  <div className="mt-4">
                    <button
                      onClick={toggleWakeWordDetection}
                      className={`w-full py-2 rounded-md transition-colors flex items-center justify-center ${
                        isWakeWordActive
                          ? "bg-red-500/20 hover:bg-red-500/30 text-red-400"
                          : "bg-green-500/20 hover:bg-green-500/30 text-green-400"
                      }`}
                    >
                      <Ear className="h-4 w-4 mr-2" />
                      {isWakeWordActive ? "Stop Wake Word Detection" : "Start Wake Word Detection"}
                    </button>
                    <p className="text-xs text-gray-400 mt-2 text-center">
                      {isWakeWordActive
                        ? `Currently listening for "${settings.wakeWord}"`
                        : "Wake word detection is currently inactive"}
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Conversational Mode Section */}
          <div className="glass-card p-4 rounded-md">
            <h3 className="text-lg font-medium text-primary mb-4 flex items-center">
              <MessageSquare className="h-5 w-5 mr-2" />
              Conversational Mode Settings
            </h3>

            <div className="space-y-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="conversationalMode"
                  checked={settings.conversationalMode}
                  onChange={(e) => handleChange("conversationalMode", e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <label htmlFor="conversationalMode" className="ml-2 text-sm text-gray-300">
                  Enable conversational mode (continuous back-and-forth conversation)
                </label>
              </div>

              {settings.conversationalMode && (
                <>
                  <div className="pl-6 space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <label className="text-sm font-medium text-gray-300">Conversation Timeout</label>
                        <span className="text-xs text-gray-400">{settings.conversationTimeout} seconds</span>
                      </div>
                      <input
                        type="range"
                        min="10"
                        max="120"
                        step="10"
                        value={settings.conversationTimeout}
                        onChange={(e) => handleChange("conversationTimeout", Number.parseInt(e.target.value))}
                        className="w-full h-2 bg-background/50 rounded-lg appearance-none cursor-pointer accent-primary"
                      />
                      <p className="text-xs text-gray-400 mt-1">
                        How long JARVIS will wait for your next input before ending the conversation.
                      </p>
                    </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="conversationContext"
                        checked={settings.conversationContext}
                        onChange={(e) => handleChange("conversationContext", e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      <label htmlFor="conversationContext" className="ml-2 text-sm text-gray-300">
                        Maintain conversation context
                      </label>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      When enabled, JARVIS will remember the context of your conversation to provide more relevant
                      responses.
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Voice Synthesis Section */}
          <div className="glass-card p-4 rounded-md">
            <h3 className="text-lg font-medium text-primary mb-4 flex items-center">
              <Volume2 className="h-5 w-5 mr-2" />
              Voice Synthesis Settings
            </h3>

            {/* Enable/Disable Synthesis */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-gray-300">Enable Voice Synthesis</label>
                <button
                  onClick={() => handleChange("synthesisEnabled", !settings.synthesisEnabled)}
                  className={`p-1.5 rounded-md ${
                    settings.synthesisEnabled ? "bg-primary/20 text-primary" : "bg-gray-700/50 text-gray-400"
                  }`}
                >
                  {settings.synthesisEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                </button>
              </div>

              {settings.synthesisEnabled && (
                <>
                  {/* Voice Selection */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-300">Voice</label>
                    <select
                      value={settings.synthesisVoice}
                      onChange={(e) => handleChange("synthesisVoice", e.target.value)}
                      className="w-full bg-background/50 border border-primary/30 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-primary/50 text-gray-100"
                    >
                      <option value="default">Default Voice</option>
                      {availableVoices.map((voice) => (
                        <option key={voice.name} value={voice.name}>
                          {voice.name} ({voice.lang})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Voice Rate */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-sm font-medium text-gray-300">Speech Rate</label>
                      <span className="text-xs text-gray-400">{settings.synthesisRate.toFixed(1)}x</span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="2"
                      step="0.1"
                      value={settings.synthesisRate}
                      onChange={(e) => handleChange("synthesisRate", Number.parseFloat(e.target.value))}
                      className="w-full h-2 bg-background/50 rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                  </div>

                  {/* Voice Pitch */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-sm font-medium text-gray-300">Speech Pitch</label>
                      <span className="text-xs text-gray-400">{settings.synthesisPitch.toFixed(1)}</span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="1.5"
                      step="0.1"
                      value={settings.synthesisPitch}
                      onChange={(e) => handleChange("synthesisPitch", Number.parseFloat(e.target.value))}
                      className="w-full h-2 bg-background/50 rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                  </div>

                  {/* Voice Volume */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-sm font-medium text-gray-300">Volume</label>
                      <span className="text-xs text-gray-400">{Math.round(settings.synthesisVolume * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={settings.synthesisVolume}
                      onChange={(e) => handleChange("synthesisVolume", Number.parseFloat(e.target.value))}
                      className="w-full h-2 bg-background/50 rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                  </div>

                  {/* Auto Read Responses */}
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="autoReadResponses"
                      checked={settings.autoReadResponses}
                      onChange={(e) => handleChange("autoReadResponses", e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <label htmlFor="autoReadResponses" className="ml-2 text-sm text-gray-300">
                      Automatically read AI responses
                    </label>
                  </div>

                  {/* SSML Support */}
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="useSSML"
                      checked={settings.useSSML}
                      onChange={(e) => handleChange("useSSML", e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <label htmlFor="useSSML" className="ml-2 text-sm text-gray-300">
                      Enable SSML support (Speech Synthesis Markup Language)
                    </label>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    SSML allows for more control over how speech is synthesized, including pauses, emphasis, and
                    pronunciation.
                  </p>

                  {/* Audio Effects */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-300">Audio Effects</label>
                    <div className="space-y-2 pl-2">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="audioEffectsEcho"
                          checked={settings.audioEffects.echo}
                          onChange={(e) => handleChange("audioEffects.echo", e.target.checked)}
                          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                        />
                        <label htmlFor="audioEffectsEcho" className="ml-2 text-sm text-gray-300">
                          Echo effect
                        </label>
                      </div>
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="audioEffectsReverb"
                          checked={settings.audioEffects.reverb}
                          onChange={(e) => handleChange("audioEffects.reverb", e.target.checked)}
                          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                        />
                        <label htmlFor="audioEffectsReverb" className="ml-2 text-sm text-gray-300">
                          Reverb effect
                        </label>
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      Note: Audio effects may not be supported in all browsers.
                    </p>
                  </div>

                  {/* Test Voice Button */}
                  <button
                    onClick={handleTestVoice}
                    className="w-full py-2 bg-primary/20 hover:bg-primary/30 rounded-md text-primary transition-colors"
                  >
                    Test Voice
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-6 flex justify-between">
        <button
          onClick={handleReset}
          className="flex items-center gap-2 px-4 py-2 bg-gray-700/50 hover:bg-gray-700/70 rounded-md text-gray-300 transition-colors"
        >
          <RotateCcw className="h-4 w-4" />
          Reset to Defaults
        </button>
        <button
          onClick={handleSave}
          disabled={!isEditing}
          className="flex items-center gap-2 px-4 py-2 bg-primary/20 hover:bg-primary/30 rounded-md text-primary disabled:opacity-50 disabled:hover:bg-primary/20 transition-colors"
        >
          <Save className="h-4 w-4" />
          Save Settings
        </button>
      </div>
    </div>
  )
}
