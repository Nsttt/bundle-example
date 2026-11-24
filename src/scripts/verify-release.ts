import { checkReadiness, isServiceName, serviceNames } from '../release.js';

/**
 * An artifact script: ships as `scripts/verify-release.mjs` inside the plugin
 * root, so skills, commands, and CI can run it with plain `node`. The build
 * wraps the exported `main` in a process envelope (argv in, numeric return
 * adopted as the exit code).
 *
 *   node scripts/verify-release.mjs web      -> exit 1, failing checks on stderr
 */
export const main = async (argv: readonly string[]): Promise<number> => {
  const service = argv[0];
  if (service === undefined || !isServiceName(service)) {
    process.stderr.write(`Usage: verify-release <${serviceNames.join('|')}>\n`);
    return 2;
  }
  const readiness = checkReadiness(service);
  if (readiness.verdict === 'blocked') {
    process.stderr.write(`${readiness.summary}\n`);
    for (const check of readiness.checks.filter((c) => c.status === 'fail')) {
      process.stderr.write(`  ✗ ${check.label}: ${check.detail}\n`);
    }
    return 1;
  }
  process.stdout.write(`${readiness.summary}\n`);
  return 0;
};
