import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { covers } from '../public/world.js';
import { PISTOLS, CACHE_WEAPONS } from '../public/weapons.js';

test('every supply cache offers a different usable pistol', () => {
  const caches = covers.map((cover, index) => ({ cover, index })).filter(({ cover }) => ['crate', 'stack'].includes(cover.art));
  assert.equal(caches.length, Object.keys(CACHE_WEAPONS).length);
  assert.equal(new Set(Object.values(CACHE_WEAPONS)).size, caches.length);
  for (const { index } of caches) {
    const pistol = PISTOLS[CACHE_WEAPONS[index]];
    assert(pistol, 'cache ' + index + ' has a pistol');
    assert(pistol.magazine > 0 && pistol.interval > 0 && pistol.damage > 0);
  }
});

test('each pistol has a SpriteShip pickup illustration', async () => {
  const manifest = JSON.parse(await fs.readFile(new URL('../public/assets/spriteship/runtime.json', import.meta.url), 'utf8'));
  for (const pistol of Object.values(PISTOLS)) assert(manifest[pistol.art], pistol.name + ' art is mapped');
});
