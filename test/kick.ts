/** Offline SDK-path regression tests. No real credentials, network or publication. */
import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { TimeToPostApi } from '../src/api.js';
import { registerTools } from '../src/tools.js';

const server = new McpServer({ name: 'kick-contract-test', version: '0.0.0' });
const client = new Client({ name: 'kick-contract-test-client', version: '0.0.0' });
const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
const requests: Array<{ url: URL; init: RequestInit }> = [];
const originalFetch = globalThis.fetch;
let status = 201;
let response: unknown = { post: { id: 'draft-kick', status: 'DRAFT' } };

globalThis.fetch = async (input, init = {}) => {
  requests.push({ url: new URL(String(input)), init });
  return new Response(JSON.stringify(response), { status });
};
registerTools(server, () => new TimeToPostApi('https://api.example.test', 'ttp_fixture', 'own-workspace'));

const args = {
  content: 'A plain-text chat message 👩🏽‍💻',
  platforms: ['kick'],
  accountIds: ['kick-account'],
  platformData: { kick: { integrationId: 'kick-account', broadcasterUserId: 123456 } },
};
function textOf(result: Awaited<ReturnType<Client['callTool']>>): string {
  return (result.content as Array<{ type: string; text?: string }>).map((part) => part.text ?? '').join('\n');
}

try {
  await server.connect(serverTransport);
  await client.connect(clientTransport);

  const tools = await client.listTools();
  const scheduleTool = tools.tools.find((tool) => tool.name === 'schedule_post');
  assert(scheduleTool?.description?.includes('500 grapheme clusters'));
  assert(scheduleTool?.description?.includes('2048 UTF-8 bytes'));
  assert(scheduleTool?.description?.includes('own channel only'));

  const consent = await client.callTool({ name: 'connect_account_link', arguments: { provider: 'kick' } });
  assert.equal(consent.isError, false);
  assert.equal(new URL(JSON.parse(textOf(consent)).url).searchParams.get('connect'), 'kick');
  assert.equal(requests.length, 0);

  const draft = await client.callTool({ name: 'schedule_post', arguments: args });
  assert.equal(draft.isError, false);
  assert.equal(requests.length, 1);
  assert.equal(requests[0].url.pathname, '/api/posts');
  assert.equal(requests[0].init.method, 'POST');
  assert.deepEqual(JSON.parse(String(requests[0].init.body)), args);
  assert.deepEqual(requests[0].init.headers, {
    Authorization: 'Bearer ttp_fixture',
    'x-ttp-org': 'own-workspace',
    'x-ttp-client': 'mcp',
    'Content-Type': 'application/json',
  });

  // The real SDK must reject unsupported input rather than stripping it before
  // our proxy sees it and unintentionally publishing a changed message.
  for (const invalid of [
    { ...args, title: 'Unsupported shared field' },
    { ...args, platformData: { kick: { ...args.platformData.kick, title: 'Unsupported Kick field' } } },
    { ...args, platformData: { kick: { ...args.platformData.kick, broadcasterUserId: '123456' } } },
    { ...args, platformData: { kick: { integrationId: 'kick-account' } } },
  ]) {
    const result = await client.callTool({ name: 'schedule_post', arguments: invalid });
    assert.equal(result.isError, true);
    assert.equal(requests.length, 1);
  }

  status = 400;
  response = { error: 'Kick does not support media or threads' };
  const unsupported = { ...args, mediaUrls: ['https://example.test/image.png'], thread: ['second message'] };
  const rejection = await client.callTool({ name: 'schedule_post', arguments: unsupported });
  assert.equal(rejection.isError, true);
  assert.deepEqual(JSON.parse(String(requests[1].init.body)), unsupported);
  assert.equal(requests.length, 2);

  status = 409;
  response = { error: 'Delivery outcome unknown', deliveryUnknown: true, retryable: false };
  const held = await client.callTool({ name: 'publish_post', arguments: { id: 'held-kick' } });
  assert.equal(held.isError, true);
  assert.equal(JSON.parse(textOf(held)).deliveryUnknown, true);
  assert.equal(requests.length, 3);
  assert.equal(requests[2].url.pathname, '/api/posts/held-kick/publish');

  console.log('Kick MCP SDK path: consent, explicit target/workspace forwarding, strict field validation, media/thread rejection, and no delivery-hold retry passed.');
} finally {
  await client.close();
  await server.close();
  globalThis.fetch = originalFetch;
}
