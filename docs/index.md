---
title: TimeToPost MCP server — schedule social media posts from an AI agent
description: Open-source (MIT) MCP server that lets Claude, Cursor and other AI agents schedule posts to X, Bluesky, Mastodon and more, keep a human-approval queue, read analytics and run an SEO blog.
---

# TimeToPost MCP server

**Schedule social media posts from Claude, Cursor or any MCP client.** The TimeToPost MCP server is an MIT-licensed adapter over the TimeToPost REST API. Your agent can list your connected accounts, draft, schedule, publish and cancel posts, keep drafts in a human-approval queue, read engagement analytics and run AutoSEO for a blog. Every call uses your own token, so the same plan limits, workspace scoping and publishing pipeline apply as in the web app.

- **Hosted server:** `https://api.timetopost.co/mcp` (sign in from the browser, no token to paste)
- **npm package:** [`timetopost-mcp`](https://www.npmjs.com/package/timetopost-mcp) (stdio)
- **Product docs:** [timetopost.co/mcp](https://timetopost.co/mcp?utm_source=github&utm_medium=docs&utm_campaign=ttp-mcp-docs)

*Made by the TimeToPost team.*

## Quick start

### Option A: hosted (zero setup)

```bash
claude mcp add --transport http timetopost https://api.timetopost.co/mcp
```

Sign in with your email and a 6-digit code. The token this creates is a normal TimeToPost API token, visible and revocable in **Settings → API**.

### Option B: local stdio package

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

Or with the Claude Code CLI:

```bash
claude mcp add timetopost \
  -e TIMETOPOST_API_URL=https://api.timetopost.co \
  -e TIMETOPOST_API_TOKEN=<your token> \
  -- npx -y timetopost-mcp
```

Create the token at timetopost.co → Settings → API.

## First three calls

1. `whoami`: confirm which workspace the agent is acting in.
2. `get_capabilities`: the machine-readable map of every tool, lifecycle and idempotency rule. Trust it over guesses.
3. `list_integrations`: the accounts you connected, with the ids `schedule_post` needs.

## What the agent can do

The hosted server exposes 73 tools; the npm package registers 65 of them (the other 8 are hosted-only).

| Area | Tools |
|---|---|
| Core | `whoami`, `get_capabilities`, `list_integrations`, `get_tiktok_creator_info`, `list_boards` |
| Posts and publishing | `list_posts`, `get_post`, `schedule_post`, `publish_post`, `cancel_post`, `publish_thread`, `scheduler_status` |
| Human-approval drafts | `create_drafts`, `list_drafts`, `approve_draft`, `reject_draft`, `list_approvals` (read-only, all pending reviews in one call) |
| Analytics | `get_engagement_summary`, `get_optimal_times`, `get_post_metrics`, `list_brands`, `get_engagement_by_tag` |
| AutoSEO (any blog) | `autoseo_connect_site`, `autoseo_integration_kit`, `autoseo_verify_site`, `autoseo_list_sites`, `autoseo_configure`, `autoseo_auto_configure`, `autoseo_propose_topics`, `autoseo_mine_questions`, `autoseo_generate_post`, `autoseo_import_article`, `autoseo_import_batch` |

## Prompts that work

- *"Draft three posts about this changelog for X and Bluesky and put them in my approval queue. Don't schedule anything."*
- *"When do my posts get the most engagement this month? Schedule tomorrow's post in the best slot."*
- *"Turn this blog post into a 5-tweet thread and schedule it for 09:00 Europe/Paris on Thursday."*

## Safety rails worth knowing

- **Drafts by default.** `schedule_post` without `scheduledAt` creates a draft. Agents should only add a time when you've said to publish.
- **TikTok:** privacy, comment/duet/stitch settings and the branded-content answer must come from you, never a default. Call `get_tiktok_creator_info` first.
- **Pinterest:** exactly one image and a `boardId` from `list_boards`.
- **Uncertain delivery** (`deliveryUnknown`) is held for review rather than retried, so nothing is double-posted.
- Always include a timezone offset (`Z` or `+02:00`) in times.

## Recipes

- [Agent morning routine: schedule today's videos on every account](morning-routine.md)

## Develop from source

```bash
git clone https://github.com/MelMayssonOwen/timetopost-mcp.git
cd timetopost-mcp
npm install
npm run build   # outputs dist/src/
```

Point your client at `node dist/src/index.js`. Smoke test: `npm run build && TIMETOPOST_API_TOKEN="<jwt>" npm run test:smoke`.

## License

MIT.
