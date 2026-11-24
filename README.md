# release-desk: an agent-bundle example

A small but complete [agent-bundle](https://github.com/ScriptedAlchemy/agent-bundle)
plugin that tells you whether a service is ready to ship. One source tree
compiles into a plugin for Claude Code, Codex, Cursor, and the portable Agent
Plugins format, plus an npm package with a CLI and a library.

The release data is a hard-coded table in `src/release.ts` (`api` is ready,
`web` and `worker` are blocked), so everything runs offline and deterministically.
Swap that table for a real CI or ticketing call and nothing else changes.

## What each file demonstrates

Almost everything is declared by **where a file lives**, not by config.

| Feature | File | Becomes |
| --- | --- | --- |
| Config | `agent-bundle.config.ts` | Identity, targets, marketplace, `web`, portable and Cursor manifest metadata. Version comes from `package.json`. |
| MCP tool | `src/mcp/release/tools/list-services.tsx` | `list-services` on the generated `release` MCP server |
| MCP tool + App + CLI | `src/mcp/release/tools/check-readiness.tsx` | `check-readiness` tool, opens the dashboard App, and is projected to the CLI by `check-readiness.cli.ts` |
| MCP tool + provider + meta | `src/mcp/release/tools/draft-notes.tsx` | Reads the `repo` provider via `await agent()` and the plugin version via `agent-bundle/meta` |
| MCP resource | `src/mcp/release/resources/policy.tsx` | `policy://release-desk/release` |
| MCP prompt | `src/mcp/release/prompts/release-review.tsx` | `release-review` prompt |
| MCP App | `src/mcp/release/apps/dashboard.{ts,html}` | Self-contained `mcp-apps/dashboard.html`; calls tools and reads resources back through the bridge |
| Layout | `src/layout.tsx` | Wraps every rendered route; adds `_meta.releaseDesk` to MCP results |
| Provider | `src/providers/repo.ts` | Lazily-resolved git branch/head, available to any route |
| Plain CLI command | `src/cli/services.ts` | `release-desk services [--owner X]` (one JSON line) |
| Rendered CLI command | `src/cli/notes.tsx` | `release-desk notes [service]` (Markdown, `--json`, `--ndjson`, TTY progress) |
| Artifact script | `src/scripts/verify-release.ts` | `scripts/verify-release.mjs`, exits 1 when blocked |
| Hook: context | `src/events/session/start.tsx` | `SessionStart` on Claude/Codex, `sessionStart` on Cursor; injects blocked releases |
| Hook: guard | `src/events/tool/before.tsx` | Denies `npm publish` / `git push --tags` before shell commands, on every host. A guardrail against accidental publishes, not a sandbox. |
| Skill | `src/skills/release-readiness/SKILL.md` + `references/` | Hand-written skill with a reference doc |
| Generated skill | `src/skills/service-catalog/SKILL.tsx` | Rendered to `SKILL.md` at build time from the same data the tools use |
| Command | `src/commands/ship.md` | `/ship` (Claude and Cursor) |
| Rule | `src/rules/changelog.mdc` | Cursor rule scoped to `**/CHANGELOG.md` |
| Library | `src/index.ts` | `dist/index.js` + `.d.ts` (the package's `exports`) |
| Eval | `evals/readiness.eval.ts` | Deterministic eval run against the built artifact |

## Try it

```sh
pnpm install
pnpm run check          # build + validate + typecheck + all test pools + eval
pnpm dev                # local Workbench with live rebuilds
```

Then poke at what the build produced in `artifact/`:

```sh
node artifact/bin/release-desk.mjs --help
node artifact/bin/release-desk.mjs readiness worker
node artifact/bin/release-desk.mjs notes api --json
node artifact/bin/release-desk.mjs web                 # dashboard App in a browser
node artifact/scripts/verify-release.mjs web; echo $?  # 1: blocked

npx agent-bundle inspect                               # what each host receives, and why
npx agent-bundle mcp list --artifact artifact --server release --target claude
npx agent-bundle hooks simulate --artifact artifact --target claude \
  --hook event-route-tool-before \
  --input '{"hook_event_name":"PreToolUse","session_id":"s","transcript_path":"/tmp/t","cwd":"/tmp","tool_name":"Bash","tool_use_id":"t","tool_input":{"command":"npm publish"}}'
```

Install into a host straight from the build:

```sh
npx agent-bundle install claude --from artifact
npx agent-bundle install codex --from artifact
npx agent-bundle install cursor --from artifact
```

## What the build emits

`artifact/` is one plugin root shared by every host:

```
.claude-plugin/  .codex-plugin/  .cursor-plugin/  .agents/   per-host manifests
plugin.json  mcp.json                                        portable (Agent Plugins 1.0)
.mcp.json                                                    Claude's MCP config
mcp/mcp-release-<hash>.mjs                                   the bundled MCP server
mcp-apps/dashboard.html                                      the App, inlined into one file
bin/release-desk.mjs                                         the routed CLI
hooks/event-route-*.{claude,codex,cursor}.mjs + hooks.json   per-host hook wrappers
scripts/verify-release.mjs
skills/  commands/  rules/
INSTALL.md  install.mjs  agent-bundle.manifest.json  agent-bundle.compile-evidence.json
```

`dist/` is the npm package: the library, its declarations, and the same CLI as
the package `bin`.

## Tests

`pnpm test` runs three pools. Each one proves a different thing:

| Pool | Files | Proves |
| --- | --- | --- |
| unit | `tests/*.test.ts` | Domain logic, no framework |
| route-unit | `tests/route-unit/**` | Each route renders the right document: tools, prompt, both hooks (including the deny) |
| projection | `tests/projection/**` | The real generated MCP server over an in-memory transport, the CLI command graph, and the script's exit codes |

## Things this example ran into

- **Commands are shared between Claude and Cursor.** Both hosts read the same
  `commands/` folder in the composite root, and Cursor drops command
  frontmatter, so a command must be frontmatter-free to stay identical for
  both. Claude's validator warns about that (`AB6020`); the warning is expected.
  Building Claude and Cursor into separate artifacts would remove it.
- **Library declarations do not see generated route types.** The `.d.ts` pass
  for `src/index.ts` type-checks all of `src/` without
  `.agent-bundle/routes.d.ts`, so the App and the provider call cast to types
  from `src/release.ts` instead of relying on the generated registry.
- **Hooks are `.tsx` so they can be unit-tested.** A lightweight `.ts` event
  handler that returns `{ outcome }` works in the build but cannot be rendered by
  `renderRoute`; the `.tsx` form returns the same decision through
  `<Agent.Result value>` and is testable.
- **pnpm 11+ blocks the preview tarballs' URL subdependencies by default.**
  `pnpm-workspace.yaml` sets `blockExoticSubdeps: false` so install works.
