---
title: Agent morning routine — schedule today's posts on every account with the TimeToPost MCP
description: A copy-paste routine for Claude Code or Claude.ai that turns a folder of finished videos or images into staggered, approval-gated posts on all your connected accounts each morning.
---

# Agent morning routine: today's posts, every account, one prompt

App founders and creators who run several accounts often keep a folder of finished videos and post them by hand every morning. With the TimeToPost MCP server an agent can do the busywork while you keep the final say.

*Made by the TimeToPost team. [Set up the server first](index.md).*

## What it does

1. Reads today's files from a folder you choose (videos or images, with an optional `captions.csv`).
2. Uploads each file with `prepare_media_upload` → upload → `finalize_media_upload` (or `upload_media` for small files).
3. Looks up your best posting slots with `get_optimal_times`.
4. Creates one post per account with staggered times (default 10 minutes apart) and a caption variant per account.
5. Leaves everything as **drafts** in your approval queue unless you say "schedule".
6. Ends with a summary: which file goes where, at what time, and what still needs your answer (e.g. TikTok privacy settings).

## The prompt (save it as a routine or slash command)

```
Every morning:
1. whoami, then list_integrations. Use only the accounts in the collection "daily".
2. Take the files in ~/content/today/ (skip anything already posted; keep a log in ~/content/posted.csv).
3. For each file, write a caption for each account. Line 1 must make the topic clear in plain words,
   line 2 gives one specific, true detail, line 3 adds a twist or question. No hashtag walls.
4. get_optimal_times for each account. Space posts at least 10 minutes apart per account.
5. Create every post with schedule_post WITHOUT scheduledAt (drafts). Do not publish.
6. For TikTok: stop and ask me for privacy, comments/duet/stitch and branded-content answers.
7. Reply with a table: file, account, proposed time (with timezone), caption line 1.
When I reply "go", call approve_draft for the ones I confirm.
```

## Why drafts first

Posting the same video to many accounts at once is exactly what platforms watch for. Staggered times, per-account captions and a human "go" keep the routine on the right side of each platform's rules and keep you in control of what goes out under your name.

## Variations

- **Same slot every day plus a test slot:** ask the agent to keep a fixed daily time and put one post a week in a second slot, then compare with `get_post_metrics` after 7 days.
- **Carousels:** for Instagram, pass several image URLs as one post.
- **Threads:** for a written idea, use `publish_thread` (drafted, then approved).
