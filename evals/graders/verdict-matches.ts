import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { EvalGraderFunction } from 'agent-bundle/eval';

import { checkReadiness } from '../../src/release.ts';

/** The service this case asks about; an answer about any other service fails. */
const expectedService = 'api';

/**
 * Grades the answer in the trial's result.json. `fixturePath` is the trial's
 * own copy of the fixture after the agent ran, so this reads what the agent
 * wrote. The expected verdict comes from the release-desk domain logic, so
 * the eval also fails if the readiness rules change underneath an answer.
 */
const grade: EvalGraderFunction = async ({ fixturePath }) => {
  const recorded = JSON.parse(await readFile(join(fixturePath, 'result.json'), 'utf8')) as { service?: unknown; verdict?: unknown };
  if (recorded.service !== expectedService) {
    return { detail: `Expected an answer about ${expectedService}, got ${String(recorded.service)}.`, outcome: 'fail' };
  }
  const actual = checkReadiness(expectedService).verdict;
  return actual === recorded.verdict
    ? { detail: `${recorded.service} is ${actual}, as recorded.`, outcome: 'pass' }
    : { detail: `${recorded.service} is ${actual}, but the answer says ${String(recorded.verdict)}.`, outcome: 'fail' };
};

export default grade;
