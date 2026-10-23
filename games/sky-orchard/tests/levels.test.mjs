import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {LEVELS,makeLevel} from '../public/levels.js';

test('ten routes have reachable gaps and objectives before the exit',()=>{
  assert.equal(LEVELS.length,10);
  for(let n=0;n<10;n++){
    const level=makeLevel(n);
    assert.ok(level.platforms.length>=9);
    assert.equal(level.enemies.length,LEVELS[n].enemies);
    assert.equal(level.platforms.filter(platform=>platform.moving).length,LEVELS[n].moving);
    assert.ok(level.needed>=3);
    assert.ok(level.exit.x>level.coins.at(-1).x);
    for(let i=1;i<level.platforms.length;i++){
      const a=level.platforms[i-1],b=level.platforms[i];
      assert.ok(b.x-a.x-a.w<=145,`gap too large on level ${n+1}`);
      assert.ok(Math.abs(b.y-a.y)<=80,`rise too large on level ${n+1}`);
    }
  }
});

test('each level has its own scenery and terrain while the challenge grows',()=>{
  assert.equal(new Set(LEVELS.map(spec=>spec.slug)).size,10);
  const openings=LEVELS.map((_,n)=>makeLevel(n).platforms.slice(0,4).map(p=>`${p.w}:${p.y}`).join('|'));
  assert.equal(new Set(openings).size,10,'the first stretch of every world needs its own silhouette');
  for(let n=1;n<LEVELS.length;n++){
    const spec=LEVELS[n];
    assert.ok(spec.gaps>=LEVELS[n-1].gaps,`gap progression at level ${n+1}`);
    assert.ok(spec.rise>=LEVELS[n-1].rise,`height progression at level ${n+1}`);
    for(const asset of [`${spec.slug}-sky.png`,...['large','medium','small'].map(size=>`${spec.slug}-${size}.png`)]){
      assert.ok(existsSync(new URL(`../public/assets/worlds/${asset}`,import.meta.url)),`missing art for level ${n+1}: ${asset}`);
    }
    if(n>1)assert.ok(existsSync(new URL(`../public/assets/worlds/${spec.slug}-landmark.png`,import.meta.url)),`missing landmark for level ${n+1}`);
  }
});
