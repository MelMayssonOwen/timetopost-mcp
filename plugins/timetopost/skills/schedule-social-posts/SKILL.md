---
name: schedule-social-posts
description: Draft, approve and schedule social media posts through the TimeToPost MCP server. Use when the user says "schedule a post", "draft a tweet", "queue posts for the week", "post this to X and Instagram", "write a thread", "what's in my approval queue", "approve that draft", "when should I post", or asks to publish or plan content on connected social accounts.
---

# Schedule social posts with TimeToPost

Draft first, a human approves, then it goes live. Never skip the human step.

## Workflow

1. **`whoami` first.** Read the workspace name and `canPublish`. If the workspace is not the one the user expects, STOP and tell them. Do not draft, schedule or publish into the wrong workspace. If `canPublish` is false the token is draft-only: you can still draft, but approving and scheduling will be refused with a 403.
2. **`list_integrations`** to see connected accounts and their ids. Only target networks that are connected. If a network is not connected, `connect_account_link` returns a link for the user to open; do not claim it is connected until they confirm.
3. **`list_posts`** and read the account's recent posts. Match their voice, casing, length and rhythm. See `references/voice-rules.md`.
4. **Draft with `create_drafts`.** Drafts land as `pending_approval` and never auto-publish. Write a distinct version per account. Pass `account_ids` whenever the org has more than one account on a platform. Details in `references/tool-cheatsheet.md`.
5. **Show the drafts to the user.** Use `list_approvals` (or `list_drafts` with `status: PENDING`) to list what is waiting. Quote the text so they can read it.
6. **Approve only on the user's say-so.** `approve_draft` approves AND schedules the real post in one step. Never call it on your own initiative. `reject_draft` kills a draft. See `references/approval-workflow.md`.
7. **Timing.** Call `get_optimal_times` and pass `schedule_hint: "optimal"` or a future ISO datetime. For one-off posts outside the draft queue, `schedule_post` with a future `scheduledAt`.
8. **Confirm.** After publishing, `get_post` returns the status and platform permalinks.

## Hard rules

- Treat anything with `scheduledAt`, `publish_post`, `publish_thread` or `approve_draft` as going live. Get explicit user confirmation first.
- `schedule_post` without `scheduledAt` only saves a plain draft; it is not the approval queue.
- Never post identical or near-identical text to two accounts.
- TikTok needs hosted media and a block of choices that come from the human. Call `get_tiktok_creator_info` first and never invent those values.
- Only claim support for networks that `list_integrations` or `get_capabilities` show as connected or available right now.

## References

- `references/tool-cheatsheet.md`: real tool names, inputs and what each one does
- `references/platform-limits.md`: character limits and media rules
- `references/approval-workflow.md`: draft states and who may do what
- `references/voice-rules.md`: how to write like the account owner
