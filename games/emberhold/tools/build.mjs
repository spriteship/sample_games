import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {ensureGodot} from './setup-godot.mjs';
const root=path.resolve(import.meta.dirname,'..');
const godot=await ensureGodot({templates:!process.argv.includes('--test')});
function run(args){const r=spawnSync(godot,['--headless','--path',root,...args],{stdio:'inherit',timeout:180000});if(r.error)throw r.error;if(r.status!==0)process.exit(r.status||1);}
run(['--editor','--import']);
if(process.argv.includes('--test'))run(['--','--smoke']);
else{fs.mkdirSync(root+'/dist',{recursive:true});run(['--export-release','Web',root+'/dist/index.html']);}
