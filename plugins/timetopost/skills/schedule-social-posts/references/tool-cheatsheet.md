# Tool cheatsheet

Names and inputs come from the TimeToPost MCP server (`src/tools.ts`). Each tool needs a token capability: read, draft or publish (publish includes draft, draft includes read).

## Orientation (read)

| Tool | Use |
| --- | --- |
| `whoami` | Authenticated user, workspace, org warnings, token capabilities and `canPublish`. Call first. |
| `get_capabilities` | Machine-readable capability map, including this org's live connections and platform availability. |
| `list_integrations` | Connected accounts, ids and status. |
| `list_posts` | Posts in the org. Optional `status`: DRAFT, SCHEDULED, PUBLISHING, PUBLISHED, FAILED, PARTIAL. Read it for voice. |
| `get_post` | One post by `id`: status, scheduled and published times, permalinks. |
| `get_optimal_times` | Suggested posting times from the org's history. |
| `prompt_suggest` | Ranked hook or video prompt scaffolds. `kind`: POST_HOOK or VIDEO. Optional `niche`, `platform`. |
| `list_brands` | Attribution tags used for engagement rollups. |
| `scheduler_status` | Health of the background scheduler. |

## Drafting (draft)

`create_drafts` (alias `create_digest_drafts`):

- `external_ref`: your own id for this batch. Resending the same ref updates still-pending drafts and never duplicates or revives decided ones.
- `variants[]`: one per platform. Fields: `platform` (provider key, `x` and `x_thread` map to `twitter`), `segments[]` (1 item is a single post, 2 or more on X is a thread, max 24), optional `link`, `media[]` (`url`, `alt`), `schedule_hint` (`"optimal"` or a future ISO datetime), `account_ids[]`.
- `brand`: optional attribution tag, not the writing-style profile.
- Result: drafts with status `pending_approval`. Nothing is published.

`schedule_post`:

- `content`, `platforms[]`, optional `scheduledAt` (future ISO), `mediaUrls[]`, `thread[]` (X only), `platformData`, `brand`.
- No `scheduledAt` saves a DRAFT post. With `scheduledAt` it is scheduled and will publish. That needs the publish capability.

Media: `prepare_media_upload`, PUT the raw bytes to the returned URL, then `finalize_media_upload`, and use the returned `publicUrl` in `mediaUrls`. `upload_media` is only for tiny files.

## Approval (human gate)

| Tool | Use |
| --- | --- |
| `list_approvals` | Read-only unified queue. Optional `source` (posts, trends, build-in-public, dms) and `status` (default PENDING). |
| `list_drafts` | Engine drafts. Optional `status` PENDING, APPROVED, REJECTED, POSTED and `brand`. POSTED drafts carry a `postId`. |
| `approve_draft` | Approves and schedules the real post. Inputs: `draft_id`, optional `segments` (edits), `scheduled_for`, `account_ids`. Only on the user's instruction. |
| `reject_draft` | `draft_id`, optional `reason`. |

Only the `posts` source can be approved over MCP. Trend, build-in-public and DM approvals are done in the dashboard.

## Going live (publish)

| Tool | Use |
| --- | --- |
| `publish_post` | Queue an existing draft, scheduled or failed post for the next scheduler tick. |
| `publish_thread` | X thread in one call: `segments[]` (each 280 chars or fewer), optional `schedule_at`, `brand`. Without `schedule_at` it goes out on the next tick. |
| `cancel_post` | Delete a post, including a scheduled one. |

## Other

`get_tiktok_creator_info` (call before every TikTok `schedule_post`), `connect_account_link`, `add_to_collection`, `get_engagement_summary`, `get_post_metrics`, `get_engagement_by_tag`. Run `tools/list` on the server for the full set.
