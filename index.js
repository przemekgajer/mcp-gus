#!/usr/bin/env node
// index.js - Enhanced MCP server for GUS REGON API integration

// Import MCP SDK modules with correct paths
const { McpServer } = require('@modelcontextprotocol/sdk/dist/cjs/server/mcp.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/dist/cjs/server/stdio.js');
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
const server = new McpServer({
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
                        text: `Invalid NIP format: ${nip}. NIP must contain 10 digits.` 
                    }] 
                };
            }

            // Search for entity by NIP
            console.log(`Searching for entity with NIP: ${nipFormatted}...`);
            const result = await gusClient.search({ nip: nipFormatted });
            
            if (!result || (Array.isArray(result) && result.length === 0)) {
                return { 
                    content: [{ 
                        type: "text", 
                        text: `No entity found for NIP: ${nipFormatted}.` 
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
                console.log(`Fetching detailed report for REGON: ${basicData.Regon}...`);
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
                outputData._reportError = `Failed to fetch full report: ${err.message}`;
                console.error(`Error fetching report: ${err.message}`);
            }

            // Return formatted result as JSON
            return {
                content: [{
                    type: "text",
                    text: JSON.stringify(outputData, null, 2)
                }]
            };
        } catch (error) {
            console.error(`Error processing request: ${error.message}`);
            return {
                content: [{
                    type: "text",
                    text: `Error retrieving data from GUS REGON API: ${error.message}`
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
                        text: `Invalid REGON format: ${regon}. REGON must contain 9 or 14 digits.` 
                    }] 
                };
            }

            // Fetch PKD codes report
            console.log(`Fetching PKD codes for REGON: ${regonFormatted}...`);
            const pkdReport = await gusClient.report({ 
                regon: regonFormatted, 
                report: 'PublDaneRaportDzialalnosciPrawnej' 
            });
            
            if (!pkdReport) {
                return { 
                    content: [{ 
                        type: "text", 
                        text: `No PKD data found for REGON: ${regonFormatted}.` 
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
            console.error(`Error processing PKD request: ${error.message}`);
            return {
                content: [{
                    type: "text",
                    text: `Error retrieving PKD data from GUS REGON API: ${error.message}`
                }]
            };
        }
    }
);

// Start MCP server using STDIN/STDOUT transport
const transport = new StdioServerTransport();
server.connect(transport);

console.log("GUS REGON MCP server started successfully!");
