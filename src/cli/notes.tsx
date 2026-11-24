import { Agent } from '@agent-bundle/runtime';
import type { CliRouteConfig, CliRouteProps } from 'agent-bundle';
import React, { Suspense } from 'react';
import { z } from 'zod';

import { releaseNotes, serviceNames } from '../release.js';

/**
 * A rendered routed CLI command (`.tsx`): `release-desk notes [service]`.
 * Rendered commands get four output modes for free: Markdown on a pipe,
 * a live progress line on a TTY, `--json` for the value, and `--ndjson` for the
 * render event stream.
 */
export const config = {
  description: 'Print Markdown release notes for one service, or for all of them.',
  positionals: ['service'],
  inputJsonSchema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      service: { type: 'string', enum: ['api', 'web', 'worker'], description: 'Only print this service.' },
    },
  },
} satisfies CliRouteConfig;

export const inputSchema = z.object({
  service: z.enum(['api', 'web', 'worker']).optional().describe('Only print this service.'),
}).strict();

export const resultSchema = z.object({ services: z.array(z.string()), markdown: z.string() }).strict();

async function Notes({ services }: { readonly services: readonly (typeof serviceNames)[number][] }) {
  const markdown = services.map((service) => releaseNotes(service)).join('\n\n');
  return (
    <Agent.Result value={{ services: [...services], markdown }}>
      <Agent.Markdown>{markdown}</Agent.Markdown>
    </Agent.Result>
  );
}

export default async function NotesCommand({ input }: CliRouteProps<typeof inputSchema>) {
  const services = input.service === undefined ? [...serviceNames] : [input.service];
  // The Suspense fallback becomes the TTY progress line (and an MCP progress
  // notification on MCP surfaces) while the notes render.
  return (
    <Suspense fallback={<Agent.Progress completed={0} message="Drafting release notes" />}>
      <Notes services={services} />
    </Suspense>
  );
}
