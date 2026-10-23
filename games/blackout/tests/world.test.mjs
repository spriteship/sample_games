import test from 'node:test';
import assert from 'node:assert/strict';
import { WIDTH, HEIGHT, start, core, exit, covers, obstacles, moveCircle, circleOverlapsRect, distanceToRect, hasLineOfSight, sees, rayDistance } from '../public/world.js';

test('the player cannot cross solid cover or facility walls', () => {
  const blocked = moveCircle({ x: 465, y: 180 }, 60, 0, 17);
  assert.equal(blocked.x, 465);
  const throughDoor = moveCircle({ x: 465, y: 365 }, 60, 0, 17);
  assert(Math.abs(throughDoor.x - 525) < .001);
});

test('walls and cover block security line of sight', () => {
  assert.equal(hasLineOfSight({ x: 400, y: 180 }, { x: 600, y: 180 }), false);
  assert.equal(hasLineOfSight({ x: 400, y: 365 }, { x: 600, y: 365 }), true);
  assert.equal(sees({ x: 400, y: 365, angle: 0 }, { x: 600, y: 365 }, 220, .5), true);
  assert(rayDistance({ x: 400, y: 180 }, 0, 220) < 90, 'the guard cone must stop at the wall');
});

test('supply caches can be reached from beside their solid cover', () => {
  const box = { x: 230, y: 462, w: 82, h: 63 };
  assert.equal(distanceToRect({ x: 213, y: 493 }, box), 17);
  assert.equal(distanceToRect({ x: 400, y: 493 }, box), 88);
});

test('start, core and exit are navigably connected', () => {
  const cell = 20, cols = Math.ceil(WIDTH / cell), rows = Math.ceil(HEIGHT / cell);
  const blocked = (x, y) => obstacles.some(rect => circleOverlapsRect(x * cell + cell / 2, y * cell + cell / 2, 17, rect));
  const from = [Math.floor(start.x / cell), Math.floor(start.y / cell)];
  const to = [Math.floor(core.x / cell), Math.floor(core.y / cell)];
  const queue = [from], visited = new Set([from.join(',')]);
  for (let index = 0; index < queue.length; index++) {
    const [x, y] = queue[index];
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy, key = `${nx},${ny}`;
      if (nx < 0 || ny < 0 || nx >= cols || ny >= rows || visited.has(key) || blocked(nx, ny)) continue;
      visited.add(key); queue.push([nx, ny]);
    }
  }
  assert(visited.has(to.join(',')), 'the core must be reachable');
  assert(visited.has([Math.floor(exit.x / cell), Math.floor(exit.y / cell)].join(',')), 'the exit must be reachable');
  for (const cover of covers.filter(box => ['crate', 'stack'].includes(box.art))) {
    assert(queue.some(([x, y]) => distanceToRect({ x: x * cell + cell / 2, y: y * cell + cell / 2 }, cover) < 45), 'each supply cache must be reachable from its side');
  }
});
