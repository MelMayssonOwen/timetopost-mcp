# Install TimeToPost MCP in Cline

This file is for an AI agent such as Cline that installs the server for a user. Follow the steps in order.

There are two ways to connect. Use the local stdio setup unless the user asks for the hosted server, because it works without a browser sign-in.

## Option A: local stdio server (needs an API token)

1. Ask the user for their TimeToPost API token. It comes from Settings, then API, in their TimeToPost dashboard. Do not invent a token and do not continue without one. Never print the token back or commit it. The user's own settings file is the right place for it, so write it into the `env` block in step 4.
2. Check that Node.js 18 or later, npm and Git are installed (`node -v`, `npm -v`, `git --version`).
3. Create the server directory, then clone and build from the repository root:

```bash
mkdir -p ~/Documents/Cline/MCP
cd ~/Documents/Cline/MCP
git clone https://github.com/MelMayssonOwen/timetopost-mcp.git
cd timetopost-mcp
npm install
npm run build
```

The built entry point is `dist/src/index.js`. If the build fails, report the error to the user instead of guessing.

4. Read the user's existing `cline_mcp_settings.json` first, then add this entry under `mcpServers` without removing other servers. Use the server name `timetopost` and the absolute path to the checkout:

```json
{
  "mcpServers": {
    "timetopost": {
      "command": "node",
      "args": ["/absolute/path/to/timetopost-mcp/dist/src/index.js"],
      "env": {
        "TIMETOPOST_API_URL": "https://api.timetopost.co",
        "TIMETOPOST_API_TOKEN": "THE_USERS_TOKEN"
      }
    }
  }
}
```

Write the real token into `TIMETOPOST_API_TOKEN` in the settings file. Do not leave the placeholder in place and do not ask the user to edit it later.

5. Restart or refresh the server in Cline's MCP settings. The stdio server exposes 62 tools.
6. Verify the connection by calling the `whoami` tool. It is read only. Tell the user which workspace it returns. If `whoami` fails with an authorization error, ask the user to check the token.

## Option B: hosted server (browser sign-in)

The hosted server at `https://api.timetopost.co/mcp` exposes 77 tools and uses OAuth, so the user must complete a sign-in in their browser. Add this entry under `mcpServers`:

```json
{
  "mcpServers": {
    "timetopost": {
      "url": "https://api.timetopost.co/mcp",
      "type": "streamableHttp"
    }
  }
}
```

Then ask the user to finish the browser sign-in when Cline prompts for it, and verify with `whoami`.

## Notes

- `TIMETOPOST_ORG_ID` is optional. Set it only to pick a specific workspace, and confirm the choice with `whoami`.
- Some tools write or publish content. Call `get_capabilities` and `whoami` before any write action, and use only read tools when demonstrating the install.
