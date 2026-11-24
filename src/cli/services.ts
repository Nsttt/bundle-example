import type { CliRouteConfig, CliRouteProps } from 'agent-bundle';
import { z } from 'zod';

import { listServices } from '../release.js';

/**
 * A plain routed CLI command (`.ts`): `release-desk services`. The file path
 * is the command name; it prints one canonical JSON line. The compiler
 * generates the argv parser, `--help`, and validation from the schemas.
 */
export const config = {
  description: 'List tracked services, optionally only those owned by one team.',
  inputJsonSchema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      owner: { type: 'string', description: 'Only list services owned by this team.' },
    },
  },
} satisfies CliRouteConfig;

export const inputSchema = z.object({
  owner: z.string().min(1).optional().describe('Only list services owned by this team.'),
}).strict();

export const resultSchema = z.object({
  services: z.array(z.object({ service: z.string(), owner: z.string(), version: z.string() }).strict()),
}).strict();

export default async function services({ input }: CliRouteProps<typeof inputSchema>) {
  return {
    services: listServices()
      .filter((s) => input.owner === undefined || s.owner === input.owner)
      .map(({ service, owner, version }) => ({ service, owner, version })),
  };
}
