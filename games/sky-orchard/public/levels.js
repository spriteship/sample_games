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

// A seeded layout gives each level its own route while keeping every jump in reach.
export function makeLevel(index) {
  const spec=LEVELS[index];
  if(!spec) throw new RangeError('Unknown level '+index);
  let seed=12031+index*7919;
  const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
  const platforms=[{x:0,y:454,w:430,h:170}];
  let edge=430, lastY=454;
  for(let i=1;i<spec.islands;i++){
    const gap=spec.gaps+Math.floor(random()*28)-14;
    const w=(i===spec.islands-1?360:220+Math.floor(random()*125));
    const delta=Math.round((random()*2-1)*spec.rise);
    const y=Math.max(306,Math.min(464,lastY+delta));
    const x=edge+gap;
    platforms.push({x,y,w,h:620-y,moving:i>2&&i<spec.islands-1&&i%Math.max(3,6-spec.moving)===0&&spec.moving>0});
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
      for(let j=0;j<3;j++) coins.push({x:p.x+p.w*(.26+j*.24),y:p.y-54-(j===1?18:0),seed:false});
      if(i%3===1) coins.push({x:p.x+p.w*.5,y:p.y-112,seed:true});
      if(i===Math.floor(platforms.length/2)) checkpoints.push({x:p.x+50,y:p.y});
      if(patrolIslands.has(i)) enemies.push({x:p.x+p.w*.55,y:p.y-20,from:p.x+34,to:p.x+p.w-34});
      if(thorns.length<spec.thorns && i%3===2) thorns.push({x:p.x+p.w*.78,y:p.y});
    }
  }
  // Exactly three sun seeds form the level objective, spread across the route.
  const seeds=coins.filter(c=>c.seed);
  if(seeds.length<3){
    for(const i of [2,Math.floor(platforms.length/2),platforms.length-2]){
      const p=platforms[i];coins.push({x:p.x+p.w*.48,y:p.y-118,seed:true});
    }
  }
  const needed=coins.filter(c=>c.seed).length;
  const finish=platforms.at(-1);
  return {spec,platforms,coins,enemies,thorns,checkpoints,needed,exit:{x:finish.x+finish.w-94,y:finish.y},width:edge,height:620};
}
