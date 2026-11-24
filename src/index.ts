/**
 * The npm library export. `src/index.ts` is a convention: the build emits it
 * to `dist/index.js` with declarations, no `lib` config needed.
 */
export {
  checkReadiness,
  isServiceName,
  listServices,
  releaseNotes,
  releasePolicy,
  serviceNames,
  type Check,
  type Readiness,
  type ReleaseNotesOptions,
  type ServiceName,
  type ServiceSummary,
} from './release.js';
