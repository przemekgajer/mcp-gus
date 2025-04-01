#!/usr/bin/env node
// server.js - Simple MCP server for GUS REGON API integration

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// Install the required packages
function installDependencies() {
  return new Promise((resolve, reject) => {
    console.log('Installing required dependencies...');
    const npm = spawn('npm', ['install', '--save', '@modelcontextprotocol/sdk@1.8.0', 'bir1@3.0.2', 'zod@3.21.4']);
    
    npm.stdout.on('data', (data) => console.log(data.toString()));
    npm.stderr.on('data', (data) => console.error(data.toString()));
    
    npm.on('close', (code) => {
      if (code === 0) {
        console.log('Dependencies installed successfully');
        resolve();
      } else {
        reject(new Error(`npm install exited with code ${code}`));
      }
    });
  });
}

// Generate the MCP server code
function generateServerCode() {
  const serverCode = `
const sdk = require('@modelcontextprotocol/sdk');
const { z } = require('zod');
const Bir = require('bir1').default;

// Check if API key is provided via environment variable
const apiKey = process.env.GUS_API_KEY;
if (!apiKey) {
    console.error("Missing GUS API key. Set the GUS_API_KEY environment variable.");
    process.exit(1);
}

// Initialize GUS REGON client with modern response format
const gusClient = new Bir({ 
    key: apiKey,
    normalizeFn: 'modern' // Use modern format for consistent key naming
});

// Initialize MCP server
const server = new sdk.McpServer({
    name: "GUS-REGON-API",
    version: "1.1.0",
    description: "MCP server for fetching Polish company data from GUS REGON by NIP (VAT number)"
});

// Define MCP tool for searching by NIP (VAT number)
server.tool(
    "regon_search",
    {
        nip: z.string().describe("Polish VAT number (NIP) - 10 digits")
    },
    async ({ nip }) => {
        try {
            // Validate NIP format (basic validation)
            const nipFormatted = nip.replace(/[^0-9]/g, '');
            if (nipFormatted.length !== 10) {
                return { 
                    content: [{ 
                        type: "text", 
                        text: \`Invalid NIP format: \${nip}. NIP must contain 10 digits.\` 
                    }] 
                };
            }

            // Search for entity by NIP
            console.log(\`Searching for entity with NIP: \${nipFormatted}...\`);
            const result = await gusClient.search({ nip: nipFormatted });
            
            if (!result || (Array.isArray(result) && result.length === 0)) {
                return { 
                    content: [{ 
                        type: "text", 
                        text: \`No entity found for NIP: \${nipFormatted}.\` 
                    }] 
                };
            }

            // Process search results
            const basicData = Array.isArray(result) ? result[0] : result;
            let outputData = { ...basicData };

            // Select appropriate report type based on entity type
            // 'P' - legal entity, 'F' - natural person
            const entityType = basicData.Typ;
            const reportName = (entityType === 'P') 
                ? 'PublDaneRaportPrawna' 
                : 'PublDaneRaportDzialalnosciFizycznej';

            try {
                // Fetch detailed report for the entity
                console.log(\`Fetching detailed report for REGON: \${basicData.Regon}...\`);
                const fullReport = await gusClient.report({ 
                    regon: basicData.Regon, 
                    report: reportName 
                });
                
                if (fullReport) {
                    // Merge basic data and full report
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
                outputData._reportError = \`Failed to fetch full report: \${err.message}\`;
                console.error(\`Error fetching report: \${err.message}\`);
            }

            // Return formatted result as JSON
            return {
                content: [{
                    type: "text",
                    text: JSON.stringify(outputData, null, 2)
                }]
            };
        } catch (error) {
            console.error(\`Error processing request: \${error.message}\`);
            return {
                content: [{
                    type: "text",
                    text: \`Error retrieving data from GUS REGON API: \${error.message}\`
                }]
            };
        }
    }
);

// Add a tool to get PKD codes (business activity classifications)
server.tool(
    "get_pkd_codes",
    {
        regon: z.string().describe("REGON number of the company")
    },
    async ({ regon }) => {
        try {
            // Validate REGON format (basic validation)
            const regonFormatted = regon.replace(/[^0-9]/g, '');
            if (regonFormatted.length !== 9 && regonFormatted.length !== 14) {
                return { 
                    content: [{ 
                        type: "text", 
                        text: \`Invalid REGON format: \${regon}. REGON must contain 9 or 14 digits.\` 
                    }] 
                };
            }

            // Fetch PKD codes report
            console.log(\`Fetching PKD codes for REGON: \${regonFormatted}...\`);
            const pkdReport = await gusClient.report({ 
                regon: regonFormatted, 
                report: 'PublDaneRaportDzialalnosciPrawnej' 
            });
            
            if (!pkdReport) {
                return { 
                    content: [{ 
                        type: "text", 
                        text: \`No PKD data found for REGON: \${regonFormatted}.\` 
                    }] 
                };
            }

            // Return formatted result as JSON
            return {
                content: [{
                    type: "text",
                    text: JSON.stringify(pkdReport, null, 2)
                }]
            };
        } catch (error) {
            console.error(\`Error processing PKD request: \${error.message}\`);
            return {
                content: [{
                    type: "text",
                    text: \`Error retrieving PKD data from GUS REGON API: \${error.message}\`
                }]
            };
        }
    }
);

// Start MCP server using STDIN/STDOUT transport
const transport = new sdk.StdioServerTransport();
server.connect(transport);

console.log("GUS REGON MCP server started successfully!");
  `;

  fs.writeFileSync(path.join(__dirname, 'server-generated.js'), serverCode);
  console.log('Server code generated successfully at server-generated.js');
}

// Main function
async function main() {
  try {
    await installDependencies();
    generateServerCode();
    console.log('\nTo run the server:');
    console.log('1. Set your GUS API key:');
    console.log('   export GUS_API_KEY="your_api_key_here"');
    console.log('2. Run the server:');
    console.log('   node server-generated.js');
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();