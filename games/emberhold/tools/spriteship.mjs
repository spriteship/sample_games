import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

const root = path.resolve(import.meta.dirname, '..');
const statePath = path.join(root, '.spriteship/production.json');
const privateEnv = process.env.SPRITESHIP_API_KEY ? '' : await fs.readFile(process.env.SPRITESHIP_ENV_FILE || path.join(root,'.spriteship/local.env'), 'utf8').catch(() => '');
const key = process.env.SPRITESHIP_API_KEY || privateEnv.match(/^SPRITESHIP_API_KEY\s*=\s*["']?([^"'\r\n]+)/m)?.[1]?.trim();
if (!key) throw new Error('SpriteShip private credential unavailable');
export const origin = process.env.SPRITESHIP_API_URL || 'https://spriteship.com';
export async function api(route, body, extra = {}) {
  const res = await fetch(origin + '/api/v1' + route, { method: body === undefined ? 'GET' : 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', ...extra }, body: body === undefined ? undefined : JSON.stringify(body) });
  const result = await res.json();
  if (!res.ok) throw Object.assign(new Error(JSON.stringify(result)), { status: res.status, result });
  return result;
}
export async function state() { return JSON.parse(await fs.readFile(statePath, 'utf8').catch(() => '{"budget":30000,"reserved":0,"requests":{},"jobs":{},"assets":{},"characters":{}}')); }
export async function save(s) {
  await fs.mkdir(path.dirname(statePath), {recursive:true});
  let lock;
  for(let n=0;n<400;n++){try{lock=await fs.open(statePath+'.lock','wx');break;}catch(e){if(e.code!=='EEXIST')throw e;await new Promise(r=>setTimeout(r,25));}}
  if(!lock)throw new Error('Production ledger locked');
  try{
    const current=await state();
    function merge(a,b){const out={...a};for(const [k,v]of Object.entries(b)){out[k]=v&&typeof v==='object'&&!Array.isArray(v)?merge(a?.[k]||{},v):v;}return out;}
    const merged=merge(current,s);
    merged.reserved=Object.values(merged.requests||{}).reduce((sum,r)=>sum+(r.cost||0),0);
    const temporary=statePath+'.tmp-'+randomUUID();
    await fs.writeFile(temporary,JSON.stringify(merged,null,2));await fs.rename(temporary,statePath);
  }finally{await lock.close();await fs.unlink(statePath+'.lock');}
}
export async function paid(label, route, body) {
  const s = await state();
  if (s.requests[label]?.response) return s.requests[label].response;
  if (!s.requests[label]) {
    const quote = await api(route + '?dryRun=true', body);
    const cost = quote.estimatedCredits ?? quote.totalCredits ?? quote.cost?.credits ?? quote.credits;
    if (typeof cost !== 'number') throw new Error('Missing numeric quote: ' + JSON.stringify(quote));
    if (s.reserved + cost > s.budget) throw new Error('30,000 credit ceiling exceeded');
    console.log('QUOTE', label, cost);
    const acceptedBody = { ...body };
    if (quote.planToken) acceptedBody.planToken = quote.planToken;
    if (quote.animationPipelineAssignmentToken) acceptedBody.animationPipelineAssignmentToken = quote.animationPipelineAssignmentToken;
    s.requests[label] = { route, body: acceptedBody, cost, idempotencyKey: randomUUID(), quote, authorizedBy: 'User explicitly authorized SpriteShip game production up to 30,000 credits without questions.' };
    s.reserved += cost;
    await save(s);
  }
  const request = s.requests[label];
  const response = await api(request.route, request.body, { 'Idempotency-Key': request.idempotencyKey });
  request.response = response;
  if (response.jobId) s.jobs[label] = response;
  await save(s);
  console.log('ACCEPTED', label, JSON.stringify(response));
  return response;
}
export async function pollOnce() {
  const s = await state();
  for (const [label, dispatch] of Object.entries(s.jobs)) {
    const ids = dispatch.operations?.map(o => o.jobId) || [dispatch.jobId];
    for (const id of ids) {
      const j = await api('/jobs/' + id);
      console.log(label, id, j.status, j.errorCode || '', j.errorMessage || '', j.credits ? JSON.stringify(j.credits) : '');
      dispatch.statuses ||= {}; dispatch.statuses[id] = j;
    }
  }
  await save(s);
}
export async function mcp(method, params = {}) {
  const r = await fetch(origin + '/mcp', { method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' }, body: JSON.stringify({ jsonrpc: '2.0', id: randomUUID(), method, params }) });
  const t = await r.text();
  const line = t.split('\n').find(x => x.startsWith('data: '));
  return JSON.parse(line ? line.slice(6) : t);
}
export async function call(name, args = {}) {
  for(let attempt=0;attempt<40;attempt++){
    const r = await mcp('tools/call', { name, arguments: args });
    if(r.error && JSON.stringify(r.error).includes('service_unavailable')){await new Promise(resolve=>setTimeout(resolve,15000));continue;}
    if (r.error) throw new Error(JSON.stringify(r.error));
    const data = r.result?.structuredContent || JSON.parse(r.result?.content?.find(c => c.type === 'text')?.text || '{}');
    if(r.result?.isError && ['RATE_LIMITED','TOO_MANY_ACTIVE_JOBS'].includes(data.code)){
      console.log('RATE_LIMIT_BACKOFF',name,data.retryAfterSeconds);
      await new Promise(resolve=>setTimeout(resolve,Math.max(1000,(data.retryAfterSeconds||15)*1000)));continue;
    }
    if (r.result?.isError) throw new Error(JSON.stringify(data));
    return data;
  }
  throw new Error('SpriteShip temporarily unavailable after bounded retries: '+name);
}
export async function downloadExport(command, file) {
  const url = command.url || command.downloadUrl;
  if (!url || new URL(url).origin !== new URL(origin).origin) throw new Error('Unexpected export origin');
  for (let attempt = 0; attempt < 5; attempt++) {
    const response = await fetch(url, {headers:{Authorization:`Bearer ${key}`}});
    if (response.status === 429) { await new Promise(r=>setTimeout(r,15000)); continue; }
    if (!response.ok) throw new Error('Export failed '+response.status+': '+(await response.text()).slice(0,400));
    await fs.mkdir(path.dirname(file), {recursive:true});
    await fs.writeFile(file,new Uint8Array(await response.arrayBuffer()));
    return;
  }
  throw new Error('Export rate limit did not clear');
}
export async function paidTool(label, name, args) {
  const s = await state();
  if (s.requests[label]?.response) return s.requests[label].response;
  if (!s.requests[label]) {
    const quote = await call(name, { ...args, dryRun: true });
    const cost = quote.estimatedCredits ?? quote.totalCredits ?? quote.cost?.credits ?? quote.quote?.totalCredits;
    if (typeof cost !== 'number' || s.reserved + cost > s.budget) throw new Error('Missing quote or budget exceeded: ' + JSON.stringify(quote));
    console.log('QUOTE', label, cost);
    const accepted = { ...args, dryRun: false, idempotencyKey: randomUUID() };
    if (quote.planToken) accepted.planToken = quote.planToken;
    if (quote.animationPipelineAssignmentToken) accepted.animationPipelineAssignmentToken = quote.animationPipelineAssignmentToken;
    if (quote.quote) accepted.quote = quote.quote;
    s.requests[label] = { name, args: accepted, cost, quote, authorizedBy: 'User budget of 30,000 credits, no questions, all artistic choices delegated.' };
    s.reserved += cost; await save(s);
  }
  const response = await call(name, s.requests[label].args);
  s.requests[label].response = response;
  if (response.jobId) s.jobs[label] = response;
  await save(s); console.log('ACCEPTED', label, JSON.stringify(response)); return response;
}
if (process.argv[2] === 'catalog') {
  const result = await mcp('tools/list');
  await fs.writeFile('/tmp/emberhold-spriteship-tools.json', JSON.stringify(result, null, 2));
  console.log(result.result?.tools?.map(t => ({ name: t.name, description: t.description?.slice(0, 140) })) || result);
}
if (process.argv[2] === 'poll') await pollOnce();
