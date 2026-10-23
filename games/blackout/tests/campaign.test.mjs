import test from 'node:test';
import assert from 'node:assert/strict';
import { LEVELS } from '../public/levels.js';
import { WIDTH, HEIGHT, circleOverlapsRect, distanceToRect } from '../public/world.js';

test('the eleven campaign operations have distinct art, places and rising security', () => {
  assert.equal(LEVELS.length, 11);
  assert.equal(new Set(LEVELS.map(level => level.name)).size, 11);
  assert.equal(new Set(LEVELS.map(level => level.place)).size, 11);
  assert.equal(new Set(LEVELS.map(level => level.floorRole)).size, 11);
  assert.equal(new Set(LEVELS.map(level => level.artifactRole)).size, 11);
  assert(LEVELS.at(-1).guardPaths.length > LEVELS[0].guardPaths.length);
  assert(LEVELS.at(-1).cameras.length > LEVELS[0].cameras.length);
  assert(LEVELS.at(-1).escapeTime < LEVELS[0].escapeTime);
});

test('every objective, exit, terminal and pistol cache can be reached', () => {
  const cell = 20, columns = WIDTH / cell, rows = HEIGHT / cell;
  for (const level of LEVELS) {
    const blocked = (x, y) => level.obstacles.some(rect => circleOverlapsRect(x * cell + 10, y * cell + 10, 17, rect));
    const from = [Math.floor(level.start.x / cell), Math.floor(level.start.y / cell)];
    const queue = [from], seen = new Set([from.join(',')]);
    for (let index = 0; index < queue.length; index++) {
      const [x, y] = queue[index];
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nextX = x + dx, nextY = y + dy, key = `${nextX},${nextY}`;
        if (nextX < 0 || nextY < 0 || nextX >= columns || nextY >= rows || seen.has(key) || blocked(nextX, nextY)) continue;
        seen.add(key); queue.push([nextX, nextY]);
      }
    }
    for (const [name, point] of Object.entries({ objective: level.core, exit: level.exit, terminal: level.terminal })) {
      assert(seen.has(`${Math.floor(point.x / cell)},${Math.floor(point.y / cell)}`), `${level.name}: ${name} is accessible`);
    }
    for (const box of level.covers.filter(cover => ['crate', 'stack'].includes(cover.art))) {
      assert(queue.some(([x, y]) => distanceToRect({ x: x * cell + 10, y: y * cell + 10 }, box) < 45), `${level.name}: supply cache is accessible`);
    }
  }
});
