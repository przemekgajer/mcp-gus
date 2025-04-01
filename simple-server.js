#!/usr/bin/env node
// simple-server.js - Direct MCP server for GUS REGON API

// First, manually install dependencies:
// npm install @modelcontextprotocol/sdk@1.8.0 bir1@3.0.2 zod@3.21.4

try {
  // Main imports
  const sdk = require('@modelcontextprotocol/sdk');
  const { z } = require('zod');
  const Bir = require('bir1').default;

  // Check API key
  const apiKey = process.env.GUS_API_KEY;
  if (!apiKey) {
      console.error("Missing GUS API key. Set the GUS_API_KEY environment variable.");
      process.exit(1);
  }

  // Initialize GUS REGON client
  const gusClient = new Bir({ 
      key: apiKey,
      normalizeFn: 'modern' // For consistent field naming
  });

  // Create MCP server
  const server = new sdk.McpServer({
      name: "GUS-REGON-API",
      version: "1.1.0",
      description: "MCP server for Polish company data"
  });

  // Define NIP search tool
  server.tool(
      "regon_search",
      { nip: z.string().describe("Polish VAT number (NIP) - 10 digits") },
      async ({ nip }) => {
          try {
              // Validate NIP format
              const nipFormatted = nip.replace(/[^0-9]/g, '');
              if (nipFormatted.length !== 10) {
                  return { 
                      content: [{ type: "text", text: `Invalid NIP format: ${nip}. Must be 10 digits.` }] 
                  };
              }

              // Search for entity
              console.log(`Searching for NIP: ${nipFormatted}...`);
              const result = await gusClient.search({ nip: nipFormatted });
              
              if (!result || (Array.isArray(result) && result.length === 0)) {
                  return { 
                      content: [{ type: "text", text: `No entity found for NIP: ${nipFormatted}.` }] 
                  };
              }

              // Process results
              const basicData = Array.isArray(result) ? result[0] : result;
              let outputData = { ...basicData };

              // Get report type based on entity type
              const entityType = basicData.Typ;
              const reportName = (entityType === 'P') 
                  ? 'PublDaneRaportPrawna' 
                  : 'PublDaneRaportDzialalnosciFizycznej';

              try {
                  // Fetch full report
                  console.log(`Fetching report for REGON: ${basicData.Regon}...`);
                  const fullReport = await gusClient.report({ 
                      regon: basicData.Regon, 
                      report: reportName 
                  });
                  
                  if (fullReport) {
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
                  outputData._reportError = `Report fetch error: ${err.message}`;
              }

              return {
                  content: [{
                      type: "text",
                      text: JSON.stringify(outputData, null, 2)
                  }]
              };
          } catch (error) {
              return {
                  content: [{
                      type: "text",
                      text: `API error: ${error.message}`
                  }]
              };
          }
      }
  );

  // Start server with stdio transport
  const transport = new sdk.StdioServerTransport();
  server.connect(transport);
  
  console.log("GUS REGON MCP server running");

} catch (error) {
  console.error(`Server error: ${error.message}`);
  console.error("Make sure you've installed required dependencies:");
  console.error("npm install @modelcontextprotocol/sdk@1.8.0 bir1@3.0.2 zod@3.21.4");
  process.exit(1);
}