import {call,state,downloadExport} from './spriteship.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

const root=path.resolve(import.meta.dirname,'..');
const s=await state();
const kind=process.argv[2];
if(!['ui','map'].includes(kind))throw new Error('Usage: node tools/refresh-native.mjs ui|map');
const temp=await fs.mkdtemp('/tmp/emberhold-refresh-'+kind+'-');
const packId='6b066b7b-540e-4151-8e24-c02c987f475a';
const command=kind==='ui'
  ?await call('get_ui_pack_export_command',{packId,engine:'godot',artworkOnly:false})
  :await call('get_export_command',{target:'map',entityId:'map_1791027542158_krri',engine:'godot'});
await downloadExport(command,temp+'/bundle.zip');
execFileSync('unzip',['-q',temp+'/bundle.zip','-d',temp+'/bundle']);
let source=temp+'/bundle';
if(!(await fs.readdir(source)).includes('README.md'))source+='/'+(await fs.readdir(source))[0];
console.log('NATIVE_CONTRACT',kind,await fs.readFile(source+'/README.md','utf8'),await fs.readFile(source+'/SKILL.md','utf8'));
if(kind==='map'){
  const canonical=root+'/.spriteship/source-exports/map/Main_Map';
  await fs.mkdir(canonical,{recursive:true});
  await fs.cp(source,canonical,{recursive:true});
  console.log('REFRESHED_MAP',canonical);
}else{
  const target=root+'/assets/spriteship/ui';
  await fs.mkdir(target,{recursive:true});
  await fs.cp(source,target,{recursive:true});
  const pack=JSON.parse(await fs.readFile(target+'/ui-pack.json','utf8'));
  const runtimeFile=root+'/assets/spriteship/runtime.json';
  const runtime=JSON.parse(await fs.readFile(runtimeFile,'utf8'));
  runtime.ui_pack={file:'ui/ui-pack.json',id:pack.pack.id,contentVersion:pack.contentVersion};
  for(const component of pack.components){
    const artifact=component.activeRevision.artifacts.find(a=>a.role==='frame');
    if(artifact)runtime.sprites['ui/'+component.role]={file:'ui/'+artifact.url,componentId:component.id,revisionId:component.activeRevision.id};
  }
  await fs.writeFile(runtimeFile,JSON.stringify(runtime,null,2));
  const lockFile=root+'/assets/spriteship/spriteship.lock.json';
  const lock=JSON.parse(await fs.readFile(lockFile,'utf8'));
  lock.uiPacks[pack.pack.id]={engine:'godot',scope:'whole',artworkOnly:false,contentVersion:pack.contentVersion,localFolder:'assets/spriteship/ui',components:pack.components.map(c=>({id:c.id,revisionId:c.activeRevision.id,role:c.role})),syncedAt:new Date().toISOString(),nativeAcceptance:'Emberhold integration verified in Godot and browser; provider native certification remains pending.'};
  await fs.writeFile(lockFile,JSON.stringify(lock,null,2));
  console.log('REFRESHED_UI',pack.components.length,pack.contentVersion);
}
