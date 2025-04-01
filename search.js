#!/usr/bin/env node
// Simple script to search for company data by NIP
const { spawn } = require('child_process');
const readline = require('readline');
const path = require('path');

// Get NIP from command line
const nip = process.argv[2];
if (!nip) {
  console.error('Usage: node search.js <NIP>');
  console.error('Example: node search.js 6443307781');
  process.exit(1);
}

// Format NIP (remove any non-digit characters)
const formattedNip = nip.replace(/[^0-9]/g, '');

console.log(`Searching for company with NIP: ${formattedNip}...`);

// Start the server as a child process
const serverPath = path.join(__dirname, 'debug-server.js');
const server = spawn('node', [serverPath], {
  env: { ...process.env },
  stdio: ['pipe', 'pipe', 'inherit'] // Redirect stderr to parent process
});

// Create readline interface to read server output
const rl = readline.createInterface({
  input: server.stdout,
  terminal: false
});

// Parse and process server responses
rl.on('line', (line) => {
  try {
    const response = JSON.parse(line);
    
    // Check if this is a search result
    if (response.id === '2' && response.result && response.result.content) {
      // This is the search result
      const content = response.result.content[0].text;
      try {
        // Try to parse and pretty-print the JSON
        const data = JSON.parse(content);
        console.log('\nCompany Information:');
        console.log('===================');
        
        // Display key information
        if (data.Nazwa) console.log(`Name: ${data.Nazwa}`);
        if (data.Nip) console.log(`NIP: ${data.Nip}`);
        if (data.Regon) console.log(`REGON: ${data.Regon}`);
        if (data.Wojewodztwo) console.log(`Province: ${data.Wojewodztwo}`);
        if (data.Miejscowosc) console.log(`City: ${data.Miejscowosc}`);
        if (data.Ulica) {
          const street = [data.Ulica, data.NrNieruchomosci, data.NrLokalu].filter(Boolean).join(' ');
          console.log(`Street: ${street}`);
        }
        if (data.KodPocztowy) console.log(`Postal Code: ${data.KodPocztowy}`);
        
        // Any additional information
        console.log('\nAdditional Details:');
        console.log('===================');
        Object.keys(data).forEach(key => {
          if (!['Nazwa', 'Nip', 'Regon', 'Wojewodztwo', 'Miejscowosc', 'Ulica', 
                'NrNieruchomosci', 'NrLokalu', 'KodPocztowy'].includes(key) && data[key]) {
            console.log(`${key}: ${data[key]}`);
          }
        });
        
      } catch (e) {
        // If it's not valid JSON, just print the raw content
        console.log(content);
      }
      
      // Kill the server and exit
      server.kill();
      process.exit(0);
    }
    
    // Check for errors
    if (response.error) {
      console.error(`Error: ${response.error.message}`);
      server.kill();
      process.exit(1);
    }
    
  } catch (e) {
    // Ignore parse errors for non-JSON output
  }
});

// Send initialization request
console.log('Initializing server...');
server.stdin.write(JSON.stringify({
  id: '1',
  type: 'initialize',
  params: { 
    client: { 
      name: 'nip-search-tool', 
      version: '1.0.0' 
    } 
  }
}) + '\n');

// Wait a bit for initialization to complete
setTimeout(() => {
  console.log('Sending search request...');
  // Send search request
  server.stdin.write(JSON.stringify({
    id: '2',
    type: 'request',
    method: 'execute',
    params: { 
      tool: 'regon_search', 
      input: { 
        nip: formattedNip 
      } 
    }
  }) + '\n');
}, 1000);

// Handle errors
server.on('error', (error) => {
  console.error(`Server error: ${error.message}`);
  process.exit(1);
});

// Handle server exit
server.on('exit', (code) => {
  if (code !== 0 && code !== null) {
    console.error(`Server exited with code ${code}`);
    process.exit(code);
  }
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('Search canceled');
  server.kill();
  process.exit(0);
});