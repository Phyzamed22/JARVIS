import { AccessToken } from 'livekit-server-sdk';
import { NextRequest, NextResponse } from 'next/server';

/**
 * API endpoint to generate LiveKit tokens securely on the server side
 * This prevents exposing API secrets in client-side code
 */
export async function GET(request: NextRequest) {
  try {
    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const roomName = searchParams.get('room');
    const userId = searchParams.get('userId');
    
    // Validate required parameters
    if (!roomName || !userId) {
      return NextResponse.json(
        { error: 'Missing required parameters: room and userId' },
        { status: 400 }
      );
    }
    
    // Get API key and secret from environment variables
    // These should be set in .env.local and are only accessible server-side
    const apiKey = process.env.LIVEKIT_API_KEY || process.env.NEXT_PUBLIC_LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET || process.env.NEXT_PUBLIC_LIVEKIT_API_SECRET;
    
    // Skip verbose logging to reduce processing overhead
    if (!apiKey || !apiSecret) {
      console.error('LiveKit API key or secret not configured');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }
    
    // Create a new AccessToken with reduced TTL for faster processing
    // 6 hours is sufficient for most sessions while reducing token size
    const token = new AccessToken(
      apiKey,
      apiSecret,
      {
        identity: userId,
        name: `JARVIS User ${userId}`,
        ttl: 60 * 60 * 6, // 6 hours in seconds (reduced from 24 hours)
      }
    );
    
    // Grant permissions to the room
    token.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true, // Can publish audio/video
      canSubscribe: true, // Can subscribe to other participants
      canPublishData: true, // Can publish data
    });
    
    const jwt = token.toJwt();
    
    // Return the token
    return NextResponse.json({ token: jwt });
  } catch (error) {
    console.error('Error generating LiveKit token:', error);
    return NextResponse.json(
      { error: 'Failed to generate token' },
      { status: 500 }
    );
  }
}