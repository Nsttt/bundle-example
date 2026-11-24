import { Agent, type AgentLayoutProps } from '@agent-bundle/runtime';
import React from 'react';

/**
 * Shared layout: wraps every rendered route (MCP tools, resources, prompts,
 * rendered CLI commands, and projected tool commands). The route keeps its own
 * `<Agent.Result value>`; this shell only adds provenance metadata, which MCP
 * hosts receive as `_meta.releaseDesk` on each result. Event routes are never
 * wrapped.
 */
export default function ReleaseDeskLayout({ children, route }: AgentLayoutProps) {
  return (
    <Agent.Result metadata={{ releaseDesk: { route: route.id, surface: route.kind } }}>
      {children}
    </Agent.Result>
  );
}
