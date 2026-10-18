# TimeToPost MCP server

[![AllMCPs Verified](https://allmcps.com/api/badge/timetopost)](https://allmcps.com/mcp/timetopost?verify=1897fbe5-133e-4146-a15e-3e3b7662a0cb)

The official [Model Context Protocol](https://modelcontextprotocol.io) server for
[TimeToPost](https://timetopost.co): draft, schedule and publish social posts,
manage approval queues, read analytics and run AutoSEO workflows from your AI
assistant.

Supported networks: Instagram, X, TikTok, Threads, Bluesky, Mastodon, Nostr,
Pixelfed, Telegram, Tumblr, WordPress, Ghost, DEV, Whop, Listmonk and Buttondown.
Coming soon: LinkedIn, YouTube, Pinterest, Discord, Slack, Lemmy, Dribbble, Kick, Twitch and Farcaster.

Mirror posting: post on X and it is mirrored to your other connected networks.

The hosted server exposes 70 tools; the npm/stdio package exposes 62 of them.
Call `get_capabilities` for what your workspace can use.

- Hosted MCP endpoint: **https://api.timetopost.co/mcp**
- Public setup and tool documentation: **[TimeToPost MCP docs](https://timetopost.co/docs/mcp/)**

## Recommended setup: hosted server with OAuth

Use the hosted Streamable HTTP server in an MCP client that supports remote
servers and OAuth. Add `https://api.timetopost.co/mcp`, then follow the browser
sign-in flow and approve access. No local installation or API token copying is
needed.

For Claude Code:

```bash
claude mcp add --transport http timetopost https://api.timetopost.co/mcp
```

For clients that accept URL-based MCP configuration:

```json
{
  "mcpServers": {
    "timetopost": {
      "url": "https://api.timetopost.co/mcp"
    }
  }
}
```

Client-specific setup details are in the [public docs](https://timetopost.co/docs/mcp/).
You can revoke access from **Settings → API** in TimeToPost.

## Claude Code plugin and skill

This repo is also a Claude Code plugin marketplace. The `timetopost` plugin
bundles the hosted MCP server and a `schedule-social-posts` skill that runs the
safe workflow: check the workspace with `whoami`, read recent posts for voice,
draft first, let a human approve, then schedule.

```text
/plugin marketplace add MelMayssonOwen/timetopost-mcp
/plugin install timetopost@timetopost
```

Then sign in to TimeToPost when Claude Code prompts for MCP authentication.

Other ways to install:

- **Skill only, any harness that reads `SKILL.md` folders.** Copy
  `plugins/timetopost/skills/schedule-social-posts` into `~/.claude/skills/`
  (or your project's `.claude/skills/`), and add the MCP server separately.
- **MCP server only:**
  `claude mcp add --transport http timetopost https://api.timetopost.co/mcp`

## Before using tools

1. Call `whoami` to confirm your user, active workspace and credential permissions.
2. Call `get_capabilities` for the current capability map, platform availability
   and workflow rules.
3. Call `list_integrations` to check connected accounts and their health.

Confirm the intended workspace before creating drafts, scheduling or publishing.
Draft-only credentials can prepare drafts; actions that schedule or publish
content require publish permission. Account permissions, workspace scoping,
validation and plan limits are enforced by the TimeToPost API.

## Tools

Discover the available tools through your client's MCP tool list and use
`get_capabilities` for current workflow details. The 70 hosted tools by area:

| Workflow | Tools |
| --- | --- |
| Account and capabilities | `whoami`, `get_capabilities`, `list_integrations`, `connect_account_link`, `get_tiktok_creator_info`, `list_boards`, `list_lemmy_communities`, `list_slack_channels` |
| Posts and publishing | `list_posts`, `get_post`, `schedule_post`, `publish_post`, `cancel_post`, `publish_thread`, `scheduler_status` |
| Media and video | `upload_media`, `prepare_media_upload`, `finalize_media_upload`, `shorts_generate`, `shorts_status`, `generate_short_video` |
| Drafts and approvals | `create_drafts`, `create_digest_drafts`, `create_posts_from_source`, `list_drafts`, `approve_draft`, `reject_draft`, `list_approvals`, `list_sources`, `get_source_status` |
| Analytics and timing | `get_engagement_summary`, `get_engagement_by_tag`, `get_optimal_times`, `get_post_metrics`, `list_brands`, `calculate_engagement`, `build_campaign_urls`, `best_time_teaser` |
| Voice, prompts and personas | `prompt_suggest`, `prompt_library_list`, `persona_create`, `persona_list`, `persona_status`, `add_to_collection` |
| Build in public and DM funnels | `build_in_public_connect_link`, `build_in_public_status`, `create_dm_funnel`, `list_dm_funnels`, `list_funnel_hits` |
| AutoSEO and articles | `autoseo_connect_site`, `autoseo_integration_kit`, `autoseo_verify_site`, `autoseo_list_sites`, `autoseo_configure`, `autoseo_auto_configure`, `autoseo_propose_topics`, `autoseo_generate_post`, `read_article_draft`, `edit_article_draft`, `review_article_draft`, `list_articles`, `get_article`, `update_article` |
| SEO and GEO research | `keyword_research`, `keyword_add_to_plan`, `keyword_snapshot`, `seo_audit`, `geo_visibility_check` |
| Guides and free tools | `list_use_cases`, `list_free_tools` |

For example, ask your assistant to prepare X post drafts for review, recommend
posting times from your engagement history, or summarize recent post performance.

## Local setup: stdio from source

For clients that use a local stdio process, install from this public repository.
You need Git, Node.js 18 or later, npm and a TimeToPost API token from
**Settings → API**.

```bash
git clone https://github.com/MelMayssonOwen/timetopost-mcp.git
cd timetopost-mcp
npm install
npm run build
```

Run the install and build commands from the repository root. The built entry
point is `dist/src/index.js`.

Configure your MCP client to launch it with Node.js:

```json
{
  "mcpServers": {
    "timetopost": {
      "command": "node",
      "args": ["/absolute/path/to/timetopost-mcp/dist/src/index.js"],
      "env": {
        "TIMETOPOST_API_URL": "https://api.timetopost.co",
        "TIMETOPOST_API_TOKEN": "REPLACE_WITH_YOUR_API_TOKEN"
      }
    }
  }
}
```

Replace the example path with the absolute path to your checkout and configure
the token through your client's environment or secret settings. Keep tokens out
of version control. `TIMETOPOST_API_URL` defaults to `https://api.timetopost.co`.
You can optionally set `TIMETOPOST_ORG_ID` to select a workspace your account can
access; confirm the selection with `whoami`.

After connecting, use the checks in **Before using tools** to verify your setup.

## License

[MIT](LICENSE)
