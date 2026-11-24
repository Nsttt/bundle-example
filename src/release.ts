/**
 * Release-desk domain logic. Everything here is plain TypeScript with no
 * framework imports: the MCP tools, the routed CLI, the artifact script, the
 * generated skill, the evals, and the npm library export all reuse it.
 */
import { z } from 'zod';

export const serviceNames = ['api', 'web', 'worker'] as const;
export const serviceSchema = z.enum(serviceNames);
export type ServiceName = z.infer<typeof serviceSchema>;

export const checkSchema = z.object({
  id: z.string(),
  label: z.string(),
  status: z.enum(['pass', 'fail']),
  detail: z.string(),
}).strict();
export type Check = z.infer<typeof checkSchema>;

export const readinessSchema = z.object({
  service: serviceSchema,
  owner: z.string(),
  version: z.string(),
  verdict: z.enum(['ready', 'blocked']),
  summary: z.string(),
  checks: z.array(checkSchema),
}).strict();
export type Readiness = z.infer<typeof readinessSchema>;

export const serviceSummarySchema = z.object({
  service: serviceSchema,
  owner: z.string(),
  version: z.string(),
  description: z.string(),
}).strict();
export type ServiceSummary = z.infer<typeof serviceSummarySchema>;

interface ServiceRecord extends ServiceSummary {
  readonly checks: readonly Check[];
  readonly changes: readonly string[];
}

/**
 * A deterministic stand-in for a real release tracker. Swap this table for a
 * call to your CI, deploy, or ticketing system; nothing else has to change.
 */
const catalog: Readonly<Record<ServiceName, ServiceRecord>> = {
  api: {
    service: 'api',
    owner: 'platform',
    version: '2.14.0',
    description: 'Public REST API and auth gateway.',
    changes: ['Rate limits are now per token instead of per IP.', 'Removed the deprecated /v1/sessions route.'],
    checks: [
      { id: 'tests', label: 'CI is green', status: 'pass', detail: 'main@4f2c1e passed 1,284 tests.' },
      { id: 'migrations', label: 'Migrations reviewed', status: 'pass', detail: '2 additive migrations approved.' },
      { id: 'changelog', label: 'Changelog written', status: 'pass', detail: 'CHANGELOG.md has a 2.14.0 entry.' },
      { id: 'oncall', label: 'On-call acknowledged', status: 'pass', detail: 'platform on-call acked the window.' },
    ],
  },
  web: {
    service: 'web',
    owner: 'frontend',
    version: '5.3.0',
    description: 'Customer dashboard single-page app.',
    changes: ['New billing settings page.', 'Dark mode follows the system theme.'],
    checks: [
      { id: 'tests', label: 'CI is green', status: 'pass', detail: 'main@91ab07 passed 612 tests.' },
      { id: 'migrations', label: 'Migrations reviewed', status: 'pass', detail: 'No migrations in this release.' },
      { id: 'changelog', label: 'Changelog written', status: 'fail', detail: 'CHANGELOG.md has no 5.3.0 entry.' },
      { id: 'oncall', label: 'On-call acknowledged', status: 'pass', detail: 'frontend on-call acked the window.' },
    ],
  },
  worker: {
    service: 'worker',
    owner: 'data',
    version: '1.8.2',
    description: 'Background job runner and schedulers.',
    changes: ['Retries use exponential backoff with jitter.'],
    checks: [
      { id: 'tests', label: 'CI is green', status: 'fail', detail: 'main@c3d9e2 has 2 failing tests in queue/retry.' },
      { id: 'migrations', label: 'Migrations reviewed', status: 'pass', detail: 'No migrations in this release.' },
      { id: 'changelog', label: 'Changelog written', status: 'pass', detail: 'CHANGELOG.md has a 1.8.2 entry.' },
      { id: 'oncall', label: 'On-call acknowledged', status: 'fail', detail: 'Nobody from data has acked the window.' },
    ],
  },
};

export const releasePolicy = [
  'A service is ready to release only when every check passes.',
  'A failing check blocks the release until it is fixed or the owner records an approved exception.',
  'Releases go out through the release-desk flow, never through a bare `npm publish` or tag push.',
].join('\n');

export const isServiceName = (value: string): value is ServiceName =>
  (serviceNames as readonly string[]).includes(value);

export const listServices = (): ServiceSummary[] =>
  serviceNames.map((name) => {
    const { service, owner, version, description } = catalog[name];
    return { service, owner, version, description };
  });

export const checkReadiness = (service: ServiceName): Readiness => {
  const record = catalog[service];
  const failing = record.checks.filter((check) => check.status === 'fail');
  const verdict = failing.length === 0 ? 'ready' : 'blocked';
  const summary = verdict === 'ready'
    ? `${service} ${record.version} is ready to release.`
    : `${service} ${record.version} is blocked by ${failing.length} failing check${failing.length === 1 ? '' : 's'}: ${failing.map((check) => check.label).join(', ')}.`;
  return {
    service,
    owner: record.owner,
    version: record.version,
    verdict,
    summary,
    checks: record.checks.map((check) => ({ ...check })),
  };
};

export interface ReleaseNotesOptions {
  /** Where the notes were drafted from, e.g. a git branch; omitted when unknown. */
  readonly source?: string;
}

export const releaseNotes = (service: ServiceName, options: ReleaseNotesOptions = {}): string => {
  const record = catalog[service];
  const readiness = checkReadiness(service);
  return [
    `## ${service} ${record.version}`,
    '',
    ...record.changes.map((change) => `- ${change}`),
    '',
    `Owner: ${record.owner}. Status: ${readiness.verdict}.`,
    ...(options.source === undefined ? [] : [`Drafted from ${options.source}.`]),
  ].join('\n');
};
