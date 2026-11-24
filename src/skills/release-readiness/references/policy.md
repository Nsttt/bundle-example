# Release policy

- A service is ready only when every check passes: CI is green, migrations are
  reviewed, the changelog has an entry for the version, and the owning team's
  on-call has acknowledged the release window.
- A failing check blocks the release until it is fixed or the owner records an
  approved exception in the release ticket.
- Exceptions never cover a red CI run.
- Releases go out through the release-desk flow, never through a bare
  `npm publish` or a tag push.
