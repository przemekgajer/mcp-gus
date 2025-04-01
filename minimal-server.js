#!/usr/bin/env node
// minimal-server.js - A minimal server for GUS REGON API without MCP SDK dependencies
// This implementation follows the MCP protocol but doesn't use the SDK

// First, install bir1 package: npm install bir1@3.0.2

const readline = require('readline');

// We need to load bir1 asynchronously since it's an ES Module
let Bir;
async function loadBir() {
  try {
    // Dynamic import for ES Modules
    const bir1 = await import('bir1');
    Bir = bir1.default;
    startServer();
  } catch (error) {
    console.error(`Error loading bir1 module: ${error.message}`);
    console.error('Make sure you have installed bir1: npm install bir1@3.0.2');
    process.exit(1);
  }
}

// Function to start server after bir1 is loaded
async function startServer() {
  // Check if API key exists
  const apiKey = process.env.GUS_API_KEY;
  if (!apiKey) {
    console.error("Missing GUS API key. Set the GUS_API_KEY environment variable.");
    process.exit(1);
  }

  // Create GUS client
  let gusClient;
  try {
    // Try with different initialization options depending on bir1 version
    try {
      // First try without normalization function
      gusClient = new Bir({ 
        key: apiKey
      });
      console.error("Successfully initialized GUS client without normalization function");
    } catch (innerError) {
      console.error(`First initialization attempt failed: ${innerError.message}`);
      // If that fails, try with another approach
      gusClient = new Bir(apiKey);
      console.error("Successfully initialized GUS client with direct API key");
    }
  } catch (error) {
    console.error(`Error initializing GUS client: ${error.message}`);
    process.exit(1);
  }

  // Create readline interface for STDIN/STDOUT communication
  const rl = readline.createInterface({
    input: process.stdin,
    output: null,
    terminal: false
  });

  // Server info
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
      const parsed = JSON.parse(message);
      
      // Handle initialization request
      if (parsed.type === 'initialize' && parsed.params) {
        return {
          id: parsed.id,
          result: {
            server: serverInfo
          }
        };
      }
      
      // Handle tool execution
      if (parsed.type === 'request' && parsed.method === 'execute' && parsed.params) {
        const { tool, input } = parsed.params;
        
        // Handle regon_search tool
        if (tool === 'regon_search' && input && input.nip) {
          try {
            // Validate and format NIP
            const nipFormatted = input.nip.replace(/[^0-9]/g, '');
            if (nipFormatted.length !== 10) {
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
            console.error(`Searching for entity with NIP: ${nipFormatted}...`);
            const result = await gusClient.search({ nip: nipFormatted });
            
            if (!result || (Array.isArray(result) && result.length === 0)) {
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
              console.error(`Fetching detailed report for REGON: ${basicData.Regon}...`);
              console.error(`Using REGON: ${basicData.Regon || 'undefined'}`);
              
              // Get the REGON value safely
              const regonValue = basicData.Regon || 
                                 basicData.regon || 
                                 basicData.REGON || 
                                 Object.keys(basicData).find(k => k.toLowerCase().includes('regon'));
              
              if (!regonValue) {
                throw new Error("Could not find REGON in the response data");
              }
              
              console.error(`Normalized REGON value: ${regonValue}`);
              
              const fullReport = await gusClient.report({ 
                regon: regonValue, 
                report: reportName 
              });
              
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
              console.error(`Error fetching report: ${err.message}`);
              outputData._reportError = `Failed to fetch full report: ${err.message}`;
            }
            
            // Return formatted result
            return {
              id: parsed.id,
              result: {
                content: [{
                  type: "text",
                  text: JSON.stringify(outputData, null, 2)
                }]
              }
            };
          } catch (error) {
            console.error(`Error processing request: ${error.message}`);
            return {
              id: parsed.id,
              result: {
                content: [{
                  type: "text",
                  text: `Error retrieving data from GUS REGON API: ${error.message}`
                }]
              }
            };
          }
        }
        
        // Unknown tool or missing parameters
        return {
          id: parsed.id,
          error: {
            code: -32601,
            message: `Unknown tool or invalid parameters: ${tool}`
          }
        };
      }
      
      // Unknown message type
      return {
        id: parsed.id || null,
        error: {
          code: -32600,
          message: "Invalid request"
        }
      };
    } catch (error) {
      console.error(`Error handling message: ${error.message}`);
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
  console.error('GUS REGON API server started. Waiting for input...');

  rl.on('line', async (line) => {
    try {
      if (!line.trim()) return;
      
      const response = await handleMessage(line);
      console.log(JSON.stringify(response));
    } catch (error) {
      console.error(`Error processing line: ${error.message}`);
      console.log(JSON.stringify({
        id: null,
        error: {
          code: -32603,
          message: `Internal error: ${error.message}`
        }
      }));
    }
  });

  // Handle program termination
  process.on('SIGINT', () => {
    console.error('Server shutting down...');
    process.exit(0);
  });
}

// Start the process by loading the bir1 module
loadBir();