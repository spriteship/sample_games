import test from 'node:test';
import assert from 'node:assert/strict';
import {LEVELS,makeLevel} from '../public/levels.js';

test('ten routes have reachable gaps and objectives before the exit',()=>{
  assert.equal(LEVELS.length,10);
  for(let n=0;n<10;n++){
    const level=makeLevel(n);
    assert.ok(level.platforms.length>=9);
    assert.ok(level.needed>=3);
    assert.ok(level.exit.x>level.coins.at(-1).x);
    for(let i=1;i<level.platforms.length;i++){
      const a=level.platforms[i-1],b=level.platforms[i];
      assert.ok(b.x-a.x-a.w<=145,`gap too large on level ${n+1}`);
      assert.ok(Math.abs(b.y-a.y)<=80,`rise too large on level ${n+1}`);
    }
  }
});
