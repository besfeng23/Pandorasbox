# Claude Desktop MCP Server Configuration

## Firebase MCP Server Setup for Claude Desktop

To fix the "Error" status in Claude Desktop, you need to add the Pandora's Box MCP server to Claude Desktop's configuration.

### Step 1: Find Claude Desktop Config File

The config file location depends on your OS:

- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`

### Step 2: Edit the Config File

Open `claude_desktop_config.json` and add the following configuration:

```json
{
  "mcpServers": {
    "pandoras-box": {
      "command": "node",
      "args": [
        "--loader",
        "tsx/esm",
        "C:\\Users\\Administrator\\Downloads\\New folder\\Pandorasbox\\src\\mcp\\index.ts"
      ],
      "env": {
        "OPENAI_API_KEY": "your_openai_api_key_here",
        "MCP_API_KEY": "OKepTRWlwBohzaEbCGQgcUZXjI34m7qL"
      }
    }
  }
}
```

**Important Notes:**

1. **Update the path**: Replace `C:\\Users\\Administrator\\Downloads\\New folder\\Pandorasbox\\src\\mcp\\index.ts` with your actual absolute path to the MCP server file.

2. **Install tsx**: The server uses TypeScript, so you need `tsx` to run it:
   ```bash
   npm install -g tsx
   ```
   Or use `npx tsx` instead:
   ```json
   {
     "mcpServers": {
       "pandoras-box": {
         "command": "npx",
         "args": [
           "-y",
           "tsx",
           "C:\\Users\\Administrator\\Downloads\\New folder\\Pandorasbox\\src\\mcp\\index.ts"
         ],
         "env": {
           "OPENAI_API_KEY": "your_openai_api_key_here",
           "MCP_API_KEY": "OKepTRWlwBohzaEbCGQgcUZXjI34m7qL"
         }
       }
     }
   }
   ```

3. **Environment Variables**: 
   - Set `OPENAI_API_KEY` to your OpenAI API key
   - Set `MCP_API_KEY` (optional, defaults to `CHATGPT_API_KEY`)

4. **Firebase Service Account**: The MCP server also needs Firebase credentials. Make sure `serviceAccountKey.json` exists in the project root, or set up Application Default Credentials.

### Step 3: Restart Claude Desktop

After updating the config file, restart Claude Desktop completely for the changes to take effect.

### Alternative: Use Compiled JavaScript

If you prefer to use compiled JavaScript instead of TypeScript:

1. Build the project:
   ```bash
   npm run build
   ```

2. Use the compiled JavaScript path in the config (you'll need to check the build output location).

### Troubleshooting

If you still see an error:

1. **Check the path**: Make sure the path to `index.ts` is correct and uses forward slashes or escaped backslashes
2. **Check dependencies**: Run `npm install` in the Pandorasbox directory
3. **Check tsx**: Run `tsx src/mcp/index.ts` manually to see if there are any errors
4. **Check logs**: Claude Desktop may show error messages in its console (View → Developer → Show Developer Tools)
5. **Check environment variables**: Make sure OPENAI_API_KEY is set correctly

### Verification

After configuration, the Firebase MCP server should:
- Show a green status (no red error dot)
- Be toggleable (can enable/disable)
- Appear in Claude's available tools when enabled

