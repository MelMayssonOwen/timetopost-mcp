# Approval workflow

TimeToPost splits permissions into three tiers, enforced on the server by the API token, not by this skill:

- **read**: list and get anything.
- **draft**: create content that cannot reach an audience (drafts, a post with no `scheduledAt`).
- **publish**: anything that can reach a live audience: `schedule_post` with `scheduledAt`, `publish_post`, `publish_thread`, and `approve_draft`.

`whoami` reports the token's capabilities and `canPublish`. A draft-only token gets a 403 on every publish-tier tool.

## Lifecycle of a draft from create_drafts

1. `create_drafts` stores it as pending (`pending_approval`). It never auto-publishes.
2. The human reviews it, in the dashboard or by reading it back to you.
3. `approve_draft` (human instruction only) turns it into a real scheduled post in one step. The time is the explicit `scheduled_for`, else the draft's `schedule_hint`; `"optimal"` uses the org's best-times model with a fallback of about two hours out.
4. Once posted, `list_drafts` shows it as POSTED with a `postId`; `get_post` shows the permalink.
5. `reject_draft` ends it permanently. A rejected draft can never be posted.

Statuses for `list_drafts` and `list_approvals`: PENDING, APPROVED, REJECTED, POSTED.

## Multiple accounts on one platform

If the org has more than one connected account on a platform, approval is refused as ambiguous unless the draft was created with `account_ids` or `approve_draft` is given them. Get ids from `list_integrations`. The server never guesses and never fans one draft out to several accounts.

## What to do as the agent

- Draft, list the queue, show the user the text, and wait.
- Call `approve_draft` only after the user has said to approve that specific draft.
- If the user edits wording, pass the new `segments` to `approve_draft` rather than re-creating the draft.
- If the workspace in `whoami` is not what the user expects, stop before any write.
