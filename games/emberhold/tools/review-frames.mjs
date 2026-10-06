import fs from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';

const root=path.resolve(import.meta.dirname,'..');
const runtime=JSON.parse(await fs.readFile(root+'/assets/spriteship/runtime.json','utf8'));
const output=process.env.FRAME_REVIEW_DIR||'/tmp/emberhold-frame-review';
await fs.mkdir(output,{recursive:true});
const font=root+'/assets/spriteship/fonts/barlow.ttf';
for(const [slug,character]of Object.entries(runtime.characters)){
  if(process.argv.slice(2).length&&!process.argv.slice(2).includes(slug))continue;
  if(!character.groups)continue;
  const rows=[];
  for(const [animation,resource]of Object.entries(character.groups)){
    const tres=await fs.readFile(root+'/assets/spriteship/'+resource,'utf8');
    const texture=tres.match(/path="res:\/\/([^"]+\.png)"/)[1];
    const regions=[...tres.matchAll(/region = Rect2\(([^)]+)\)/g)].map(m=>m[1].split(',').map(Number));
    assert(regions.length>0,slug+'/'+animation+' has no atlas regions');
    const [width,height]=execFileSync('magick',['identify','-format','%w %h',root+'/'+texture],{encoding:'utf8'}).split(' ').map(Number);
    for(const [x,y,w,h]of regions)assert(x>=0&&y>=0&&x+w<=width&&y+h<=height,'Paired atlas bounds: '+slug+'/'+animation);
    const samples=[];
    for(let i=0;i<6;i++){
      const index=Math.round(i*(regions.length-1)/5);
      const [x,y,w,h]=regions[index];
      const file=output+'/'+slug+'-'+animation+'-'+i+'.png';
      execFileSync('magick',[root+'/'+texture,'-crop',`${w}x${h}+${x}+${y}`,'+repage','-resize','128x128','-background','#253a30','-alpha','remove','-gravity','center','-extent','144x152','-font',font,'-pointsize','12','-fill','#eee2c3','-gravity','south','-annotate','+0+2',animation+' · '+index,file]);
      samples.push(file);
    }
    const row=output+'/'+slug+'-'+animation+'-row.png';
    execFileSync('magick',['montage',...samples,'-font',font,'-background','#253a30','-geometry','144x152+0+0','-tile','6x1',row]);
    rows.push(row);
  }
  const result=output+'/'+slug+'.png';
  execFileSync('magick',[...rows,'-append',result]);
  console.log('FRAME_REVIEW',slug,rows.length,result);
}
