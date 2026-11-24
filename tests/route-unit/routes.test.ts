import { expect, it } from '@rstest/core';
import { createEventRouteInput, expectDocument, renderRoute, testManifest } from 'agent-bundle/test';

/**
 * Route-unit level: each route module rendered through the real Agent
 * renderer against this project's own compiler pass. No artifact, no MCP
 * transport, no host.
 */
const manifest = testManifest();

it('compiles every route without a build', () => {
  expect(manifest.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
  expect(Object.keys(manifest.routes).sort()).toEqual([
    'app:release/dashboard',
    'cli:notes',
    'cli:services',
    'event:session/start',
    'event:tool/before',
    'prompt:release/release-review',
    'resource:release/policy',
    'script:verify-release',
    'tool:release/check-readiness',
    'tool:release/draft-notes',
    'tool:release/list-services',
  ]);
});

it('renders a blocked release as data, not as an error', async () => {
  const rendered = await renderRoute('tool:release/check-readiness', { input: { service: 'web' } });

  expectDocument(rendered)
    .toHaveStatus('success')
    .toContainText('web 5.3.0 is blocked by 1 failing check: Changelog written.');
  expect(rendered.result).toMatchObject({ service: 'web', verdict: 'blocked' });
});

it('drafts notes from a stubbed repo provider', async () => {
  const rendered = await renderRoute('tool:release/draft-notes', {
    input: { service: 'api' },
    // Providers are stubbed per render; the real one shells out to git.
    context: { providers: { repo: { state: 'available', branch: 'main', head: 'abc123' } } },
  });

  expect(rendered.result).toMatchObject({ service: 'api', source: 'main@abc123', generator: 'release-desk@0.1.0' });
  expect(String((rendered.result as { markdown: string }).markdown)).toContain('Drafted from main@abc123.');
});

it('builds the release-review prompt', async () => {
  const rendered = await renderRoute('prompt:release/release-review', { input: { service: 'worker' } });

  expect(JSON.stringify(rendered.result)).toContain('Review the worker release.');
});

it('injects blocked releases into a new session', async () => {
  const rendered = await renderRoute('event:session/start', {
    input: createEventRouteInput('session/start', {
      cwd: '/repo',
      hook_event_name: 'SessionStart',
      session_id: 'session-1',
      source: 'startup',
      transcript_path: '/tmp/transcript.jsonl',
    }, { host: 'claude' }),
  });

  expectDocument(rendered).toContainContext(
    'release-desk is active in /repo. Blocked releases: web 5.3.0, worker 1.8.2. '
      + 'Use the release-readiness skill and the check-readiness tool before shipping anything.',
  );
});

const preToolUse = (command: string) => createEventRouteInput('tool/before', {
  cwd: '/repo',
  hook_event_name: 'PreToolUse',
  session_id: 'session-1',
  tool_input: { command },
  tool_name: 'Bash',
  tool_use_id: 'tool-1',
  transcript_path: '/tmp/transcript.jsonl',
}, { host: 'claude' });

it('denies a bare npm publish', async () => {
  const rendered = await renderRoute('event:tool/before', { input: preToolUse('npm publish --access public') });

  expect(rendered.document.value).toMatchObject({ outcome: 'deny' });
  expect(JSON.stringify(rendered.document.value)).toContain('release-desk blocks `npm publish`');
});

it.each([
  ['npm --registry=https://registry.npmjs.org publish', 'npm publish'],
  ['npm test && NPM_CONFIG_PROVENANCE=true npm publish', 'npm publish'],
  ['pnpm -C packages/web publish', 'pnpm publish'],
  ['git -C repo push origin --tags', 'git push --tags'],
  ['npm "publish"', 'npm publish'],
  ["n\\pm 'publish'", 'npm publish'],
  ['NPM_CONFIG_USERCONFIG="/Users/Jane Doe/.npmrc" npm publish', 'npm publish'],
  ['git push --tags;echo done', 'git push --tags'],
  ['npm --userconfig ./.npmrc publish', 'npm publish'],
  ['pnpm --workspace-root publish', 'pnpm publish'],
])('denies %s even with leading options or chaining', async (command, label) => {
  const rendered = await renderRoute('event:tool/before', { input: preToolUse(command) });

  expect(rendered.document.value).toMatchObject({ outcome: 'deny' });
  expect(JSON.stringify(rendered.document.value)).toContain(`release-desk blocks \`${label}\``);
});

it.each([
  'npm test',
  'npm run publish-docs',
  'npm help publish',
  'npm run test -- publish',
  'pnpm --filter web exec publish',
  'git push origin main',
  'git log --tags push',
  'echo npm publish is blocked',
  'git commit -m "npm publish later"',
])(
  'lets %s through',
  async (command) => {
    const rendered = await renderRoute('event:tool/before', { input: preToolUse(command) });

    expect(rendered.document.value).toMatchObject({ outcome: 'continue' });
  },
);
