#!/usr/bin/env node
// Simple test for BIR1 authentication only

async function testBir() {
  try {
    console.log('Testing BIR1 API authentication...');
    
    // Get API key
    const apiKey = process.env.GUS_API_KEY;
    if (!apiKey) {
      console.error('ERROR: GUS_API_KEY environment variable is not set');
      process.exit(1);
    }
    
    console.log(`Using API key with length: ${apiKey.length}`);
    console.log(`Key begins with: ${apiKey.substring(0, 4)}...`);
    
    // Import bir1
    const bir1Module = await import('bir1');
    const Bir = bir1Module.default;
    
    console.log('BIR1 module loaded successfully');
    console.log('Attempting to authenticate...');
    
    // Create client with basic configuration
    const client = new Bir({
      key: apiKey,
      sandbox: false // Set to true for test environment
    });
    
    console.log('Client created, attempting login...');
    
    // Try just a login operation
    const sessionId = await client.login();
    console.log(`Login successful! Session ID: ${sessionId}`);
    
    // Try to get API status
    const status = await client.apiStatus();
    console.log(`API Status: ${JSON.stringify(status)}`);
    
    console.log('Test completed successfully!');
  } catch (error) {
    console.error(`\nAUTHENTICATION TEST FAILED: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
}

testBir().catch(error => {
  console.error('Uncaught error:', error);
  process.exit(1);
});