import fs from 'node:fs/promises';
import path from 'node:path';
const root = path.resolve(import.meta.dirname, '..');

const name = process.argv[2];
if (!['infiltrator', 'guard'].includes(name)) throw new Error('Use infiltrator or guard');
const role = name === 'infiltrator' ? 'hero' : 'guard';
const exportRoot = path.join(root, '.spriteship', 'exports', 'characters', name);
const [folder] = await fs.readdir(exportRoot);
if (!folder) throw new Error('Export the SpriteShip character first');
const source = path.join(exportRoot, folder);
const destination = path.join(root, 'public', 'assets', 'spriteship', 'characters', role);
const manifestPath = path.join(root, 'public', 'assets', 'spriteship', 'runtime.json');
const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
await fs.mkdir(destination, { recursive: true });
for (const [direction, facing] of [['Down', 's'], ['Up', 'n'], ['Right', 'e'], ['Left', 'w']]) {
  const slug = direction.toLowerCase();
  const walkPng = `spritesheet_walk_${slug}.png`, walkJson = `atlas_walk_${slug}.json`;
  await fs.copyFile(path.join(source, walkPng), path.join(destination, `walk_${slug}.png`));
  await fs.copyFile(path.join(source, walkJson), path.join(destination, `walk_${slug}.json`));
  await fs.copyFile(path.join(source, 'poses', `pose_facing_${facing}_256.png`), path.join(destination, `idle_${slug}.png`));
  manifest[`${role}Walk${direction}`] = { file: `characters/${role}/walk_${slug}.png`, atlas: `characters/${role}/walk_${slug}.json` };
  manifest[`${role}Idle${direction}`] = `characters/${role}/idle_${slug}.png`;
}
await fs.copyFile(path.join(source, 'LICENSE.txt'), path.join(destination, 'LICENSE.txt'));
await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log('INTEGRATED', role, 'four walk directions and directional still poses');
