# Quick Start Guide

This is a quick guide to get the GUS REGON MCP server up and running.

## 1. Installation

For local development, install the required packages:

```bash
# Install the bir1 package
npm install bir1@3.0.2
```

## 2. Set Up Environment

Set your GUS API key as an environment variable:

```bash
# Replace with your actual API key
export GUS_API_KEY="your_api_key_here"
```

## 3. Test the Server

Run the server directly:

```bash
node minimal-server.js
```

You should see:
```
GUS REGON API server started. Waiting for input...
```

## 4. Send Test Messages

Once the server is running, you can test it by typing the following MCP messages (each on a new line):

### Initialize:
```json
{"id":"1","type":"initialize","params":{"client":{"name":"test-client","version":"1.0.0"}}}
```

### Search by NIP (GUS - Polish Statistical Office):
```json
{"id":"2","type":"request","method":"execute","params":{"tool":"regon_search","input":{"nip":"5261040567"}}}
```

## 5. Set Up MCP Configuration

Create or update your `mcp.json` file in your project:

```json
{
  "mcpServers": {
    "gus-regon": {
      "command": "node",
      "args": ["minimal-server.js"],
      "env": {
        "GUS_API_KEY": "your_api_key_here"
      },
      "description": "GUS REGON API server for Polish company data"
    }
  }
}
```

## 6. For NPX Usage (After Publishing)

If the package is published to npm, update your `mcp.json` to:

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
        "GUS_API_KEY": "your_api_key_here"
      },
      "description": "GUS REGON API server for Polish company data"
    }
  }
}
```

## 7. Running with MCP Client

If you have an MCP client installed, you can test with:

```bash
mcp regon_search --nip "5261040567"
```

## Common Issues

- **API Key Error**: Make sure the GUS_API_KEY environment variable is set correctly
- **Module Error**: Check that bir1 package is installed (`npm install bir1@3.0.2`)
- **NIP Format Error**: NIP numbers must be 10 digits (spaces and dashes are automatically removed)
- **No Results**: The company might not exist or the NIP might be incorrect