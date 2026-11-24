import { Agent } from '@agent-bundle/runtime';
import React from 'react';
import { appResourceUri, defineTool } from 'agent-bundle/routes';
import { z } from 'zod';

import { checkReadiness, readinessSchema } from '../../../release.js';

export const inputSchema = z.object({
  service: z.enum(['api', 'web', 'worker']).describe('The service to check.'),
}).strict();
export const resultSchema = readinessSchema;

/**
 * Three surfaces from one file:
 * - the MCP tool `check-readiness` on the generated `release` server;
 * - the dashboard MCP App, linked through `_meta.ui.resourceUri`, which hosts
 *   that support MCP Apps render next to the result;
 * - the `release-desk readiness <service>` CLI command, projected by the
 *   sibling `check-readiness.cli.ts`.
 *
 * A blocked release is still a successful check, so it is returned as data. An
 * `Agent.Error` is for when the check itself cannot run.
 */
export default defineTool({
  // Static JSON Schema the compiler reads without running code; the CLI
  // projection builds its argv grammar (`readiness <service>`) from it.
  inputJsonSchema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      service: { type: 'string', enum: ['api', 'web', 'worker'], description: 'The service to check.' },
    },
    required: ['service'],
  },
  _meta: { ui: { resourceUri: appResourceUri('dashboard') } },
  annotations: { readOnlyHint: true },
  description: 'Check whether one service is ready to release, check by check.',
  inputSchema,
  resultSchema,
}, async (input) => {
  const readiness = checkReadiness(input.service);
  return (
    <Agent.Result value={readiness}>
      <Agent.Text>{readiness.summary}</Agent.Text>
      <Agent.Markdown>
        {readiness.checks.map((c) => `- [${c.status === 'pass' ? 'x' : ' '}] ${c.label}: ${c.detail}`).join('\n')}
      </Agent.Markdown>
    </Agent.Result>
  );
});
