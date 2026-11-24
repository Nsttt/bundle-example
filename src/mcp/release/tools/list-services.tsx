import { Agent } from '@agent-bundle/runtime';
import React from 'react';
import { defineTool } from 'agent-bundle/routes';
import { z } from 'zod';

import { listServices, serviceSummarySchema } from '../../../release.js';

export const inputSchema = z.object({}).strict();
export const resultSchema = z.object({ services: z.array(serviceSummarySchema) }).strict();

export default defineTool({
  annotations: { readOnlyHint: true },
  description: 'List every service release-desk tracks, with its owner and the version queued for release.',
  inputSchema,
  resultSchema,
}, async () => {
  const services = listServices();
  return (
    <Agent.Result value={{ services }}>
      <Agent.Markdown>
        {services.map((s) => `- **${s.service}** ${s.version} (owner: ${s.owner}): ${s.description}`).join('\n')}
      </Agent.Markdown>
    </Agent.Result>
  );
});
