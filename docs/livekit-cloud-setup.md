# LiveKit Cloud Integration Setup

## Overview

This document explains how to set up and use the LiveKit cloud-hosted server with JARVIS 2.0. LiveKit provides real-time audio/video communication capabilities that enable voice interaction with JARVIS.

## Configuration Steps

### 1. Get LiveKit Cloud Credentials

1. Sign up for a LiveKit Cloud account at [https://cloud.livekit.io](https://cloud.livekit.io)
2. Create a new project in the LiveKit Cloud dashboard
3. Navigate to the project settings to find your:
   - WebSocket URL (wss://yourproject.livekit.cloud)
   - API Key
   - API Secret

### 2. Update Environment Variables

The `.env.local` file has been updated with placeholders for your LiveKit cloud credentials. Replace these placeholders with your actual values:

```
NEXT_PUBLIC_LIVEKIT_URL=wss://yourproject.livekit.cloud
NEXT_PUBLIC_LIVEKIT_API_KEY=your_api_key_here
NEXT_PUBLIC_LIVEKIT_API_SECRET=your_api_secret_here
```

### 3. Using LiveKit in JARVIS

The LiveKit integration has been configured to use your cloud-hosted server. Key features include:

- **Secure JWT Token Generation**: Tokens are generated with a 24-hour TTL for secure authentication
- **Automatic Reconnection**: The client will attempt to reconnect up to 3 times if the connection is lost
- **Voice Activity Detection**: Built-in VAD for detecting when you're speaking
- **Wake Word Detection**: Optional wake word detection to activate JARVIS

## Troubleshooting

If you encounter connection issues:

1. Verify your API credentials in the `.env.local` file
2. Check the browser console for detailed error messages
3. Ensure your LiveKit project is active in the LiveKit Cloud dashboard
4. Check if your browser has permission to access the microphone

## Additional Resources

- [LiveKit Documentation](https://docs.livekit.io)
- [LiveKit Cloud Dashboard](https://cloud.livekit.io)