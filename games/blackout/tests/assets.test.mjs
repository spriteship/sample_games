import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const base = new URL('../public/assets/spriteship/', import.meta.url);
const manifest = JSON.parse(await fs.readFile(new URL('runtime.json', base), 'utf8'));

test('every SpriteShip runtime role points to a valid image region', async () => {
  for (const [role, entry] of Object.entries(manifest)) {
    const file = typeof entry === 'string' ? entry : entry.file;
    const png = await fs.readFile(new URL(file, base));
    assert.equal(png.subarray(1, 4).toString(), 'PNG', `${role} must be a PNG`);
    const width = png.readUInt32BE(16), height = png.readUInt32BE(20);
    assert(width > 0 && height > 0, `${role} has valid dimensions`);
    const regions = entry.frame ? [entry.frame] : entry.atlas ? Object.values(JSON.parse(await fs.readFile(new URL(entry.atlas, base), 'utf8')).frames).map(value => value.frame) : [];
    for (const region of regions) {
      const [x, y, w, h] = Array.isArray(region) ? region : [region.x, region.y, region.w, region.h];
      assert(w > 0 && h > 0 && x >= 0 && y >= 0 && x + w <= width && y + h <= height, `${role} frame stays inside its PNG`);
    }
  }
});
