import {call,state,save,paidTool} from './spriteship.mjs';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const cast=Object.entries((await state()).characters);
const pending=new Map();
async function dispatch(slug,c,kind){
  const walk=kind==='walk';
  const args={characterId:c.selectedId,animationDirectionMode:'four_direction',animations:walk?['walk_down','walk_right','walk_up']:['attack'],targetFacings:walk?{walk_down:'s',walk_right:'e',walk_up:'n'}:{attack:'s'},mirrorAnims:walk?{walk_left:'walk_right'}:{}};
  const label='motion-'+slug+'-'+(walk?'walk-v2':'attack');
  const r=await paidTool(label,'generate_character_animation',args);
  pending.set(label,{slug,c,kind,ids:r.operations?.map(o=>o.jobId)||[r.jobId]});
}
// Different characters are independent entities; all quotes remain bounded and durable.
for(const [slug,c]of cast)await dispatch(slug,c,'walk');
for(;;){
  for(const [label,item]of [...pending]){
    let all=true;
    const statuses={};
    for(const id of item.ids){
      let j;try{j=await call('get_job',{jobId:id});}catch(e){console.log('POLL_RETRY',id,e.message.slice(0,80));all=false;continue;}
      statuses[id]=j;console.log(label,id,j.status,j.wizardPhase||'');
      if(j.status==='error')throw new Error(label+': '+j.error);
      if(j.status!=='done')all=false;
    }
    const s=await state();s.jobs[label]||=s.requests[label].response;s.jobs[label].statuses={...s.jobs[label].statuses,...statuses};await save(s);
    if(all){pending.delete(label);if(item.kind==='walk')await dispatch(item.slug,item.c,'attack');}
  }
  if(!pending.size)break;
  await sleep(10000);
}
console.log('ALL_CHARACTER_MOTION_FINISHED');
