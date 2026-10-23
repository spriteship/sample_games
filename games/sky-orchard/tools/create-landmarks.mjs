import fs from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {call} from '../../emberhold/tools/spriteship.mjs';

if(!process.argv.includes('--execute'))throw new Error('Pass --execute to use the authorized SpriteShip budget.');
const root=path.resolve(import.meta.dirname,'..');
const ledgerPath=path.join(root,'.spriteship-ledger.json');
const projectId='proj_1792746064854_ufby';
const themes=[
  ['breezy-bridges','six painted silk wind pennants on elegant slim wooden poles, turquoise and ivory sails curling in a sea breeze'],
  ['honeydrop-heights','six honeycomb saplings with warm golden wax, amber honey drips, small golden leaves and tiny cream blossoms'],
  ['violet-grove','six amethyst crystal clusters rising from plum moss, faceted lavender spires with soft mint-green shoots'],
  ['lantern-ledges','six ornate amber lantern posts with warm glowing glass, teal-black iron and tiny hanging tassels'],
  ['whispering-canopy','six small leafy canopy trees with twisting roots, layered jade foliage and sunlit sea-green leaves'],
  ['thunderberry-run','six jagged stormstone lightning markers with slate rock bases, violet berry brambles and pale electric sparks'],
  ['cloudbreak-crossing','six tall frost crystal clusters with pale blue ice shards, little snow mounds and icy glints'],
  ['sun-orchard','six blooming orchard saplings with warm brown trunks, pink blossom crowns and cream flower centers'],
];

const ledger=JSON.parse(await fs.readFile(ledgerPath,'utf8'));
for(const [slug,subject] of themes){
  const label=`landmark-${slug}`;
  if(ledger.jobs[label]?.submitted){console.log('SKIP',label);continue;}
  const args={projectId,assetType:'tileset',name:`${slug} landmarks`,slug:`${slug}-landmarks`,targetTileSize:256,
    prompt:`A coordinated collection of exactly ${subject}. Each one is a distinct isolated full object, side view, sitting on a flat baseline, with a clean transparent background. Match a high-quality hand-painted storybook platform game with floating islands. Rich detail and soft light, readable at 80 pixels tall. No landscape, island, ground slab, character, lettering, UI, frame, or grid.`};
  const quote=await call('create_asset',{...args,dryRun:true});
  const cost=quote.estimatedCredits??quote.totalCredits??quote.cost?.credits??quote.quote?.totalCredits;
  if(!Number.isFinite(cost)||ledger.reserved+cost>ledger.limit)throw new Error(`Budget exceeded for ${label}: ${cost}`);
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
