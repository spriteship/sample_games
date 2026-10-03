import {call,state} from './spriteship.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
const file=path.resolve(import.meta.dirname,'../.spriteship/quality.json');
const review=JSON.parse(await fs.readFile(file,'utf8').catch(()=>'{}'));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const s=await state();
for(const [slug,entity]of Object.entries(s.characters)){
  if(process.argv.slice(2).length&&!process.argv.slice(2).includes(slug))continue;
  if(!entity.selectedId)continue;
  review[slug]||={repairs:{}};
  const c=await call('get_character',{characterId:entity.selectedId});
  for(const [animation,gate]of Object.entries(c.animationQualityGate?.animations||{})){
    if(!gate.actions?.includes('rematte')||review[slug].repairs[animation])continue;
    let result;
    for(;;){try{result=await call('rematte_animation',{characterId:entity.selectedId,animation});break;}catch(e){if(!e.message.includes('ENTITY_BUSY'))throw e;await sleep(10000);}}
    review[slug].repairs[animation]={jobId:result.jobId};await fs.writeFile(file,JSON.stringify(review,null,2));
    for(;;){const j=await call('get_job',{jobId:result.jobId});console.log('FREE_MATTE',slug,animation,j.status);if(j.status==='done')break;if(j.status==='error')throw new Error(j.error);await sleep(10000);}
  }
  const detail=await call('get_character',{characterId:entity.selectedId});
  review[slug].quality=detail.animationQualityGate;
  review[slug].checkedAt=new Date().toISOString();
  await fs.writeFile(file,JSON.stringify(review,null,2));
  console.log('QUALITY',slug,JSON.stringify(detail.animationQualityGate));
}
