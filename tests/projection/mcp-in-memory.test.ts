import { expect, it } from '@rstest/core';
import { getMcpPrompt, invokeMcpTool, listMcpSurface, readMcpResource } from 'agent-bundle/test';

/**
 * mcp-in-memory level: the real generated `release` MCP server driven by a
 * real MCP client over the SDK's in-memory transport. Proves the protocol
 * contract, not the packed process.
 */
it('registers tools, the resource, and the prompt from the file layout', async () => {
  const surface = await listMcpSurface();

  expect([...surface.tools].sort()).toEqual(['check-readiness', 'draft-notes', 'list-services']);
  expect(surface.resources).toContain('policy://release-desk/release');
  expect(surface.prompts).toEqual(['release-review']);
});

it('returns structured content plus the layout metadata', async () => {
  const invocation = await invokeMcpTool('check-readiness', { input: { service: 'api' } });

  expect(invocation.isError).toBe(false);
  expect(invocation.structuredContent).toMatchObject({ service: 'api', verdict: 'ready' });
  // Added by src/layout.tsx, not by the tool.
  expect(invocation._meta).toMatchObject({
    releaseDesk: { route: 'tool:release/check-readiness', surface: 'tool' },
  });
});

it('serves the release policy resource', async () => {
  const read = await readMcpResource('policy://release-desk/release');

  expect(String(read.contents[0]?.text)).toContain('every check passes');
});

it('serves the release-review prompt', async () => {
  const prompt = await getMcpPrompt('release-review', { input: { service: 'api' } });

  expect(JSON.stringify(prompt.messages)).toContain('Review the api release.');
});
