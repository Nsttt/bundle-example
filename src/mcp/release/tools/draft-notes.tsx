import { Agent, agent } from '@agent-bundle/runtime';
import React from 'react';
import { defineTool } from 'agent-bundle/routes';
import { name, version } from 'agent-bundle/meta';
import { z } from 'zod';

import { releaseNotes } from '../../../release.js';
import type { RepoContext } from '../../../providers/repo.js';

export const inputSchema = z.object({
  service: z.enum(['api', 'web', 'worker']).describe('The service to draft notes for.'),
}).strict();
export const resultSchema = z.object({
  service: z.string(),
  markdown: z.string(),
  source: z.string().nullable(),
  generator: z.string(),
}).strict();

/**
 * Opts in to request context: `await agent()` exposes the request, and
 * `.provider('repo')` lazily runs `src/providers/repo.ts`. The plugin's own
 * name and version come from `agent-bundle/meta`, which the compiler fills
 * in from package.json.
 */
export default defineTool({
  annotations: { readOnlyHint: true },
  description: 'Draft Markdown release notes for one service, stamped with the current git branch.',
  inputSchema,
  resultSchema,
}, async (input) => {
  const repo = await (await agent()).provider('repo') as RepoContext;
  const source = repo.state === 'available' ? `${repo.branch}@${repo.head}` : null;
  const markdown = releaseNotes(input.service, source === null ? {} : { source });
  return (
    <Agent.Result value={{ service: input.service, markdown, source, generator: `${name}@${version}` }}>
      <Agent.Markdown>{markdown}</Agent.Markdown>
    </Agent.Result>
  );
});
