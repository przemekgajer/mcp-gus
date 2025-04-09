#!/usr/bin/env node
// test-api.js - Direct test of GUS API access without MCP
const fs = require('fs');

// Try to load bir1 synchronously first
async function runTest() {
  try {
    console.log('Testing GUS API access...');
    
    // Get API key from environment
    const apiKey = process.env.GUS_API_KEY;
    if (!apiKey) {
      console.error('ERROR: GUS_API_KEY environment variable is not set.');
      process.exit(1);
    }
    
    console.log(`Using API key with length: ${apiKey.length}`);
    
    // Import bir1 dynamically
    const bir1 = await import('bir1');
    const Bir = bir1.default;
    
    console.log('Initializing GUS client...');
    let gusClient;
    
    try {
      // First try with modern config
      gusClient = new Bir({ 
        key: apiKey 
      });
      console.log('Initialized client with object configuration');
    } catch (error) {
      console.log(`First initialization attempt failed: ${error.message}`);
      
      // Try simpler approach
      gusClient = new Bir(apiKey);
      console.log('Initialized client with direct key');
    }
    
    // Test NIP search
    const testNip = '6443307781'; // GUS NIP
    console.log(`Searching for NIP: ${testNip}...`);
    
    const result = await gusClient.search({ nip: testNip });
    
    if (result) {
      console.log('API SEARCH SUCCESSFUL!');
      console.log('========== SEARCH RESULT ==========');
      console.log(JSON.stringify(result, null, 2));
      
      // Test report fetch
      if (Array.isArray(result) && result.length > 0) {
        const entity = result[0];
        const regon = entity.Regon;
        
        if (regon) {
          console.log(`\nFetching full report for REGON: ${regon}...`);
          
          const reportType = (entity.Typ === 'P') 
            ? 'PublDaneRaportPrawna' 
            : 'PublDaneRaportDzialalnosciFizycznej';
            
          const fullReport = await gusClient.report({
            regon: regon,
            report: reportType
          });
          
          console.log('========== FULL REPORT ==========');
          console.log(JSON.stringify(fullReport, null, 2));
        }
      }
    } else {
      console.log('API SEARCH RETURNED EMPTY RESULT');
    }
    
    // Write results to file for inspection
    fs.writeFileSync('gus-api-test-results.json', JSON.stringify({
      apiKeyLength: apiKey.length,
      searchResult: result
    }, null, 2));
    
    console.log('\nTest completed successfully!');
    console.log('Results saved to gus-api-test-results.json');
  
  } catch (error) {
    console.error(`\nTEST FAILED: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
}

console.log('Starting GUS API test...');
runTest();