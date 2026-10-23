import fs from 'node:fs/promises';
import path from 'node:path';
const root = path.resolve(import.meta.dirname, '..');

const source = path.join(root, '.spriteship/exports/weapons/0/BLACKOUT_six_collectible_pistols');
const atlas = JSON.parse(await fs.readFile(path.join(source, 'atlas.json'), 'utf8'));
if (atlas.meta?.extractionStatus !== 'exact' || Object.keys(atlas.textures?.[0]?.frames || {}).length !== 6) {
  throw new Error('SpriteShip did not extract exactly six pistol icons');
}
const names = ['pistolService', 'pistolGhost', 'pistolViper', 'pistolBreach', 'pistolArc', 'pistolTwinshot'];
const destination = path.join(root, 'public/assets/spriteship');
await fs.copyFile(path.join(source, 'asset.png'), path.join(destination, 'weapons.png'));
const manifestPath = path.join(destination, 'runtime.json');
const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
for (const [index, name] of names.entries()) {
  const { x, y, w, h } = atlas.textures[0].frames['tile_' + index].frame;
  manifest[name] = { file: 'weapons.png', frame: [x, y, w, h] };
}
await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log('Integrated six exact SpriteShip pistol cutouts');
