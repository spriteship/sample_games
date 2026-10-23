import fs from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {call} from '../../emberhold/tools/spriteship.mjs';
if(!process.argv.includes('--execute'))throw new Error('Pass --execute to authorize SpriteShip animation generation under the 20,000-credit ledger.');
const file=path.resolve(import.meta.dirname,'../.spriteship-ledger.json');
const state=JSON.parse(await fs.readFile(file));
const save=()=>fs.writeFile(file,JSON.stringify(state,null,2));
for(const [label,character,animations] of [['pip-motion','pip',['walk','idle']],['bramble-motion','bramble',['walk']],['mallow-motion','mallow',['idle']]]){
  if(state.jobs[label]?.submitted)continue;
  const characterId=state.jobs[character].job.characterIds[0];
  const args={characterId,animations};
  const quote=await call('generate_character_animation',{...args,dryRun:true});
  const cost=quote.estimatedCredits??quote.totalCredits??quote.cost?.credits??quote.quote?.totalCredits;
  if(!Number.isFinite(cost)||state.reserved+cost>state.limit)throw new Error('SpriteShip 20k budget exceeded');
  console.log('PLAN',label,cost,JSON.stringify(quote.preflight||{}).slice(0,1000));
  const accepted={...args,dryRun:false,idempotencyKey:randomUUID()};
  if(quote.animationPipelineAssignmentToken)accepted.animationPipelineAssignmentToken=quote.animationPipelineAssignmentToken;
  state.reserved+=cost;state.jobs[label]={name:'generate_character_animation',cost,args:accepted,submitted:false};await save();
  const result=await call('generate_character_animation',accepted);
  state.jobs[label].result=result;state.jobs[label].submitted=true;await save();
  console.log('JOB',label,JSON.stringify(result).slice(0,1800));
}
