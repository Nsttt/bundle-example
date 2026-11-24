import type { AppRouteConfig } from 'agent-bundle';
import { createAppClient } from 'agent-bundle/app';
import { name, version } from 'agent-bundle/meta';

import type { Readiness } from '../../../release.js';
import { policyUri } from '../../../uris.js';

/**
 * An MCP App: this browser entry plus `dashboard.html` compile into one
 * self-contained HTML resource on the `release` server. `check-readiness`
 * opens it through `appResourceUri('dashboard')`, and `release-desk web`
 * (enabled by the `web` key in agent-bundle.config.ts) serves it in a
 * plain browser tab.
 */
export const config = {
  resourceUri: 'ui://release-desk/dashboard.html',
  template: './dashboard.html',
} satisfies AppRouteConfig;

const route = 'tool:release/check-readiness';

const $ = <T extends HTMLElement>(selector: string) => document.querySelector<T>(selector)!;
const serviceHeading = $<HTMLHeadingElement>('#service');
const verdict = $<HTMLElement>('#verdict');
const summary = $<HTMLParagraphElement>('#summary');
const checks = $<HTMLUListElement>('#checks');
const policy = $<HTMLParagraphElement>('#policy');
const picker = $<HTMLSelectElement>('#picker');

const render = (result: Readiness) => {
  serviceHeading.textContent = `${result.service} ${result.version}`;
  verdict.dataset.state = result.verdict;
  verdict.textContent = result.verdict;
  summary.textContent = result.summary;
  picker.value = result.service;
  checks.replaceChildren(...result.checks.map((check) => {
    const item = document.createElement('li');
    item.dataset.state = check.status;
    const label = document.createElement('strong');
    label.textContent = check.label;
    const detail = document.createElement('span');
    detail.textContent = check.detail;
    item.append(label, detail);
    return item;
  }));
};

const client = createAppClient({ appInfo: { name, version } });

client.onToolInput(route, (input) => {
  serviceHeading.textContent = (input as { service: string }).service;
  verdict.dataset.state = 'checking';
  verdict.textContent = 'checking';
});
client.onToolResult(route, (result) => render(result as Readiness));
client.onToolError(route, (error) => {
  verdict.dataset.state = 'blocked';
  verdict.textContent = 'unavailable';
  summary.textContent = error.message;
});

// The App can call back into the server: re-run the tool for another service...
picker.addEventListener('change', async () => {
  const service = picker.value as Readiness['service'];
  render(await client.call(route, { service }) as Readiness);
});

// ...and read server resources.
$('#read-policy').addEventListener('click', async () => {
  const result = await client.request('resources/read', { uri: policyUri }) as { contents?: { text?: string }[] };
  policy.textContent = result.contents?.[0]?.text ?? 'Policy unavailable.';
});

await client.connect();
