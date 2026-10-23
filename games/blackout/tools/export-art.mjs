import fs from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { execFile } from 'node:child_process';
import { call, downloadExport, root, state } from './spriteship.mjs';

const exec = promisify(execFile);
const s = await state();
const names = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(s.assets);
for (const name of names) {
  const ids = s.assets[name]?.ids;
  if (!ids?.length) throw new Error('No SpriteShip asset for ' + name);
  for (let index = 0; index < ids.length; index++) {
    const zip = path.join(root, '.spriteship', `${name}-${index}.zip`);
    const directory = path.join(root, '.spriteship', 'exports', name, String(index));
    if ((await fs.readdir(directory).catch(() => [])).length) { console.log('EXISTS', name, index); continue; }
    const command = await call('get_export_command', { target: 'asset', entityId: ids[index], engine: 'phaser', ...(['facility', 'mission', 'weapons', 'campaign-objectives'].includes(name) ? { size: '256' } : {}) });
    await downloadExport(command, zip);
    await fs.mkdir(directory, { recursive: true });
    await exec('unzip', ['-q', '-o', zip, '-d', directory]);
    console.log('EXPORTED', name, index, (await fs.readdir(directory)).join(', '));
  }
}
