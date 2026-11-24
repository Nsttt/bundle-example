import { defineConfig } from 'agent-bundle/config';

/**
 * Most of this plugin is declared by file layout, not by config:
 *
 *   src/mcp/release/**        -> the `release` MCP server (tools, resource, prompt, App)
 *   src/cli/**                -> the `release-desk` CLI (bin/release-desk.mjs + npm bin)
 *   src/scripts/*.ts          -> artifact scripts (scripts/<name>.mjs)
 *   src/events/**             -> hooks for Claude, Codex, and Cursor
 *   src/skills/<name>/        -> skills (SKILL.md, or SKILL.tsx rendered at build time)
 *   src/commands/*.md         -> slash commands (Claude)
 *   src/rules/*.mdc           -> rules (Cursor)
 *   src/providers/*.ts        -> request context providers
 *   src/layout.tsx            -> shared result shell for every rendered route
 *   src/index.ts              -> the npm library export (dist/index.js)
 *
 * Config only holds what no file can own: identity, hosts, distribution, and
 * policy. The version comes from package.json.
 */
export default defineConfig({
  plugin: {
    name: 'release-desk',
    description: 'Release readiness checks, release notes, and a guard against unreviewed publishes.',
  },
  targets: ['portable', 'claude', 'codex', 'cursor'],
  // Emit local marketplace manifests so Claude and Codex can install from the folder.
  marketplace: true,
  // Plugin root goes to artifact/; dist/ stays the npm package.
  output: { distPath: 'artifact' },
  // `release-desk web` (and `agent-bundle dev` at /web/release/dashboard) serve the App in a browser.
  web: {
    apps: [{ app: 'release/dashboard', tool: 'check-readiness', input: { service: 'web' }, allow: ['call-tool'] }],
  },
  // Agent Plugins standard manifest metadata (root plugin.json).
  portable: {
    author: { name: 'Nestor Lopez' },
    homepage: 'https://github.com/nsttt/bundle-example',
    repository: 'https://github.com/nsttt/bundle-example',
    license: 'Apache-2.0',
    keywords: ['release', 'readiness', 'example'],
  },
  // Cursor Plugin manifest metadata (.cursor-plugin/plugin.json).
  cursor: {
    author: { name: 'Nestor Lopez' },
    homepage: 'https://github.com/nsttt/bundle-example',
    repository: 'https://github.com/nsttt/bundle-example',
    license: 'Apache-2.0',
    keywords: ['release', 'readiness', 'example'],
  },
});
