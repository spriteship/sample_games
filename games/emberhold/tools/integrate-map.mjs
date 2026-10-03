import fs from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
const root=path.resolve(import.meta.dirname,'..');
const source=root+'/.spriteship/source-exports/map/Main_Map';
const target=root+'/assets/spriteship/map';
await fs.mkdir(target,{recursive:true});
const scene=await fs.readFile(source+'/Main_Map.tscn','utf8');
const refs=new Map([...scene.matchAll(/\[ext_resource type="Texture2D" path="res:\/\/Main_Map\/([^"]+)" id="([^"]+)"\]/g)].map(m=>[m[2],m[1]]));
// Bake only canonical exported ground artwork. All simulation entities stay dynamic.
const base=source+'/'+refs.get('1');
execFileSync('magick',['-size','4096x3584','tile:'+base,target+'/ground.png']);
const section=scene.split('[node name="The_old_beacon_roads"')[1].split('[node name="Settlement__groves__and_beacon_routes"')[0];
const positions=[...section.matchAll(/position = Vector2\(([^,]+), ([^)]+)\)([\s\S]*?)(?=\[node|$)/g)];
for(const [i,m]of positions.entries()){
  const texture=m[3].match(/texture = ExtResource\("(\d+)"\)/)?.[1];
  if(!texture)continue;
  const p=source+'/'+refs.get(texture);
  const [w,h]=execFileSync('magick',['identify','-format','%w %h',p],{encoding:'utf8'}).split(' ').map(Number);
  const scale=m[3].match(/scale = Vector2\(([^,]+), ([^)]+)\)/);
  const width=Math.round(w*(scale?Number(scale[1]):1)),height=Math.round(h*(scale?Number(scale[2]):1));
  const x=Math.round(Number(m[1])-width/2),y=Math.round(Number(m[2])-height/2);
  const args=[target+'/ground.png','(',p,'-resize',width+'x'+height+'!',')','-geometry',`+${x}+${y}`,'-compose','over','-composite',target+'/ground.png'];
  execFileSync('magick',args);console.log('Canonical terrain region',i,texture,width,height,x,y);
}
await fs.copyFile(source+'/LICENSE.txt',target+'/LICENSE.txt');
for(const file of ['terrain-runtime.json','material-areas.json','map-capabilities.json'])await fs.copyFile(source+'/'+file,target+'/'+file);
const authored=JSON.parse(await fs.readFile(root+'/.spriteship/map-authored.json','utf8'));
await fs.writeFile(target+'/map-authored.json',JSON.stringify(authored,null,2));
const placements=authored.layers.find(l=>l.id==='world').objects;
await fs.writeFile(target+'/placements.json',JSON.stringify(placements,null,2));
const runtime=JSON.parse(await fs.readFile(root+'/assets/spriteship/runtime.json','utf8'));
runtime.ground_file='map/ground.png';runtime.map_file='map/placements.json';
await fs.writeFile(root+'/assets/spriteship/runtime.json',JSON.stringify(runtime,null,2));
const lock=JSON.parse(await fs.readFile(root+'/assets/spriteship/spriteship.lock.json','utf8'));
lock.maps['map_1791027542158_krri']={version:2,engine:'godot',files:['map/ground.png','map/placements.json','map/map-authored.json','map/terrain-runtime.json','map/material-areas.json'],integration:'Canonical Godot export ground-only bake; authored identities/geometry retained; dynamic mechanics in game.gd.',syncedAt:new Date().toISOString()};
await fs.writeFile(root+'/assets/spriteship/spriteship.lock.json',JSON.stringify(lock,null,2));
