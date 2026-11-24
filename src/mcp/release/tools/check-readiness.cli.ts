import type { CliProjectionConfig } from 'agent-bundle/routes';

import type { inputSchema } from './check-readiness.js';

/**
 * Projects the `check-readiness` MCP tool into the routed CLI as
 * `release-desk readiness <service>`. The command runs the same route through
 * the same layout, so the CLI and the MCP tool cannot drift apart.
 */
export const config = {
  command: ['readiness'],
  confirm: false,
  description: 'Check whether one service is ready to release.',
  positionals: ['service'],
} satisfies CliProjectionConfig<typeof inputSchema>;
