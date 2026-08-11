#!/usr/bin/env node
/**
 * TimeToPost MCP server — stdio transport.
 *
 * For local clients (Claude Code / Desktop). Auth via a bearer token in the
 * environment (a TimeToPost JWT). The hosted "add a URL + browser OAuth"
 * experience is the Streamable HTTP server (src/http.ts).
 *
 * Env:
 *   TIMETOPOST_API_URL    backend base (default https://api.timetopost.co)
 *   TIMETOPOST_API_TOKEN  TimeToPost JWT for the user (required)
 *   TIMETOPOST_ORG_ID     optional org override sent as x-ttp-org
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { TimeToPostApi } from './api.js';
import { registerTools, WRITING_STYLE_GUIDELINE } from './tools.js';

const API_URL = process.env.TIMETOPOST_API_URL || 'https://api.timetopost.co';
const TOKEN = process.env.TIMETOPOST_API_TOKEN || '';
const ORG_ID = process.env.TIMETOPOST_ORG_ID || undefined;

async function main() {
  if (!TOKEN) {
    console.error('TIMETOPOST_API_TOKEN is required for the stdio server.');
    process.exit(1);
  }
  const server = new McpServer(
    { name: 'timetopost', version: '0.1.0' },
    { instructions: WRITING_STYLE_GUIDELINE }
  );
  const api = new TimeToPostApi(API_URL, TOKEN, ORG_ID);
  registerTools(server, () => api);

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`TimeToPost MCP (stdio) connected → ${API_URL}${ORG_ID ? ` org=${ORG_ID}` : ''}`);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
