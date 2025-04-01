# CLAUDE.md - MCP-GUS Project Guide

## Commands
- **Run**: `npm start` or `node index.js` - starts MCP server
- **Install**: `npm ci` (clean) or `npm i` (regular)
- **Global Usage**: `npx -y gus-regon-mcp-server` (uses mcp.json config)
- **Environment**: Required `GUS_API_KEY=abc123` before running
- **Debug**: `NODE_DEBUG=mcp* node index.js` for detailed logs
- **As Binary**: After `npm link`, use `gus-regon-mcp-server` command

## Code Style
- **Project Type**: ES Modules (specified in package.json)
- **Imports**: Use ES imports `import {x} from 'y'` (not require)
- **MCP Patterns**: Follow ModelContextProtocol SDK structure for tools
- **Validation**: Use Zod schemas for input validation
- **Polish Terms**: API responses use Polish; variable names should be English
- **Error Handling**: Wrap GUS API calls in try/catch, preserve context
- **JSON Responses**: Format with 2-space indent via JSON.stringify(x, null, 2)
- **Structure**: Prefer async/await over promise chains
- **Security**: Never hardcode API keys, use environment variables