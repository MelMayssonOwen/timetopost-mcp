/**
 * AutoSEO MCP tools (AUTOSEO-14 / TIM-97).
 *
 * Supersedes the earlier design-doc scaffold from feat/autoseo-design: the
 * shipped target-connection model is a generic signed webhook or WordPress
 * REST (kind "webhook" | "wp_rest"), not the wider wp_plugin/git_pr/ghost/
 * webflow/shopify surface the original draft sketched. The "AI installs it"
 * step also got its own dedicated tool, autoseo_integration_kit, instead of
 * being folded into a backend-driven plugin installer.
 *
 * The AutoSEO tools (including the keyword-research planning entry points):
 *   autoseo_connect_site      → POST /api/autoseo/targets/connect
 *   autoseo_integration_kit   → GET  /api/autoseo/integration-kit
 *   autoseo_verify_site       → POST /api/autoseo/targets/:id/verify
 *   autoseo_list_sites        → GET  /api/autoseo/targets
 *   autoseo_configure         → POST /api/autoseo/config
 *   autoseo_propose_topics    → POST /api/autoseo/propose-topics
 *   autoseo_generate_post     → POST /api/autoseo/generate
 *   keyword_research          → POST /api/keywords/research
 *   keyword_add_to_plan       → POST /api/keywords/sets/:id/add-to-plan
 *
 * are registered directly inside registerTools() in tools.ts, alongside the
 * rest of the TimeToPost tool surface — NOT from this file. That's a hard
 * requirement, not a style choice: the MCP surface-parity test
 * (backend/src/__tests__/unit/mcp-parity.test.ts) diffs the hosted surface
 * (backend/src/mcp/server.ts) against the npm surface by regexing
 * mcp/src/tools.ts's source for `server.registerTool('name', ...)` calls.
 * Registrations living in a second file would be invisible to that regex and
 * the parity test would fail even though the tool works fine at runtime.
 *
 * This file exists so the AutoSEO tool-name list has a stable, independently
 * importable home (e.g. for docs, filtering, or a future AutoSEO-only build
 * target) without pulling in the rest of tools.ts.
 */
export { AUTOSEO_TOOL_NAMES } from './tools.js';
