import fs from 'node:fs/promises';
import {createReadStream, createWriteStream, existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {Readable, Transform} from 'node:stream';
import {pipeline} from 'node:stream/promises';
import {execFileSync, spawnSync} from 'node:child_process';
import {homedir, tmpdir} from 'node:os';
import path from 'node:path';

const version='4.7.2';
const release=`https://github.com/godotengine/godot-builds/releases/download/${version}-stable/`;
const engineArchive=`Godot_v${version}-stable_linux.x86_64.zip`;
const templateArchive=`Godot_v${version}-stable_export_templates.tpz`;
// SHA-256 digests published by the official Godot release, pinned here.
const digests={
  [engineArchive]:'cadd3204e728a35d3f13adb7fd0d7902636b79f6b95c40c265eb73b6c35329e4',
  [templateArchive]:'f298490b8d44d934be425a5a65a51bf15f422428b229a06a6e11d9ffea248011',
};

async function digest(file){
  const hash=createHash('sha256');
  for await(const chunk of createReadStream(file))hash.update(chunk);
  return hash.digest('hex');
}

async function download(name, directory){
  const file=path.join(directory,name);
  if(existsSync(file)&&await digest(file)===digests[name])return file;
  console.log('Downloading official Godot artifact:',name);
  const response=await fetch(release+name,{signal:AbortSignal.timeout(600000)});
  if(!response.ok||!response.body)throw new Error(`Godot download HTTP ${response.status}: ${name}`);
  const partial=file+'.partial';
  const hash=createHash('sha256');
  const hashStream=new Transform({transform(chunk,encoding,done){hash.update(chunk);done(null,chunk);}});
  await pipeline(Readable.fromWeb(response.body),hashStream,createWriteStream(partial));
  if(hash.digest('hex')!==digests[name])throw new Error('Godot artifact checksum mismatch: '+name);
  await fs.rename(partial,file);
  return file;
}

export async function ensureGodot({templates=false}={}){
  const candidates=[process.env.GODOT_BIN,'/Applications/Godot.app/Contents/MacOS/Godot',path.join(homedir(),'Applications/Godot.app/Contents/MacOS/Godot'),'godot'].filter(Boolean);
  let binary=candidates.find(candidate=>candidate==='godot'?spawnSync(candidate,['--version'],{stdio:'ignore'}).status===0:existsSync(candidate));
  const automatic=Boolean(process.env.CI)&&process.platform==='linux'&&process.arch==='x64';
  if(!binary&&!automatic)throw new Error('Install Godot 4.7.2 and matching Web export templates, or set GODOT_BIN. Automatic setup is limited to Linux x64 CI.');
  const directory=path.join(process.env.RUNNER_TEMP||tmpdir(),'emberhold-godot-'+version);
  if(!binary){
    await fs.mkdir(directory,{recursive:true});
    binary=path.join(directory,`Godot_v${version}-stable_linux.x86_64`);
    if(!existsSync(binary))execFileSync('unzip',['-q','-o',await download(engineArchive,directory),'-d',directory]);
    await fs.chmod(binary,0o755);
  }
  const actual=execFileSync(binary,['--version'],{encoding:'utf8'}).trim();
  if(!actual.startsWith(version+'.stable'))throw new Error(`Expected Godot ${version}.stable; found ${actual}`);
  if(templates&&automatic){
    const target=path.join(process.env.XDG_DATA_HOME||path.join(homedir(),'.local/share'),'godot/export_templates',version+'.stable');
    if(!existsSync(path.join(target,'web_nothreads_release.zip'))){
      await fs.mkdir(directory,{recursive:true});
      const archive=await download(templateArchive,directory);
      const extraction=await fs.mkdtemp(path.join(directory,'templates-'));
      // Only install the version marker and our single-threaded Web templates.
      execFileSync('unzip',['-q',archive,'templates/version.txt','templates/web_nothreads_release.zip','templates/web_nothreads_debug.zip','-d',extraction]);
      await fs.mkdir(target,{recursive:true});
      for(const name of ['version.txt','web_nothreads_release.zip','web_nothreads_debug.zip'])await fs.copyFile(path.join(extraction,'templates',name),path.join(target,name));
    }
  }
  console.log('Godot build engine:',actual);
  return binary;
}
