# ANGUNET MCP Server

This dependency-free MCP server exposes project startup help for AI clients.

Run it from the repository root:

```bash
node mcp-server/server.js
```

It provides:

- Resources: `angunet://overview`, `angunet://startup`, `angunet://environment`
- Tools: `get_start_commands`, `get_environment_urls`, `list_project_structure`
- Prompt: `start-angunet`

Use this command in an MCP client configuration:

```json
{
  "command": "node",
  "args": ["mcp-server/server.js"],
  "cwd": "C:\\Users\\hp\\Documents\\Projects\\angunet"
}
```
