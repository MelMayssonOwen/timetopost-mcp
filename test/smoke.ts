/**
 * Smoke test: spawn the stdio server as a real MCP client, list tools, and call
 * a couple of read-only tools against the live API. Requires TIMETOPOST_API_TOKEN.
 * Run after `npm run build`.
 */
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const token = process.env.TIMETOPOST_API_TOKEN;
if (!token) {
  console.error('Set TIMETOPOST_API_TOKEN to run the smoke test.');
  process.exit(1);
}

const transport = new StdioClientTransport({
  command: process.execPath,
  args: ['dist/src/index.js'],
  env: {
    ...process.env,
    TIMETOPOST_API_TOKEN: token,
    TIMETOPOST_API_URL: process.env.TIMETOPOST_API_URL || 'https://api.timetopost.co',
  },
});

const client = new Client({ name: 'smoke-test', version: '1.0.0' });

function textOf(res: any): string {
  return (res?.content ?? []).map((c: any) => c.text).join('\n');
}

const main = async () => {
  await client.connect(transport);

  const tools = (await client.listTools()).tools.map((t) => t.name);
  console.log(`✓ tools (${tools.length}):`, tools.join(', '));

  const who = await client.callTool({ name: 'whoami', arguments: {} });
  const whoText = textOf(who);
  console.log('✓ whoami isError=', who.isError, '→', whoText.slice(0, 120));
  if (who.isError || !whoText.includes('@')) throw new Error('whoami failed');

  const posts = await client.callTool({ name: 'list_posts', arguments: {} });
  console.log('✓ list_posts isError=', posts.isError);
  if (posts.isError) throw new Error('list_posts failed');

  const sched = await client.callTool({ name: 'scheduler_status', arguments: {} });
  console.log('✓ scheduler_status isError=', sched.isError);

  await client.close();
  console.log('\nSMOKE OK');
};

main().catch((e) => {
  console.error('SMOKE FAILED:', e);
  process.exit(1);
});
