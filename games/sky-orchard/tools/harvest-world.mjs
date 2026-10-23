import fs from 'node:fs/promises';
import path from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {api,call} from '../../emberhold/tools/spriteship.mjs';

const run=promisify(execFile);
const root=path.resolve(import.meta.dirname,'..');
const review=path.join(root,'.spriteship-review','world');
const output=path.join(root,'public','assets','worlds');
const ledger=JSON.parse(await fs.readFile(path.join(root,'.spriteship-ledger.json')));
await fs.mkdir(review,{recursive:true});await fs.mkdir(output,{recursive:true});
async function download(url,file){const response=await fetch(url);if(!response.ok)throw new Error(`${file}: HTTP ${response.status}`);await fs.writeFile(file,new Uint8Array(await response.arrayBuffer()));}
for(const [label,entry] of Object.entries(ledger.jobs).filter(([name])=>name.startsWith('world-'))){
  if(!entry.result?.jobId)continue;
  const job=await api('/jobs/'+entry.result.jobId);
  if(job.status!=='done'){console.log('WAIT',label,job.status);continue;}
  const slug=entry.args.slug;
  const completed=label.endsWith('-sky')
    ? [path.join(output,`${slug}.png`)]
    : ['large','medium','small'].map(size=>path.join(output,`${slug.replace(/-terrain$/,'')}-${size}.png`));
  if((await Promise.all(completed.map(file=>fs.access(file).then(()=>true,()=>false)))).every(Boolean)){console.log('SKIP',slug);continue;}
  const asset=await call('get_asset',{assetId:slug});
  if(label.endsWith('-sky')){
    const source=path.join(review,`${slug}.png`);
    await download(asset.primaryUrl,source);
    await run('magick',[source,'-resize','1280x720^','-gravity','center','-extent','1280x720','-strip',path.join(output,`${slug}.png`)]);
    console.log('READY',slug,'backdrop');
  }else{
    const tiles=asset.grid?.tiles||[];
    if(tiles.length<3)throw new Error(`${slug} has only ${tiles.length} terrain pieces`);
    for(const tile of tiles)await download(tile.url,path.join(review,`${slug}-${tile.index}.png`));
    for(const [size,index,width] of [['large',0,960],['medium',1,640],['small',2,440]]){
      const source=path.join(review,`${slug}-${index}.png`);
      await run('magick',[source,'-trim','+repage','-resize',`${width}x500>`,path.join(output,`${slug.replace(/-terrain$/,'')}-${size}.png`)]);
    }
    await fs.writeFile(path.join(review,`${slug}.json`),JSON.stringify({id:asset.id,extraction:asset.extraction,tiles:tiles.map(t=>({index:t.index,name:t.name,prompt:t.prompt,description:t.description}))},null,2));
    console.log('READY',slug,tiles.length,'terrain pieces');
  }
}
