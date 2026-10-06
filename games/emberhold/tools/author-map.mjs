import {call,state,save} from './spriteship.mjs';
import fs from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const s=await state();
const mapId='map_1791027542158_krri';
const context=await call('map_authoring_context',{projectId:s.project.id,mapId});
const runtime=JSON.parse(await fs.readFile(root+'/assets/spriteship/runtime.json','utf8'));
const layout=JSON.parse(await fs.readFile('/tmp/emberhold-world-layout.json','utf8'));
const materials=s.assets.ground.ids.map((id,i)=>({materialId:['moss','earth','slate','ash'][i],fillRef:{kind:'material',id}}));
const cells={};
const beacons=layout.beacons.map(b=>b.pos._vector);
for(let y=0;y<28;y++)for(let x=0;x<32;x++){
  const px=x*128+64,py=y*128+64;
  let materialId='moss';
  const road=2048+Math.sin(py/540)*170;
  if(Math.abs(px-road)<130 || Math.hypot(px-2048,py-2656)<290)materialId='earth';
  // Branches to the three ritual sites, keeping abundant open buildable ground.
  if(py>1200&&py<1510&&px>650&&px<3470)materialId='earth';
  if(py>2090&&py<2240&&(px<950||px>3200))materialId='earth';
  if(beacons.some(([bx,by])=>Math.hypot(px-bx,py-by)<210))materialId='slate';
  if(py<600&&Math.hypot(px-2048,py-360)<630)materialId='ash';
  cells[x+','+y]={materialId:'moss',elevation:0};
}
const areas=[];
function area(id,material,bounds,points){
  const [x,y,width,height]=bounds;
  areas.push({id,layerId:'paths',kind:'shape',x,y,width,height,
    shape:{type:points?'path':'ellipse',fill:'#ffffff',stroke:'transparent',strokeWidth:0,...(points?{points:points.map(([px,py])=>({x:px,y:py})),closed:true,curveType:'catmullRom'}:{})},
    collisionBody:{kind:'none'},materialArea:{version:1,projection:'ortho',material:materials[material],repeatSize:512,blendWidthPx:90}});
}
// Canonical authored material regions give the road a soft, irregular edge.
const left=[],right=[];
for(let py=630;py<=3584;py+=140){const center=2048+Math.sin(py/540)*170;const w=105+Math.sin(py/210)*22;left.push([(center-w-1600)/920,(py-600)/2984]);right.unshift([(center+w-1600)/920,(py-600)/2984]);}
area('hearth-road',1,[1600,600,920,2984],[...left,...right]);
area('hearth-clearing',1,[1720,2350,660,660]);
area('westwatch-path',1,[650,1240,1600,280],[[0,.28],[.2,.05],[.5,.22],[.8,.35],[1,.32],[1,.75],[.75,.85],[.45,.58],[.18,.52],[0,.8]]);
area('dawnspire-path',1,[2040,1290,1450,280],[[0,.05],[.3,.3],[.6,.12],[.82,.35],[1,.25],[1,.8],[.8,.85],[.55,.62],[.3,.78],[0,.6]]);
for(let i=0;i<beacons.length;i++){const [bx,by]=beacons[i];area('beacon-dais-'+i,2,[bx-210,by-160,420,330]);}
area('ash-crown',3,[1410,60,1300,700]);
const objects=[];
function add(id,key,pos,size,radius=0,fields={}){
  const a=runtime.sprites[key]; if(!a)throw new Error('Unknown sprite '+key);
  const file=root+'/assets/spriteship/'+a.file;
  const metrics=execFileSync('magick',['identify','-format','%w %h %@',file],{encoding:'utf8'}).trim().split(' ');
  const bounds=metrics[2].match(/(\d+)x(\d+)\+(\d+)\+(\d+)/);
  const vw=Number(bounds[1]),vh=Number(bounds[2]);
  const ratio=Math.min(size[0]/vw,size[1]/vh);
  const width=vw*ratio,height=vh*ratio;
  objects.push({id,name:key,gameplayId:id,kind:'tile',layerId:'world',x:pos[0]-width/2,y:pos[1]-height*.89,width,height,
    assetRef:{kind:'asset',id:a.assetId,itemIndex:a.itemIndex},
    footprint:{kind:'rect',w:Math.max(12,radius*2),h:Math.max(10,radius*1.2),anchorX:width/2,anchorY:height*.89},
    collisionBody:radius?{kind:'circle',cx:width/2,cy:height*.89,r:radius}:{kind:'none'},
    fields:{...fields,art:key,groundX:pos[0],groundY:pos[1]}});
}
const bs={hall:[0,[260,245],85],farm:[5,[190,165],65]};
for(const b of layout.buildings){const spec=bs[b.type];add(b.id,'buildings/'+spec[0],b.pos._vector,spec[1],spec[2],{entityKind:'building',buildingType:b.type,level:1});}
const rs={wood:[145,210],stone:[90,75],gold:[95,85],food:[74,68]};
for(const r of layout.resources)add(r.id,r.art,r.pos._vector,rs[r.type],r.type==='wood'?30:r.type==='food'?18:28,{entityKind:'resource',resourceType:r.type,amount:r.maxamount});
layout.decorations.forEach((d,i)=>add('decoration'+i,d.art,d.pos._vector,d.size._vector,0,{entityKind:'decoration'}));
for(const b of layout.beacons)add(b.id,'landmarks/0',b.pos._vector,[190,220],40,{entityKind:'beacon',lit:false});
for(const c of layout.camps)add(c.id,c.citadel?'landmarks/4':'landmarks/5',c.pos._vector,c.citadel?[390,330]:[195,170],c.citadel?85:48,{entityKind:'camp',citadel:c.citadel,hp:c.maxhp});
const document={version:1,widthPx:4096,heightPx:3584,gridSize:64,projection:'ortho',depthSort:'ground',cameraZoom:1,
  playerSpawn:{x:2118,y:2821},playerDisplaySize:136,playerOcclusion:{enabled:true,opacity:.25,radius:105},
  layers:[{id:'ground',name:'Mosswood Valley',type:'terrain',kind:'materialgrid',objects:[],materialGrid:{version:1,projection:'topdown',cellW:128,cellH:128,materials,cells,chunk:{columns:16,rows:16,halo:2},appearance:{materialScale:2,transitionWidth:.8,elevationShading:0}}},
  {id:'paths',name:'The old beacon roads',type:'terrain',kind:'object',objects:areas},
  {id:'world',name:'Settlement, groves, and beacon routes',type:'objects',kind:'object',objects}]};
console.log('Request size',JSON.stringify(document).length);
const draft=await call('prepare_map_draft',{projectId:s.project.id,mapId,expectedRevision:context.selectedMap.revision,name:'Mosswood Valley — The Last Hearth',document});
await fs.writeFile(root+'/.spriteship/map-draft.json',JSON.stringify(draft,null,2));
await fs.writeFile(root+'/.spriteship/map-authored.json',JSON.stringify(document,null,2));
console.log(JSON.stringify(draft,null,2));
const preview=await call('preview_map_draft',{draftId:draft.id,scale:.4});
await fs.writeFile('/tmp/emberhold-map-preview-response.json',JSON.stringify(preview));
console.log('PREVIEW',JSON.stringify(preview));
