import fs from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {call} from '../../emberhold/tools/spriteship.mjs';

if(!process.argv.includes('--execute')) throw new Error('Pass --execute to spend SpriteShip credits within the 20,000-credit game budget.');
const root=path.resolve(import.meta.dirname,'..');
const ledgerPath=path.join(root,'.spriteship-ledger.json');
const projectId='proj_1792746064854_ufby';
const themes=[
  ['mushroom-mile','Mushroom Mile','peach and rose morning sky, giant distant spotted mushroom forests, warm mint mist','emerald moss and coral mushroom-topped brown earth, pale spotted caps and tiny fern details'],
  ['breezy-bridges','Breezy Bridges','turquoise coastal sky, sweeping wind wisps, far-off white limestone spires and little clouds','pale chalk limestone cliffs capped with short spring-green grass, windblown tufts and tiny blue flowers'],
  ['honeydrop-heights','Honeydrop Heights','glowing amber late-afternoon sky, distant honey-colored cliffs and warm drifting clouds','golden honeycomb sandstone islands with caramel soil and saffron grass, tiny clover blooms'],
  ['violet-grove','Violet Grove','lavender twilight sky, distant violet tree crowns and amethyst hills, soft mauve cloud bands','violet crystal-veined earth islands with plum moss and mint-green leaf tops, tiny glowing lilac flowers'],
  ['lantern-ledges','Lantern Ledges','deep teal blue evening sky, distant lantern-lit treetops and turquoise firefly haze','dark blue slate islands with teal moss and embedded amber lantern stones, hanging roots'],
  ['whispering-canopy','Whispering Canopy','jade and sea-glass canopy horizon, huge distant floating tree silhouettes and sunbeams through leaves','weathered timber and earth floating islands bound with twisting roots, jade moss and dangling vines'],
  ['thunderberry-run','Thunderberry Run','dramatic storm blue sky, distant violet thunderclouds, soft electric highlights on mountain silhouettes','charcoal slate cliff islands with deep blue grass and electric purple thornberry blooms, cracked rock faces'],
  ['cloudbreak-crossing','Cloudbreak Crossing','high-altitude pearl sky, vast white cloud sea, pale icy blue distant mountains and floating snowy peaks','pale cloudstone islands with white frost grass, icy blue rock layers and delicate snow blossoms'],
  ['sun-orchard','The Sun Orchard','radiant golden dawn, distant blooming orchard silhouettes, honey-yellow sunrays and peach cloud sea','warm terracotta and golden soil islands topped with luminous spring grass, small white orchard blossoms'],
];

const requests=themes.flatMap(([slug,title,backdrop,terrain])=>[
  [`world-${slug}-sky`,{
    projectId,assetType:'background',bgType:'distant_backdrop',name:`${title} Backdrop`,slug:`${slug}-sky`,
    prompt:`Wide 16:9 side-scrolling platform game backdrop in the same polished, vibrant painted storybook style as a cheerful floating-island adventure: ${backdrop}. Expansive readable open center with atmospheric depth. Pure distant scenery only. No foreground islands, traversable platforms, characters, words, logos, UI, or grid. Fully opaque edge-to-edge panorama.`
  }],
  [`world-${slug}-terrain`,{
    projectId,assetType:'terrain',targetTileSize:256,name:`${title} Floating Terrain`,slug:`${slug}-terrain`,
    prompt:`Coordinated collection of six separate transparent side-view floating platformer island cutouts in the same polished illustrated storybook style as a bright fox adventure. Theme: ${terrain}. Include a wide flat-top floating island, medium island, small island, narrow ledge, tall cliff, and decorative fragment. Every playable island has a clear flat top and visible hanging underside. Distinct isolated transparent pieces, no backdrop, no characters, no text, no UI.`
  }]
]);

let ledger=JSON.parse(await fs.readFile(ledgerPath,'utf8'));
for(const [label,args] of requests){
  if(ledger.jobs[label]?.submitted){console.log('SKIP',label);continue;}
  const quote=await call('create_asset',{...args,dryRun:true});
  const cost=quote.estimatedCredits??quote.totalCredits??quote.cost?.credits??quote.quote?.totalCredits;
  if(!Number.isFinite(cost)||ledger.reserved+cost>ledger.limit)throw new Error(`Budget check failed for ${label}: ${cost}`);
  const accepted={...args,dryRun:false,idempotencyKey:randomUUID()};
  if(quote.planToken)accepted.planToken=quote.planToken;
  ledger.reserved+=cost;
  ledger.jobs[label]={name:'create_asset',cost,args:accepted,submitted:false};
  await fs.writeFile(ledgerPath,JSON.stringify(ledger,null,2));
  const result=await call('create_asset',accepted);
  ledger.jobs[label].submitted=true;
  ledger.jobs[label].result=result;
  await fs.writeFile(ledgerPath,JSON.stringify(ledger,null,2));
  console.log('SUBMITTED',label,cost,result.jobId);
}
