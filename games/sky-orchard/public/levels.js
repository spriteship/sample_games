export const LEVELS = [
  {name:'First Flight', slug:'orchard', subtitle:'Learn the leap', sky:'#a9e9ff', accent:'#78d64c', islands:9, gaps:76, rise:24, enemies:2, moving:0, thorns:0},
  {name:'Mushroom Mile', slug:'mushroom-mile', surface:'spring', subtitle:'Bounce on the spotted caps', sky:'#ffcfba', accent:'#79d847', islands:10, gaps:88, rise:36, enemies:3, moving:0, thorns:1},
  {name:'Breezy Bridges', slug:'breezy-bridges', wind:95, subtitle:'The wind helps every leap', sky:'#9cddfa', accent:'#80da4e', islands:11, gaps:96, rise:42, enemies:4, moving:1, thorns:1},
  {name:'Honeydrop Heights', slug:'honeydrop-heights', surface:'honey', subtitle:'Sticky landings, careful takeoffs', sky:'#ffd491', accent:'#e3d44e', islands:11, gaps:102, rise:56, enemies:4, moving:1, thorns:2},
  {name:'The Violet Grove', slug:'violet-grove', subtitle:'Bramble gets bolder', sky:'#c7b8ed', accent:'#a2d459', islands:12, gaps:108, rise:62, enemies:5, moving:1, thorns:2},
  {name:'Lantern Ledges', slug:'lantern-ledges', subtitle:'Every landing counts', sky:'#447f94', accent:'#ffc35b', islands:12, gaps:112, rise:66, enemies:6, moving:2, thorns:2},
  {name:'Whispering Canopy', slug:'whispering-canopy', subtitle:'A route through the treetops', sky:'#a0dded', accent:'#69cfa1', islands:13, gaps:116, rise:70, enemies:6, moving:2, thorns:3},
  {name:'Thunderberry Run', slug:'thunderberry-run', wind:-125, subtitle:'Leap against the storm', sky:'#7583af', accent:'#f8b85c', islands:13, gaps:122, rise:73, enemies:7, moving:2, thorns:3},
  {name:'Cloudbreak Crossing', slug:'cloudbreak-crossing', surface:'ice', wind:75, subtitle:'Keep your footing on the frost', sky:'#d6edff', accent:'#d5d76b', islands:14, gaps:124, rise:78, enemies:8, moving:3, thorns:4},
  {name:'The Sun Orchard', slug:'sun-orchard', subtitle:'Bring the light home', sky:'#ffe0a4', accent:'#ffe274', islands:15, gaps:126, rise:80, enemies:9, moving:3, thorns:4},
];

// The route signatures make the terrain play differently, not just wear different art.
// Steps are relative to the previous island; the small seeded wobble keeps edges organic.
const ROUTES = [
  {start:[430,454], widths:[286,306,260,325], steps:[2,-12,18,-8], gapShift:[0,0,0], coinLift:[54,72,54], seedStops:[1,4,7], bridges:[2]},
  {start:[355,465], widths:[218,286,220,318], steps:[-30,-28,18,-34,26], gapShift:[-8,3,0], coinLift:[95,125,95], seedStops:[2,5,8], bridges:[]},
  {start:[395,438], widths:[210,405,198,335], steps:[-4,5,-9,12], gapShift:[-5,8,-6], coinLift:[54,78,104], seedStops:[1,5,9], bridges:[1,4,7], movingAt:[4]},
  {start:[345,456], widths:[390,248,375,220], steps:[-49,32,-42,28], gapShift:[5,-8,7], coinLift:[80,61,86], seedStops:[3,6,9], bridges:[], movingAt:[5]},
  {start:[382,428], widths:[244,214,300,226], steps:[-43,35,-54,47,-30], gapShift:[5,-4,9], coinLift:[55,108,65], seedStops:[2,4,7,10], bridges:[], movingAt:[4]},
  {start:[325,470], widths:[190,215,185,265], steps:[-58,51,-61,52,-45], gapShift:[-4,6,-2], coinLift:[64,100,132], seedStops:[1,4,7,10], bridges:[6], movingAt:[3,8]},
  {start:[485,440], widths:[430,175,345,190], steps:[-23,-42,55,-51,38], gapShift:[-4,5,0], coinLift:[105,74,108], seedStops:[2,5,8,11], bridges:[], movingAt:[4,9]},
  {start:[365,455], widths:[248,365,205,315], steps:[-69,62,-66,58,-47], gapShift:[8,-6,10], coinLift:[63,114,68], seedStops:[1,4,7,11], bridges:[], movingAt:[3,9]},
  {start:[375,476], widths:[235,228,260,205], steps:[-72,-68,-64,46,64], gapShift:[-3,5,8], coinLift:[92,122,148], seedStops:[2,5,8,10,12], bridges:[], movingAt:[3,7,11]},
  {start:[455,448], widths:[305,270,385,225], steps:[-68,52,-72,55,-76], gapShift:[10,-5,7], coinLift:[58,100,140], seedStops:[1,4,7,10,13], bridges:[5], movingAt:[3,8,12]},
];

// A deterministic route keeps every jump stable across retries.
export function makeLevel(index) {
  const spec=LEVELS[index];
  if(!spec) throw new RangeError('Unknown level '+index);
  const route=ROUTES[index];
  let seed=12031+index*7919;
  const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
  const platforms=[{x:0,y:route.start[1],w:route.start[0],h:620-route.start[1]}];
  let edge=route.start[0], lastY=route.start[1];
  for(let i=1;i<spec.islands;i++){
    const gap=Math.max(60,Math.min(144,spec.gaps+route.gapShift[(i-1)%route.gapShift.length]+Math.floor(random()*13)-6));
    const w=i===spec.islands-1?360:route.widths[(i-1)%route.widths.length]+Math.floor(random()*19)-9;
    const delta=Math.max(-spec.rise,Math.min(spec.rise,route.steps[(i-1)%route.steps.length]+Math.floor(random()*9)-4));
    const y=Math.max(300,Math.min(490,lastY+delta));
    const x=edge+gap;
    platforms.push({x,y,w,h:620-y,moving:route.movingAt?.includes(i)||false,bridge:route.bridges.includes(i)});
    edge=x+w;lastY=y;
  }
  const coins=[];
  const enemies=[];
  const thorns=[];
  const checkpoints=[];
  const interior=platforms.length-2;
  const patrolIslands=new Set(Array.from({length:spec.enemies},(_,j)=>1+Math.round(j*(interior-1)/(spec.enemies-1))));
  for(let i=0;i<platforms.length;i++){
    const p=platforms[i];
    if(i>0 && i<platforms.length-1){
      for(let j=0;j<3;j++) coins.push({x:p.x+p.w*(.2+j*.3),y:p.y-route.coinLift[(j+i-1)%3],seed:false});
      if(route.seedStops.includes(i)) coins.push({x:p.x+p.w*.5,y:p.y-119,seed:true});
      if(i===Math.floor(platforms.length/2)) checkpoints.push({x:p.x+50,y:p.y});
      if(patrolIslands.has(i)) enemies.push({x:p.x+p.w*.55,y:p.y-20,from:p.x+34,to:p.x+p.w-34});
      if(thorns.length<spec.thorns && i%3===2) thorns.push({x:p.x+p.w*.78,y:p.y});
    }
  }
  const needed=coins.filter(c=>c.seed).length;
  const finish=platforms.at(-1);
  return {spec,platforms,coins,enemies,thorns,checkpoints,needed,exit:{x:finish.x+finish.w-94,y:finish.y},width:edge,height:620};
}
