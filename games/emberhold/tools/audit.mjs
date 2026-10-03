import {call,state} from './spriteship.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';

const root=path.resolve(import.meta.dirname,'..');
const s=await state();
const ledger=await call('get_credits',{includeLedger:true,limit:500});
const start=s.project.createdAt;
const entries=ledger.entries.filter(e=>e.createdAt>=start&&e.apiKeyName==='spriteshipdemo');
const credits={net:-entries.reduce((sum,e)=>sum+e.delta,0),balance:ledger.balance,startingBalance:150150,ceiling:s.budget,quotedReservation:s.reserved,charged:-entries.filter(e=>e.delta<0).reduce((sum,e)=>sum+e.delta,0),refunded:entries.filter(e=>e.delta>0).reduce((sum,e)=>sum+e.delta,0)};
if(credits.net>s.budget)throw new Error('Production exceeded user credit ceiling');
const cleanJobs=Object.fromEntries(Object.entries(s.requests).map(([label,r])=>[label,{estimatedCredits:r.cost,jobId:r.response?.jobId,operations:r.response?.operations?.map(o=>({jobId:o.jobId,animations:o.animations}))}]));
const audit={projectId:s.project.id,projectUrl:'https://spriteship.com/project/'+s.project.id,createdAt:start,auditedAt:new Date().toISOString(),credits,authorization:'User authorized original Godot web game and all SpriteShip artwork, with no questions and a 30,000-credit ceiling.',accounting:'Actual signed-in API-key ledger entries since this project was created, including provider refunds; quoted estimates are not counted as actual spend.',requests:cleanJobs,deliveryFailures:s.deliveryFailures||{},ledger:entries.map(({id,kind,delta,jobId,createdAt})=>({id,kind,delta,jobId,createdAt}))};
await fs.writeFile(root+'/.spriteship/production-audit.json',JSON.stringify(audit,null,2));
console.log('ACTUAL_SPRITESHIP_CREDITS',JSON.stringify(credits));

const lockFile=root+'/assets/spriteship/spriteship.lock.json';
const lock=JSON.parse(await fs.readFile(lockFile,'utf8'));
const entities=[];
for(const [table,kind]of [['characters','character'],['assets','asset'],['maps','map'],['uiPacks','ui-pack']])for(const [id,e]of Object.entries(lock[table]))entities.push({kind,id,version:kind==='asset'?e.updatedAt:e.contentVersion||null,engine:e.engine||'godot',...(kind==='ui-pack'?{artworkOnly:e.artworkOnly||false}:{}),...(e.snapshot?{snapshot:e.snapshot}:{})});
const result=await call('plan_sync',{entities});
const safe=JSON.parse(JSON.stringify(result,(k,v)=>typeof v==='string'&&/^https?:\/\//.test(v)?undefined:v));
await fs.writeFile(root+'/.spriteship/sync-review.json',JSON.stringify(safe,null,2));
// A snapshot is retained only for an unchanged entity. Changed entries require
// real integration; never pretend that a newly advertised version was downloaded.
const rows=result.entities||result.items||result.results||[];
for(const row of rows){
  const table={'character':'characters','asset':'assets','map':'maps','ui-pack':'uiPacks'}[row.kind];
  if(table&&row.status==='unchanged'&&row.snapshot)lock[table][row.id].snapshot=row.snapshot;
}
await fs.writeFile(lockFile,JSON.stringify(lock,null,2));
console.log('SYNC_REVIEW',rows.map(r=>({kind:r.kind,id:r.id,status:r.status})));
