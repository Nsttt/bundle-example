import React from 'react';

import { listServices } from '../../release.js';

/**
 * A generated skill. Instead of a hand-written SKILL.md, this component is
 * rendered to Markdown at build time, so the catalog can never go stale
 * relative to the code that ships with it.
 */
export const frontmatter = {
  description: 'Look up which team owns a service and which version is queued for release. Use when someone asks who owns a service or what is about to ship.',
  name: 'service-catalog',
};

export default function ServiceCatalog() {
  const services = listServices();
  return (
    <>
      <h1>Service catalog</h1>
      <p>
        These are the services release-desk tracks. For live readiness, call the <code>check-readiness</code> tool;
        this page is only a snapshot taken at build time.
      </p>
      <ul>
        {services.map((s) => (
          <li key={s.service}>
            <strong>{s.service}</strong> {s.version}, owned by <em>{s.owner}</em>: {s.description}
          </li>
        ))}
      </ul>
    </>
  );
}
