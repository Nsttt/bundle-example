import { Agent } from '@agent-bundle/runtime';
import type { AgentEventRouteProps } from 'agent-bundle';
import React from 'react';

/**
 * Global options that take their value as the next word (`-C dir`), per tool.
 * `--opt=value` forms need no entry. Anything else starting with `-` is a flag.
 */
const valueOptions = {
  git: new Set(['-C', '-c', '--git-dir', '--work-tree', '--namespace', '--exec-path', '--config-env']),
  npm: new Set(['--registry', '--userconfig', '--prefix', '--workspace', '-w', '--tag', '--access', '--otp', '--loglevel']),
  pnpm: new Set(['-C', '--dir', '--filter', '-F', '--registry', '--tag', '--access', '--otp', '--loglevel']),
} as const;

/** The subcommand and its arguments: the first word after the tool's global options. */
const subcommand = (bin: keyof typeof valueOptions, args: readonly string[]): readonly string[] => {
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]!;
    if (!arg.startsWith('-')) return args.slice(index);
    if (valueOptions[bin].has(arg)) index += 1;
  }
  return [];
};

/**
 * Shell commands that ship something on their own, outside the release flow.
 * Matching runs on the parsed subcommand of each command segment rather than a
 * regex over the line, so global options (`npm --registry=… publish`,
 * `git -C repo push --tags`), quoting (`npm "publish"`), and chaining
 * (`npm test && npm publish`) are caught, while `npm help publish` is not.
 * This is a guardrail against accidental publishes, not a sandbox: a command
 * hidden behind `sh -c` or a package script still runs.
 */
const bypasses: readonly { readonly label: string; readonly matches: (tokens: readonly string[]) => boolean }[] = [
  { label: 'npm publish', matches: ([bin, ...args]) => bin === 'npm' && subcommand('npm', args)[0] === 'publish' },
  { label: 'pnpm publish', matches: ([bin, ...args]) => bin === 'pnpm' && subcommand('pnpm', args)[0] === 'publish' },
  {
    label: 'git push --tags',
    matches: ([bin, ...args]) => {
      if (bin !== 'git') return false;
      const [name, ...rest] = subcommand('git', args);
      return name === 'push' && rest.includes('--tags');
    },
  },
];

/**
 * Splits a shell line into command segments the way the shell would word-split
 * it: single and double quotes group words and are removed, backslash escapes
 * the next character, and `;`, `&`, `|`, and newlines end a segment. Leading
 * `VAR=value` assignments are dropped so the command itself comes first.
 */
const segments = (command: string): readonly (readonly string[])[] => {
  const result: string[][] = [];
  let tokens: string[] = [];
  let word: string | undefined;
  let quote: '"' | "'" | undefined;
  const endWord = () => {
    if (word !== undefined) tokens.push(word);
    word = undefined;
  };
  const endSegment = () => {
    endWord();
    const start = tokens.findIndex((token) => !/^[A-Za-z_][A-Za-z0-9_]*=/u.test(token));
    if (start !== -1) result.push(tokens.slice(start));
    tokens = [];
  };
  for (let index = 0; index < command.length; index += 1) {
    const char = command[index]!;
    if (quote === "'") {
      if (char === "'") quote = undefined;
      else word += char;
    } else if (char === '\\' && quote === undefined) {
      word = (word ?? '') + (command[index + 1] ?? '');
      index += 1;
    } else if (quote === '"') {
      if (char === '"') quote = undefined;
      else if (char === '\\') {
        word += command[index + 1] ?? '';
        index += 1;
      } else word += char;
    } else if (char === '"' || char === "'") {
      quote = char;
      word ??= '';
    } else if (/[;&|\n]/u.test(char)) endSegment();
    else if (/\s/u.test(char)) endWord();
    else word = (word ?? '') + char;
  }
  endSegment();
  return result;
};

const findBypass = (command: string): string | undefined => {
  for (const tokens of segments(command)) {
    const bypass = bypasses.find(({ matches }) => matches(tokens));
    if (bypass !== undefined) return bypass.label;
  }
  return undefined;
};

const shellCommand = (toolInput: unknown): string | undefined => {
  if (toolInput === null || typeof toolInput !== 'object') return undefined;
  const command = (toolInput as { readonly command?: unknown }).command;
  return typeof command === 'string' ? command : undefined;
};

/**
 * A guard hook. `tools: ['shell']` is a cross-host tool selector; the compiler
 * maps it to each host's own matcher (`Bash` on Claude, and so on), so this
 * route only runs before shell commands. `tool/before` is allowed to deny: the
 * `outcome` in the result value becomes each host's native block decision, and
 * `reason` is shown to the agent.
 */
export const config = {
  targets: ['claude', 'codex', 'cursor'],
  tools: ['shell'],
};

export default async function BeforeTool({ canonical }: AgentEventRouteProps<'tool/before'>) {
  const command = shellCommand(canonical.payload.toolInput?.value);
  const bypass = command === undefined ? undefined : findBypass(command);
  if (bypass === undefined) return <Agent.Result value={{ outcome: 'continue' }} />;
  return (
    <Agent.Result
      value={{
        outcome: 'deny',
        reason: `release-desk blocks \`${bypass}\`. Run \`release-desk readiness <service>\` and ship through /ship so every release check runs first.`,
      }}
    />
  );
}
