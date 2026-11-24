import { Agent } from '@agent-bundle/runtime';
import type { AgentEventRouteProps } from 'agent-bundle';
import React from 'react';

import { checkReadiness, serviceNames } from '../../release.js';

/**
 * A hook, written as an event route. The path is the canonical event:
 * `src/events/session/start.tsx` is `session/start`, which the compiler
 * lowers to Claude's and Codex's `SessionStart` and Cursor's `sessionStart`
 * hooks. `Agent.Context` becomes the context injected into the session.
 * Application code never touches host-specific hook JSON.
 */
export const config = {
  targets: ['claude', 'codex', 'cursor'],
};

export default async function SessionStart({ canonical }: AgentEventRouteProps<'session/start'>) {
  const blocked = serviceNames.map(checkReadiness).filter((r) => r.verdict === 'blocked');
  const cwd = canonical.payload.cwd?.value;
  return (
    <Agent.Result>
      <Agent.Context>
        {[
          `release-desk is active${cwd === undefined ? '' : ` in ${cwd}`}.`,
          blocked.length === 0
            ? 'Every tracked service is ready to release.'
            : `Blocked releases: ${blocked.map((r) => `${r.service} ${r.version}`).join(', ')}.`,
          'Use the release-readiness skill and the check-readiness tool before shipping anything.',
        ].join(' ')}
      </Agent.Context>
    </Agent.Result>
  );
}
