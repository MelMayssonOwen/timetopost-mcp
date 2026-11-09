# TimeToPost

TimeToPost is a social media scheduler your assistant can operate. This plugin connects Claude to your TimeToPost workspace and adds two skills that run the common workflows from start to finish.

## What it does

- Writes post drafts in the voice of each connected account and saves them in TimeToPost.
- Schedules posts at the best time for each account, based on that account's own engagement history.
- Publishes to 16 networks, including X, Instagram, TikTok, Threads, Bluesky and Mastodon.
- Reads post performance and summarizes what worked.
- Connects a blog and prepares AutoSEO article drafts from researched topics.

## Use it

Install the plugin, then connect the TimeToPost connector and sign in with your TimeToPost account. Sign-in uses OAuth, so there is no API key to copy. Then ask for what you need:

- "Draft three posts about our launch for X and Threads, and show them to me."
- "When is the best time to post on Instagram this week?"
- "Summarize how my posts did over the last 30 days."
- "Propose five blog topics for my site and draft the first one."

The skills check which workspace is connected before any write.

In Claude Code, install it in one step:

```text
/plugin install timetopost --marketplace MelMayssonOwen/timetopost-mcp
```

## What is included

- Connector: the hosted TimeToPost MCP server at `https://api.timetopost.co/mcp` (77 tools).
- Skill `schedule-social-posts`: drafting, timing and scheduling.
- Skill `timetopost-autoseo-blog`: site connection, topic research and article drafts.

## Data

The plugin sends your requests, post text and media references to your TimeToPost account through `api.timetopost.co`. TimeToPost publishes to the social accounts and sites you connected. The plugin stores nothing on its own and contacts no other service. You can revoke access at any time in TimeToPost under Settings, API.

- Privacy: https://timetopost.co/privacy/
- Terms: https://timetopost.co/terms/
- Docs: https://timetopost.co/docs/mcp/
- Website: https://go.timetopost.co/mkt-claude-plugin

MIT licensed.
