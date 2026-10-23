import fs from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { execFile } from 'node:child_process';
import { call, downloadExport, root, state } from './spriteship.mjs';

const name = process.argv[2];
if (!['infiltrator', 'guard'].includes(name)) throw new Error('Use infiltrator or guard');
const s = await state();
const id = s.characters[name]?.selectedId;
if (!id) throw new Error('No selected SpriteShip character for ' + name);
const command = await call('get_export_command', { target: 'character', entityId: id, engine: 'phaser', size: '256' });
const zip = path.join(root, '.spriteship', name + '.zip');
const directory = path.join(root, '.spriteship', 'exports', 'characters', name);
await downloadExport(command, zip);
await fs.mkdir(directory, { recursive: true });
await promisify(execFile)('unzip', ['-q', '-o', zip, '-d', directory]);
console.log('EXPORTED', name, (await fs.readdir(directory)).join(', '));
