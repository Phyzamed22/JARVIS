// Test script for LiveKit cloud integration
const { initializeLiveKit, disconnectLiveKit, getLiveKitClient } = require('../lib/livekit');

// Generate a random user ID for testing
const userId = `test-user-${Math.floor(Math.random() * 10000)}`;

async function testLiveKitCloudConnection() {
  console.log('Testing LiveKit cloud connection...');
  console.log(`Test user ID: ${userId}`);
  
  try {
    // Initialize LiveKit with the test user ID
    console.log('Initializing LiveKit...');
    const success = await initializeLiveKit(userId);
    
    if (!success) {
      console.error('Failed to initialize LiveKit');
      return;
    }
    
    console.log('LiveKit initialized successfully');
    
    // Get the LiveKit client instance
    const client = getLiveKitClient();
    
    if (!client) {
      console.error('Failed to get LiveKit client instance');
      return;
    }
    
    console.log(`Connected to room: ${client.name}`);
    console.log('Connection state:', client.connectionState);
    
    // Wait for 5 seconds to observe the connection
    console.log('Waiting for 5 seconds...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Disconnect from LiveKit
    console.log('Disconnecting from LiveKit...');
    disconnectLiveKit();
    console.log('Disconnected from LiveKit');
    
    console.log('Test completed successfully');
  } catch (error) {
    console.error('Error during LiveKit cloud connection test:', error);
  }
}

// Run the test
testLiveKitCloudConnection();