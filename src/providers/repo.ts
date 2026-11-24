import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import type { AgentProviderContext } from 'agent-bundle';

const execFileAsync = promisify(execFile);

export type RepoContext =
  | { readonly state: 'available'; readonly branch: string; readonly head: string }
  | { readonly state: 'unavailable'; readonly reason: string };

/**
 * A request context provider. Any route can read it with
 * `await (await agent()).provider('repo')`; it runs lazily, at most once per
 * request, and only when a route asks for it. The generated
 * `.agent-bundle/routes.d.ts` types the value as `RepoContext`.
 */
export default async function repo({ signal }: AgentProviderContext): Promise<RepoContext> {
  const git = async (...args: string[]) =>
    (await execFileAsync('git', args, { encoding: 'utf8', signal })).stdout.trim();
  try {
    const [branch, head] = await Promise.all([
      git('rev-parse', '--abbrev-ref', 'HEAD'),
      git('rev-parse', '--short', 'HEAD'),
    ]);
    return { state: 'available', branch, head };
  } catch (error) {
    return { state: 'unavailable', reason: error instanceof Error ? error.message : String(error) };
  }
}
