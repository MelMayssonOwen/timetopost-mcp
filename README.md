# TimeToPost MCP server

An [MCP](https://modelcontextprotocol.io) server that lets AI agents (Claude, etc.)
drive TimeToPost: list connected accounts, draft/schedule/publish/cancel posts, run
AutoSEO, and read analytics. It's a thin adapter over the existing REST API — every
tool calls `api.timetopost.co` with the caller's token, so all auth, org-scoping,
validation and publishing logic is reused (never duplicated).

The exact same 32 tools are exposed identically on both surfaces this package
ships alongside — the hosted Streamable HTTP endpoint (`backend/src/mcp/server.ts`)
and this npm/stdio package (`mcp/src/tools.ts`) — enforced by a CI parity test
(`backend/src/__tests__/unit/mcp-parity.test.ts`).

## Tools (32)

Call `get_capabilities` first — it returns the authoritative, machine-readable map
of everything below (lifecycles, idempotency contracts, terminology) and should be
trusted over inferences from other tools' raw fields.

**Core**
`whoami` · `get_capabilities` · `list_integrations` · `get_tiktok_creator_info` · `list_boards`

**Posts & publishing**
`list_posts` · `get_post` · `schedule_post` · `publish_post` · `cancel_post` ·
`publish_thread` · `scheduler_status`

**Engine drafts (human-approval queue)**
`create_digest_drafts` · `create_drafts` (alias of `create_digest_drafts` — same
mechanism, name doesn't imply digest-only) · `list_drafts` · `approve_draft` ·
`reject_draft`

**Unified approvals rail**
`list_approvals` — READ-ONLY: one call returns everything pending human review
across all four automation sources (posts/EngineDraft, trends/Trend-Rider,
build-in-public tweet drafts, and warm-lead engager DMs), normalized into a
common shape with per-source counts. `approve_draft`/`reject_draft` above remain
the only MCP-side approval actions (for the `posts` source); approving a trend,
build-in-public or DM item is a dashboard action for now.

**Analytics & brands**

Note: a "brand" here is a niche/play attribution *tag* on a post (see
`list_brands`) — unrelated to BrandVoice, the org's single AI writing-style
profile used to guide AI content generation. An org has one BrandVoice but can
have many brands.

`get_engagement_summary` · `get_optimal_times` · `get_post_metrics` ·
`list_brands` · `get_engagement_by_tag`

**AutoSEO** (any-blog AI content engine — see `.claude/skills` / `get_capabilities`
for the full connect → integrate → verify → configure → generate flow)
`autoseo_connect_site` · `autoseo_integration_kit` · `autoseo_verify_site` ·
`autoseo_list_sites` · `autoseo_configure` · `autoseo_auto_configure` ·
`autoseo_propose_topics` · `autoseo_generate_post`

Public docs: **https://timetopost.co/mcp**

## Install (any MCP client — Claude Code, Claude Desktop, Cursor)

Published on npm as [`timetopost-mcp`](https://www.npmjs.com/package/timetopost-mcp):

```json
{
  "mcpServers": {
    "timetopost": {
      "command": "npx",
      "args": ["-y", "timetopost-mcp"],
      "env": {
        "TIMETOPOST_API_URL": "https://api.timetopost.co",
        "TIMETOPOST_API_TOKEN": "${TIMETOPOST_API_TOKEN}"
      }
    }
  }
}
```

Or via the Claude Code CLI:

```bash
claude mcp add timetopost \
  -e TIMETOPOST_API_URL=https://api.timetopost.co \
  -e TIMETOPOST_API_TOKEN=<your token> \
  -- npx -y timetopost-mcp
```

## Develop from source

```bash
cd mcp
npm install
npm run build   # outputs dist/src/
```

Point your MCP config at `node mcp/dist/src/index.js` instead of npx.

Smoke test:

```bash
npm run build && TIMETOPOST_API_TOKEN="<jwt>" npm run test:smoke
```

## Prefer zero setup? Use the hosted server (browser OAuth, no tokens)

The hosted Streamable HTTP server is live at **`https://api.timetopost.co/mcp`** —
add it to any remote-capable MCP client and sign in from the browser (email +
6-digit code). No installation, no token pasting:

```bash
claude mcp add --transport http timetopost https://api.timetopost.co/mcp
```

The OAuth access token it mints is a regular TimeToPost API token — visible and
revocable in **Settings → API** — so org-scoping and plan limits are enforced by
the backend exactly as for the web app. This npm package remains the right choice
for clients that only speak stdio, or when you want the process local.
