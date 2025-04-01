# Publishing Guide

This guide explains how to publish the GUS REGON MCP server to npm so it can be used with n8n.

## Before Publishing

1. Make sure the `debug-server.js` is working correctly
2. Update version number in `package.json` if needed
3. Ensure all dependencies are correct in `package.json`

## Publishing Steps

### 1. Login to npm

```bash
# Login to your npm account
npm login
```

### 2. Prepare the Package

```bash
# Test the package locally
npm test

# Check what files will be included in the package
npm pack --dry-run
```

### 3. Publish the Package

```bash
# Publish to npm (public access required for first-time packages)
npm publish --access=public
```

### 4. Verify Publication

Visit your package on npm:
```
https://www.npmjs.com/package/gus-regon-mcp-server
```

### 5. Test with npx

```bash
# Test direct execution with npx (in a new directory)
GUS_API_KEY=your_key npx -y gus-regon-mcp-server
```

## Use with n8n

After publishing, update your n8n's mcp.json file:

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

## Updating the Package

1. Make your changes
2. Update the version in package.json (follow semantic versioning)
3. Run `npm publish` again

## Troubleshooting

### Package Name Already Taken

If the package name is already taken, you can:
1. Use a scoped package name: `@yourusername/gus-regon-mcp-server`
2. Choose a different package name

### Permission Issues

If you get permissions errors when installing globally, use:
```bash
sudo npm install -g gus-regon-mcp-server
```