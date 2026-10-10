# Platform limits

Limits for the networks most people schedule to. For anything else, or if a limit looks stale, call `get_capabilities` and `list_integrations`: they show what is available and connected for this workspace right now.

| Network | Text limit | Notes |
| --- | --- | --- |
| X | 280 characters per post | Threads: up to 24 segments, 280 each, published as chained replies. |
| Instagram | 2200 characters | Needs hosted media. Text-only posts are not possible. |
| TikTok | 2200 characters (enforced at post creation) | Needs hosted media and one TikTok account per post. Requires `platformData.tiktok` with choices from the human (privacy, comments, duet, stitch, own-brand or third-party promotion). Call `get_tiktok_creator_info` first, every time. |
| Threads | 500 characters | |

Rules of thumb:

- Write to the tightest limit among the targets only if the same text really belongs on all of them. Usually it should not; write a separate version per account.
- Media must be a hosted URL. Use `prepare_media_upload` then `finalize_media_upload`.
- Scheduled times must be in the future, in ISO 8601.
- Do not claim or promise a network that `list_integrations` does not show as connected.
