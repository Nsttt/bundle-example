import { Agent } from '@agent-bundle/runtime';
import React from 'react';
import type { ResourceConfig } from 'agent-bundle';
import { z } from 'zod';

import { releasePolicy } from '../../../release.js';

/** An MCP resource: static config plus a component that renders its contents. */
export const config = {
  description: 'The rules a release is judged against.',
  mimeType: 'text/plain',
  title: 'Release policy',
  uri: 'policy://release-desk/release',
} satisfies ResourceConfig;

export const inputSchema = z.object({ uri: z.string() });
export const resultSchema = z.object({
  contents: z.array(z.object({ mimeType: z.string(), text: z.string(), uri: z.string() })),
});

export default async function Policy({ input }: { readonly input: z.infer<typeof inputSchema> }) {
  return (
    <Agent.Result value={{ contents: [{ mimeType: 'text/plain', text: releasePolicy, uri: input.uri }] }}>
      <Agent.Text>{releasePolicy}</Agent.Text>
    </Agent.Result>
  );
}
