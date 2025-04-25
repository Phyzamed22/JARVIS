# LiveKit Server Integration Guide

## Overview

This document explains how to properly set up LiveKit integration with JARVIS using server-side token generation for enhanced security.

## Environment Variables Setup

To properly configure LiveKit with server-side token generation, you need to set the following environment variables in your `.env.local` file:

```
# LiveKit Configuration
LIVEKIT_URL=wss://yourproject.livekit.cloud  # Your LiveKit server URL
LIVEKIT_API_KEY=your_api_key                 # Your LiveKit API key
LIVEKIT_API_SECRET=your_api_secret           # Your LiveKit API secret
```

> **IMPORTANT**: Never expose your API secret in client-side code. The new implementation uses a server-side API endpoint to generate tokens securely.

## How It Works

1. The client requests a token from the server-side API endpoint (`/api/livekit/token`)
2. The server generates a token using the API key and secret (which are only accessible server-side)
3. The token is returned to the client and used to connect to LiveKit

## Troubleshooting

If you encounter connection issues:

1. Verify that your environment variables are correctly set in `.env.local`
2. Check the server logs for any errors during token generation
3. Ensure your LiveKit project is properly set up in the LiveKit Cloud dashboard
4. Verify that your API key and secret are valid

## Migration from Client-Side Token Generation

The previous implementation generated tokens directly in the client-side code, which exposed the API secret and caused security warnings. The new implementation fixes this by moving token generation to a secure server-side API endpoint.

No changes are needed to your voice settings or other configuration - just update your environment variables as described above.