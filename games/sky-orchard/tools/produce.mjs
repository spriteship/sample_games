import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { call } from '../../emberhold/tools/spriteship.mjs';
if(!process.argv.includes('--execute'))throw new Error('Pass --execute to authorize SpriteShip generation under the 20,000-credit ledger.');

const projectId = 'proj_1792746064854_ufby';
const root = path.resolve(import.meta.dirname, '..');
const ledgerPath = path.join(root, '.spriteship-ledger.json');
let ledger = JSON.parse(await fs.readFile(ledgerPath, 'utf8').catch(() => '{"limit":20000,"reserved":0,"jobs":{}}'));
async function save() { await fs.writeFile(ledgerPath, JSON.stringify(ledger, null, 2)); }

const requests = [
  ['sky', 'create_asset', {projectId, assetType:'background', bgType:'distant_backdrop', name:'Orchard Sky', slug:'orchard-sky', prompt:'Wide luminous blue daytime sky with soft white puffy clouds, distant hazy turquoise hills and hints of floating meadow silhouettes far away. Open uncluttered center for side-scrolling gameplay; no foreground platforms, characters, words, or UI.'}],
  ['terrain', 'create_asset', {projectId, assetType:'terrain', name:'Floating Island Kit', slug:'floating-island-kit', targetTileSize:256, prompt:'A coordinated side-view collection of twelve separate floating earth islands and grassy platform segments: wide flat grassy island, medium island, small island, narrow ledge, sloped grassy island, deep soil cliff edge, grass-topped dirt wall, bridge landing, flower patch, round mushroom, wooden crate, and tiny glowing sapling. Each has richly layered dark brown soil with scattered light pebbles, lush chartreuse grass edges, playful hand-painted platform-game finish. Separate transparent pieces; no characters or text.'}],
  ['props', 'create_asset', {projectId, assetType:'tileset', name:'Orchard Props', slug:'orchard-props', targetTileSize:256, prompt:'Exactly eight separate side-view platformer props in one coordinated collection: golden collectible sun coin, red spotted mushroom, purple mushroom, wooden ladder segment, short rope bridge section, wooden directional sign without lettering, star-shaped glowing checkpoint lantern, and floating golden exit portal with leafy arch. Cheerful polished illustrated game art, transparent cutouts, no scenery or text.'}],
  ['pip', 'create_character', {projectId, prompt:'Pip, a small brave cinnamon-orange fox courier with oversized ears, cream muzzle, teal scarf, tiny brown satchel and bright expressive eyes. Full body side view facing right, standing on feet, readable silhouette and friendly determined personality. No weapon, no lettering.'}],
  ['bramble', 'create_character', {projectId, prompt:'Bramble, a mischievous round purple thornberry creature with leafy tuft, tiny feet, two expressive eyes, soft spikes, and a grumpy but cute expression. Full body side view facing right, standing on feet, readable silhouette. No lettering.'}],
  ['mallow', 'create_character', {projectId, prompt:'Mallow, a tiny floating cream-white cloud owl with pale blue wing tips, sleepy golden eyes, and a small leaf charm. Full body side view facing right, readable silhouette. No lettering.'}],
];

for (const [label, name, args] of requests) {
  if (ledger.jobs[label]) continue;
  const quote = await call(name, {...args, dryRun:true});
  const cost = quote.estimatedCredits ?? quote.totalCredits ?? quote.cost?.credits ?? quote.quote?.totalCredits;
  if (!Number.isFinite(cost) || ledger.reserved + cost > ledger.limit) throw Error(`Budget check failed for ${label}: ${cost}`);
  console.log('PLAN', label, cost, JSON.stringify(quote.plan?.preview || quote.plan || '').slice(0, 1200));
  const accepted = {...args, dryRun:false, idempotencyKey:randomUUID()};
  if (quote.planToken) accepted.planToken = quote.planToken;
  if (quote.animationPipelineAssignmentToken) accepted.animationPipelineAssignmentToken = quote.animationPipelineAssignmentToken;
  ledger.reserved += cost;
  ledger.jobs[label] = {name, cost, args:accepted, submitted:false};
  await save();
  const result = await call(name, accepted);
  ledger.jobs[label].submitted = true;
  ledger.jobs[label].result = result;
  await save();
  console.log('JOB', label, JSON.stringify(result));
}
