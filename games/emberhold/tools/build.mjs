import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const options=[process.env.GODOT_BIN,'/Applications/Godot.app/Contents/MacOS/Godot',process.env.HOME+'/Applications/Godot.app/Contents/MacOS/Godot','/tmp/emberhold-engine/Godot.app/Contents/MacOS/Godot','godot'].filter(Boolean);
const godot=options.find(p=>p==='godot'?spawnSync(p,['--version'],{stdio:'ignore'}).status===0:fs.existsSync(p));
if(!godot)throw new Error('Install Godot 4.7.2 and Web export templates, or set GODOT_BIN to its executable.');
function run(args){const r=spawnSync(godot,['--headless','--path',root,...args],{stdio:'inherit',timeout:180000});if(r.error)throw r.error;if(r.status!==0)process.exit(r.status||1);}
run(['--editor','--import']);
if(process.argv.includes('--test'))run(['--','--smoke']);
else{fs.mkdirSync(root+'/dist',{recursive:true});run(['--export-release','Web',root+'/dist/index.html']);}
