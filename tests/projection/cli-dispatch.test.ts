import { expect, it } from '@rstest/core';
import { cliJson, invokeCli, testManifest } from 'agent-bundle/test';

/**
 * cli-dispatch level: argv run through the routed CLI's own shell (command
 * resolution, generated argv grammar and help, validation, exit codes) in
 * this process. The built `bin/release-desk.mjs` is proven by `npm run build`.
 */
it('compiles authored commands and the projected MCP tool into one command graph', () => {
  expect(testManifest().cliCommands.map((c) => c.path.join(' ')).sort()).toEqual(['notes', 'readiness', 'services']);
});

it('filters services by owner', async () => {
  const run = await invokeCli(['services', '--owner', 'data']);

  expect(run.exitCode).toBe(0);
  expect(cliJson(run)).toEqual({ services: [{ service: 'worker', owner: 'data', version: '1.8.2' }] });
});

it('runs the check-readiness MCP tool as `readiness <service>`', async () => {
  const run = await invokeCli(['readiness', 'worker', '--json']);

  expect(run.exitCode).toBe(0);
  expect(cliJson(run)).toMatchObject({ service: 'worker', verdict: 'blocked' });
});

it('prints rendered notes as Markdown when piped', async () => {
  const run = await invokeCli(['notes', 'api']);

  expect(run.exitCode).toBe(0);
  expect(run.stdout).toContain('## api 2.14.0');
});

it('rejects an unknown service with a usage error', async () => {
  const run = await invokeCli(['notes', 'billing']);

  expect(run.exitCode).toBe(2);
});
