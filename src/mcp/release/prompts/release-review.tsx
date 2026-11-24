import { Agent, type JsonValue } from '@agent-bundle/runtime';
import type { PromptConfig, ToolRouteProps } from 'agent-bundle';
import React from 'react';
import { z } from 'zod';

/** An MCP prompt: hosts list it as a reusable conversation starter. */
export const config = {
  description: 'Start a release review for one service.',
} satisfies PromptConfig;

export const inputSchema = z.object({ service: z.enum(['api', 'web', 'worker']) }).strict();
export const resultSchema = z.object({
  messages: z.array(z.object({
    content: z.object({ text: z.string(), type: z.literal('text') }).strict(),
    role: z.literal('user'),
  }).strict()),
}).strict();

export default async function ReleaseReview({ input }: ToolRouteProps<typeof inputSchema>) {
  const text = [
    `Review the ${input.service} release.`,
    `Call check-readiness for ${input.service}, read the release policy resource, and draft notes with draft-notes.`,
    'Give a ready or blocked verdict, and name an owner and next step for every failing check.',
  ].join(' ');
  const result = { messages: [{ content: { text, type: 'text' as const }, role: 'user' as const }] };
  return (
    <Agent.Result value={result as JsonValue}>
      <Agent.Text>{`Release review prepared for ${input.service}.`}</Agent.Text>
    </Agent.Result>
  );
}
