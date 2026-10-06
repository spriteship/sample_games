import {call,state,origin} from './spriteship.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
const root = path.resolve(import.meta.dirname, '../assets/spriteship');
await fs.mkdir(root, {recursive:true});
let runtime = JSON.parse(await fs.readFile(path.join(root,'runtime.json'),'utf8').catch(()=>'{}'));
runtime.sprites ||= {}; runtime.characters ||= {};
let lock = JSON.parse(await fs.readFile(path.join(root,'spriteship.lock.json'),'utf8').catch(()=>'{}'));
Object.assign(lock,{version:2,apiUrl:origin}); lock.assets ||= {}; lock.characters ||= {}; lock.maps ||= {}; lock.uiPacks ||= {};
const s = await state();
async function download(url,file){
  await fs.mkdir(path.dirname(file),{recursive:true});
  const r=await fetch(url);if(!r.ok)throw new Error('Download failed '+r.status);
  await fs.writeFile(file,new Uint8Array(await r.arrayBuffer()));
}
if(process.argv[2]==='assets'){
  for(const [slug,entry] of Object.entries(s.assets)){
    let idx=0;
    for(const id of entry.ids){
      const a=await call('get_asset',{assetId:id});
      const it=a.iterations.find(i=>i.id===a.currentIterationId)||a.iterations.at(-1);
      const files=[];
      for(const item of it.items||[]){
        const file=slug+'/item-'+idx+'.png';
        await download(item.imageUrl,path.join(root,file));
        runtime.sprites[slug+'/'+idx]={file,assetId:id,iterationId:it.id,itemIndex:item.itemIndex,name:item.displayName};files.push(file);idx++;
      }
      if(!it.items?.length){
        const file=slug+'/item-'+idx+'.png';await download(a.primaryUrl,path.join(root,file));runtime.sprites[slug+'/'+idx]={file,assetId:id,iterationId:it.id};files.push(file);idx++;
      }
      await download(a.primaryUrl,path.join(root,slug+'/source-'+id+'.png'));
      const clean=JSON.parse(JSON.stringify(a,(k,v)=>typeof v==='string'&&/^https?:\/\//.test(v)?undefined:v));
      await fs.writeFile(path.join(root,slug+'/metadata-'+id+'.json'),JSON.stringify(clean,null,2));
      lock.assets[id]={name:a.name,slug,updatedAt:a.updatedAt,engine:'godot',files,syncedAt:new Date().toISOString()};
      console.log('SYNCED',slug,id,files.length,a.extraction?.status||'single');
    }
  }
  const fonts=await call('list_ui_fonts');
  for(const id of ['exo2','barlow']){
    const f=fonts.fonts.find(x=>x.id===id);await download(new URL(f.url,origin),path.join(root,'fonts/'+id+'.ttf'));await download(new URL(f.licenseUrl,origin),path.join(root,'fonts/'+id+'-OFL.txt'));
  }
  runtime.heading_font='fonts/exo2.ttf';runtime.body_font='fonts/barlow.ttf';
  const original = Array.from({length:14},(_,i)=>runtime.sprites['nature/'+i]);
  const mapping = [0,1,2,5,6,8,9,10,11,12,13,7];
  mapping.forEach((source,index)=>runtime.sprites['nature/'+index]={...original[source],visualReview:'Mapped from inspected source sheet; extra birches retained as optional art.'});
  const buildingOriginal = Array.from({length:11},(_,i)=>runtime.sprites['buildings/'+i]);
  [0,1,2,3,4,5,6,7,9,8,10].forEach((source,index)=>runtime.sprites['buildings/'+index]={...buildingOriginal[source],visualReview:'Reviewed delivered sprite; forge and watchtower ordering corrected.'});
  for(const [slug,entry] of Object.entries(s.characters)){
    const character=await call('get_character',{characterId:entry.selectedId});
    const file='portraits/'+slug+'.png';
    await download(character.imageUrl,path.join(root,file));
    await fs.mkdir(path.join(root,'characters',slug),{recursive:true});
    await fs.copyFile(path.join(root,file),path.join(root,'characters',slug,'source.png'));
    runtime.sprites['characters/'+slug]={file,characterId:entry.selectedId,syncedAt:new Date().toISOString()};
    console.log('REFRESHED_PORTRAIT',slug);
  }
}
await fs.writeFile(path.join(root,'runtime.json'),JSON.stringify(runtime,null,2));
await fs.writeFile(path.join(root,'spriteship.lock.json'),JSON.stringify(lock,null,2));
