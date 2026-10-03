import {call,state,downloadExport} from './spriteship.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
const root=path.resolve(import.meta.dirname,'..');
const s=await state();
const slugs=process.argv.slice(2).length?process.argv.slice(2):Object.keys(s.characters);
const heights={hero:88,guard:74,ranger:74,knight:86,raider:77,brute:115,worker:74};
for(const slug of slugs){
  const id=s.characters[slug].selectedId;
  let detail=await call('get_character',{characterId:id});
  const temp=await fs.mkdtemp('/tmp/emberhold-character-'+slug+'-');
  async function exportBundle(suffix){
    await downloadExport(await call('get_export_command',{target:'character',entityId:id,engine:'godot'}),temp+'/'+suffix+'.zip');
    execFileSync('unzip',['-q',temp+'/'+suffix+'.zip','-d',temp+'/'+suffix]);
    const folder=(await fs.readdir(temp+'/'+suffix))[0];
    const source=temp+'/'+suffix+'/'+folder;
    return {folder,source,manifest:JSON.parse(await fs.readFile(source+'/tizo-export.json','utf8'))};
  }
  let bundle=await exportBundle('inspection');
  const calibration={};let changed=false;
  for(const group of bundle.manifest.payload.groups){
    const tres=await fs.readFile(bundle.source+'/'+path.basename(group.tresFile),'utf8');
    const [x,y,w,h]=tres.match(/region = Rect2\(([^)]+)\)/)[1].split(',').map(Number);
    const bounds=execFileSync('magick',[bundle.source+'/'+path.basename(group.spritesheetFile),'-crop',`${w}x${h}+${x}+${y}`,'+repage','-format','%@','info:'],{encoding:'utf8'}).match(/(\d+)x(\d+)\+(\d+)\+(\d+)/);
    if(!bounds||Number(bounds[2])<16)throw new Error('Empty first-frame reference '+slug+'/'+group.key);
    // A fixed per-clip render calibration, never a per-frame crop or physics bbox replacement.
    // Neutral first frames establish figure height and ground contact across differently padded poses.
    const frameEdgeScale=h/Number(bounds[2]);
    const groundAnchor={x:.5,y:Math.min(.995,(Number(bounds[4])+Number(bounds[2])-2)/h)};
    const movement={kind:'circle',cx:groundAnchor.x,cy:groundAnchor.y,r:17/(heights[slug]*frameEdgeScale)};
    for(const animation of group.animations){
      calibration[animation]={frameEdgeScale,groundAnchor,firstFrameBounds:{x:Number(bounds[3])/w,y:Number(bounds[4])/h,w:Number(bounds[1])/w,h:Number(bounds[2])/h},method:'Fixed neutral first-frame reference; full logical frame and source artwork retained.'};
      const old=detail.animations[animation]?.collisionRoles?.movement;
      if(!old||Object.keys(movement).some(k=>typeof movement[k]==='number'?Math.abs((old[k]||0)-movement[k])>1e-8:old[k]!==movement[k])){
        await call('set_character_collision_roles',{characterId:id,animation,collisionRoles:{movement}});changed=true;
      }
    }
  }
  // Character detail is the Phaser contract; native-engine sync versions differ.
  // Pin the Godot version around an actual fresh native download, never stamp a
  // sync-plan version onto artwork that was not fetched under that version.
  const before=await call('plan_sync',{entities:[{kind:'character',id,engine:'godot'}]});
  const nativeVersion=before.entities[0].currentVersion;
  bundle=await exportBundle('delivery');
  const after=await call('plan_sync',{entities:[{kind:'character',id,engine:'godot',version:nativeVersion}]});
  if(after.entities[0].status!=='unchanged')throw new Error('Character changed during native export: '+slug);
  detail=await call('get_character',{characterId:id});
  const {folder:bundleFolder,source,manifest}=bundle;
  // Read the native bundle contracts before integrating its exported data.
  console.log('BUNDLE_CONTRACT',slug,await fs.readFile(source+'/README.md','utf8'),await fs.readFile(source+'/SKILL.md','utf8'));
  const target=root+'/assets/spriteship/characters/'+slug;
  const original=root+'/.spriteship/source-exports/'+slug;
  await fs.mkdir(target,{recursive:true});await fs.mkdir(original,{recursive:true});
  await fs.cp(source,original,{recursive:true});
  const groups={};
  for(const group of manifest.payload.groups){
    const imageFile=path.basename(group.spritesheetFile),tresFile=path.basename(group.tresFile);
    // One paired 50% delivery transform: image AND every atlas region. Originals are retained.
    execFileSync('magick',[source+'/'+imageFile,'-resize','50%',target+'/'+imageFile]);
    let tres=await fs.readFile(source+'/'+tresFile,'utf8');
    tres=tres.replaceAll('res://'+bundleFolder+'/','res://assets/spriteship/characters/'+slug+'/');
    tres=tres.replace(/region = Rect2\(([^)]+)\)/g,(_,v)=>'region = Rect2('+v.split(',').map(n=>Number(n)/2).join(', ')+')');
    await fs.writeFile(target+'/'+tresFile,tres);
    for(const animation of group.animations)groups[animation]='characters/'+slug+'/'+tresFile;
  }
  const clean=JSON.parse(JSON.stringify(manifest,(k,v)=>typeof v==='string'&&/^https?:\/\//.test(v)?undefined:v));
  await fs.writeFile(target+'/native-manifest.json',JSON.stringify(clean,null,2));
  await fs.copyFile(source+'/LICENSE.txt',target+'/LICENSE.txt');
  const runtime=JSON.parse(await fs.readFile(root+'/assets/spriteship/runtime.json','utf8'));
  runtime.characters[slug]={characterId:id,groups,frame_scale:1.0,renderCalibration:calibration,sourceFrameSize:manifest.payload.frameSize,deliveryScale:.5,animationPhysics:manifest.payload.animationPhysics,quality:detail.animationQualityGate};
  await fs.writeFile(root+'/assets/spriteship/runtime.json',JSON.stringify(runtime,null,2));
  const lock=JSON.parse(await fs.readFile(root+'/assets/spriteship/spriteship.lock.json','utf8'));
  lock.characters[id]={slug,engine:'godot',contentVersion:nativeVersion,snapshot:after.entities[0].snapshot,detailContentVersion:detail.contentVersion,files:Object.values(groups),pairedAtlasScale:.5,quality:detail.animationQualityGate,syncedAt:new Date().toISOString()};
  await fs.writeFile(root+'/assets/spriteship/spriteship.lock.json',JSON.stringify(lock,null,2));
  console.log('INTEGRATED',slug,Object.keys(groups));
}
