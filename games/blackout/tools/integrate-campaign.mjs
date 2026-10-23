import fs from 'node:fs/promises';
import path from 'node:path';
import { root } from './spriteship.mjs';

const destination = path.join(root, 'public/assets/spriteship');
const manifestPath = path.join(destination, 'runtime.json');
const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
const groups = [['campaign-ground', [0, 1, 2, 3]], ['campaign-ground-b', [0, 1, 2, 3]], ['campaign-ground-c', [0, 2]]];
let level = 1;
for (const [group, indices] of groups) {
  for (const index of indices) {
    const parent = path.join(root, '.spriteship/exports', group, String(index));
    const folders = await fs.readdir(parent);
    const file = (await fs.readdir(path.join(parent, folders[0]))).find(name => name.endsWith('.png'));
    if (!file) throw new Error('Missing SpriteShip floor ' + group + ' ' + index);
    const name = `campaign-floor-${level}.png`;
    await fs.copyFile(path.join(parent, folders[0], file), path.join(destination, name));
    manifest['campaignFloor' + level] = name;
    level++;
  }
}
const artifacts = path.join(root, '.spriteship/exports/campaign-objectives/0/BLACKOUT_campaign_mission_artifacts');
const atlas = JSON.parse(await fs.readFile(path.join(artifacts, 'atlas.json'), 'utf8'));
if (atlas.meta?.extractionStatus !== 'exact' || Object.keys(atlas.textures?.[0]?.frames || {}).length !== 10) throw new Error('SpriteShip did not extract ten objective illustrations');
await fs.copyFile(path.join(artifacts, 'asset.png'), path.join(destination, 'campaign-artifacts.png'));
for (const [index, tile] of [0, 2, 1, 3, 4, 5, 6, 7, 8, 9].entries()) {
  const { x, y, w, h } = atlas.textures[0].frames['tile_' + tile].frame;
  manifest['campaignArtifact' + (index + 1)] = { file: 'campaign-artifacts.png', frame: [x, y, w, h] };
}
await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log('Integrated ten SpriteShip floors and ten mission artifacts');
