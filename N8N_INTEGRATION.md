# n8n Integration Guide

This guide helps you fix connection issues when using the GUS REGON MCP server with n8n.

## Common Error

If you see the error:
```
NodeOperationError: Failed to execute operation: Failed to connect to MCP server: MCP error -32000: Connection closed
```

This indicates that n8n couldn't establish or maintain a connection with the MCP server.

## Solution Steps

### 1. Use Direct File Path in mcp.json

The most reliable way to connect is using an absolute path to the server script:

```json
{
  "mcpServers": {
    "gus-regon": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-gus/debug-server.js"],
      "env": {
        "GUS_API_KEY": "your_api_key_here"
      },
      "description": "GUS REGON API server for retrieving Polish company data"
    }
  }
}
```

### 2. Install Required Dependencies

Make sure all required dependencies are installed:

```bash
cd /path/to/mcp-gus
npm install bir1@3.0.2
```

### 3. Set Correct Permissions

Ensure script files are executable:

```bash
chmod +x /path/to/mcp-gus/debug-server.js
```

### 4. Verify Environment Variables

Make sure your GUS API key is valid and properly set in the mcp.json configuration.

### 5. Check Log Files

For a detailed view of what's happening, check:
- The debug server log: `mcp-server-debug.log`
- Your n8n logs

### 6. Test Outside n8n

Use the diagnostic script to test the server outside of n8n:

```bash
node n8n-test.js
```

This will create a `n8n-test.log` file with detailed information about the communication.

### 7. n8n Configuration

In n8n:
1. Add an MCP node
2. Select "gus-regon" from the server dropdown
3. Choose "regon_search" as the operation
4. Enter a valid NIP (VAT number) in the input field

### 8. Debug Using Browser Dev Tools

If you're using n8n's web interface:
1. Open browser developer tools (F12)
2. Go to Network tab
3. Look for WebSocket connections
4. Check for any error messages in the Console tab

## Working Configuration Example

```json
{
  "mcpServers": {
    "gus-regon": {
      "command": "npx",
      "args": [
        "-y",
        "gus-regon-mcp-server"
      ],
      "env": {
        "GUS_API_KEY": "your_api_key_here",
        "NODE_DEBUG": "mcp*,bir*,net,stream"
      },
      "description": "GUS REGON API server for company data"
    }
  }
}
```

### Installation Requirements

Before using this configuration, ensure the package is installed:

```bash
# Install globally (recommended for n8n)
npm install -g gus-regon-mcp-server

# Or let npx install it on demand
```

## Need More Help?

If you're still experiencing issues:
1. Run the test script: `node n8n-test.js`
2. Check all log files
3. Make sure bir1 library is correctly installed
4. Verify your GUS API key is valid and hasn't expired