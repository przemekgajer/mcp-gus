# GUS REGON MCP Server

An MCP server for fetching Polish company data from the GUS REGON database using NIP (VAT number).

## Features

- Query Polish companies by NIP (VAT) number
- Get detailed company information including address, registration data, etc.
- Fully compatible with Model Context Protocol (MCP)
- Ready for n8n and other MCP clients
- Enhanced logging and diagnostics for troubleshooting

## Installation

### Using npm (For n8n Integration)

```bash
# Install globally (recommended for n8n)
npm install -g gus-regon-mcp-server

# Or install it locally
npm install gus-regon-mcp-server
```

### Using npx (Alternative)

If you prefer not to install the package, use npx:

```bash
# Let npx handle installation
npx -y gus-regon-mcp-server
```

## Configuration

Create or update your `mcp.json` file with:

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
      "description": "GUS REGON API server for Polish company data"
    }
  }
}
```

## Usage

### MCP Tools

The server provides the following MCP tools:

1. **regon_search**: Search for a company by NIP (VAT number)
   - Parameter: `nip` - Polish VAT number (10 digits)

### Example Usage with n8n

1. Add an MCP node in your n8n workflow
2. Select "gus-regon" from the server dropdown
3. Choose "regon_search" as the operation
4. Enter a NIP number (e.g., "5261040567")
5. Run the workflow

## Troubleshooting

If you encounter issues with n8n integration, please see the [N8N_INTEGRATION.md](./N8N_INTEGRATION.md) guide for detailed troubleshooting steps.

## API Key

To obtain a GUS REGON API key:
1. Register at [api.stat.gov.pl/Home/RegonApi](https://api.stat.gov.pl/Home/RegonApi)
2. Complete the registration process
3. Your API key will be provided after approval

## License

MIT