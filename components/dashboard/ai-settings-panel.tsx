"use client"

import { useState, useEffect } from "react"
import { Save, RotateCcw, Volume2, VolumeX, Info } from "lucide-react"
import {
  type AISettings,
  defaultAISettings,
  getAISettings,
  saveAISettings,
  resetAISettings,
  availableModels,
} from "@/lib/settings-service"
import { useToast } from "@/components/ui/use-toast"

export function AISettingsPanel() {
  const [settings, setSettings] = useState<AISettings>(defaultAISettings)
  const [isEditing, setIsEditing] = useState(false)
  const { toast } = useToast()

  // Load settings on component mount
  useEffect(() => {
    const userSettings = getAISettings()
    setSettings(userSettings)
  }, [])

  // Handle settings change
  const handleChange = (field: keyof AISettings, value: any) => {
    setSettings((prev) => ({
      ...prev,
      [field]: value,
    }))
    setIsEditing(true)
  }

  // Save settings
  const handleSave = () => {
    saveAISettings(settings)
    setIsEditing(false)
    toast({
      title: "Settings Saved",
      description: "Your AI settings have been updated.",
    })
  }

  // Reset settings to defaults
  const handleReset = () => {
    const defaultSettings = resetAISettings()
    setSettings(defaultSettings)
    setIsEditing(false)
    toast({
      title: "Settings Reset",
      description: "Your AI settings have been reset to defaults.",
    })
  }

  // Toggle voice
  const toggleVoice = () => {
    handleChange("voiceEnabled", !settings.voiceEnabled)
  }

  return (
    <div className="glass-card p-6 h-full overflow-hidden flex flex-col">
      <h2 className="text-xl font-semibold mb-4 text-primary">AI Settings</h2>

      <div className="flex-1 overflow-y-auto pr-2">
        <div className="space-y-6">
          {/* Model Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">AI Model</label>
            <select
              value={settings.model}
              onChange={(e) => handleChange("model", e.target.value)}
              className="w-full bg-background/50 border border-primary/30 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-primary/50 text-gray-100"
            >
              {availableModels.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name} - {model.description}
                </option>
              ))}
            </select>
          </div>

          {/* Temperature Slider */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium text-gray-300">Temperature</label>
              <span className="text-xs text-gray-400">{settings.temperature.toFixed(1)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">Precise</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={settings.temperature}
                onChange={(e) => handleChange("temperature", Number.parseFloat(e.target.value))}
                className="flex-1 h-2 bg-background/50 rounded-lg appearance-none cursor-pointer accent-primary"
              />
              <span className="text-xs text-gray-400">Creative</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Lower values produce more predictable responses, higher values produce more creative ones.
            </p>
          </div>

          {/* Max Tokens Slider */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium text-gray-300">Response Length</label>
              <span className="text-xs text-gray-400">{settings.maxTokens} tokens</span>
            </div>
            <input
              type="range"
              min="100"
              max="2000"
              step="100"
              value={settings.maxTokens}
              onChange={(e) => handleChange("maxTokens", Number.parseInt(e.target.value))}
              className="w-full h-2 bg-background/50 rounded-lg appearance-none cursor-pointer accent-primary"
            />
            <p className="text-xs text-gray-400 mt-1">
              Maximum length of AI responses. Higher values allow for longer, more detailed responses.
            </p>
          </div>

          {/* Response Style */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Response Style</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                className={`p-2 rounded-md text-sm ${
                  settings.responseStyle === "concise"
                    ? "bg-primary/30 text-primary-foreground"
                    : "bg-background/50 text-gray-300 hover:bg-background/70"
                }`}
                onClick={() => handleChange("responseStyle", "concise")}
              >
                Concise
              </button>
              <button
                className={`p-2 rounded-md text-sm ${
                  settings.responseStyle === "balanced"
                    ? "bg-primary/30 text-primary-foreground"
                    : "bg-background/50 text-gray-300 hover:bg-background/70"
                }`}
                onClick={() => handleChange("responseStyle", "balanced")}
              >
                Balanced
              </button>
              <button
                className={`p-2 rounded-md text-sm ${
                  settings.responseStyle === "detailed"
                    ? "bg-primary/30 text-primary-foreground"
                    : "bg-background/50 text-gray-300 hover:bg-background/70"
                }`}
                onClick={() => handleChange("responseStyle", "detailed")}
              >
                Detailed
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-1">Choose how detailed JARVIS's responses should be.</p>
          </div>

          {/* Voice Settings */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium text-gray-300">Voice Output</label>
              <button
                onClick={toggleVoice}
                className={`p-1.5 rounded-md ${
                  settings.voiceEnabled ? "bg-primary/20 text-primary" : "bg-gray-700/50 text-gray-400"
                }`}
              >
                {settings.voiceEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              </button>
            </div>

            {settings.voiceEnabled && (
              <>
                {/* Voice Rate */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-medium text-gray-300">Speech Rate</label>
                    <span className="text-xs text-gray-400">{settings.voiceRate.toFixed(1)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="2"
                    step="0.1"
                    value={settings.voiceRate}
                    onChange={(e) => handleChange("voiceRate", Number.parseFloat(e.target.value))}
                    className="w-full h-2 bg-background/50 rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                </div>

                {/* Voice Pitch */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-medium text-gray-300">Speech Pitch</label>
                    <span className="text-xs text-gray-400">{settings.voicePitch.toFixed(1)}</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="1.5"
                    step="0.1"
                    value={settings.voicePitch}
                    onChange={(e) => handleChange("voicePitch", Number.parseFloat(e.target.value))}
                    className="w-full h-2 bg-background/50 rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                </div>
              </>
            )}
          </div>

          {/* System Prompt */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">System Prompt</label>
            <textarea
              value={settings.systemPrompt}
              onChange={(e) => handleChange("systemPrompt", e.target.value)}
              rows={5}
              className="w-full bg-background/50 border border-primary/30 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-primary/50 text-gray-100"
              placeholder="Enter custom system prompt..."
            />
            <div className="flex items-start gap-2 text-xs text-gray-400 mt-1">
              <Info className="h-4 w-4 shrink-0 mt-0.5" />
              <p>
                The system prompt defines JARVIS's personality and behavior. Editing this will override the response
                style setting.
              </p>
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
