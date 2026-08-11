/**
 * Registers all TimeToPost tools on an McpServer. Each tool is a thin wrapper
 * over a backend REST endpoint, using the caller's bearer token (so the backend
 * enforces auth + org-scoping). `apiFor` returns the API client for the current
 * request — for stdio it's a fixed token; for the remote/OAuth server it's
 * derived per-request from the validated access token.
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolAnnotations } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { TimeToPostApi, ApiResult } from './api.js';

type ApiFor = (extra: unknown) => TimeToPostApi;

/**
 * Server-level guidance sent to MCP clients at initialize, and appended to the
 * content-writing tools. Founder rule (2026-07-02): AI-drafted posts must not
 * read like AI wrote them, for this account or any customer's.
 */
export const WRITING_STYLE_GUIDELINE =
  "Writing style for any post content you draft: write like the account's human owner, not like an AI. " +
  'NEVER use em-dashes or en-dashes (—, –) or double hyphens (--); use a period, comma or colon instead. ' +
  'Skip hashtag spam (0-1 hashtags), filler openers ("Exciting news!") and rocket/sparkle emoji. ' +
  "Before drafting, read the account's recent posts with list_posts and match their voice, casing and rhythm.";

function toContent(result: ApiResult) {
  const text = JSON.stringify(result.data, null, 2);
  return {
    content: [{ type: 'text' as const, text }],
    isError: !result.ok,
  };
}

async function requestWithMcpHeader(
  api: TimeToPostApi,
  method: 'GET' | 'POST' | 'DELETE',
  path: string,
  body?: unknown
): Promise<ApiResult> {
  return api.requestWithMcpHeader(method, path, body);
}

// Providers connect_account_link hands out a deep link for. Mirrors the hosted
// surface (backend/src/mcp/server.ts) so the two stay in parity.
const CONNECT_PROVIDERS = [
  'instagram',
  'twitter',
  'tiktok',
  'facebook',
  'pinterest',
  'youtube',
  'linkedin',
  'reddit',
  'threads',
] as const;

const connectAppBaseUrl = () =>
  (process.env.APP_URL || process.env.FRONTEND_URL || process.env.PUBLIC_URL || 'https://timetopost.co').replace(
    /\/$/,
    ''
  );


/**
 * Which capability each tool needs (backend core/api-tokens.ts). Enforced
 * server-side in middleware on the REST routes these tools proxy — a
 * draft-scoped token calling a `publish` tool gets a 403 no matter what a tool
 * description claims.
 *
 * Kept in lockstep with the hosted surface's TOOL_CAPABILITIES
 * (backend/src/mcp/server.ts); mcp-parity.test.ts fails the build if they diverge.
 */
export const TOOL_CAPABILITIES: Record<string, 'read' | 'draft' | 'publish'> = {
  whoami: 'read',
  get_capabilities: 'read',
  prompt_suggest: 'read',
  prompt_library_list: 'read',
  list_integrations: 'read',
  get_tiktok_creator_info: 'read',
  add_to_collection: 'draft',
  connect_account_link: 'read',
  list_boards: 'read',
  list_posts: 'read',
  get_post: 'read',
  upload_media: 'draft',
  prepare_media_upload: 'draft',
  finalize_media_upload: 'draft',
  schedule_post: 'draft',
  publish_post: 'publish',
  cancel_post: 'draft',
  get_engagement_summary: 'read',
  get_optimal_times: 'read',
  scheduler_status: 'read',
  create_digest_drafts: 'draft',
  create_drafts: 'draft',
  list_drafts: 'read',
  approve_draft: 'publish',
  reject_draft: 'draft',
  list_approvals: 'read',
  shorts_generate: 'draft',
  generate_short_video: 'draft',
  persona_create: 'draft',
  persona_list: 'read',
  persona_status: 'read',
  shorts_status: 'read',
  publish_thread: 'publish',
  list_brands: 'read',
  get_engagement_by_tag: 'read',
  get_post_metrics: 'read',
  build_in_public_connect_link: 'read',
  build_in_public_status: 'read',
  autoseo_connect_site: 'draft',
  autoseo_integration_kit: 'read',
  autoseo_verify_site: 'draft',
  autoseo_list_sites: 'read',
  autoseo_configure: 'draft',
  autoseo_auto_configure: 'draft',
  autoseo_propose_topics: 'draft',
  autoseo_generate_post: 'draft',
  keyword_research: 'draft',
  keyword_add_to_plan: 'draft',
  create_posts_from_source: 'draft',
  get_source_status: 'read',
  list_sources: 'read',
  create_dm_funnel: 'draft',
  list_dm_funnels: 'read',
  list_funnel_hits: 'read',
};

/**
 * MCP tool annotations: client-facing hints per the MCP spec's ToolAnnotations
 * shape (readOnlyHint, destructiveHint, idempotentHint, openWorldHint) plus a
 * short human-readable title per tool. These are hints only, never a
 * substitute for the capability enforcement above, but they are what a
 * connectors directory scanner and a cautious agent both check before ever
 * calling a tool.
 *
 * Kept in lockstep with the hosted surface's TOOL_ANNOTATIONS
 * (backend/src/mcp/server.ts): values must match exactly, or the two MCP
 * surfaces hand an agent conflicting safety signals for the same tool name.
 * Typed against TOOL_CAPABILITIES's own key set so a tool added to one map
 * without a matching entry in the other fails the build, not just a test.
 */
export const TOOL_ANNOTATIONS: Record<keyof typeof TOOL_CAPABILITIES, ToolAnnotations> = {
  whoami: { title: 'Whoami', readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  get_capabilities: { title: 'Get Capabilities', readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  prompt_suggest: { title: 'Suggest Prompt', readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  prompt_library_list: { title: 'List Prompt Library', readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  list_integrations: { title: 'List Integrations', readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  get_tiktok_creator_info: { title: 'Get TikTok Creator Info', readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
  add_to_collection: { title: 'Add To Collection', readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  connect_account_link: { title: 'Connect Account Link', readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
  list_boards: { title: 'List Boards', readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  list_posts: { title: 'List Posts', readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  get_post: { title: 'Get Post', readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  upload_media: { title: 'Upload Media', readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
  prepare_media_upload: { title: 'Prepare Media Upload', readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
  finalize_media_upload: { title: 'Finalize Media Upload', readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
  schedule_post: { title: 'Schedule Post', readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
  publish_post: { title: 'Publish Post', readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
  cancel_post: { title: 'Cancel Post', readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: true },
  get_engagement_summary: { title: 'Get Engagement Summary', readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
  get_optimal_times: { title: 'Get Optimal Times', readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  scheduler_status: { title: 'Scheduler Status', readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  create_digest_drafts: { title: 'Create Digest Drafts', readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  create_drafts: { title: 'Create Drafts', readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  list_drafts: { title: 'List Drafts', readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  approve_draft: { title: 'Approve Draft', readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
  reject_draft: { title: 'Reject Draft', readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: true },
  list_approvals: { title: 'List Approvals', readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  shorts_generate: { title: 'Generate Short', readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
  generate_short_video: { title: 'Generate Short Video', readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
  persona_create: { title: 'Create Persona', readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  persona_list: { title: 'List Personas', readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  persona_status: { title: 'Persona Status', readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  shorts_status: { title: 'Shorts Status', readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  publish_thread: { title: 'Publish Thread', readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
  list_brands: { title: 'List Brands', readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  get_engagement_by_tag: { title: 'Get Engagement By Tag', readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
  get_post_metrics: { title: 'Get Post Metrics', readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
  build_in_public_connect_link: { title: 'Build In Public Connect Link', readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
  build_in_public_status: { title: 'Build In Public Status', readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  autoseo_connect_site: { title: 'AutoSEO Connect Site', readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
  autoseo_integration_kit: { title: 'AutoSEO Integration Kit', readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  autoseo_verify_site: { title: 'AutoSEO Verify Site', readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
  autoseo_list_sites: { title: 'AutoSEO List Sites', readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  autoseo_configure: { title: 'AutoSEO Configure', readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  autoseo_auto_configure: { title: 'AutoSEO Auto Configure', readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  autoseo_propose_topics: { title: 'AutoSEO Propose Topics', readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  autoseo_generate_post: { title: 'AutoSEO Generate Post', readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
  keyword_research: { title: 'Keyword Research', readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
  keyword_add_to_plan: { title: 'Add Keyword To Plan', readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  create_posts_from_source: { title: 'Create Posts From Source', readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
  get_source_status: { title: 'Get Source Status', readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  list_sources: { title: 'List Sources', readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  create_dm_funnel: { title: 'Create DM Funnel', readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  list_dm_funnels: { title: 'List DM Funnels', readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  list_funnel_hits: { title: 'List Funnel Hits', readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
};

/**
 * The sentence appended to every tool description so an agent knows, BEFORE it
 * calls, which permission tier the call needs and what a 403 will mean.
 */
export function capabilityNote(name: string): string {
  if (name === 'schedule_post') {
    return 'CAPABILITY: `draft` when scheduledAt is omitted (creates a DRAFT that never goes out on its own); `publish` when scheduledAt is set, because the scheduler will push it to a live audience. A draft-scoped token that passes scheduledAt gets a 403 — drop scheduledAt and hand the draft to a human.';
  }
  const cap = TOOL_CAPABILITIES[name] ?? 'read';
  if (cap === 'publish') {
    return 'CAPABILITY: `publish` — this can reach a LIVE AUDIENCE. A draft-scoped token gets a 403 here; a human must approve at timetopost.co instead.';
  }
  if (cap === 'draft') {
    return 'CAPABILITY: `draft` — creates content that cannot reach an audience on its own. Safe for a draft-only agent token.';
  }
  return 'CAPABILITY: `read` — side-effect-free.';
}

/**
 * Wraps an McpServer so every registered tool's description carries its
 * capability note and its annotations come from TOOL_ANNOTATIONS. Registration
 * sites below are untouched, so the parity test can keep parsing their
 * tool-name literals out of this file.
 *
 * Throws at registration time if a tool has no TOOL_ANNOTATIONS entry, so a
 * tool added later without one fails on server startup instead of shipping
 * silently unannotated.
 */
function withCapabilityNotes(target: McpServer): McpServer {
  return {
    ...target,
    registerTool: ((name: string, config: { description?: string; annotations?: ToolAnnotations }, handler: unknown) => {
      const annotations = TOOL_ANNOTATIONS[name as keyof typeof TOOL_CAPABILITIES];
      if (!annotations) {
        throw new Error(
          `registerTool('${name}'): no TOOL_ANNOTATIONS entry. Add one before registering this tool.`
        );
      }
      return (target.registerTool as unknown as (n: string, c: unknown, h: unknown) => unknown)(
        name,
        {
          ...config,
          description: `${config.description ?? ''} ${capabilityNote(name)}`.trim(),
          annotations: { ...annotations, ...config.annotations },
        },
        handler
      );
    }) as McpServer['registerTool'],
  } as McpServer;
}

export function registerTools(mcpServer: McpServer, apiFor: ApiFor) {
  // Every tool description gains its capability note; registration below is unchanged.
  const server = withCapabilityNotes(mcpServer);

  const api = (extra: unknown) => ({
    get: (path: string) => requestWithMcpHeader(apiFor(extra), 'GET', path),
    post: (path: string, body?: unknown) => requestWithMcpHeader(apiFor(extra), 'POST', path, body),
    delete: (path: string) => requestWithMcpHeader(apiFor(extra), 'DELETE', path),
  });

  server.registerTool(
    'whoami',
    {
      title: 'Who am I',
      description:
        "Return the authenticated TimeToPost user, bound organization and any org warning — plus THIS credential's capabilities (read / draft / publish) and canPublish. CALL THIS FIRST: a DRAFT-ONLY token can create drafts but is 403ed by every route that reaches a live audience (publish, schedule, approve, DM-send), so check canPublish before you plan any publishing step.",
      inputSchema: {},
    },
    async (_args, extra) => toContent(await api(extra).get('/api/auth/me'))
  );

  server.registerTool(
    'get_capabilities',
    {
      title: 'Capability map (start here)',
      description:
        "START HERE when mapping what TimeToPost can do. Returns the authoritative machine-readable capability map: post statuses + lifecycle, thread rules, per-platform platformData shapes, the engine-draft approval lifecycle and idempotency contract, the org/multi-account model (incl. the brand-vs-BrandVoice terminology distinction), metrics fields + ingestion cadence, AutoSEO, DM Funnels beta, the Weekly X Trend-Rider, the warm-outbound DM engager loop, backlink/email outreach, the link shortener + click analytics, Launch with TTP, the link-in-bio public profile, and THIS org's live connections including token-refresh semantics (e.g. X access tokens live 2h by design and refresh automatically at publish — a past expiresAt with hasRefreshCapability=true is normal, NOT a dead integration). Trust this over inferences from other tools' raw fields.",
      inputSchema: {},
    },
    async (_args, extra) => toContent(await api(extra).get('/api/capabilities'))
  );

  server.registerTool(
    'prompt_suggest',
    {
      title: 'Suggest a proven prompt structure',
      description:
        'Return ranked, evidence-labeled prompt scaffolds for the active organization. Call this before generating any post or short and start from the first result. Use POST_HOOK for post openings and VIDEO for short-video structures. Organization winners rank above source-cited best-practice templates only when confidence is medium or high.',
      inputSchema: {
        kind: z.enum(['POST_HOOK', 'VIDEO']),
        niche: z
          .string()
          .trim()
          .min(1)
          .max(80)
          .optional()
          .describe('Optional niche used to prefer an exact or generic proven template.'),
        platform: z
          .enum([
            'instagram',
            'twitter',
            'youtube',
            'linkedin',
            'tiktok',
            'facebook',
            'wordpress',
            'medium',
            'pinterest',
            'reddit',
            'threads',
          ])
          .optional()
          .describe('Optional platform filter for organization winners and proven templates.'),
      },
    },
    async ({ kind, niche, platform }, extra) => {
      const query = new URLSearchParams({ kind });
      if (niche) query.set('niche', niche);
      if (platform) query.set('platform', platform);
      return toContent(
        await api(extra).get(`/api/prompt-library/suggest?${query.toString()}`)
      );
    }
  );

  server.registerTool(
    'prompt_library_list',
    {
      title: 'List the prompt library',
      description:
        'List the active organization prompt library, including visible system and organization templates plus learned winner evidence. Use prompt_suggest for the ranked generation default and this tool to inspect the complete inventory.',
      inputSchema: {},
    },
    async (_args, extra) => toContent(await api(extra).get('/api/prompt-library'))
  );

  server.registerTool(
    'list_integrations',
    {
      title: 'List connected accounts',
      description: 'List the social/platform integrations for the active org and their connection status.',
      inputSchema: {},
    },
    async (_args, extra) => toContent(await api(extra).get('/api/integrations'))
  );

  server.registerTool(
    'get_tiktok_creator_info',
    {
      title: 'TikTok posting settings for an account',
      description:
        "Read a connected TikTok account's CURRENT posting settings, straight from TikTok. Call this before every TikTok schedule_post: it returns who the post would go out as (creator_nickname/creator_username), privacy_level_options (the ONLY audiences this account may be offered, so never present one that is missing from this list), comment_disabled/duet_disabled/stitch_disabled (a disabled interaction MUST be sent as false in platformData.tiktok, and must not be offered to the human as a choice), and max_video_post_duration_sec (the longest video this account may upload). Show these to the human, get their answers, and send those answers. TikTok requires this lookup per posting session and forbids caching it between sessions, so do not reuse an earlier response. accountId is the integration id from list_integrations; omit it when only one TikTok account is connected.",
      inputSchema: {
        accountId: z
          .string()
          .optional()
          .describe('Integration id of the TikTok account (from list_integrations). Optional when only one is connected.'),
      },
    },
    async ({ accountId }, extra) =>
      toContent(
        await api(extra).get(
          '/api/integrations/tiktok/creator-info' +
            (accountId ? `?accountId=${encodeURIComponent(accountId)}` : '')
        )
      )
  );

  // ── Collections + media ────────────────────────────────────────────────────
  // These four existed only on the hosted surface (PRs #383/#384). Without them
  // an npm/stdio MCP client cannot upload media AT ALL, which also breaks the
  // reference-image flow generate_short_video depends on. Keep both surfaces in
  // lockstep — mcp-parity.test.ts asserts it.

  server.registerTool(
    'add_to_collection',
    {
      title: 'Group an account into a collection',
      description:
        'Group a connected account into a collection (a named set of accounts, e.g. "clefdrills" spanning its X + Instagram). CREATES the collection if the name is new, so this is also how you create one. Then schedule_post can post to the whole group via its `collection` field. Pass accountId (an integration id from list_integrations) and collection (the group name). Pass an empty collection name to ungroup.',
      inputSchema: {
        accountId: z.string().describe('Integration id of the account to group (from list_integrations).'),
        collection: z.string().describe('Collection name. Created if it does not exist. Empty string ungroups.'),
      },
    },
    async ({ accountId, collection }, extra) =>
      toContent(
        await api(extra).post('/api/integrations/move-account', { accountId, groupName: collection })
      )
  );

  server.registerTool(
    'prepare_media_upload',
    {
      title: 'Start a media upload (step 1)',
      description:
        'STEP 1 of the media upload flow (use this for any real image/video; upload_media is only for tiny files). Returns a short-lived PRESIGNED upload URL you PUT the raw file bytes to yourself, outside MCP, with NO credentials (the signature is in the URL). Then call finalize_media_upload to register it and get the hosted publicUrl for schedule_post mediaUrls.\n\nFlow:\n1. prepare_media_upload { filename, contentType, size } -> { key, uploadUrl, publicUrl }\n2. PUT the bytes to uploadUrl, e.g. `curl -X PUT --data-binary @day01.mp4 -H "Content-Type: video/mp4" "<uploadUrl>"`. Send RAW bytes, do NOT base64-encode.\n3. finalize_media_upload { key, contentType, size }.\n\nsize must be the exact byte size. The uploadUrl expires shortly, so PUT immediately (prepare/PUT/finalize one file at a time).',
      inputSchema: {
        filename: z.string().describe('Original filename incl. extension, e.g. "day01.mp4".'),
        contentType: z
          .string()
          .describe('MIME type: image/jpeg|image/png|image/gif|image/webp|video/mp4|video/quicktime.'),
        size: z.number().describe('Exact file size in bytes.'),
      },
    },
    async ({ filename, contentType, size }, extra) =>
      toContent(await api(extra).post('/api/media/presign', { filename, contentType, size }))
  );

  server.registerTool(
    'finalize_media_upload',
    {
      title: 'Finish a media upload (step 3)',
      description:
        'STEP 3 of the media upload flow: call AFTER you have PUT the raw bytes to the presigned uploadUrl from prepare_media_upload. Registers the object as a MediaAsset and returns it; its publicUrl is what you pass to schedule_post mediaUrls. Pass the same key/contentType/size from step 1. Idempotent: re-finalizing the same key returns the existing asset.',
      inputSchema: {
        key: z.string().describe('The object key returned by prepare_media_upload.'),
        contentType: z.string().describe('Same MIME type used in prepare_media_upload.'),
        size: z.number().describe('Exact file size in bytes.'),
      },
    },
    async ({ key, contentType, size }, extra) =>
      toContent(await api(extra).post('/api/media/confirm', { key, contentType, size }))
  );

  server.registerTool(
    'upload_media',
    {
      title: 'Upload a small file inline',
      description:
        'Upload a SMALL image/video inline and get a hosted public URL for schedule_post mediaUrls. Only practical for tiny files: it carries the whole file as base64, ~1.35x the byte size. For ANY real photo or video (over ~100KB) use prepare_media_upload + finalize_media_upload instead. Instagram and TikTok REQUIRE hosted media (they cannot take a text-only post). Once a post using the media publishes, the file is auto-deleted 30 days later.',
      inputSchema: {
        filename: z.string().describe('Original filename incl. extension.'),
        contentType: z.string().describe('MIME type, e.g. image/png or video/mp4.'),
        dataBase64: z.string().describe('The file bytes, base64-encoded (no data: URI prefix).'),
      },
    },
    async ({ filename, contentType, dataBase64 }, extra) =>
      toContent(await api(extra).post('/api/media/upload', { filename, contentType, dataBase64 }))
  );

  server.registerTool(
    'connect_account_link',
    {
      title: 'Get a link to connect a social account',
      description:
        'Return a link the user opens in a browser to connect a social account via OAuth. The link deep-links into Settings and auto-opens the connect flow for the chosen provider. provider must be one of: ' +
        CONNECT_PROVIDERS.join('|') +
        '. Connecting requires a signed-in human clicking through the OAuth popup in a browser; an agent cannot complete it directly, so relay this link to the user and do not claim the account is connected until they confirm.',
      inputSchema: { provider: z.enum(CONNECT_PROVIDERS) },
    },
    async ({ provider }) => {
      const url = `${connectAppBaseUrl()}/dashboard/settings?tab=integrations&connect=${provider}`;
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(
              {
                provider,
                url,
                instructions:
                  'Open this link in your browser and click Connect to authorize the account. This must be done by a signed-in human; it cannot be completed by an API.',
              },
              null,
              2
            ),
          },
        ],
        isError: false,
      };
    }
  );

  server.registerTool(
    'list_boards',
    {
      title: 'List Pinterest boards',
      description:
        "List the active org's connected Pinterest account's boards (id, name, privacy, pin count). Call this before schedule_post with a pinterest platform target — Pinterest requires platformData.pinterest.boardId on every pin, and boardId must be one of the ids returned here. 404s if no Pinterest integration is connected.",
      inputSchema: {},
    },
    async (_args, extra) => toContent(await api(extra).get('/api/integrations/pinterest/boards'))
  );

  server.registerTool(
    'list_posts',
    {
      title: 'List posts',
      description: 'List posts for the active org. Optionally filter by status.',
      inputSchema: {
        status: z
          .enum(['DRAFT', 'SCHEDULED', 'PUBLISHING', 'PUBLISHED', 'FAILED', 'PARTIAL'])
          .optional()
          .describe('Only return posts in this status'),
      },
    },
    async ({ status }, extra) => {
      const result = await api(extra).get('/api/posts');
      if (status && result.ok && result.data && typeof result.data === 'object') {
        const posts = (result.data as { posts?: any[] }).posts ?? [];
        const normalizedStatus = status.toLowerCase();
        return toContent({
          ...result,
          data: { posts: posts.filter((p) => String(p.status).toLowerCase() === normalizedStatus) },
        });
      }
      return toContent(result);
    }
  );

  server.registerTool(
    'get_post',
    {
      title: 'Get a post',
      description:
        'Fetch a single post by id (must belong to the active org): content, platforms, status (DRAFT|SCHEDULED|PUBLISHING|PUBLISHED|FAILED|PARTIAL), scheduledAt/publishedAt, mediaUrls, and platformData including per-platform published post ids/urls and thread segments. Use after publishing to confirm the post actually went out and to get platform permalinks.',
      inputSchema: { id: z.string().describe('Post id') },
    },
    async ({ id }, extra) => toContent(await api(extra).get(`/api/posts/${encodeURIComponent(id)}`))
  );

  server.registerTool(
    'schedule_post',
    {
      title: 'Schedule / draft a post',
      description:
        'Create a post. Provide a future ISO scheduledAt to schedule it (omit for a draft). platforms are provider keys like "instagram", "tiktok", "twitter", "pinterest". For TIKTOK, platformData.tiktok is REQUIRED and every field in it must be an answer YOU GOT FROM THE HUMAN: who can see the post (privacy), whether comments, duet and stitch are allowed, and whether it promotes their own brand or a third party. Never invent, assume or default those values, and never carry them over from a previous post: TikTok requires the creator to choose them with nothing pre-selected. Call get_tiktok_creator_info first to see the audiences this account may pick and which interactions it has switched off. An incomplete block is rejected naming the fields still missing; in a mixed request only TikTok is refused and the other platforms are still scheduled. TikTok needs mediaUrls and posts to ONE TikTok account at a time. For PINTEREST, mediaUrls must contain exactly one image URL, and platformData.pinterest.boardId is REQUIRED — call list_boards first to get a valid boardId; content becomes the pin description (≤500 chars), platformData.pinterest.title is the pin title (≤100 chars). Optional brand: a niche/play attribution tag for per-play engagement rollups (auto-registers; see list_brands) — NOT the AI BrandVoice writing-style profile. ' +
        WRITING_STYLE_GUIDELINE,
      inputSchema: {
        content: z.string().describe('Post text/caption'),
        platforms: z.array(z.string()).min(1).describe('Target platform provider keys'),
        scheduledAt: z
          .string()
          .optional()
          .describe('ISO-8601 timestamp in the future; omit to save as a draft'),
        mediaUrls: z.array(z.string()).optional().describe('Optional media URLs'),
        thread: z
          .array(z.string().min(1).max(280))
          .max(24)
          .optional()
          .describe('X/Twitter thread: tweets 2..N published as chained replies to content'),
        platformData: z
          .object({
            pinterest: z
              .object({
                boardId: z.string().describe('Required. Get valid ids from list_boards.'),
                title: z.string().max(100).optional().describe('Pin title, ≤100 chars'),
                link: z.string().optional().describe('Destination URL the pin links to'),
                altText: z.string().max(500).optional().describe('Accessibility alt text, ≤500 chars'),
                dominantColor: z.string().optional().describe('Optional hex color hint, e.g. "#6B4F3B"'),
              })
              .optional()
              .describe('Required when pinterest is a target platform'),
            tiktok: z
              .object({
                privacy: z
                  .enum(['PUBLIC_TO_EVERYONE', 'MUTUAL_FOLLOW_FRIENDS', 'FOLLOWER_OF_CREATOR', 'SELF_ONLY'])
                  .describe(
                    'Who can see the post, chosen by the human. Must be one get_tiktok_creator_info lists for this account.'
                  ),
                allowComments: z.boolean().describe('Human said comments are allowed. Send false if they did not say yes, or if the account has comments disabled.'),
                allowDuet: z.boolean().describe('Human said Duet is allowed. Videos only; false for photo posts and for accounts with duet disabled.'),
                allowStitch: z.boolean().describe('Human said Stitch is allowed. Videos only; false for photo posts and for accounts with stitch disabled.'),
                yourBrand: z.boolean().describe('Human declared the post promotes themselves or their own business.'),
                brandedContent: z.boolean().describe('Human declared the post promotes a third party. Cannot be combined with privacy SELF_ONLY.'),
              })
              .optional()
              .describe(
                'REQUIRED when tiktok is a target platform. Every value must come from the human, asked for this post. Do not invent them.'
              ),
          })
          .optional()
          .describe('Platform-specific fields: pinterest pin fields, and the TikTok posting choices'),
        brand: z
          .string()
          .max(60)
          .optional()
          .describe('Brand/niche tag for per-play engagement rollups (auto-registers)'),
      },
    },
    async ({ content, platforms, scheduledAt, mediaUrls, thread, platformData, brand }, extra) =>
      toContent(
        await api(extra).post('/api/posts', {
          content,
          platforms,
          scheduledAt,
          mediaUrls,
          thread,
          platformData,
          brand,
        })
      )
  );

  server.registerTool(
    'publish_post',
    {
      title: 'Publish a post now',
      description:
        'Queue an existing draft/scheduled/failed post for immediate publishing on the next scheduler tick (must belong to the active org). Uses the real scheduler/provider pipeline; records become PUBLISHED only after platform publishing succeeds.',
      inputSchema: { id: z.string().describe('Post id') },
    },
    async ({ id }, extra) =>
      toContent(await api(extra).post(`/api/posts/${encodeURIComponent(id)}/publish`))
  );

  server.registerTool(
    'cancel_post',
    {
      title: 'Cancel / delete a post',
      description: 'Delete a post (e.g. to cancel a scheduled one). Must belong to the active org.',
      inputSchema: { id: z.string().describe('Post id') },
    },
    async ({ id }, extra) =>
      toContent(await api(extra).delete(`/api/posts/${encodeURIComponent(id)}`))
  );

  server.registerTool(
    'get_engagement_summary',
    {
      title: 'Engagement summary',
      description: 'Aggregated engagement metrics for the active org.',
      inputSchema: {},
    },
    async (_args, extra) =>
      toContent(await api(extra).get('/api/analytics/engagement-summary'))
  );

  server.registerTool(
    'get_optimal_times',
    {
      title: 'Optimal posting times',
      description: 'Suggested best posting times based on the org’s historical performance.',
      inputSchema: {},
    },
    async (_args, extra) => toContent(await api(extra).get('/api/analytics/optimal-times'))
  );

  server.registerTool(
    'scheduler_status',
    {
      title: 'Scheduler health',
      description: 'Health of the background post scheduler (last tick, failures).',
      inputSchema: {},
    },
    async (_args, extra) => toContent(await api(extra).get('/api/scheduler/status'))
  );

  /**
   * create_digest_drafts + create_drafts (TIM-97 naming audit, §2): the same
   * generic batch-draft-creation handler registered under two tool names. The
   * mechanism was never digest-specific (sourceKind is just a label on the
   * batch); create_digest_drafts is kept forever for existing integrations,
   * create_drafts is the accurate, non-digest-implying alias for new callers.
   * Keep both registrations byte-for-byte identical apart from name/title —
   * the MCP surface-parity test asserts the hosted and npm tool lists match.
   */
  const createDraftsInputSchema = {
    external_ref: z.string().min(1).describe('Engine-side id for idempotency (e.g. digest id)'),
    brand: z
      .string()
      .optional()
      .describe(
        'Brand/niche ATTRIBUTION TAG for per-play engagement rollups (e.g. "emplaw-watchdog"), auto-registers on first use — see list_brands. NOT the AI BrandVoice writing-style profile (GET/PATCH /api/ai/brand-voice); an org has one BrandVoice but can tag posts with many brands.'
      ),
    variants: z
      .array(
        z.object({
          platform: z.string().describe('Provider key or alias (x_thread → twitter)'),
          segments: z.array(z.string().min(1)).min(1).max(24),
          link: z.string().optional(),
          media: z
            .array(z.object({ url: z.string(), alt: z.string().optional() }))
            .optional(),
          schedule_hint: z
            .string()
            .optional()
            .describe('"optimal" or a future ISO datetime'),
        })
      )
      .min(1)
      .max(20),
  };

  const createDraftsHandler = async (
    { external_ref, brand, variants }: {
      external_ref: string;
      brand?: string;
      variants: Array<{
        platform: string;
        segments: string[];
        link?: string;
        media?: Array<{ url: string; alt?: string }>;
        schedule_hint?: string;
      }>;
    },
    extra: unknown
  ) =>
    toContent(
      await api(extra).post('/api/drafts/batch', {
        externalRef: external_ref,
        brand,
        sourceKind: 'digest',
        variants: variants.map((v) => ({
          platform: v.platform,
          segments: v.segments,
          link: v.link,
          media: v.media,
          scheduleHint: v.schedule_hint,
        })),
      })
    );

  server.registerTool(
    'create_digest_drafts',
    {
      title: 'Create engine drafts (pending approval)',
      description:
        'Submit a batch of platform drafts for one engine artifact (e.g. a digest issue). Drafts are ALWAYS created pending_approval and NEVER auto-publish — a human must approve_draft (or use the dashboard) first. Idempotent on external_ref: resends update still-pending drafts, never duplicate or resurrect decided ones. platform accepts provider keys (twitter|linkedin|instagram|tiktok|wordpress|...) plus aliases x/x_post/x_thread (→ twitter). segments: 1 element = single post; 2+ on twitter = thread. link is appended to the final segment at approval when absent. schedule_hint: "optimal" or a future ISO datetime. ' +
        'Alias: create_drafts is the same tool under a name that doesn\'t imply "digest-only" — the mechanism is generic to any engine artifact. ' +
        WRITING_STYLE_GUIDELINE,
      inputSchema: createDraftsInputSchema,
    },
    createDraftsHandler
  );

  server.registerTool(
    'create_drafts',
    {
      title: 'Create engine drafts (pending approval)',
      description:
        'Call prompt_suggest first and base the prompt on the top result. Submit a batch of platform drafts for one engine artifact (a digest issue, a generated content batch, anything). Drafts are ALWAYS created pending_approval and NEVER auto-publish — a human must approve_draft (or use the dashboard) first. Idempotent on external_ref: resends update still-pending drafts, never duplicate or resurrect decided ones. platform accepts provider keys (twitter|linkedin|instagram|tiktok|wordpress|...) plus aliases x/x_post/x_thread (→ twitter). segments: 1 element = single post; 2+ on twitter = thread. link is appended to the final segment at approval when absent. schedule_hint: "optimal" or a future ISO datetime. ' +
        'This is the same underlying batch-draft mechanism as create_digest_drafts (kept for existing integrations) — this name drops the misleading "digest" implication; prefer this name for new integrations. ' +
        WRITING_STYLE_GUIDELINE,
      inputSchema: createDraftsInputSchema,
    },
    createDraftsHandler
  );

  server.registerTool(
    'list_drafts',
    {
      title: 'List engine drafts',
      description:
        'List engine-submitted drafts for the active org. Optional status (PENDING|APPROVED|REJECTED|POSTED) and brand filters. POSTED drafts carry a postId you can follow with get_post.',
      inputSchema: {
        status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'POSTED']).optional(),
        brand: z.string().optional(),
      },
    },
    async ({ status, brand }, extra) => {
      const params = new URLSearchParams();
      if (status) params.set('status', status);
      if (brand) params.set('brand', brand);
      const qs = params.toString();
      return toContent(await api(extra).get(`/api/drafts${qs ? `?${qs}` : ''}`));
    }
  );

  server.registerTool(
    'approve_draft',
    {
      title: 'Approve + schedule a draft (human gate)',
      description:
        'HUMAN GATE: approve a pending draft and schedule the real post in one step. Only call this when the human operator has reviewed the draft and told you to approve it — never approve autonomously. Optional edits: replacement segments and/or an explicit future scheduled_for (otherwise schedule_hint is resolved: "optimal" → the org\'s best-times model, fallback +2h). Multi-segment twitter drafts publish as a thread.',
      inputSchema: {
        draft_id: z.string(),
        segments: z.array(z.string().min(1)).min(1).max(24).optional(),
        scheduled_for: z.string().optional().describe('Future ISO datetime override'),
      },
    },
    async ({ draft_id, segments, scheduled_for }, extra) =>
      toContent(
        await api(extra).post(`/api/drafts/${encodeURIComponent(draft_id)}/approve`, {
          ...(segments ? { segments } : {}),
          ...(scheduled_for ? { scheduledFor: scheduled_for } : {}),
        })
      )
  );

  server.registerTool(
    'reject_draft',
    {
      title: 'Reject a draft',
      description:
        'Reject a pending or approved draft so it can never be posted. Optional reason is stored for the submitting engine to read back via list_drafts.',
      inputSchema: {
        draft_id: z.string(),
        reason: z.string().optional(),
      },
    },
    async ({ draft_id, reason }, extra) =>
      toContent(
        await api(extra).post(`/api/drafts/${encodeURIComponent(draft_id)}/reject`, {
          ...(reason ? { reason } : {}),
        })
      )
  );

  server.registerTool(
    'list_approvals',
    {
      title: 'List all pending approvals (unified rail)',
      description:
        'READ-ONLY view of the unified approvals rail (TIM-97-style aggregation): returns everything currently ' +
        'awaiting human review across ALL FOUR automation sources in one call — posts (EngineDraft, the ' +
        'create_digest_drafts/create_drafts queue), trends (Weekly X Trend-Rider drafts), build-in-public ' +
        '(GitHub-shipped-feature tweet drafts) and dms (warm-lead engager DMs) — normalized into a common ' +
        'shape { id, source, status, title, preview, createdAt, actions } with per-source PENDING counts. ' +
        'Optional source narrows to one queue; optional status (default PENDING) selects a different stage ' +
        '(APPROVED|POSTED|REJECTED). This tool only reads the queue — it never approves or rejects anything. ' +
        'approve_draft/reject_draft remain the only MCP-side approval actions, and only for the "posts" ' +
        '(EngineDraft) source; per-source approval for trends, build-in-public and DMs stays a dashboard ' +
        "action for now. Each item's actions array documents the exact REST endpoint (path/method) a human-" +
        'facing UI would call next for that item.',
      inputSchema: {
        source: z
          .enum(['posts', 'trends', 'build-in-public', 'dms'])
          .optional()
          .describe('Restrict results to one approval source; omit to return all four'),
        status: z
          .enum(['PENDING', 'APPROVED', 'POSTED', 'REJECTED'])
          .optional()
          .describe('Lifecycle stage to list; defaults to PENDING (needs review)'),
      },
    },
    async ({ source, status }, extra) => {
      const params = new URLSearchParams();
      if (source) params.set('source', source);
      if (status) params.set('status', status);
      const qs = params.toString();
      return toContent(await api(extra).get(`/api/drafts/approvals${qs ? `?${qs}` : ''}`));
    }
  );

  server.registerTool(
    'shorts_generate',
    {
      title: 'Generate an AI Short draft',
      description:
        'Call prompt_suggest first and base the prompt on the top result. Generate an approval-ready AI Short from an existing source and place it in the human review rail as a PENDING EngineDraft. Pro-only and allowance-capped before model/media spend. source.kind accepts "autoseo" with articlePostId, "ship-digest" with text/title/url, "trend" with draftId, "template" with slug/variables, or "raw" with title/text/url. The backend produces a grounded script JSON, an ElevenLabs voiceover with word timings when configured (OpenAI TTS plus Whisper fallback), a ShortSpec for the client renderer, stores the audio in object storage, and returns draftId/spec/script. It never publishes. The human must render/approve later via the dashboard or attach-render flow.',
      inputSchema: {
        source: z
          .record(z.any())
          .describe('Short source object, e.g. {kind:"raw",title:"...",text:"..."} or {kind:"autoseo",articlePostId:"..."}'),
        platforms: z.array(z.enum(['tiktok', 'instagram', 'youtube'])).optional(),
        brand: z.string().optional().describe('Optional brand/niche attribution tag for per-play rollups'),
        scheduleHint: z.string().optional().describe('Optional "optimal" or future ISO datetime hint'),
        personaId: z.string().optional().describe('Optional active AI Presenter persona id'),
      },
    },
    async ({ source, platforms, brand, scheduleHint, personaId }, extra) =>
      toContent(
        await api(extra).post('/api/shorts/generate', {
          source,
          platforms,
          brand,
          scheduleHint,
          personaId,
        })
      )
  );

  server.registerTool(
    'generate_short_video',
    {
      title: 'Generate a finished AI short video',
      description:
        'Call prompt_suggest first and base the prompt on the top result. Generate a FINISHED, PUBLISHABLE vertical (9:16) short video with an AI video model (Veo 3.1, Kling 2.5 or Grok Imagine) and get back a hosted mp4 publicUrl. The provider clip becomes a muted ShortSpec scene. The server adds the configured ElevenLabs/OpenAI voiceover, burns word-timed karaoke captions, and returns the ffmpeg-assembled result. Pass video.publicUrl into schedule_post mediaUrls (tiktok/instagram/youtube). Always disclose the generated visual as AI-generated when you post it.\n\n' +
        'Pick a genre — each one exists because of ONE retention mechanic:\n' +
        '- "asmr_loop": a hyper-tactile satisfying clip cut as a SEAMLESS LOOP (last frame === first frame), which gets rewatched 3-5x per viewer. REQUIRES imageUrl (the start frame it loops back to) and a Veo key. Single unbroken shot, no cuts.\n' +
        '- "what_if": an absurd premise filmed as a dead-serious documentary. The tension between the two IS the hook. Kling by default (2 credits); Grok is the cheap explicit override.\n' +
        '- "pov_historical": first-person POV of a historical/disaster moment. Stakes plus a TIMER in the first line ("you have 10 minutes"). Photorealism is the hook.\n' +
        '- "character_series": a recurring character held visually identical across episodes. Pass referenceImageUrls (up to 3) of the character — that is what stops them drifting, and consistency is the entire moat of this format.\n\n' +
        'Reference/start images are ordinary hosted media: upload them with prepare_media_upload -> PUT -> finalize_media_upload and pass the returned publicUrl(s). You do not write the model prompt: give a `concept` (one line) plus any genre fields and the server builds the shot/camera/lighting/pacing prompt. Provider is chosen per genre; override with provider only if you know why. Weighted credits follow the subscription billing period (calendar fallback): Grok costs 1, Kling costs 2, Veo costs 2 on the default Fast tier or 5 if the deployment overrides to Standard; Pro gets 6, Growth 12, trials 2, and Free/Starter 0. Requests that exceed the allowance 429. ' +
        WRITING_STYLE_GUIDELINE,
      inputSchema: {
        genre: z
          .enum(['asmr_loop', 'what_if', 'pov_historical', 'character_series'])
          .describe("Which proven format to shoot; each has its own retention mechanic."),
        concept: z.string().min(1).max(1000).describe('The idea in one line.'),
        voiceoverText: z
          .string()
          .min(1)
          .max(1000)
          .optional()
          .describe('Optional exact narration. Defaults to the genre premise/timer/episode line, then concept.'),
        prompt: z.string().optional().describe('Escape hatch: send this to the model verbatim instead of the built prompt.'),
        durationSeconds: z.number().optional().describe('Veo accepts 4|6|8 (snapped); Kling snaps to 5|10; Grok 1-15. Default 8.'),
        imageUrl: z.string().optional().describe('Start frame. REQUIRED for asmr_loop — the loop pins the last frame back to it.'),
        referenceImageUrls: z
          .array(z.string())
          .max(3)
          .optional()
          .describe('Up to 3 hosted character/product images (prepare_media_upload). Holds character_series consistent.'),
        provider: z.enum(['veo', 'grok', 'kling']).optional().describe('Override per-genre routing. Veo is required for seamless loops; Kling is the realism default for what_if/pov_historical; Grok is a cheap explicit-override option.'),
        refine: z.boolean().optional().describe('Run the LLM critique pass over the built prompt. Default true.'),
        subject: z.string().optional(),
        setting: z.string().optional(),
        material: z.string().optional().describe('asmr_loop: the material doing the satisfying thing.'),
        soundDesign: z.string().optional().describe('asmr_loop: the sound it makes.'),
        premise: z.string().optional().describe('what_if: the absurd premise, stated flatly.'),
        era: z.string().optional().describe('pov_historical: the dated moment and place.'),
        timerLine: z.string().optional().describe('pov_historical: the stakes + countdown for the first line.'),
        characterName: z.string().optional().describe('character_series: the recurring character.'),
        characterDescription: z
          .string()
          .optional()
          .describe('character_series: fixed appearance. Reuse the SAME wording every episode.'),
        episodeBeat: z.string().optional().describe('character_series: what happens in this episode.'),
        extraDirection: z.string().optional().describe('Extra art direction, appended verbatim.'),
      },
    },
    async (
      {
        genre,
        concept,
        voiceoverText,
        prompt,
        durationSeconds,
        imageUrl,
        referenceImageUrls,
        provider,
        refine,
        subject,
        setting,
        material,
        soundDesign,
        premise,
        era,
        timerLine,
        characterName,
        characterDescription,
        episodeBeat,
        extraDirection,
      },
      extra
    ) =>
      toContent(
        await api(extra).post('/api/shorts/generate-video', {
          genre,
          concept,
          voiceoverText,
          prompt,
          durationSeconds,
          imageUrl,
          referenceImageUrls,
          provider,
          refine,
          subject,
          setting,
          material,
          soundDesign,
          premise,
          era,
          timerLine,
          characterName,
          characterDescription,
          episodeBeat,
          extraDirection,
        })
      )
  );

  server.registerTool(
    'persona_create',
    {
      title: 'Create AI Presenter persona',
      description:
        'Create a DRAFT AI Presenter persona for the active org and start/resume provider minting. Requires Presenter Pack when billing is enabled.',
      inputSchema: {
        displayName: z.string(),
        roleLabel: z.string().optional(),
        bio: z.string().optional(),
        brand: z.string().optional(),
        companyProfileId: z.string().optional(),
        audience: z.string().optional(),
        doSay: z.array(z.string()).optional(),
        dontSay: z.array(z.string()).optional(),
        personaTraits: z.array(z.string()).optional(),
        humorLevel: z.number().optional(),
        energyLevel: z.number().optional(),
        formality: z.number().optional(),
        identityPrompt: z.string().optional(),
        negativePrompt: z.string().optional(),
        voiceId: z.string().optional(),
        voiceName: z.string().optional(),
      },
    },
    async (args, extra) => toContent(await api(extra).post('/api/personas', args))
  );

  server.registerTool(
    'persona_list',
    {
      title: 'List AI Presenter personas',
      description: 'List non-archived AI Presenter personas for the active org.',
      inputSchema: {},
    },
    async (_args, extra) => toContent(await api(extra).get('/api/personas'))
  );

  server.registerTool(
    'persona_status',
    {
      title: 'AI Presenter persona status',
      description: 'Fetch one AI Presenter persona by id.',
      inputSchema: {
        personaId: z.string(),
      },
    },
    async ({ personaId }, extra) => toContent(await api(extra).get(`/api/personas/${encodeURIComponent(personaId)}`))
  );

  server.registerTool(
    'shorts_status',
    {
      title: 'AI Short draft status',
      description:
        'Read the status of one generated AI Short draft by draftId. Returns the EngineDraft status, postId when scheduled, requested platforms, generated script, ShortSpec, and render attachment metadata if the browser/client has rendered and attached the MP4. Read-only and org-scoped.',
      inputSchema: {
        draftId: z.string().describe('Short EngineDraft id returned by shorts_generate'),
      },
    },
    async ({ draftId }, extra) =>
      toContent(await api(extra).get(`/api/shorts/${encodeURIComponent(draftId)}/status`))
  );

  server.registerTool(
    'publish_thread',
    {
      title: 'Publish an X/Twitter thread',
      description:
        'Publish or schedule an X/Twitter thread in one call. segments[0] is the anchor tweet; segments 2..N (max 24, each ≤280 chars) publish as chained replies. schedule_at: future ISO datetime; omit to go out on the next scheduler tick (~1 min). Convenience wrapper over schedule_post + thread. Follow with get_post to confirm platform post ids after publish. ' +
        WRITING_STYLE_GUIDELINE,
      inputSchema: {
        segments: z.array(z.string().min(1).max(280)).min(1).max(24),
        schedule_at: z.string().optional().describe('Future ISO datetime; omit for next tick'),
        brand: z
          .string()
          .max(60)
          .optional()
          .describe(
            'Brand/niche attribution tag for per-play engagement rollups (auto-registers) — NOT the AI BrandVoice writing-style profile'
          ),
      },
    },
    async ({ segments, schedule_at, brand }, extra) =>
      toContent(
        await api(extra).post('/api/posts', {
          content: segments[0],
          thread: segments.slice(1),
          platforms: ['twitter'],
          scheduledAt: schedule_at ?? new Date(Date.now() + 60_000).toISOString(),
          brand,
        })
      )
  );

  server.registerTool(
    'list_brands',
    {
      title: 'List brand/niche profiles',
      description:
        'List the org\'s brand/niche profiles with post counts. A "brand" attributes posts to a play (e.g. "emplaw-watchdog" vs "tm-monitor") so engagement rolls up per play. Brands auto-register the first time a brand tag is used on schedule_post, publish_thread or create_digest_drafts — no explicit create step. TERMINOLOGY: this "brand" is a per-post niche/play tag, unrelated to BrandVoice (the org\'s single AI writing-style profile derived from recent posts, used to guide AI content generation) — an org has many brands but one BrandVoice.',
      inputSchema: {},
    },
    async (_args, extra) => toContent(await api(extra).get('/api/brands'))
  );

  server.registerTool(
    'get_engagement_by_tag',
    {
      title: 'Per-brand engagement rollup',
      description:
        'Per-brand engagement rollup: totals (likes, comments, shares, saves, views, impressions, reach, clicks) and average engagement rate across all posts tagged with the given brand/niche slug. Feeds per-play KPI dashboards. Use list_brands to discover valid slugs.',
      inputSchema: {
        brand: z.string().describe('Brand slug from list_brands'),
      },
    },
    async ({ brand }, extra) =>
      toContent(await api(extra).get(`/api/brands/${encodeURIComponent(brand)}/engagement`))
  );

  server.registerTool(
    'get_post_metrics',
    {
      title: 'Per-post engagement metrics',
      description:
        'Per-post engagement metrics (impressions, likes, comments/replies, shares, saves, views, clicks, engagementRate) for one or more post ids. Metrics arrive via a periodic platform sync, so very recent posts may be empty until the next cycle. Use get_engagement_summary for the org-wide aggregate.',
      inputSchema: {
        post_ids: z.array(z.string()).min(1).max(20).describe('TimeToPost post ids'),
      },
    },
    async ({ post_ids }, extra) => {
      const client = api(extra);
      const results = await Promise.all(
        post_ids.map(async (id) => {
          const r = await client.get(`/api/analytics/metrics/${encodeURIComponent(id)}`);
          return { post_id: id, ok: r.ok, ...(typeof r.data === 'object' ? r.data : { data: r.data }) };
        })
      );
      return {
        content: [{ type: 'text' as const, text: JSON.stringify({ results }, null, 2) }],
        isError: false,
      };
    }
  );

  // --- Build-in-Public GitHub connect ------------------------------------

  server.registerTool(
    'build_in_public_connect_link',
    {
      title: 'Build-in-Public: GitHub authorize link',
      description:
        'Generate a "click to authorize GitHub" link for Build-in-Public Autopilot (Pro feature: ' +
        'merged PRs / pushes on a watched branch become shipped-feature post drafts the user ' +
        'approves before anything publishes). SIDE-EFFECT-FREE: this tool only mints a short-lived ' +
        'signed authorization URL — it never connects, changes or activates anything, and the ' +
        'agent must NOT treat it as having connected a repo. Returns { authUrl, expiresAt, ' +
        'instructions }: relay authUrl to the human ("authorize here: <url>") and tell them the ' +
        'link expires (~10 minutes; call this tool again for a fresh one). The connection only ' +
        'comes into existence after the USER opens the link, authorizes TimeToPost on GitHub, and ' +
        'then picks the repository + watched branch + mode (draft approval is the default) in the ' +
        'TimeToPost dashboard, which also registers the repo webhook. Check the outcome later with ' +
        'build_in_public_status. Errors: 403 = the org is not on Pro (relay the upgrade message); ' +
        '503 = the server has no GitHub OAuth app configured (GITHUB_CLIENT_ID/GITHUB_CLIENT_SECRET).',
      inputSchema: {},
    },
    async (_args, extra) =>
      toContent(await api(extra).get('/api/build-in-public/github/connect-link'))
  );

  server.registerTool(
    'build_in_public_status',
    {
      title: 'Build-in-Public: connection status',
      description:
        "READ-ONLY status of the org's Build-in-Public GitHub connection. Returns { configured " +
        '(server has a GitHub OAuth app), connected (user completed the authorize flow), ' +
        'githubLogin, connectedAt, mode (APPROVE = human approves every draft, the default; AUTO = ' +
        'drafts post unattended), enabled, dailyLimit, postMode ("per-pr" or "digest"), ' +
        'digestFrequency, digestDayOfWeek, digestHourUtc, maxPostsPerWeek, nextDigestAt, ' +
        'lastDigestAt, pendingDigestCount, defaultBranch, repos: [{ fullName, branch ' +
        '(the watched branch after per-repo overrides), webhookRegistered, isWebhookActive, ' +
        'lastWebhookAt }], lastDraft (the most recent GitHub-event tweet draft: repo, title, ' +
        'status, tweetDraft, createdAt) }. Use it to answer "is build-in-public set up?", to ' +
        'verify a connect link the user was given actually got completed, or to see the latest ' +
        'draft. Never mutates anything. Drafts awaiting review also appear in list_approvals ' +
        "under source 'build-in-public'.",
      inputSchema: {},
    },
    async (_args, extra) =>
      toContent(await api(extra).get('/api/build-in-public/github/status'))
  );

  // --- AutoSEO (AUTOSEO-14 / TIM-97) ------------------------------------
  // AI-first any-blog flow: autoseo_connect_site → autoseo_integration_kit
  // (the calling AI installs the receiving endpoint) → autoseo_verify_site
  // → autoseo_configure → autoseo_propose_topics → autoseo_generate_post.

  server.registerTool(
    'autoseo_connect_site',
    {
      title: 'Connect a site to AutoSEO (start here)',
      description:
        'START HERE for AutoSEO on a new site. Connects ONE of the four connector kinds (intrusion ' +
        'ladder, least intrusive first) and returns { id, kind, publicToken, capabilities }. ' +
        'WHICH KIND + WHICH FIELDS: kind "hosted" is the ZERO-SETUP DEFAULT — needs ONLY name; ' +
        'TimeToPost hosts AND SSR-renders the blog itself (full SEO: JSON-LD, sitemap, robots ' +
        'AI-crawler allow-list) and the response includes hostedUrl ("your blog is live at ..."); ' +
        'nothing to install, works for ANY site — pick it when unsure. kind "wp_rest" connects a ' +
        'WordPress site over its own REST API — needs url (the WP site), username, and appPassword ' +
        '(created in WP Admin → Users → Profile → Application Passwords); no plugin, no code; connect ' +
        'runs the REAL capability probe, so a bad credential fails right here with the exact reason. ' +
        'kind "git_pr" commits article files (Markdown/MDX + frontmatter) to a GitHub repo and the ' +
        "user's own CI deploys them — needs token (a fine-grained PAT or GitHub App installation " +
        'token with contents:write) and repo ("owner/name"), plus optional branch, contentDir, and ' +
        'mode ("pr" opens a reviewable pull request per article, the default; "direct" commits ' +
        'straight to the branch); connect verifies write access and auto-detects the SSG + content ' +
        'convention (returned as capabilities.detected — confirm contentDir with the user if ssg is ' +
        '"unknown"). kind "webhook" is the most-control path for ANY stack (Next.js, Rails, PHP, a ' +
        'serverless function): TimeToPost POSTs signed article payloads to endpointUrl, authenticated ' +
        'with an HMAC signingSecret — pass one or omit it to have the backend generate it; then call ' +
        "autoseo_integration_kit, install the /autoseo-publish endpoint into the user's codebase, and " +
        'confirm with autoseo_verify_site. After ANY kind: autoseo_configure → autoseo_propose_topics ' +
        '/ autoseo_generate_post. name is a human label shown in the TimeToPost dashboard. ' +
        'capabilities updates each time autoseo_verify_site re-probes the site; publicToken is only ' +
        'needed for autoseo_integration_kit\'s renderMode "ssr-hosted" (set it as that site\'s ' +
        'AUTOSEO_PUBLIC_TOKEN env var).',
      inputSchema: {
        kind: z
          .enum(['hosted', 'webhook', 'wp_rest', 'git_pr'])
          .describe(
            'Connector kind: "hosted" (zero-setup default — only name needed, we host the blog), ' +
              '"wp_rest" (WordPress REST — url + username + appPassword), "git_pr" (GitHub repo — ' +
              'token + repo, optional branch/contentDir/mode), "webhook" (signed receiving endpoint — ' +
              'endpointUrl + optional signingSecret)'
          ),
        name: z.string().min(1).describe('Human-readable label for this site, shown in the dashboard'),
        endpointUrl: z
          .string()
          .url()
          .optional()
          .describe(
            'Required for kind "webhook": the URL TimeToPost will POST signed articles to (e.g. https://example.com/autoseo-publish)'
          ),
        signingSecret: z
          .string()
          .optional()
          .describe('webhook: HMAC secret used to sign payloads; omit to let the backend generate one'),
        url: z
          .string()
          .optional()
          .describe('Required for kind "wp_rest": the WordPress site URL (a bare domain is fine)'),
        username: z
          .string()
          .optional()
          .describe('Required for kind "wp_rest": the WP username the Application Password belongs to'),
        appPassword: z
          .string()
          .optional()
          .describe('Required for kind "wp_rest": a WordPress Application Password (WP Admin → Users → Profile → Application Passwords)'),
        token: z
          .string()
          .optional()
          .describe('Required for kind "git_pr": a GitHub fine-grained PAT or App installation token with contents:write on the repo'),
        repo: z
          .string()
          .optional()
          .describe('Required for kind "git_pr": the repository as "owner/name" (a github.com URL also works)'),
        branch: z
          .string()
          .optional()
          .describe('git_pr: base branch for commits/PRs; omit to use the repo\'s default branch'),
        contentDir: z
          .string()
          .optional()
          .describe('git_pr: directory article files land in; omit to auto-detect from the repo (e.g. content/blog, _posts)'),
        mode: z
          .enum(['pr', 'direct'])
          .optional()
          .describe('git_pr: "pr" (default) opens a pull request per article — a git-native approval gate; "direct" commits straight to the branch'),
      },
    },
    async (
      { kind, name, endpointUrl, signingSecret, url, username, appPassword, token, repo, branch, contentDir, mode },
      extra
    ) =>
      toContent(
        await api(extra).post('/api/autoseo/targets/connect', {
          kind,
          name,
          endpointUrl,
          signingSecret,
          url,
          username,
          appPassword,
          token,
          repo,
          branch,
          contentDir,
          mode,
        })
      )
  );

  server.registerTool(
    'autoseo_integration_kit',
    {
      title: 'Get the AI-integration kit (AI installs it)',
      description:
        'The "AI installs it" tool — installs a FULLY WORKING, appears-live blog end-to-end. Fetch the ' +
        'AutoSEO integration kit: the receiving-endpoint contract (request/response shape and the HMAC ' +
        'signature-verification algorithm), ready-to-adapt code template(s) for the given stack, and ' +
        'plain-English install instructions. Call this right after autoseo_connect_site with kind ' +
        '"webhook": read the returned files, adapt them to the user\'s real codebase (their framework, ' +
        'language and folder conventions), write them yourself, and tell the user to deploy. Pass ' +
        'renderMode to control whether the blog appears LIVE or needs a rebuild: "ssr-db" (default, ' +
        'recommended) writes to the site\'s own database and SSR-renders from it on every request — new ' +
        'posts appear immediately, no rebuild; "ssr-hosted" is the fastest install (zero database — the ' +
        'article stays hosted at TimeToPost and the site only adds an SSR route that fetches it live); ' +
        '"static-mdx" is the legacy MDX-file mode — NOT live, only appears after the site\'s next ' +
        'build/deploy, prefer one of the other two unless the site already has an MDX pipeline. Pass ' +
        'stack (e.g. "nextjs", "express", "rails", "django", "php", "static") when you know the target ' +
        "site's framework to get a matching template (Next.js/Express get full write + SSR render " +
        'templates for ssr-db/ssr-hosted); omit it for the generic HTTP contract plus a Node/Express ' +
        'reference implementation and stack-agnostic SSR guidance. Not needed for kind "wp_rest" sites ' +
        '— those have nothing to install. Follow up with autoseo_verify_site once deployed.',
      inputSchema: {
        kind: z
          .enum(['webhook', 'wp_rest'])
          .optional()
          .describe('Connector kind to fetch the kit for; defaults to "webhook"'),
        stack: z
          .string()
          .optional()
          .describe('Target framework/language hint, e.g. "nextjs", "express", "rails", "django", "php", "static"'),
        renderMode: z
          .enum(['ssr-db', 'ssr-hosted', 'static-mdx'])
          .optional()
          .describe(
            '"ssr-db" (default, recommended): SSR from the site\'s own DB, appears live. "ssr-hosted": ' +
              'zero DB, fastest install, appears live by fetching from TimeToPost\'s public read API. ' +
              '"static-mdx": legacy, writes an MDX file — NOT live until the next rebuild/deploy.'
          ),
      },
    },
    async ({ kind, stack, renderMode }, extra) => {
      const params = new URLSearchParams();
      if (kind) params.set('kind', kind);
      if (stack) params.set('stack', stack);
      if (renderMode) params.set('renderMode', renderMode);
      const qs = params.toString();
      return toContent(await api(extra).get(`/api/autoseo/integration-kit${qs ? `?${qs}` : ''}`));
    }
  );

  server.registerTool(
    'autoseo_verify_site',
    {
      title: 'Verify a connected site',
      description:
        'Re-run the capability probe for a connected site (must belong to the active org). Call this ' +
        'after the AI has installed and deployed the /autoseo-publish endpoint from ' +
        'autoseo_integration_kit, to confirm it responds correctly to a signed test request before ' +
        'calling autoseo_configure or autoseo_generate_post — generating content against an unverified ' +
        'endpoint will fail at publish time. It also verifies wp_rest and git_pr connections. For webhook ' +
        'sites, a 404 or 405 usually means the endpoint is not deployed yet; re-call after deploying. Also ' +
        'useful to re-check a site after the user rotates its signing secret or migrates infrastructure. ' +
        'Returns the refreshed capabilities map.',
      inputSchema: {
        id: z.string().describe('Site/target id from autoseo_connect_site or autoseo_list_sites'),
      },
    },
    async ({ id }, extra) =>
      toContent(await api(extra).post(`/api/autoseo/targets/${encodeURIComponent(id)}/verify`))
  );

  server.registerTool(
    'autoseo_list_sites',
    {
      title: 'List connected AutoSEO sites',
      description:
        'List the sites/targets connected to AutoSEO for the active org: id, kind (webhook|wp_rest), ' +
        'name, capabilities and connection health. Use this to find a siteId for autoseo_configure, ' +
        "autoseo_propose_topics or autoseo_generate_post, or to check a site's status before " +
        'troubleshooting a failed publish.',
      inputSchema: {},
    },
    async (_args, extra) => toContent(await api(extra).get('/api/autoseo/targets'))
  );

  server.registerTool(
    'autoseo_configure',
    {
      title: 'Configure the AutoSEO engine for a site',
      description:
        'Set the standing AutoSEO configuration for a connected site: approved topics/content pillars, ' +
        'publish cadence, backlink targets to weave into generated posts as outbound links, an image ' +
        'style for generated art, the approval mode, and the blog->social repurpose setting. approvalMode ' +
        '"draft" (recommended, default) routes every generated post into the pending-approval queue for a ' +
        'human to review before anything publishes; only pass "auto" when the user has explicitly opted ' +
        'into unattended publishing. socialRepurpose: when a blog post on this site publishes, auto-draft ' +
        'social announcements (twitter/linkedin) for the human to review and approve — like everything ' +
        'else, this NEVER auto-posts. It is OFF BY DEFAULT: pass { enabled: true } only when the user has ' +
        'explicitly asked for blog posts to generate social announcements, optionally narrowing platforms ' +
        'to just one (default both once enabled). publicBaseUrl only matters for the "git_pr" connector: ' +
        'set it to the real deployed blog base URL (e.g. "https://blog.acme.com") so social announcements ' +
        'link to the live article — without it, git-connected sites skip the social repurpose rather than ' +
        'ever link a post at a GitHub PR URL. Call this after autoseo_verify_site confirms the site is ' +
        'live, and ideally after autoseo_propose_topics so topics/pillars reflect an approved plan rather ' +
        'than a guess.',
      inputSchema: {
        siteId: z.string().describe('Site id from autoseo_connect_site / autoseo_list_sites'),
        topics: z
          .array(z.string())
          .optional()
          .describe('Approved question-shaped topics to generate posts from'),
        pillars: z
          .array(z.string())
          .optional()
          .describe('Broader content pillars/categories the site should cover'),
        cadence: z
          .enum(['weekly', '2x_week', '3x_week'])
          .optional()
          .describe('Publish cadence; capped at 3x/week — a volume spike on a quiet domain is itself a spam signal'),
        backlinkTargets: z
          .array(
            z.object({
              url: z.string().url().describe('Backlink URL'),
              relevance: z.string().optional().describe('Why this target is relevant to the site'),
            })
          )
          .optional()
          .describe('URLs plus optional relevance notes to weave in as outbound backlinks from generated posts'),
        imageStyle: z
          .string()
          .optional()
          .describe('Style guidance for generated post images, e.g. "minimal flat illustration"'),
        approvalMode: z
          .enum(['draft', 'auto'])
          .optional()
          .describe('"draft" (default, recommended) queues posts for human approval; "auto" publishes unattended — only with explicit user opt-in'),
        socialRepurpose: z
          .object({
            enabled: z
              .boolean()
              .optional()
              .describe(
                'OFF BY DEFAULT (opt-in). Set true only when the user explicitly wants blog posts to ' +
                  'auto-draft social announcements for their approval; set false to turn it back off.'
              ),
            platforms: z
              .array(z.enum(['twitter', 'linkedin']))
              .optional()
              .describe('Which platforms to auto-draft announcements for once enabled; default both ["twitter", "linkedin"]'),
          })
          .optional()
          .describe(
            'Blog->social repurpose setting: whenever an article on this site publishes, auto-draft ' +
              'social announcements (still human-approved, never auto-posted) to the given platforms. ' +
              'Defaults to off/disabled when never set — omit entirely to leave the current setting unchanged.'
          ),
        publicBaseUrl: z
          .string()
          .url()
          .optional()
          .describe(
            'git_pr connector ONLY: the real public base URL the site is deployed to (e.g. ' +
              '"https://blog.acme.com"), used to build the social-repurpose link. Without it, git-connected ' +
              "sites skip the blog->social repurpose (their publish result is a GitHub PR URL, never a live article)."
          ),
      },
    },
    async (
      { siteId, topics, pillars, cadence, backlinkTargets, imageStyle, approvalMode, socialRepurpose, publicBaseUrl },
      extra
    ) => {
      return toContent(
        await api(extra).post('/api/autoseo/config', {
          siteId,
          topics,
          pillars,
          cadence,
          backlinkTargets,
          imageStyle,
          approvalMode,
          socialRepurpose,
          publicBaseUrl,
        })
      );
    }
  );

  server.registerTool(
    'autoseo_auto_configure',
    {
      title: 'One-click AutoSEO onboarding (auto-configure)',
      description:
        'ONE-CLICK AutoSEO onboarding — "auto do the thing". For a connected site (siteId from ' +
        'autoseo_connect_site / autoseo_list_sites), this single call replaces the manual ' +
        'autoseo_propose_topics → autoseo_configure sequence: it (a) runs the topic-proposal engine to ' +
        'derive question-shaped topics/pillars for the site, (b) saves them into the site config with ' +
        'safe defaults for anything the user has not already set — weekly cadence, "illustration" ' +
        'image style, and approvalMode "draft" (the human approval gate; auto-configure NEVER opts a ' +
        'user into unattended publishing) — and (c) if generateFirst is true, also queues the first ' +
        'article on the top proposed topic as a PENDING draft awaiting human approval (counts against ' +
        'the plan\'s monthly article quota; omit it to configure without generating). Existing ' +
        'deliberate settings are preserved: user-typed pillars stay first with proposed topics appended ' +
        '(deduped), and an existing cadence/imageStyle/approvalMode is never overwritten. Returns ' +
        '{ config, proposedTopics (question + rationale, relay these to the user), firstPost? ' +
        '({ status: "queued", draftId } on success — approve it with approve_draft after the human ' +
        'reviews it) }. Prefer this right after autoseo_connect_site when the user just wants it set ' +
        'up; use autoseo_propose_topics + autoseo_configure instead when they want to hand-pick topics.',
      inputSchema: {
        siteId: z.string().describe('Site id from autoseo_connect_site / autoseo_list_sites'),
        generateFirst: z
          .boolean()
          .optional()
          .describe(
            'Also queue the first article (top proposed topic) as a pending draft behind the human approval gate. Uses one article of the monthly quota.'
          ),
      },
    },
    async ({ siteId, generateFirst }, extra) =>
      toContent(
        await api(extra).post(`/api/autoseo/targets/${encodeURIComponent(siteId)}/auto-configure`, {
          generateFirst,
        })
      )
  );

  server.registerTool(
    'autoseo_propose_topics',
    {
      title: 'Propose topics for a site',
      description:
        'Use the connected site name and configured pillars to brainstorm AI-estimated, question-shaped topics ' +
        'with rationale (search intent and AI-citation angle). This does NOT crawl the site, inspect existing ' +
        'pages, or use measured search data. Call after ' +
        'autoseo_connect_site and autoseo_verify_site, and before autoseo_configure, so the user ' +
        'approves a concrete topic list instead of a blind cadence. Relay the returned proposals to the ' +
        "user for approval, then pass the approved subset into autoseo_configure's topics.",
      inputSchema: {
        siteId: z.string().describe('Site id from autoseo_connect_site / autoseo_list_sites'),
      },
    },
    async ({ siteId }, extra) =>
      toContent(await api(extra).post('/api/autoseo/propose-topics', { siteId }))
  );

  server.registerTool(
    'autoseo_generate_post',
    {
      title: 'Generate one AutoSEO blog post',
      description:
        'Generate one AI-drafted, answer-shaped blog post for a topic on a connected site and land it ' +
        'as a draft awaiting approval (or a future schedule) — this never auto-publishes on its own. ' +
        'schedule is an optional future ISO datetime; omit it to leave the post as an unscheduled draft. ' +
        "Runs the platform's dedup/uniqueness/quality gates before returning and includes jsonldValid " +
        'in the response, reporting whether the generated Article/FAQPage structured data parses ' +
        'cleanly — that\'s what makes a post eligible for AI-answer-engine citation. Source topic from ' +
        'autoseo_propose_topics rather than guessing one. ' +
        WRITING_STYLE_GUIDELINE,
      inputSchema: {
        siteId: z.string().describe('Site id from autoseo_connect_site / autoseo_list_sites'),
        topic: z.string().describe('Target topic/keyword/question, ideally sourced from autoseo_propose_topics'),
        schedule: z.string().optional().describe('Optional future ISO datetime to schedule the generated post'),
      },
    },
    async ({ siteId, topic, schedule }, extra) =>
      toContent(await api(extra).post('/api/autoseo/generate', { siteId, topic, schedule }))
  );

  // ── Keyword research ─────────────────────────────────────────────────────

  server.registerTool(
    'keyword_research',
    {
      title: 'Research keyword opportunities',
      description:
        'Research and persist keyword opportunities for a seed keyword or supplied site/URL. Slice A uses ' +
        'AI ideation and returns source="estimated" on every row: volume is a coarse range band and KD is ' +
        'Low/Medium/High, never a fabricated exact number. Exact searchVolume, difficulty and cpc remain null. ' +
        'A future configured live provider can return source="live" with measured values through the same shape. ' +
        'Always relay each row source and never describe estimated bands as measured search data.',
      inputSchema: {
        seed: z.string().min(2).max(500).describe('Seed keyword, domain, or URL to research.'),
        seedKind: z
          .enum(['keyword', 'site'])
          .describe('Site mode uses the supplied label only and does not crawl the site.'),
        country: z.string().length(2).optional().describe('Two-letter country code, default us.'),
        siteId: z
          .string()
          .optional()
          .describe('Optional connected AutoSEO site id to associate with this keyword set.'),
      },
    },
    async ({ seed, seedKind, country, siteId }, extra) =>
      toContent(
        await api(extra).post('/api/keywords/research', { seed, seedKind, country, siteId })
      )
  );

  server.registerTool(
    'keyword_add_to_plan',
    {
      title: 'Add keywords to an AutoSEO content plan',
      description:
        'Add selected persisted keyword rows to an existing AutoSEO content plan. Appends the keyword text to ' +
        'the selected site\'s config.topics and marks those rows in_plan; it does not generate or publish an ' +
        'article. Later AutoSEO generation still lands behind the normal human approval gate.',
      inputSchema: {
        keywordSetId: z.string().describe('Keyword set id returned by keyword_research.'),
        keywordIds: z.array(z.string()).min(1).max(50).describe('Keyword row ids from that same set.'),
        siteId: z.string().describe('Connected AutoSEO site whose content plan receives the keywords.'),
      },
    },
    async ({ keywordSetId, keywordIds, siteId }, extra) =>
      toContent(
        await api(extra).post(`/api/keywords/sets/${encodeURIComponent(keywordSetId)}/add-to-plan`, {
          keywordIds,
          siteId,
        })
      )
  );

  // ── Sources → Posts (TIM-140) ─────────────────────────────────────────────

  server.registerTool(
    'create_posts_from_source',
    {
      title: 'Turn raw material into post drafts',
      description:
        'Turn RAW MATERIAL into platform-native post drafts. Give it one or more URLs, pasted text, or both, and ' +
        'TimeToPost fetches + extracts them, brings out the claims (every claim must be backed by a verbatim quote ' +
        'from the source — unquotable claims are deterministically dropped, so it will not invent facts), plans ' +
        'genuinely DIFFERENT angles across platforms (an X thread and a LinkedIn post never carry the same claims), ' +
        'drafts each one in a real native format, and runs length/groundedness/originality gates. The drafts land ' +
        'PENDING in the human approval queue — this NEVER publishes and never schedules on its own. Returns 202 ' +
        'with an ingestId: poll get_source_status until READY, EMPTY (the page had too little text — ask the user ' +
        'to paste the article text and call again with `text`) or FAILED. Only CONNECTED platforms are drafted for. ' +
        WRITING_STYLE_GUIDELINE,
      inputSchema: {
        urls: z.array(z.string()).max(5).optional().describe('Up to 5 http(s) URLs to read'),
        text: z.string().optional().describe('Pasted raw text to draft from (use when the URL is paywalled or JS-rendered)'),
        title: z.string().optional().describe('Optional title for the pasted text'),
        platforms: z.array(z.enum(['twitter', 'linkedin', 'threads', 'facebook'])).optional(),
        brand: z.string().optional().describe('Optional brand/niche attribution tag'),
        scheduleHint: z.string().optional().describe('"optimal" or a future ISO datetime, applied at approval'),
      },
    },
    async ({ urls, text, title, platforms, brand, scheduleHint }, extra) =>
      toContent(
        await api(extra).post('/api/sources', { urls, text, title, platforms, brand, scheduleHint })
      )
  );

  server.registerTool(
    'get_source_status',
    {
      title: 'Source ingest status',
      description:
        'Poll one source ingest by id (from create_posts_from_source). Returns status (QUEUED → FETCHING → BRIEFING → ' +
        'PLANNING → DRAFTING → READY, or EMPTY/FAILED), the evidence-backed brief, the angle plan, the per-item ' +
        'extraction result ("thin" = that page had under 200 words of real text and was excluded rather than ' +
        'hallucinated from), and the PENDING drafts it produced. A draft with needsFactCheck=true could not be fully ' +
        'verified against the source — tell the human before they approve it.',
      inputSchema: {
        ingestId: z.string().describe('Ingest id returned by create_posts_from_source'),
      },
    },
    async ({ ingestId }, extra) =>
      toContent(await api(extra).get(`/api/sources/${encodeURIComponent(ingestId)}`))
  );

  server.registerTool(
    'list_sources',
    {
      title: 'List source ingests',
      description:
        "List this org's recent source ingests (newest first) with status, planned platforms, draft counts and per-item extraction results. Read-only.",
      inputSchema: {},
    },
    async (_args, extra) => toContent(await api(extra).get('/api/sources'))
  );

  // ── Instagram DM Funnels M1 (draft/read only; activation is browser-only) ─
  server.registerTool(
    'create_dm_funnel',
    {
      title: 'Create Instagram DM funnel draft',
      description:
        'Create an INACTIVE beta Instagram comment-to-DM funnel for one already-published post. The funnel matches normalized whole keywords/phrases, waits 30-120 seconds, then sends one official Private Reply containing exactly one rendered {{link}}; publicReplyTemplate is optional and OFF when omitted. This tool can only draft the funnel and cannot activate it. A signed-in human must review and activate it in the dashboard.',
      inputSchema: {
        name: z.string().min(1).max(100),
        integrationId: z.string().describe('Instagram integration id from list_integrations'),
        scope: z.literal('post').describe('M1 supports post scope only'),
        postId: z.string().describe('Published Instagram post id from list_posts'),
        keywords: z.array(z.string().min(1).max(64)).min(1).max(20),
        dmTemplate: z.string().describe('Private reply text with exactly one literal {{link}}'),
        leadUrl: z.string().url().describe('HTTPS destination substituted for {{link}}'),
        publicReplyTemplate: z.string().max(500).optional(),
        dailyCap: z.number().int().min(1).max(50).optional(),
      },
    },
    async (
      { name, integrationId, scope, postId, keywords, dmTemplate, leadUrl, publicReplyTemplate, dailyCap },
      extra
    ) =>
      toContent(
        await api(extra).post('/api/dm-funnels', {
          name,
          integrationId,
          scope,
          postId,
          keywords,
          dmTemplate,
          leadUrl,
          publicReplyTemplate,
          dailyCap,
        })
      )
  );

  server.registerTool(
    'list_dm_funnels',
    {
      title: 'List Instagram DM funnels',
      description:
        "List this organization's post-scoped Instagram DM funnels, including Draft/Active state, account and post snapshots, keywords, today's reserved send usage, poll errors, and reconnect state. This is read-only; there is deliberately no MCP activation tool.",
      inputSchema: {
        integrationId: z.string().optional(),
        scope: z.literal('post').optional(),
        active: z.boolean().optional(),
        cursor: z.string().optional(),
        limit: z.number().int().min(1).max(100).optional(),
      },
    },
    async ({ integrationId, scope, active, cursor, limit }, extra) => {
      const query = new URLSearchParams();
      if (integrationId) query.set('integrationId', integrationId);
      if (scope) query.set('scope', scope);
      if (typeof active === 'boolean') query.set('active', String(active));
      if (cursor) query.set('cursor', cursor);
      if (limit) query.set('limit', String(limit));
      const suffix = query.toString();
      return toContent(await api(extra).get(`/api/dm-funnels${suffix ? `?${suffix}` : ''}`));
    }
  );

  server.registerTool(
    'list_funnel_hits',
    {
      title: 'List DM funnel hits',
      description:
        'List captured comment evidence and delivery outcomes for one DM funnel: commenter, comment id/text, matched keyword, rendered reply snapshots, timestamps, detailed status, and public dmStatus lifecycle including window_expired. Read-only failure-queue visibility; a hit means a matching commenter, not a verified link conversion.',
      inputSchema: {
        funnelId: z.string(),
        status: z.string().optional(),
        cursor: z.string().optional(),
        limit: z.number().int().min(1).max(100).optional(),
      },
    },
    async ({ funnelId, status, cursor, limit }, extra) => {
      const query = new URLSearchParams();
      if (status) query.set('status', status);
      if (cursor) query.set('cursor', cursor);
      if (limit) query.set('limit', String(limit));
      const suffix = query.toString();
      return toContent(
        await api(extra).get(
          `/api/dm-funnels/${encodeURIComponent(funnelId)}/hits${suffix ? `?${suffix}` : ''}`
        )
      );
    }
  );
}

export const TOOL_NAMES = [
  'whoami',
  'get_capabilities',
  'prompt_suggest',
  'prompt_library_list',
  'list_integrations',
  'get_tiktok_creator_info',
  'add_to_collection',
  'prepare_media_upload',
  'finalize_media_upload',
  'upload_media',
  'connect_account_link',
  'list_boards',
  'list_posts',
  'get_post',
  'schedule_post',
  'publish_post',
  'cancel_post',
  'get_engagement_summary',
  'get_optimal_times',
  'scheduler_status',
  'create_digest_drafts',
  'create_drafts',
  'list_drafts',
  'approve_draft',
  'reject_draft',
  'list_approvals',
  'shorts_generate',
  'generate_short_video',
  'persona_create',
  'persona_list',
  'persona_status',
  'shorts_status',
  'publish_thread',
  'get_post_metrics',
  'list_brands',
  'get_engagement_by_tag',
  'build_in_public_connect_link',
  'build_in_public_status',
  'autoseo_connect_site',
  'autoseo_integration_kit',
  'autoseo_verify_site',
  'autoseo_list_sites',
  'autoseo_configure',
  'autoseo_auto_configure',
  'autoseo_propose_topics',
  'autoseo_generate_post',
  'keyword_research',
  'keyword_add_to_plan',
  'create_posts_from_source',
  'get_source_status',
  'list_sources',
  'create_dm_funnel',
  'list_dm_funnels',
  'list_funnel_hits',
];

/** Subset covering the AutoSEO + keyword planning workflow; see autoseo-tools.ts. */
export const AUTOSEO_TOOL_NAMES = [
  'autoseo_connect_site',
  'autoseo_integration_kit',
  'autoseo_verify_site',
  'autoseo_list_sites',
  'autoseo_configure',
  'autoseo_auto_configure',
  'autoseo_propose_topics',
  'autoseo_generate_post',
  'keyword_research',
  'keyword_add_to_plan',
];
