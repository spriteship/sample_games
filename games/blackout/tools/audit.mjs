import fs from 'node:fs/promises';
import path from 'node:path';
import { call, config, root, state } from './spriteship.mjs';

const production = await state();
const credits = await call('get_credits', { includeLedger: true, limit: 500 });
const knownJobs = new Set();
for (const request of Object.values(production.requests)) {
  if (request.response?.jobId) knownJobs.add(request.response.jobId);
  for (const operation of request.response?.operations || []) knownJobs.add(operation.jobId);
  for (const batch of request.response?.batches || []) if (batch.jobId) knownJobs.add(batch.jobId);
}
const ledger = (credits.entries || []).filter(entry => knownJobs.has(entry.jobId));
const charged = -ledger.filter(entry => entry.delta < 0).reduce((sum, entry) => sum + entry.delta, 0);
const refunded = ledger.filter(entry => entry.delta > 0).reduce((sum, entry) => sum + entry.delta, 0);
const spent = charged - refunded;
if (spent > config.budgetCredits) throw new Error('SpriteShip spend exceeded the authorized limit');

const characters = {};
for (const [name, value] of Object.entries(production.characters)) {
  if (!value.selectedId) continue;
  const character = await call('get_character', { characterId: value.selectedId });
  characters[name] = {
    id: value.selectedId,
    animations: Object.keys(character.animations || {}),
    animationDirection: character.animationDirection?.mode || null,
    quality: character.animationQualityGate || null
  };
}
const assets = Object.fromEntries(Object.entries(production.assets).map(([name, value]) => [name, value.ids]));
const audit = {
  projectId: config.projectId,
  projectUrl: config.projectUrl,
  auditedAt: new Date().toISOString(),
  authorization: 'User authorized up to 30,000 SpriteShip credits for this new game.',
  creditCeiling: config.budgetCredits,
  actualChargedCredits: charged,
  actualRefundedCredits: refunded,
  actualNetCredits: spent,
  accounting: 'API-key ledger entries matched to this production run’s SpriteShip job IDs.',
  ledger: ledger.map(({ kind, delta, jobId, createdAt }) => ({ kind, delta, jobId, createdAt })),
  assets,
  characters,
  uiPack: production.uiPack?.id || null
};
await fs.writeFile(path.join(root, '.spriteship', 'production-audit.json'), JSON.stringify(audit, null, 2) + '\n');
await fs.writeFile(path.join(root, 'public', 'assets', 'spriteship', 'spriteship.lock.json'), JSON.stringify({
  projectId: config.projectId, projectUrl: config.projectUrl, assets, characters, uiPack: production.uiPack?.id || null,
  actualNetCredits: spent, creditCeiling: config.budgetCredits, auditedAt: audit.auditedAt
}, null, 2) + '\n');
console.log('BLACKOUT_SPRITESHIP_AUDIT', JSON.stringify({ spent, ceiling: config.budgetCredits, assets: Object.keys(assets).length, characters: Object.keys(characters).length }));
