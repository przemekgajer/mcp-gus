#!/usr/bin/env node
// n8n-test.js - A test script that simulates n8n's MCP client behavior

const child_process = require('child_process');
const readline = require('readline');
const path = require('path');
const fs = require('fs');

// Configuration
const serverPath = path.join(__dirname, 'debug-server.js');
const apiKey = process.env.GUS_API_KEY || 'api_key'; // Use environment variable or default
const logFile = path.join(__dirname, 'n8n-test.log');

// Set up logging
function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `${timestamp} - ${message}\n`;
  fs.appendFileSync(logFile, logMessage);
  console.log(message);
}

// Log start
log('Starting n8n test script...');

// Start the MCP server as a child process
log(`Starting MCP server from: ${serverPath}`);
const server = child_process.spawn('node', [serverPath], {
  env: { ...process.env, GUS_API_KEY: apiKey, NODE_DEBUG: 'mcp*,bir*,net,stream' },
  stdio: ['pipe', 'pipe', 'pipe']
});

// Create readline interface for server stdout
const rl = readline.createInterface({
  input: server.stdout,
  output: null,
  terminal: false
});

// Listen for server stderr output
server.stderr.on('data', (data) => {
  log(`[SERVER ERR] ${data.toString().trim()}`);
});

// Listen for server stdout
rl.on('line', (line) => {
  try {
    log(`[SERVER OUT] ${line}`);
    const parsed = JSON.parse(line);
    if (parsed.result && parsed.result.content && parsed.result.content[0]) {
      log(`RESULT: ${parsed.result.content[0].text.substring(0, 100)}...`);
    }
  } catch (error) {
    log(`Error parsing server output: ${error.message}`);
    log(`Raw line: ${line}`);
  }
});

// Simulate n8n MCP client behavior
async function runTest() {
  try {
    // 1. Send initialize request
    log('Sending initialize request...');
    const initializeRequest = {
      id: '1',
      type: 'initialize',
      params: {
        client: {
          name: 'n8n-test-client',
          version: '1.0.0'
        }
      }
    };
    
    server.stdin.write(JSON.stringify(initializeRequest) + '\n');
    
    // Wait a bit for initialization
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 2. Send execute request with NIP
    log('Sending execute request with NIP...');
    const executeRequest = {
      id: '2',
      type: 'request',
      method: 'execute',
      params: {
        tool: 'regon_search',
        input: {
          nip: '5261040567'  // GUS's NIP
        }
      }
    };
    
    server.stdin.write(JSON.stringify(executeRequest) + '\n');
    
    // Give time for execution and logging
    await new Promise(resolve => setTimeout(resolve, 15000));
    
    // End test
    log('Test completed, shutting down server');
    server.kill();
    process.exit(0);
  } catch (error) {
    log(`Test error: ${error.message}`);
    if (server) server.kill();
    process.exit(1);
  }
}

// Handle server exit
server.on('exit', (code, signal) => {
  log(`Server exited with code ${code} and signal ${signal}`);
  process.exit(0);
});

// Handle process termination
process.on('SIGINT', () => {
  log('Test interrupted, shutting down server');
  if (server) server.kill();
  process.exit(0);
});

// Start the test
setTimeout(runTest, 3000); // Give the server time to start up