import { defineEvalSuite, expectOutcome } from 'agent-bundle/eval';

/**
 * An eval suite. `agent-bundle eval` runs it against the built artifact; the
 * deterministic harness needs no model or API key, so it can run in CI.
 *
 * Each trial gets its own copy of the fixture, and the grader reads the
 * `result.json` the agent wrote there. The deterministic harness runs no
 * agent, so the fixture ships a recorded answer to stand in for one. To run
 * the case against a live agent, switch `hosts` to `claude` or `codex` with a
 * real model and remove the recorded `result.json` so the agent has to write it.
 */
export default defineEvalSuite({
  name: 'release-readiness',
  cases: [{
    id: 'api-is-ready',
    prompt: 'Use release-readiness to decide whether api can ship. Write {"service":"api","verdict":"ready"|"blocked"} to result.json.',
    invocation: { mode: 'explicit', skill: 'release-readiness' },
    fixture: './fixtures/ready-service',
    hosts: { portable: { model: 'deterministic' } },
    assertions: [expectOutcome({ script: './graders/verdict-matches.ts' })],
    trials: 1,
  }],
});
