---
name: release-readiness
description: Decide whether a service is ready to release and drive it through the release-desk flow. Use when someone asks to ship, release, tag, or publish a service, or asks whether a release is blocked.
---
# Release readiness

Apply [the release policy](references/policy.md) to every decision.

## Workflow

1. Find the service. If the user did not name one, call the `list-services`
   tool (or run `release-desk services`) and ask which one.
2. Call `check-readiness` for the service. Without MCP, run the plugin's
   `scripts/verify-release.mjs <service>` with `node` instead; it exits
   non-zero when the release is blocked.
3. If the verdict is `blocked`, stop. List every failing check with its detail
   and the owning team, and propose the smallest next step for each one. Do not
   offer to ship.
4. If the verdict is `ready`, call `draft-notes` and show the notes for review.
5. Ship only after the user approves the notes. Never run `npm publish` or
   `git push --tags` yourself; the release-desk hook blocks them.

## Report

End with one line: `<service> <version>: ready` or
`<service> <version>: blocked (<failing checks>)`.
