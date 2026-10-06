import {call,state,save,paidTool} from './spriteship.mjs';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function wait(ids){
  for(;;){let done=true;for(const id of ids){const j=await call('get_job',{jobId:id});console.log('FINISH_MOTION',id,j.status);if(j.status==='error'){const s=await state();s.deliveryFailures||={};s.deliveryFailures[id]={error:j.error,failureKind:j.failureKind,credits:j.credits,retryMode:j.retryMode};await save(s);console.log('DELIVERY_FAILURE_PRESERVED',id,j.credits?.net);continue;}if(j.status!=='done')done=false;}if(done)return;await sleep(10000);}
}
const s=await state();
async function finishCharacter(slug,c){
  // Wait for already-authorized baseline captures; no duplicate provider dispatch.
  for(const type of ['walk-v2','attack']){
    for(;;){const current=await state();const r=current.requests['motion-'+slug+'-'+type]?.response;if(r){await wait(r.operations?.map(o=>o.jobId)||[r.jobId]);break;}await sleep(15000);}
  }
  if(slug==='worker'&&process.argv.includes('worker')){
    // A previous independent finish pass owns the worker's free standing poses.
    for(;;){const c=await call('get_character',{characterId:s.characters.worker.selectedId});if(['idle_down','idle_up','idle_right','idle_left'].every(n=>c.animations[n]))break;await sleep(10000);}
  }
  {
    const action=slug==='ranger'?'Draw the wooden longbow and release one arrow in a clear controlled shot. Preserve the same solid bow shape in the same hand.':'Perform one short, clear '+(slug==='worker'?'wood chopping stroke':'weapon strike')+' in place with the same held '+(slug==='brute'?'heavy warhammer':slug==='raider'?'steel axe':slug==='worker'?'small iron hatchet':'steel sword')+'. Keep the tool or weapon visible and solid through the strike; retain clothing, armor and shield where present.';
    const animations=['attack_up','attack_right'];
    const customAnims=Object.fromEntries(animations.map(a=>[a,{prompt:action+' Stay planted on the ground. No turning or walking, no trails, lettering or camera movement.',loop:false,keepDirection:true,anchorToGround:true}]));
    const r=await paidTool('combat-directions-'+slug,'generate_character_animation',{characterId:c.selectedId,animationDirectionMode:'four_direction',animations,targetFacings:{attack_up:'n',attack_right:'e'},mirrorAnims:{attack_left:'attack_right'},customAnims});
    await wait(r.operations?.map(o=>o.jobId)||[r.jobId]);
  }
  const detail=await call('get_character',{characterId:c.selectedId});
  const poses=await call('list_character_poses',{characterId:c.selectedId});
  for(const [facing,direction]of [['s','down'],['n','up'],['e','right'],['w','left']]){
    const name='idle_'+direction;
    if(detail.animations[name])continue;
    const pose=poses.poses.find(p=>p.direction===facing&&p.status==='done');
    if(!pose)throw new Error('Missing standing pose '+slug+'/'+direction);
    const r=await call('create_animation_from_pose',{characterId:c.selectedId,poseId:pose.id,newId:name,displayName:'Standing '+direction,fps:1});
    await wait([r.jobId]);
  }
}
// Characters finish independently. Provider backoff and the locked budget
// ledger bound concurrent dispatch without duplicate generation.
await Promise.all(Object.entries(s.characters).filter(([slug])=>!process.argv.slice(2).length||process.argv.slice(2).includes(slug)).map(([slug,c])=>finishCharacter(slug,c)));
console.log('ALL_CHARACTER_DELIVERIES_SETTLED');
