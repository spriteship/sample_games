import {cp,rm,mkdir} from 'node:fs/promises';
const source=new URL('../public/',import.meta.url), output=new URL('../dist/',import.meta.url);
await rm(output,{recursive:true,force:true});
await mkdir(output,{recursive:true});
await cp(source,output,{recursive:true});
console.log('Built Sky Orchard into games/sky-orchard/dist/');
