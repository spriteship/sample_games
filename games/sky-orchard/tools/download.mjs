import fs from 'node:fs/promises';
import path from 'node:path';
import {call} from '../../emberhold/tools/spriteship.mjs';

const root=path.resolve(import.meta.dirname,'..');
const review=path.join(root,'.spriteship-review');
await fs.mkdir(review,{recursive:true});
async function download(url,file){
  const response=await fetch(url);
  if(!response.ok)throw new Error(`${file}: ${response.status}`);
  await fs.writeFile(file,new Uint8Array(await response.arrayBuffer()));
}
for(const slug of ['orchard-sky','floating-island-kit','orchard-props']){
  const asset=await call('get_asset',{assetId:slug});
  await download(asset.primaryUrl,path.join(review,slug+'.png'));
  for(const tile of asset.grid?.tiles||[]) await download(tile.url,path.join(review,`${slug}-${tile.index}.png`));
  await fs.writeFile(path.join(review,slug+'.json'),JSON.stringify({id:asset.id,grid:asset.grid?.tiles?.map(t=>({index:t.index,name:t.name,prompt:t.prompt,description:t.description})),extraction:asset.extraction},null,2));
}
const ledger=JSON.parse(await fs.readFile(path.join(root,'.spriteship-ledger.json'),'utf8'));
for(const name of ['pip','bramble','mallow']){
  const previews=ledger.jobs[name].job.characterPreviews;
  for(let i=0;i<previews.length;i++) await download(previews[i].previewUrl,path.join(review,`${name}-${i}.png`));
  await fs.writeFile(path.join(review,`${name}.json`),JSON.stringify(previews.map((x,i)=>({index:i,id:x.id})),null,2));
}
console.log('Downloaded SpriteShip art for visual review.');
