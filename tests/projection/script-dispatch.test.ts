import { expect, it } from '@rstest/core';
import { runScript } from 'agent-bundle/test';

/**
 * script-dispatch level: `src/scripts/verify-release.ts` run through the
 * `main` envelope its generated `scripts/verify-release.mjs` carries, as a
 * separate Node process over the source.
 */
it('exits 0 for a ready service', async () => {
  const run = await runScript('verify-release', ['api']);

  expect(run.exitCode).toBe(0);
  expect(run.stdout).toBe('api 2.14.0 is ready to release.\n');
});

it('exits 1 and lists failing checks for a blocked service', async () => {
  const run = await runScript('verify-release', ['worker']);

  expect(run.exitCode).toBe(1);
  expect(run.stderr).toContain('✗ CI is green');
});

it('exits 2 with usage for an unknown service', async () => {
  const run = await runScript('verify-release', ['billing']);

  expect(run.exitCode).toBe(2);
  expect(run.stderr).toBe('Usage: verify-release <api|web|worker>\n');
});
