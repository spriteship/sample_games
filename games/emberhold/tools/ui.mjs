import {call,paidTool,state,save} from './spriteship.mjs';
let s=await state();
if(!s.uiPack){
  const existing=await call('list_ui_packs',{projectId:s.project.id});console.log('Existing packs',JSON.stringify(existing));
  const pack=await call('create_ui_pack',{projectId:s.project.id,name:'Emberhold Command Interface'});
  s=await state();s.uiPack=pack;await save(s);console.log('PACK',JSON.stringify(pack));
}
s=await state();const packId=s.uiPack.id||s.uiPack.pack?.id;
const components=[
 ['icon','wood','Timber','A warm brown bundle of cut timber logs with ivory cut ends.'],
 ['icon','stone','Stone','Three cool slate stone blocks.'],
 ['icon','gold','Gold','Three bright golden nuggets, restrained amber shine.'],
 ['icon','food','Harvest','A golden wheat sheaf and a small apple.'],
 ['icon','population','Settlers','Two small ivory silhouettes of settlers.'],
 ['icon','sword','Command','A simple ivory steel sword and teal shield.'],
 ['icon','flame','Hearthlight','An elegant amber flame over a small glowing coal.'],
 ['icon','crown','Ash Crown','A dark iron crown with ember red cracks.'],
 ['panel','inspector','Command panel','Refined dark charcoal and deep forest green panel with delicate aged copper edge and restrained ivory corner flourishes. Broad completely empty dark center for readable interface text. No writing.'],
 ['frame','portrait','Captain frame','Simple elegant copper oval portrait frame, completely hollow transparent center, small amber jewel at base.'],
 ['bar','health','Hearth vitality','Slender dark copper bordered empty health meter, warm amber accent, clean hollow fill opening.'],
 ['indicator','selection','Unit selection','Thin warm amber elliptical ground selection ring, empty transparent center, angled topdown projected ground.']
].map(([kind,role,name,description])=>({kind,role,name,description,quantity:1,method:'illustrated',requiredCapabilities:['artwork']}));
const result=await paidTool('interface','generate_ui_pack',{packId,request:{requestId:'emberhold-command-interface-v1',components}});
console.log('UI result',JSON.stringify(result));
