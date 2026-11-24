import { expect, it } from '@rstest/core';

import { checkReadiness, listServices, releaseNotes } from '../src/release.js';

/** Plain unit tests over the domain module; no framework involved. */
it('lists every tracked service', () => {
  expect(listServices().map((s) => s.service)).toEqual(['api', 'web', 'worker']);
});

it('marks a service with all checks passing as ready', () => {
  expect(checkReadiness('api')).toMatchObject({ verdict: 'ready', summary: 'api 2.14.0 is ready to release.' });
});

it('names every failing check when a release is blocked', () => {
  const worker = checkReadiness('worker');
  expect(worker.verdict).toBe('blocked');
  expect(worker.summary).toBe('worker 1.8.2 is blocked by 2 failing checks: CI is green, On-call acknowledged.');
});

it('stamps release notes with their source when one is known', () => {
  expect(releaseNotes('web', { source: 'main@abc123' })).toContain('Drafted from main@abc123.');
  expect(releaseNotes('web')).not.toContain('Drafted from');
});
