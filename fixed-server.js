#!/usr/bin/env node
// fixed-server.js - Optimized MCP server for GUS REGON API integration

const readline = require('readline');
const fs = require('fs');
const path = require('path');

// Setup logging
const logFile = path.join(__dirname, 'mcp-server-debug.log');
function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `${timestamp} - ${message}\n`;
  fs.appendFileSync(logFile, logMessage);
  console.error(message);
}

log('Server starting...');
log(`Node.js version: ${process.version}`);
log(`Working directory: ${process.cwd()}`);
log(`Environment variables: ${Object.keys(process.env).filter(key => key.includes('GUS') || key.includes('MCP') || key.includes('NODE'))}`);

// We need to load bir1 asynchronously since it's an ES Module
let Bir;
async function loadBir() {
  try {
    log('Attempting to load bir1 module...');
    // Dynamic import for ES Modules
    const bir1 = await import('bir1');
    Bir = bir1.default;
    log('bir1 module loaded successfully');
    startServer();
  } catch (error) {
    log(`Error loading bir1 module: ${error.message}`);
    log(error.stack);
    process.exit(1);
  }
}

// Function to start server after bir1 is loaded
async function startServer() {
  // Extract the API key from environment variables
  let apiKey = process.env.GUS_API_KEY;
  if (!apiKey) {
    log("Missing GUS API key. Set the GUS_API_KEY environment variable.");
    process.exit(1);
  }
  log(`GUS_API_KEY found with length: ${apiKey.length}`);

  // Create GUS client
  let gusClient;
  try {
    log('Initializing GUS client...');
    // Try with different initialization options depending on bir1 version
    try {
      // First try without normalization function
      gusClient = new Bir({ 
        key: apiKey
      });
      log("Successfully initialized GUS client without normalization function");
    } catch (innerError) {
      log(`First initialization attempt failed: ${innerError.message}`);
      log(innerError.stack);
      // If that fails, try with another approach
      gusClient = new Bir(apiKey);
      log("Successfully initialized GUS client with direct API key");
    }
  } catch (error) {
    log(`Error initializing GUS client: ${error.message}`);
    log(error.stack);
    process.exit(1);
  }

  // Create readline interface for STDIN/STDOUT communication
  log('Setting up readline interface...');
  const rl = readline.createInterface({
    input: process.stdin,
    output: null,
    terminal: false
  });

  // Server info - following exactly the MCP protocol format
  const serverInfo = {
    name: "GUS-REGON-API",
    version: "1.0.0",
    tools: [
      {
        name: "regon_search",
        description: "Search for Polish company data by NIP (VAT number)",
        parameters: {
          type: "object",
          properties: {
            nip: {
              type: "string",
              description: "Polish VAT number (NIP) - 10 digits"
            }
          },
          required: ["nip"]
        }
      }
    ]
  };

  // Handle MCP protocol messages
  async function handleMessage(message) {
    try {
      log(`Received message: ${message}`);
      const parsed = JSON.parse(message);
      
      // Handle initialization request
      if (parsed.type === 'initialize' && parsed.params) {
        log('Processing initialize request');
        const response = {
          id: parsed.id,
          result: {
            server: serverInfo
          }
        };
        log(`Sending initialize response: ${JSON.stringify(response)}`);
        return response;
      }
      
      // Handle tool execution - this must match exact MCP protocol expectations
      if (parsed.type === 'request' && parsed.method === 'execute' && parsed.params) {
        const { tool, input } = parsed.params;
        log(`Processing execute request for tool: ${tool}`);
        
        // Handle regon_search tool
        if (tool === 'regon_search' && input && input.nip) {
          try {
            // Validate and format NIP
            const nipFormatted = input.nip.replace(/[^0-9]/g, '');
            log(`Processing NIP: ${nipFormatted}`);
            if (nipFormatted.length !== 10) {
              log(`Invalid NIP format: ${input.nip}`);
              return {
                id: parsed.id,
                result: {
                  content: [{ 
                    type: "text", 
                    text: `Invalid NIP format: ${input.nip}. NIP must contain 10 digits.` 
                  }]
                }
              };
            }
            
            // Search for company by NIP
            log(`Searching for entity with NIP: ${nipFormatted}...`);
            const result = await gusClient.search({ nip: nipFormatted });
            log(`Search result: ${JSON.stringify(result)}`);
            
            if (!result || (Array.isArray(result) && result.length === 0)) {
              log(`No entity found for NIP: ${nipFormatted}`);
              return {
                id: parsed.id,
                result: {
                  content: [{ 
                    type: "text", 
                    text: `No entity found for NIP: ${nipFormatted}.` 
                  }]
                }
              };
            }
            
            // Process search results and normalize field names
            const basicData = Array.isArray(result) ? result[0] : result;
            log(`Basic data: ${JSON.stringify(basicData)}`);
            
            // Create a clean object with normalized data
            let outputData = {};
            
            // Manual normalization of common fields
            Object.keys(basicData).forEach(key => {
              // Copy the data as-is without relying on normalization function
              outputData[key] = basicData[key];
            });
            
            // Determine entity type and report type
            const entityType = basicData.Typ;
            const reportName = (entityType === 'P') 
                ? 'PublDaneRaportPrawna' 
                : 'PublDaneRaportDzialalnosciFizycznej';
            
            try {
              // Get detailed report
              log(`Fetching detailed report for REGON...`);
              log(`Using REGON: ${basicData.Regon || 'undefined'}`);
              
              // Get the REGON value safely
              const regonValue = basicData.Regon || 
                                 basicData.regon || 
                                 basicData.REGON || 
                                 Object.keys(basicData).find(k => k.toLowerCase().includes('regon'));
              
              if (!regonValue) {
                throw new Error("Could not find REGON in the response data");
              }
              
              log(`Normalized REGON value: ${regonValue}`);
              
              const fullReport = await gusClient.report({ 
                regon: regonValue, 
                report: reportName 
              });
              
              log(`Full report received with keys: ${fullReport ? Object.keys(fullReport) : 'null'}`);
              
              if (fullReport) {
                // Merge data
                outputData = { 
                  ...outputData, 
                  ...fullReport,
                  queryDetails: {
                    reportType: reportName,
                    queryTime: new Date().toISOString()
                  }
                };
              }
            } catch (err) {
              log(`Error fetching report: ${err.message}`);
              log(err.stack);
              outputData._reportError = `Failed to fetch full report: ${err.message}`;
            }
            
            // Return formatted result - must follow MCP protocol format
            const response = {
              id: parsed.id,
              result: {
                content: [{
                  type: "text",
                  text: JSON.stringify(outputData, null, 2)
                }]
              }
            };
            log(`Sending response with data length: ${JSON.stringify(response).length}`);
            return response;
          } catch (error) {
            log(`Error processing request: ${error.message}`);
            log(error.stack);
            // Return error in correct MCP format
            return {
              id: parsed.id,
              error: {
                code: -32603,
                message: `Error retrieving data from GUS REGON API: ${error.message}`
              }
            };
          }
        }
        
        // Unknown tool or missing parameters
        log(`Unknown tool or missing parameters: ${tool}`);
        return {
          id: parsed.id,
          error: {
            code: -32601,
            message: `Unknown tool or invalid parameters: ${tool}`
          }
        };
      }
      
      // Handle list_tools request
      if (parsed.type === 'request' && parsed.method === 'list_tools') {
        log('Processing list_tools request');
        return {
          id: parsed.id,
          result: {
            tools: serverInfo.tools
          }
        };
      }
      
      // Unknown message type
      log(`Unknown message type: ${parsed.type}`);
      return {
        id: parsed.id || null,
        error: {
          code: -32600,
          message: "Invalid request"
        }
      };
    } catch (error) {
      log(`Error handling message: ${error.message}`);
      log(error.stack);
      return {
        id: null,
        error: {
          code: -32700,
          message: `Parse error: ${error.message}`
        }
      };
    }
  }

  // Start reading from stdin
  log('GUS REGON API server started. Waiting for input...');

  rl.on('line', async (line) => {
    try {
      if (!line.trim()) {
        log('Empty line received, ignoring');
        return;
      }
      
      log(`Processing line: ${line.substring(0, 100)}${line.length > 100 ? '...' : ''}`);
      const response = await handleMessage(line);
      const responseStr = JSON.stringify(response);
      log(`Sending response: ${responseStr.substring(0, 100)}${responseStr.length > 100 ? '...' : ''}`);
      console.log(responseStr);
    } catch (error) {
      log(`Error processing line: ${error.message}`);
      log(error.stack);
      // Return a properly formatted error response
      console.log(JSON.stringify({
        id: null,
        error: {
          code: -32603,
          message: `Internal error: ${error.message}`
        }
      }));
    }
  });

  // Handle errors on stdin
  process.stdin.on('error', (error) => {
    log(`Error on stdin: ${error.message}`);
    log(error.stack);
  });

  // Handle program termination
  process.on('SIGINT', () => {
    log('Server shutting down due to SIGINT...');
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    log('Server shutting down due to SIGTERM...');
    process.exit(0);
  });

  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    log(`Uncaught exception: ${error.message}`);
    log(error.stack);
    process.exit(1);
  });

  // Handle unhandled rejections
  process.on('unhandledRejection', (reason, promise) => {
    log(`Unhandled rejection at: ${promise}, reason: ${reason}`);
    if (reason instanceof Error) {
      log(reason.stack);
    }
    process.exit(1);
  });
}

// Start the process by loading the bir1 module
loadBir();