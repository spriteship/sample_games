import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

const root = path.resolve(import.meta.dirname, '..');
const config = JSON.parse(await fs.readFile(path.join(root, '.spriteship/project.json'), 'utf8'));
const statePath = path.join(root, '.spriteship/production.json');
const envText = process.env.SPRITESHIP_API_KEY ? '' : await fs.readFile(process.env.SPRITESHIP_ENV_FILE || path.join(root, '.spriteship/local.env'), 'utf8').catch(() => '');
const key = process.env.SPRITESHIP_API_KEY || envText.match(/^SPRITESHIP_API_KEY\s*=\s*["']?([^"'\r\n]+)/m)?.[1]?.trim();
if (!key) throw new Error('Set SPRITESHIP_API_KEY or SPRITESHIP_ENV_FILE for SpriteShip production');
const origin = process.env.SPRITESHIP_API_URL || 'https://spriteship.com';
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

export async function call(name, args = {}) {
  for (let attempt = 0; attempt < 12; attempt++) {
    const response = await fetch(origin + '/mcp', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' },
      body: JSON.stringify({ jsonrpc: '2.0', id: randomUUID(), method: 'tools/call', params: { name, arguments: args } })
    });
    const raw = await response.text();
    const line = raw.split('\n').find(value => value.startsWith('data: '));
    const rpc = JSON.parse(line ? line.slice(6) : raw);
    if (rpc.error) throw new Error(JSON.stringify(rpc.error));
    const result = rpc.result;
    const data = result?.structuredContent || JSON.parse(result?.content?.find(item => item.type === 'text')?.text || '{}');
    if (result?.isError && ['RATE_LIMITED', 'TOO_MANY_ACTIVE_JOBS', 'service_unavailable'].includes(data.code)) {
      await pause(Math.max(3000, (data.retryAfterSeconds || 15) * 1000));
      continue;
    }
    if (result?.isError) throw new Error(JSON.stringify(data));
    return data;
  }
  throw new Error('SpriteShip remained unavailable after retries: ' + name);
}

export async function state() {
  return JSON.parse(await fs.readFile(statePath, 'utf8').catch(() => JSON.stringify({ budget: config.budgetCredits, reserved: 0, requests: {}, assets: {}, characters: {} })));
}

export async function save(value) {
  await fs.mkdir(path.dirname(statePath), { recursive: true });
  const temporary = statePath + '.' + randomUUID() + '.tmp';
  await fs.writeFile(temporary, JSON.stringify(value, null, 2));
  await fs.rename(temporary, statePath);
}

export async function paid(label, name, args) {
  const current = await state();
  if (current.requests[label]?.response) return current.requests[label].response;
  if (!current.requests[label]) {
    const quote = await call(name, { ...args, dryRun: true });
    const cost = quote.estimatedCredits ?? quote.totalCredits ?? quote.cost?.credits ?? quote.quote?.totalCredits;
    if (typeof cost !== 'number') throw new Error('SpriteShip did not return a numeric quote for ' + label);
    if (current.reserved + cost > current.budget) throw new Error('BLACKOUT 30,000-credit limit exceeded');
    console.log('QUOTE', label, cost, JSON.stringify(quote.plan?.preview || quote.preflight || {}));
    const confirmed = { ...args, dryRun: false, idempotencyKey: randomUUID() };
    if (quote.planToken) confirmed.planToken = quote.planToken;
    if (quote.animationPipelineAssignmentToken) confirmed.animationPipelineAssignmentToken = quote.animationPipelineAssignmentToken;
    if (quote.quote) confirmed.quote = quote.quote;
    current.requests[label] = { name, args: confirmed, cost, quotedAt: new Date().toISOString() };
    current.reserved += cost;
    await save(current);
  }
  const request = current.requests[label];
  const response = await call(name, request.args);
  request.response = response;
  await save(current);
  console.log('ACCEPTED', label, response.jobId || 'synchronous');
  return response;
}

export async function waitFor(label, response) {
  const ids = response.operations?.map(operation => operation.jobId) || (response.jobId ? [response.jobId] : []);
  const jobs = [];
  for (const id of ids) {
    for (;;) {
      const job = await call('get_job', { jobId: id });
      console.log('JOB', label, id, job.status, job.wizardPhase || '');
      if (job.status === 'done') { jobs.push(job); break; }
      if (job.status === 'error' || job.status === 'waiting_approval') throw new Error('SpriteShip job needs review: ' + JSON.stringify(job));
      await pause(10000);
    }
  }
  return jobs;
}

export async function downloadExport(command, destination) {
  const url = command.url || command.downloadUrl;
  if (!url || new URL(url).origin !== new URL(origin).origin) throw new Error('Unexpected SpriteShip export URL');
  for (let attempt = 0; attempt < 6; attempt++) {
    const response = await fetch(url, { headers: { Authorization: `Bearer ${key}` } });
    if (response.status === 429) { await pause(15000); continue; }
    if (!response.ok) throw new Error('SpriteShip export HTTP ' + response.status);
    await fs.mkdir(path.dirname(destination), { recursive: true });
    await fs.writeFile(destination, new Uint8Array(await response.arrayBuffer()));
    return;
  }
  throw new Error('SpriteShip export rate limit did not clear');
}

export { config, root };
