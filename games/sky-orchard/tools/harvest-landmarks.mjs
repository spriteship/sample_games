import fs from 'node:fs/promises';
import path from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {api,call} from '../../emberhold/tools/spriteship.mjs';

const run=promisify(execFile);
const root=path.resolve(import.meta.dirname,'..');
const review=path.join(root,'.spriteship-review','landmarks');
const output=path.join(root,'public','assets','worlds');
const ledger=JSON.parse(await fs.readFile(path.join(root,'.spriteship-ledger.json')));
await fs.mkdir(review,{recursive:true});await fs.mkdir(output,{recursive:true});
for(const [label,entry] of Object.entries(ledger.jobs).filter(([name])=>name.startsWith('landmark-'))){
  if(!entry.result?.jobId)continue;
  const job=await api('/jobs/'+entry.result.jobId);
  if(job.status!=='done'){console.log('WAIT',label,job.status);continue;}
  const slug=label.slice('landmark-'.length);
  const dest=path.join(output,`${slug}-landmark.png`);
  if(await fs.access(dest).then(()=>true,()=>false)){console.log('SKIP',slug);continue;}
  const asset=await call('get_asset',{assetId:entry.args.slug});
  const tiles=asset.grid?.tiles||[];
  if(!tiles.length)throw new Error(`${slug} has no extracted landmarks`);
  for(const tile of tiles){
    const response=await fetch(tile.url);
    if(!response.ok)throw new Error(`${slug} tile ${tile.index}: HTTP ${response.status}`);
    await fs.writeFile(path.join(review,`${slug}-${tile.index}.png`),new Uint8Array(await response.arrayBuffer()));
  }
  await fs.writeFile(path.join(review,`${slug}.json`),JSON.stringify(tiles.map(tile=>({index:tile.index,name:tile.name,prompt:tile.prompt,description:tile.description})),null,2));
  await run('magick',[path.join(review,`${slug}-0.png`),'-trim','+repage','-resize','360x360>','-strip',dest]);
  console.log('READY',slug,tiles.length,'landmarks');
}
