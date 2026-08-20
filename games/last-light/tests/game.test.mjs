import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";

async function pngSize(url) {
  const png = await readFile(url);
  return { width: png.readUInt32BE(16), height: png.readUInt32BE(20) };
}

test("game shell includes required playable surfaces", async () => {
  const html = await readFile(new URL("../public/index.html", import.meta.url), "utf8");
  for (const id of ["game", "startButton", "hud", "colliderButton", "upgradeChoices", "result"]) {
    assert.match(html, new RegExp(`id=["']${id}["']`));
  }
});

test("game implementation contains the vertical-slice systems", async () => {
  const game = await readFile(new URL("../public/game.js", import.meta.url), "utf8");
  for (const system of ["spawnEnemies", "openUpgrade", "createLamp", "spawnBoss", "writeSave"]) {
    assert.match(game, new RegExp(system));
  }
  assert.match(game, /const WORLD = 1800 \* 20/);
  assert.match(game, /const DESKTOP_MODE = window\.matchMedia/);
  assert.match(game, /DESKTOP_MODE \? 1280 : 432/);
  assert.match(game, /DESKTOP_MODE \? 720 : 768/);
});

test("SpriteShip player atlas is wired into movement", async () => {
  const game = await readFile(new URL("../public/game.js", import.meta.url), "utf8");
  const atlas = JSON.parse(await readFile(new URL("../public/assets/spriteship/player/atlas_walk_256.json", import.meta.url), "utf8"));
  const idleAtlas = JSON.parse(await readFile(new URL("../public/assets/spriteship/player/atlas_idle_2_256.json", import.meta.url), "utf8"));
  const collisionBodies = JSON.parse(await readFile(new URL("../public/assets/spriteship/player/collision-bodies.json", import.meta.url), "utf8"));
  const sheet = await stat(new URL("../public/assets/spriteship/player/spritesheet_walk_256.png", import.meta.url));
  const idleSheet = await stat(new URL("../public/assets/spriteship/player/spritesheet_idle_2_256.png", import.meta.url));

  assert.match(game, /load\.atlas\(PLAYER_ATLAS/);
  assert.match(game, /load\.atlas\(PLAYER_IDLE_ATLAS/);
  assert.match(game, /this\.player\.play\(PLAYER_ANIMATION, true\)/);
  assert.match(game, /this\.player\.play\(PLAYER_IDLE_ANIMATION, true\)/);
  assert.match(game, /spritesheet_idle_2_256\.png/);
  assert.match(game, /const PLAYER_WALK_FPS = 60/);
  assert.match(game, /playerCollisionDefinitions\[animationName\]/);
  assert.match(game, /playerCollisionHitsCircle/);
  assert.doesNotMatch(game, /SPRITESHIP HITBOX/);
  assert.doesNotMatch(game, /drawPlayerCollisionDebug/);
  assert.match(game, /resolution: Math\.min\(window\.devicePixelRatio \|\| 1, 2\)/);
  assert.match(game, /setFilter\(Phaser\.Textures\.FilterMode\.LINEAR\)/);
  assert.match(game, /spritesheet_walk_256\.png/);
  assert.match(game, /const PLAYER_SCALE = DESKTOP_MODE \? \.4 : \.31/);
  assert.doesNotMatch(game, /distance < enemy\.radius \+ 15/);
  assert.equal(atlas.animations.walk.frames.length, 26);
  assert.ok(Object.values(atlas.frames).every((frame) => frame.trimmed === false));
  assert.deepEqual(atlas.frames.walk_0000.spriteSourceSize, { x: 0, y: 0, w: 256, h: 256 });
  assert.deepEqual(atlas.frames.walk_0000.sourceSize, { w: 256, h: 256 });
  assert.deepEqual(atlas.meta.size, { w: 3870, h: 516 });
  assert.equal(idleAtlas.animations.idle_2.frames.length, 60);
  assert.equal(idleAtlas.animations.idle_2.fps, 30);
  assert.ok(Object.values(idleAtlas.frames).every((frame) => frame.sourceSize.w === 256 && frame.sourceSize.h === 256));
  assert.equal(collisionBodies.idle_2.kind, "rect");
  assert.ok(sheet.size > 0);
  assert.ok(idleSheet.size > 0);
});

test("all four SpriteShip enemies are used by the game", async () => {
  const game = await readFile(new URL("../public/game.js", import.meta.url), "utf8");

  for (let index = 1; index <= 4; index += 1) {
    assert.match(game, new RegExp(`enemy-bio-${index}`));
    const enemy = await stat(new URL(`../public/assets/spriteship/enemies/runtime/enemy-${index}.png`, import.meta.url));
    assert.ok(enemy.size > 0);
  }
  assert.match(game, /type = "charged"/);
});

test("the large SpriteShip humanoid uses its walk and edited attack", async () => {
  const game = await readFile(new URL("../public/game.js", import.meta.url), "utf8");
  const walkAtlas = JSON.parse(await readFile(new URL("../public/assets/spriteship/humanoid-enemy-2/runtime-walk-256.json", import.meta.url), "utf8"));
  const attackAtlas = JSON.parse(await readFile(new URL("../public/assets/spriteship/humanoid-enemy-2/runtime-attack-256.json", import.meta.url), "utf8"));
  const collisionBodies = JSON.parse(await readFile(new URL("../public/assets/spriteship/humanoid-enemy-2/collision-bodies.json", import.meta.url), "utf8"));

  assert.match(game, /type = "humanoid"/);
  assert.match(game, /this\.nextHumanoidSpawnAt = 5/);
  assert.match(game, /this\.nextHumanoidSpawnAt \+= 15/);
  assert.match(game, /this\.spawnEnemy\("humanoid"\)/);
  assert.match(game, /const HUMANOID_HEALTH_MULTIPLIER = 7/);
  assert.match(game, /hp \*= HUMANOID_HEALTH_MULTIPLIER/);
  assert.match(game, /setDisplaySize\(256, 256\)/);
  assert.match(game, /HUMANOID_WALK_ANIMATION/);
  assert.match(game, /HUMANOID_ATTACK_ANIMATION/);
  assert.doesNotMatch(game, /drawHumanoidCollisionDebug|humanoidCollisionDebug/);
  assert.match(game, /toggleColliderDebug/);
  assert.match(game, /drawColliderBody\(this\.getPlayerCollisionBody\(\), 0x66f5dc\)/);
  assert.match(game, /drawColliderBody\(this\.getHumanoidCollisionBody\(enemy\)/);
  assert.match(game, /const HUMANOID_ASSET_VERSION = "c6b8b610028d"/);
  assert.match(game, /playerCollisionHitsHumanoid/);
  assert.match(game, /getHumanoidCollisionBody\(enemy\)/);
  assert.match(game, /humanoidCanStrikePlayer/);
  assert.match(game, /enemy\.sprite\.setPosition\(previousX, previousY\)/);
  assert.match(game, /this\.startHumanoidAttack\(enemy, time\)/);
  assert.doesNotMatch(game, /distance < enemy\.radius \+ 34/);
  assert.equal(walkAtlas.animations.walk.frames.length, 28);
  assert.equal(attackAtlas.animations.attack.frames.length, 42);
  assert.deepEqual(collisionBodies.walk, { kind: "rect", cx: 0.501953125, cy: 0.55859375, hw: 0.1796875, hh: 0.1796875 });
  assert.deepEqual(collisionBodies.attack, { kind: "rect", cx: 0.5009765625, cy: 0.513671875, hw: 0.2138671875, hh: 0.134765625 });
  assert.ok(Object.values(walkAtlas.frames).every((frame) => frame.sourceSize.w === 256 && frame.sourceSize.h === 256));
  assert.ok(Object.values(attackAtlas.frames).every((frame) => frame.sourceSize.w === 256 && frame.sourceSize.h === 256));
});

test("all sixteen SpriteShip weapons are wired into combat", async () => {
  const game = await readFile(new URL("../public/game.js", import.meta.url), "utf8");

  assert.match(game, /RANGED_WEAPON_KEYS = WEAPON_KEYS/);
  assert.doesNotMatch(game, /ORBITAL_WEAPON_KEYS/);
  assert.doesNotMatch(game, /updateOrbitals/);
  assert.doesNotMatch(game, /orbitals: 2/);
  assert.match(game, /this\.enemies\.length >= 62/);
  assert.match(game, /const WEAPON_SIZE = 32/);
  assert.match(game, /weapons\/runtime-32/);
  assert.match(game, /spin: spinDirection \* Phaser\.Math\.FloatBetween\(6\.5, 9\)/);
  assert.match(game, /bullet\.sprite\.rotation \+= bullet\.spin \* dt/);
  for (let index = 1; index <= 16; index += 1) {
    const weaponUrl = new URL(`../public/assets/spriteship/weapons/runtime-32/weapon-${index}.png`, import.meta.url);
    const weapon = await stat(weaponUrl);
    assert.ok(weapon.size > 0);
    assert.deepEqual(await pngSize(weaponUrl), { width: 32, height: 32 });
  }
});

test("all sixteen SpriteShip collectibles are wired into drops", async () => {
  const game = await readFile(new URL("../public/game.js", import.meta.url), "utf8");

  assert.match(game, /COLLECTIBLE_KEYS/);
  assert.match(game, /applyCollectible/);
  assert.match(game, /const COLLECTIBLE_SIZE = 64/);
  assert.match(game, /setDisplaySize\(COLLECTIBLE_SIZE, COLLECTIBLE_SIZE\)/);
  assert.match(game, /collectibles\/runtime-64/);
  assert.match(game, /COLLECTIBLE_GLOW_COLORS/);
  for (let index = 1; index <= 16; index += 1) {
    const collectibleUrl = new URL(`../public/assets/spriteship/collectibles/runtime-64/collectible-${index}.png`, import.meta.url);
    const collectible = await stat(collectibleUrl);
    assert.ok(collectible.size > 0);
    assert.deepEqual(await pngSize(collectibleUrl), { width: 64, height: 64 });
  }
});
