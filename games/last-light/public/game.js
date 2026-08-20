const Phaser = window.Phaser;

const DESKTOP_MODE = window.matchMedia("(min-width: 900px) and (min-aspect-ratio: 4 / 3)").matches;
const WIDTH = DESKTOP_MODE ? 1280 : 432;
const HEIGHT = DESKTOP_MODE ? 720 : 768;
const WORLD = 1800 * 20;
const RUN_SECONDS = 90;
const BOSS_AT = 60;
const PLAYER_ATLAS = "spriteship-player-walk";
const PLAYER_ANIMATION = "spriteship-player-walk-cycle";
const PLAYER_FIRST_FRAME = "walk_0000";
const PLAYER_IDLE_ATLAS = "spriteship-player-idle-2";
const PLAYER_IDLE_ANIMATION = "spriteship-player-idle-2-cycle";
const PLAYER_IDLE_FIRST_FRAME = "idle_2_0000";
const PLAYER_WALK_FPS = 60;
const PLAYER_SCALE = DESKTOP_MODE ? .4 : .31;
const ATTRACT_PLAYER_SCALE = DESKTOP_MODE ? .64 : .525;
const COLLECTIBLE_SIZE = 64;
const COLLECTIBLE_GLOW_SIZE = 40;
const WEAPON_SIZE = 32;
const ENEMY_SIZE_SCALE = DESKTOP_MODE ? 1.18 : 1;
const HUMANOID_WALK_ATLAS = "humanoid-enemy-walk";
const HUMANOID_ATTACK_ATLAS = "humanoid-enemy-attack";
const HUMANOID_WALK_ANIMATION = "humanoid-enemy-walk-cycle";
const HUMANOID_ATTACK_ANIMATION = "humanoid-enemy-attack-cycle";
const HUMANOID_HEALTH_MULTIPLIER = 7;
const WEAPON_KEYS = Array.from({ length: 16 }, (_, index) => `weapon-${index + 1}`);
const COLLECTIBLE_KEYS = Array.from({ length: 16 }, (_, index) => `collectible-${index + 1}`);
const RANGED_WEAPON_KEYS = WEAPON_KEYS;
const COLLECTIBLE_GLOW_COLORS = [0x66f5dc, 0xefff55, 0xff6d84];
document.documentElement.classList.toggle("desktop-mode", DESKTOP_MODE);
const dom = Object.fromEntries([
  "hud", "menu", "upgrade", "pause", "result", "toast", "timer", "healthFill",
  "healthText", "xpFill", "level", "kills", "runScrap", "objective", "objectiveText",
  "objectiveFill", "bestScore", "totalScrap", "upgradeChoices", "buildSummary",
  "resultKicker", "resultTitle", "resultCopy", "resultTime", "resultKills", "resultLevel",
  "resultScrap", "startButton", "pauseButton", "resumeButton", "quitButton", "retryButton", "homeButton"
].map((id) => [id, document.getElementById(id)]));

const save = readSave();
refreshMeta();

function readSave() {
  try {
    return { scrap: 0, bestKills: 0, clears: 0, ...JSON.parse(localStorage.getItem("last-light-save") || "{}") };
  } catch {
    return { scrap: 0, bestKills: 0, clears: 0 };
  }
}

function writeSave() {
  localStorage.setItem("last-light-save", JSON.stringify(save));
  refreshMeta();
}

function refreshMeta() {
  dom.bestScore.textContent = `${save.bestKills} kills`;
  dom.totalScrap.textContent = save.scrap;
}

function show(element) { element.classList.remove("is-hidden"); }
function hide(element) { element.classList.add("is-hidden"); }

class BootScene extends Phaser.Scene {
  constructor() { super("boot"); }
  preload() {
    const assetPath = "assets/spriteship/player";
    this.load.atlas(PLAYER_ATLAS, `${assetPath}/spritesheet_walk_256.png`, `${assetPath}/atlas_walk_256.json`);
    this.load.json(`${PLAYER_ATLAS}-data`, `${assetPath}/atlas_walk_256.json`);
    this.load.atlas(PLAYER_IDLE_ATLAS, `${assetPath}/spritesheet_idle_2_256.png`, `${assetPath}/atlas_idle_2_256.json`);
    this.load.json(`${PLAYER_IDLE_ATLAS}-data`, `${assetPath}/atlas_idle_2_256.json`);
    this.load.json(`${PLAYER_ATLAS}-collisions`, `${assetPath}/collision-bodies.json`);
    const humanoidPath = "assets/spriteship/humanoid-enemy-2";
    this.load.atlas(HUMANOID_WALK_ATLAS, `${humanoidPath}/runtime-walk-256.png`, `${humanoidPath}/runtime-walk-256.json`);
    this.load.atlas(HUMANOID_ATTACK_ATLAS, `${humanoidPath}/runtime-attack-256.png`, `${humanoidPath}/runtime-attack-256.json`);
    this.load.json(`${HUMANOID_WALK_ATLAS}-data`, `${humanoidPath}/runtime-walk-256.json`);
    this.load.json(`${HUMANOID_ATTACK_ATLAS}-data`, `${humanoidPath}/runtime-attack-256.json`);
    this.load.json("humanoid-collision-bodies", `${humanoidPath}/collision-bodies.json`);
    for (let index = 1; index <= 4; index += 1) {
      this.load.image(`enemy-bio-${index}`, `assets/spriteship/enemies/runtime/enemy-${index}.png`);
    }
    for (const weaponKey of WEAPON_KEYS) {
      this.load.image(weaponKey, `assets/spriteship/weapons/runtime-32/${weaponKey}.png`);
    }
    for (const collectibleKey of COLLECTIBLE_KEYS) {
      this.load.image(collectibleKey, `assets/spriteship/collectibles/runtime-64/${collectibleKey}.png`);
    }
  }
  create() {
    makeTextures(this);
    this.textures.get(PLAYER_ATLAS).setFilter(Phaser.Textures.FilterMode.LINEAR);
    this.textures.get(PLAYER_IDLE_ATLAS).setFilter(Phaser.Textures.FilterMode.LINEAR);
    for (const weaponKey of WEAPON_KEYS) this.textures.get(weaponKey).setFilter(Phaser.Textures.FilterMode.LINEAR);
    for (const collectibleKey of COLLECTIBLE_KEYS) this.textures.get(collectibleKey).setFilter(Phaser.Textures.FilterMode.LINEAR);
    for (let index = 1; index <= 4; index += 1) this.textures.get(`enemy-bio-${index}`).setFilter(Phaser.Textures.FilterMode.LINEAR);
    this.textures.get(HUMANOID_WALK_ATLAS).setFilter(Phaser.Textures.FilterMode.LINEAR);
    this.textures.get(HUMANOID_ATTACK_ATLAS).setFilter(Phaser.Textures.FilterMode.LINEAR);
    registerPlayerAnimations(this);
    registerHumanoidAnimations(this);
    this.scene.start("attract");
  }
}

class AttractScene extends Phaser.Scene {
  constructor() { super("attract"); }
  create() {
    this.cameras.main.setBackgroundColor("#060912");
    const g = this.add.graphics();
    drawWorld(g, WIDTH, HEIGHT, true);
    const enemyKeys = ["enemy-bio-1", "enemy-bio-2", "enemy-bio-3", "enemy-bio-4"];
    for (let i = 0; i < 24; i += 1) {
      const x = Phaser.Math.Between(20, WIDTH - 20);
      const y = Phaser.Math.Between(30, HEIGHT - 30);
      const dot = this.add.image(x, y, enemyKeys[i % enemyKeys.length])
        .setDisplaySize((i % 4 === 2 ? 54 : 42) * ENEMY_SIZE_SCALE, (i % 4 === 2 ? 54 : 42) * ENEMY_SIZE_SCALE)
        .setAlpha(Phaser.Math.FloatBetween(.12, .3));
      this.tweens.add({ targets: dot, y: y + Phaser.Math.Between(-35, 35), x: x + Phaser.Math.Between(-25, 25), duration: Phaser.Math.Between(2200, 4600), yoyo: true, repeat: -1, ease: "Sine.inOut" });
    }
    this.add.sprite(WIDTH / 2, DESKTOP_MODE ? HEIGHT * .42 : 205, PLAYER_IDLE_ATLAS, PLAYER_IDLE_FIRST_FRAME)
      .setScale(ATTRACT_PLAYER_SCALE)
      .setAlpha(.88)
      .play(PLAYER_IDLE_ANIMATION);
  }
}

class GameScene extends Phaser.Scene {
  constructor() { super("gameScene"); }

  create() {
    this.cameras.main.setBackgroundColor("#070a12");
    this.physics.world.setBounds(0, 0, WORLD, WORLD);
    this.cameras.main.setBounds(0, 0, WORLD, WORLD);
    this.drawMap();

    this.player = this.add.sprite(WORLD / 2, WORLD / 2, PLAYER_IDLE_ATLAS, PLAYER_IDLE_FIRST_FRAME)
      .setScale(PLAYER_SCALE)
      .setDepth(10)
      .play(PLAYER_IDLE_ANIMATION);
    this.playerCollisionDefinitions = this.cache.json.get(`${PLAYER_ATLAS}-collisions`);
    this.humanoidCollisionDefinitions = this.cache.json.get("humanoid-collision-bodies");
    this.humanoidCollisionDebug = this.add.graphics().setDepth(60);
    this.cameras.main.startFollow(this.player, true, .09, .09);
    this.cameras.main.setDeadzone(DESKTOP_MODE ? 230 : 80, DESKTOP_MODE ? 130 : 140);

    this.state = {
      hp: 120, maxHp: 120, level: 1, xp: 0, xpNeed: 7, kills: 0, scrap: 0,
      moveSpeed: 225, damage: 22, fireRate: 520, projectileSpeed: 520, projectiles: 1,
      pickupRadius: 54, field: 0, elapsed: 0, ended: false,
    };
    this.upgradeLevels = {};
    this.enemies = [];
    this.bullets = [];
    this.enemyBullets = [];
    this.drops = [];
    this.lastShot = 0;
    this.lastSpawn = 0;
    this.nextHumanoidSpawnAt = 5;
    this.lastField = 0;
    this.lastBossShot = 0;
    this.weaponCycle = 0;
    this.collectibleCycle = 0;
    this.boss = null;
    this.damageGrace = 0;
    this.pointerVector = new Phaser.Math.Vector2();
    this.pointerDown = false;
    this.stickOrigin = new Phaser.Math.Vector2();

    this.joystick = this.add.graphics().setScrollFactor(0).setDepth(100).setVisible(false);
    this.input.on("pointerdown", (p) => this.beginPointer(p));
    this.input.on("pointermove", (p) => this.movePointer(p));
    this.input.on("pointerup", () => this.endPointer());
    this.input.on("pointerupoutside", () => this.endPointer());
    this.keys = this.input.keyboard.addKeys("W,A,S,D,UP,DOWN,LEFT,RIGHT");

    this.createLamp();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.cleanup());
    updateHud(this.state);
    hide(dom.menu); hide(dom.result); hide(dom.upgrade); hide(dom.pause); show(dom.hud);
    toast("SURVIVE THE BLACKOUT");
  }

  drawMap() {
    const g = this.add.graphics();
    g.fillStyle(0x070a12).fillRect(0, 0, WORLD, WORLD);
    drawWorld(g, WORLD, WORLD, false);
    for (let i = 0; i < 320; i += 1) {
      const x = Phaser.Math.Between(90, WORLD - 90);
      const y = Phaser.Math.Between(90, WORLD - 90);
      g.fillStyle(0x101827, .9).fillRect(x, y, Phaser.Math.Between(45, 110), Phaser.Math.Between(28, 70));
      g.lineStyle(1, 0x253148, .7).strokeRect(x, y, 54, 38);
    }
  }

  createLamp() {
    const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
    this.lamp = {
      x: WORLD / 2 + Math.cos(angle) * 260,
      y: WORLD / 2 + Math.sin(angle) * 260,
      charge: 0,
      active: false,
    };
    this.lamp.glow = this.add.circle(this.lamp.x, this.lamp.y, 86, 0xefff55, .04).setDepth(1);
    this.lamp.ring = this.add.circle(this.lamp.x, this.lamp.y, 65, 0xefff55, 0).setStrokeStyle(2, 0xefff55, .32).setDepth(2);
    this.lamp.sprite = this.add.image(this.lamp.x, this.lamp.y, "lamp").setDepth(3);
    this.tweens.add({ targets: this.lamp.ring, scale: 1.12, alpha: .25, duration: 900, yoyo: true, repeat: -1 });
  }

  beginPointer(pointer) {
    if (this.state.ended || !this.scene.isActive()) return;
    this.pointerDown = true;
    this.stickOrigin.set(pointer.x, pointer.y);
    this.pointerVector.set(0, 0);
    this.drawStick(pointer.x, pointer.y, 0, 0);
  }

  movePointer(pointer) {
    if (!this.pointerDown) return;
    const dx = pointer.x - this.stickOrigin.x;
    const dy = pointer.y - this.stickOrigin.y;
    const len = Math.hypot(dx, dy);
    const limit = 46;
    const scale = len > limit ? limit / len : 1;
    this.pointerVector.set(dx * scale / limit, dy * scale / limit);
    this.drawStick(this.stickOrigin.x, this.stickOrigin.y, dx * scale, dy * scale);
  }

  drawStick(x, y, dx, dy) {
    this.joystick.clear().setVisible(true);
    this.joystick.fillStyle(0x080b13, .62).fillCircle(x, y, 48);
    this.joystick.lineStyle(2, 0xefff55, .35).strokeCircle(x, y, 48);
    this.joystick.fillStyle(0xefff55, .7).fillCircle(x + dx, y + dy, 18);
  }

  endPointer() {
    this.pointerDown = false;
    this.pointerVector.set(0, 0);
    this.joystick.setVisible(false);
  }

  update(time, deltaMs) {
    if (this.state.ended) return;
    const dt = Math.min(deltaMs, 40) / 1000;
    this.state.elapsed += dt;
    this.damageGrace = Math.max(0, this.damageGrace - dt);
    this.movePlayer(dt);
    this.updateLamp(dt);
    this.spawnEnemies(time);
    this.updateEnemies(dt, time);
    this.fire(time);
    this.updateBullets(dt);
    this.updateEnemyBullets(dt);
    this.updateField(time);
    this.updateDrops(dt);
    if (!this.boss && this.state.elapsed >= BOSS_AT) this.spawnBoss();
    if (this.state.elapsed >= RUN_SECONDS && this.boss) this.enrageBoss();
    updateHud(this.state);
  }

  movePlayer(dt) {
    let x = this.pointerVector.x;
    let y = this.pointerVector.y;
    if (this.keys.A.isDown || this.keys.LEFT.isDown) x -= 1;
    if (this.keys.D.isDown || this.keys.RIGHT.isDown) x += 1;
    if (this.keys.W.isDown || this.keys.UP.isDown) y -= 1;
    if (this.keys.S.isDown || this.keys.DOWN.isDown) y += 1;
    const length = Math.hypot(x, y);
    if (length > 1) { x /= length; y /= length; }
    this.player.x = Phaser.Math.Clamp(this.player.x + x * this.state.moveSpeed * dt, 28, WORLD - 28);
    this.player.y = Phaser.Math.Clamp(this.player.y + y * this.state.moveSpeed * dt, 28, WORLD - 28);
    if (x || y) {
      this.player.play(PLAYER_ANIMATION, true);
      this.player.rotation = Phaser.Math.Angle.RotateTo(this.player.rotation, Math.atan2(y, x) + Math.PI / 2, .14);
    } else if (this.player.anims?.currentAnim?.key !== PLAYER_IDLE_ANIMATION) {
      this.player.play(PLAYER_IDLE_ANIMATION, true);
    }
  }

  getPlayerCollisionBody() {
    const animationName = this.player.anims?.currentAnim?.key === PLAYER_IDLE_ANIMATION ? "idle_2" : "walk";
    const definition = this.playerCollisionDefinitions[animationName];
    const width = 256;
    const height = 256;
    const scaleX = Math.abs(this.player.scaleX);
    const scaleY = Math.abs(this.player.scaleY);
    const localCenterX = (definition.cx - this.player.originX) * width * scaleX;
    const localCenterY = (definition.cy - this.player.originY) * height * scaleY;
    const cos = Math.cos(this.player.rotation);
    const sin = Math.sin(this.player.rotation);

    return {
      x: this.player.x + localCenterX * cos - localCenterY * sin,
      y: this.player.y + localCenterX * sin + localCenterY * cos,
      halfWidth: definition.hw * width * scaleX,
      halfHeight: definition.hh * height * scaleY,
      rotation: this.player.rotation + (definition.rot || 0),
    };
  }

  playerCollisionHitsCircle(x, y, radius) {
    return this.circleHitsOrientedRect(x, y, radius, this.getPlayerCollisionBody());
  }

  circleHitsOrientedRect(x, y, radius, body) {
    const dx = x - body.x;
    const dy = y - body.y;
    const cos = Math.cos(body.rotation);
    const sin = Math.sin(body.rotation);
    const localX = dx * cos + dy * sin;
    const localY = -dx * sin + dy * cos;
    const closestX = Phaser.Math.Clamp(localX, -body.halfWidth, body.halfWidth);
    const closestY = Phaser.Math.Clamp(localY, -body.halfHeight, body.halfHeight);

    return (localX - closestX) ** 2 + (localY - closestY) ** 2 <= radius ** 2;
  }

  getHumanoidCollisionBody(enemy) {
    const definition = this.humanoidCollisionDefinitions[enemy.isAttacking ? "attack" : "walk"];
    const width = enemy.sprite.displayWidth;
    const height = enemy.sprite.displayHeight;
    const localCenterX = (definition.cx - enemy.sprite.originX) * width;
    const localCenterY = (definition.cy - enemy.sprite.originY) * height;
    const cos = Math.cos(enemy.sprite.rotation);
    const sin = Math.sin(enemy.sprite.rotation);

    return {
      x: enemy.sprite.x + localCenterX * cos - localCenterY * sin,
      y: enemy.sprite.y + localCenterX * sin + localCenterY * cos,
      halfWidth: definition.hw * width,
      halfHeight: definition.hh * height,
      rotation: enemy.sprite.rotation + (definition.rot || 0),
    };
  }

  orientedRectCorners(body) {
    const cos = Math.cos(body.rotation);
    const sin = Math.sin(body.rotation);
    return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sy]) => {
      const x = sx * body.halfWidth;
      const y = sy * body.halfHeight;
      return { x: body.x + x * cos - y * sin, y: body.y + x * sin + y * cos };
    });
  }

  orientedRectsOverlap(first, second) {
    const firstCorners = this.orientedRectCorners(first);
    const secondCorners = this.orientedRectCorners(second);
    const axes = [first.rotation, first.rotation + Math.PI / 2, second.rotation, second.rotation + Math.PI / 2];
    return axes.every((angle) => {
      const axisX = Math.cos(angle);
      const axisY = Math.sin(angle);
      const firstProjection = firstCorners.map((point) => point.x * axisX + point.y * axisY);
      const secondProjection = secondCorners.map((point) => point.x * axisX + point.y * axisY);
      return Math.max(...firstProjection) >= Math.min(...secondProjection)
        && Math.max(...secondProjection) >= Math.min(...firstProjection);
    });
  }

  playerCollisionHitsHumanoid(enemy) {
    return this.orientedRectsOverlap(this.getPlayerCollisionBody(), this.getHumanoidCollisionBody(enemy));
  }

  drawHumanoidCollisionDebug() {
    this.humanoidCollisionDebug.clear();
    this.humanoidCollisionDebug.lineStyle(3, 0xefff55, .95);
    this.humanoidCollisionDebug.fillStyle(0xff4f71, 1);
    for (const enemy of this.enemies) {
      if (enemy.type !== "humanoid" || !enemy.sprite.active) continue;
      const body = this.getHumanoidCollisionBody(enemy);
      const corners = this.orientedRectCorners(body);
      this.humanoidCollisionDebug.beginPath();
      this.humanoidCollisionDebug.moveTo(corners[0].x, corners[0].y);
      for (let index = 1; index < corners.length; index += 1) {
        this.humanoidCollisionDebug.lineTo(corners[index].x, corners[index].y);
      }
      this.humanoidCollisionDebug.closePath().strokePath();
      this.humanoidCollisionDebug.fillCircle(body.x, body.y, 3);
    }
  }

  updateLamp(dt) {
    if (this.lamp.active) return;
    const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.lamp.x, this.lamp.y);
    if (distance < 78) {
      this.lamp.charge = Math.min(1, this.lamp.charge + dt / 3);
      dom.objectiveText.textContent = "Hold position — charging light";
      dom.objectiveFill.style.width = `${this.lamp.charge * 100}%`;
      this.lamp.ring.setStrokeStyle(3, 0xefff55, .6 + this.lamp.charge * .4);
      if (this.lamp.charge >= 1) this.activateLamp();
    } else if (this.lamp.charge > 0) {
      this.lamp.charge = Math.max(0, this.lamp.charge - dt * .12);
      dom.objectiveText.textContent = "Return to the lamp";
      dom.objectiveFill.style.width = `${this.lamp.charge * 100}%`;
    }
  }

  activateLamp() {
    this.lamp.active = true;
    this.lamp.sprite.setTexture("lampOn");
    this.lamp.glow.setFillStyle(0xefff55, .16).setRadius(130);
    this.lamp.ring.setStrokeStyle(2, 0xefff55, .9);
    dom.objectiveText.textContent = "Street lamp restored — bonus scrap secured";
    dom.objectiveFill.style.width = "100%";
    this.state.scrap += 12;
    this.heal(28);
    toast("LIGHT RESTORED  +12 SCRAP");
    this.cameras.main.flash(220, 239, 255, 85, false);
    this.time.delayedCall(3500, () => hide(dom.objective));
  }

  spawnEnemies(time) {
    if (this.state.elapsed >= this.nextHumanoidSpawnAt) {
      this.spawnEnemy("humanoid");
      this.nextHumanoidSpawnAt += 15;
    }
    if (this.enemies.length >= 62) return;
    const cadence = Math.max(285, 720 - this.state.elapsed * 3.2);
    if (time - this.lastSpawn < cadence) return;
    this.lastSpawn = time;
    const amount = this.state.elapsed > 72 ? 2 : 1;
    for (let i = 0; i < amount; i += 1) this.spawnEnemy();
  }

  spawnEnemy(forcedType = null) {
    const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
    const distance = Phaser.Math.Between(DESKTOP_MODE ? 700 : 390, DESKTOP_MODE ? 880 : 520);
    const x = Phaser.Math.Clamp(this.player.x + Math.cos(angle) * distance, 20, WORLD - 20);
    const y = Phaser.Math.Clamp(this.player.y + Math.sin(angle) * distance, 20, WORLD - 20);
    const roll = Math.random();
    let type = "basic", hp = 34 + this.state.elapsed * .34, speed = 58 + this.state.elapsed * .18;
    let texture = "enemy-bio-1", damage = 10, radius = 17, displaySize = 44;
    if (forcedType === "humanoid") {
      type = "humanoid"; hp *= HUMANOID_HEALTH_MULTIPLIER; speed *= .72; texture = HUMANOID_WALK_ATLAS; damage = 20; radius = 72; displaySize = 256;
    } else if (this.state.elapsed > 18 && roll < .22) {
      type = "fast"; hp *= .58; speed *= 1.9; texture = "enemy-bio-2"; damage = 8; radius = 13; displaySize = 38;
    } else if (this.state.elapsed > 28 && roll < .42) {
      type = "charged"; hp *= 1.35; speed *= 1.22; texture = "enemy-bio-4"; damage = 13; radius = 19; displaySize = 50;
    } else if (this.state.elapsed > 36 && roll > .86) {
      type = "tank"; hp *= 2.8; speed *= .63; texture = "enemy-bio-3"; damage = 18; radius = 25; displaySize = 64;
    }
    if (type !== "humanoid") {
      displaySize *= ENEMY_SIZE_SCALE;
      radius *= ENEMY_SIZE_SCALE;
    }
    const sprite = type === "humanoid"
      ? this.add.sprite(x, y, texture, "walk_0000").setDisplaySize(256, 256).setDepth(6).play(HUMANOID_WALK_ANIMATION)
      : this.add.image(x, y, texture).setDisplaySize(displaySize, displaySize).setDepth(6);
    const enemy = { sprite, type, hp, maxHp: hp, speed, damage, radius, hitAt: 0, attackReady: 0, isAttacking: false, isBoss: false };
    if (type === "humanoid") {
      sprite.on(Phaser.Animations.Events.ANIMATION_COMPLETE, (animation) => {
        if (animation.key === HUMANOID_ATTACK_ANIMATION && sprite.active) {
          enemy.isAttacking = false;
          sprite.play(HUMANOID_WALK_ANIMATION);
        }
      });
    }
    this.enemies.push(enemy);
  }

  updateEnemies(dt, time) {
    for (let i = this.enemies.length - 1; i >= 0; i -= 1) {
      const enemy = this.enemies[i];
      const dx = this.player.x - enemy.sprite.x;
      const dy = this.player.y - enemy.sprite.y;
      const distance = Math.max(1, Math.hypot(dx, dy));
      if (enemy.type === "humanoid" && distance < enemy.radius + 34 && time >= enemy.attackReady && !enemy.isAttacking) {
        enemy.attackReady = time + 1700;
        enemy.isAttacking = true;
        enemy.sprite.play(HUMANOID_ATTACK_ANIMATION, true);
        this.time.delayedCall(480, () => {
          if (enemy.sprite.active && enemy.isAttacking && this.enemies.includes(enemy) && this.damageGrace <= 0
            && this.playerCollisionHitsHumanoid(enemy)) this.damagePlayer(enemy.damage);
        });
      }
      const humanoidAttacking = enemy.type === "humanoid" && enemy.isAttacking;
      const speed = enemy.speed
        * (this.lamp.active && Phaser.Math.Distance.Between(enemy.sprite.x, enemy.sprite.y, this.lamp.x, this.lamp.y) < 130 ? .62 : 1)
        * (humanoidAttacking ? 0 : 1);
      enemy.sprite.x += dx / distance * speed * dt;
      enemy.sprite.y += dy / distance * speed * dt;
      if (enemy.isBoss) enemy.sprite.rotation += dt * .8;
      else enemy.sprite.rotation = Phaser.Math.Angle.RotateTo(enemy.sprite.rotation, Math.atan2(dy, dx) - Math.PI / 2, enemy.type === "fast" ? .2 : .12);
      if (enemy.type !== "humanoid" && this.playerCollisionHitsCircle(enemy.sprite.x, enemy.sprite.y, enemy.radius) && this.damageGrace <= 0) {
        this.damagePlayer(enemy.damage);
      }
      if (enemy.isBoss && time - this.lastBossShot > (enemy.enraged ? 820 : 1550)) {
        this.lastBossShot = time;
        this.bossVolley(enemy);
      }
    }
    this.drawHumanoidCollisionDebug();
  }

  fire(time) {
    if (time - this.lastShot < this.state.fireRate) return;
    const target = this.nearestEnemy();
    if (!target) return;
    this.lastShot = time;
    const base = Math.atan2(target.sprite.y - this.player.y, target.sprite.x - this.player.x);
    const count = this.state.projectiles;
    const weaponKey = RANGED_WEAPON_KEYS[this.weaponCycle % RANGED_WEAPON_KEYS.length];
    this.weaponCycle += 1;
    for (let i = 0; i < count; i += 1) {
      const offset = (i - (count - 1) / 2) * .14;
      const angle = base + offset;
      const sprite = this.add.image(this.player.x, this.player.y, weaponKey)
        .setDisplaySize(WEAPON_SIZE, WEAPON_SIZE)
        .setRotation(angle + Math.PI / 2)
        .setDepth(8);
      const spinDirection = (this.weaponCycle + i) % 2 === 0 ? 1 : -1;
      this.bullets.push({
        sprite,
        vx: Math.cos(angle) * this.state.projectileSpeed,
        vy: Math.sin(angle) * this.state.projectileSpeed,
        spin: spinDirection * Phaser.Math.FloatBetween(6.5, 9),
        damage: this.state.damage,
        life: 1.35,
        radius: DESKTOP_MODE ? 12 : 10,
        pierce: 0,
      });
    }
  }

  nearestEnemy() {
    let nearest = null;
    let best = Infinity;
    for (const enemy of this.enemies) {
      const d = Phaser.Math.Distance.Squared(this.player.x, this.player.y, enemy.sprite.x, enemy.sprite.y);
      if (d < best) { best = d; nearest = enemy; }
    }
    return nearest;
  }

  updateBullets(dt) {
    for (let i = this.bullets.length - 1; i >= 0; i -= 1) {
      const bullet = this.bullets[i];
      bullet.sprite.x += bullet.vx * dt;
      bullet.sprite.y += bullet.vy * dt;
      bullet.sprite.rotation += bullet.spin * dt;
      bullet.life -= dt;
      let consumed = bullet.life <= 0;
      for (let e = this.enemies.length - 1; e >= 0 && !consumed; e -= 1) {
        const enemy = this.enemies[e];
        const collides = enemy.type === "humanoid"
          ? this.circleHitsOrientedRect(bullet.sprite.x, bullet.sprite.y, bullet.radius, this.getHumanoidCollisionBody(enemy))
          : Phaser.Math.Distance.Squared(bullet.sprite.x, bullet.sprite.y, enemy.sprite.x, enemy.sprite.y) < (enemy.radius + bullet.radius) ** 2;
        if (collides) {
          this.hitEnemy(enemy, bullet.damage);
          consumed = true;
        }
      }
      if (consumed) { bullet.sprite.destroy(); this.bullets.splice(i, 1); }
    }
  }

  updateField(time) {
    if (!this.state.field) return;
    if (!this.fieldRing) this.fieldRing = this.add.circle(this.player.x, this.player.y, 82 + this.state.field * 10, 0x66f5dc, .035).setStrokeStyle(2, 0x66f5dc, .24).setDepth(4);
    this.fieldRing.setPosition(this.player.x, this.player.y).setRadius(82 + this.state.field * 10).setAlpha(.18 + Math.sin(time * .006) * .07);
    if (time - this.lastField < 680) return;
    this.lastField = time;
    const radius = 82 + this.state.field * 10;
    for (const enemy of this.enemies) if (Phaser.Math.Distance.Squared(this.player.x, this.player.y, enemy.sprite.x, enemy.sprite.y) < radius ** 2) this.hitEnemy(enemy, 7 + this.state.field * 5);
  }

  hitEnemy(enemy, damage) {
    enemy.hp -= damage;
    enemy.sprite.setTintFill(0xffffff);
    this.time.delayedCall(55, () => enemy.sprite?.active && enemy.sprite.clearTint());
    if (enemy.hp <= 0) this.killEnemy(enemy);
  }

  killEnemy(enemy) {
    const index = this.enemies.indexOf(enemy);
    if (index < 0) return;
    const x = enemy.sprite.x, y = enemy.sprite.y;
    enemy.sprite.destroy();
    this.enemies.splice(index, 1);
    this.state.kills += enemy.isBoss ? 10 : 1;
    this.state.scrap += enemy.isBoss ? 20 : (Math.random() < .16 ? 1 : 0);
    if (enemy.isBoss) {
      this.win();
      return;
    }
    const collectibleIndex = this.collectibleCycle % COLLECTIBLE_KEYS.length;
    this.collectibleCycle += 1;
    const glow = this.add.circle(x, y, COLLECTIBLE_GLOW_SIZE, COLLECTIBLE_GLOW_COLORS[collectibleIndex % COLLECTIBLE_GLOW_COLORS.length], .1).setDepth(4);
    const drop = this.add.image(x, y, COLLECTIBLE_KEYS[collectibleIndex]).setDisplaySize(COLLECTIBLE_SIZE, COLLECTIBLE_SIZE).setDepth(5);
    this.drops.push({
      sprite: drop,
      glow,
      kind: collectibleIndex,
      value: enemy.type === "tank" ? 3 : enemy.type === "fast" ? 2 : 1,
      spin: collectibleIndex % 2 ? -1 : 1,
      phase: Phaser.Math.FloatBetween(0, Math.PI * 2),
    });
  }

  updateDrops(dt) {
    for (let i = this.drops.length - 1; i >= 0; i -= 1) {
      const drop = this.drops[i];
      const dx = this.player.x - drop.sprite.x;
      const dy = this.player.y - drop.sprite.y;
      const distance = Math.max(1, Math.hypot(dx, dy));
      drop.phase += dt * 2;
      drop.sprite.rotation += drop.spin * dt * .18;
      const pulse = Math.sin(drop.phase);
      drop.sprite.setDisplaySize(COLLECTIBLE_SIZE * (1 + pulse * .025), COLLECTIBLE_SIZE * (1 + pulse * .025));
      if (distance < this.state.pickupRadius) {
        const speed = 230 + (this.state.pickupRadius - distance) * 8;
        drop.sprite.x += dx / distance * speed * dt;
        drop.sprite.y += dy / distance * speed * dt;
      }
      drop.glow.setPosition(drop.sprite.x, drop.sprite.y).setRadius(COLLECTIBLE_GLOW_SIZE + pulse * 1.2).setAlpha(.08 + (pulse + 1) * .025);
      if (distance < 42) {
        drop.sprite.destroy();
        drop.glow.destroy();
        this.drops.splice(i, 1);
        this.applyCollectible(drop);
      }
    }
  }

  applyCollectible(drop) {
    let bonusXp = 0;
    switch (drop.kind) {
      case 0: bonusXp = 2; break;
      case 1: this.heal(12); break;
      case 2: this.state.scrap += 2; break;
      case 3: bonusXp = 1; break;
      case 4: bonusXp = 2; break;
      case 5: this.state.pickupRadius = Math.min(200, this.state.pickupRadius + 3); break;
      case 6: this.heal(6); break;
      case 7: this.state.moveSpeed = Math.min(320, this.state.moveSpeed + 1); break;
      case 8: this.state.damage += .5; break;
      case 9: this.state.fireRate = Math.max(155, this.state.fireRate * .995); break;
      case 10: this.state.scrap += 3; break;
      case 11: bonusXp = 2; break;
      case 12: this.heal(8); break;
      case 13: bonusXp = 3; break;
      case 14: this.state.damage += .25; break;
      case 15:
        if (Math.random() < .5) bonusXp = 2;
        else this.state.scrap += 2;
        break;
      default: break;
    }
    this.gainXp(drop.value + bonusXp);
  }

  gainXp(value) {
    this.state.xp += value;
    if (this.state.xp >= this.state.xpNeed) {
      this.state.xp -= this.state.xpNeed;
      this.state.level += 1;
      this.state.xpNeed = Math.floor(this.state.xpNeed * 1.27 + 3);
      this.openUpgrade();
    }
  }

  openUpgrade() {
    this.scene.pause();
    this.endPointer();
    dom.upgradeChoices.replaceChildren();
    for (const choice of chooseUpgrades(this)) {
      const button = document.createElement("button");
      button.className = "upgrade-card";
      button.style.setProperty("--accent", choice.color);
      const current = this.upgradeLevels[choice.id] || 0;
      button.innerHTML = `<span class="upgrade-icon">${choice.icon}</span><span class="upgrade-copy"><span>${choice.type} · LV ${current + 1}</span><strong>${choice.name}</strong><small>${choice.description}</small></span><b class="upgrade-arrow">›</b>`;
      button.addEventListener("click", () => {
        this.upgradeLevels[choice.id] = current + 1;
        choice.apply(this);
        hide(dom.upgrade);
        this.scene.resume();
        toast(`${choice.name.toUpperCase()}  LV ${current + 1}`);
      }, { once: true });
      dom.upgradeChoices.append(button);
    }
    show(dom.upgrade);
  }

  spawnBoss() {
    toast("WARDEN SIGNAL DETECTED");
    dom.objectiveText.textContent = "ELITE THREAT — defeat The Warden";
    dom.objectiveFill.style.width = "0%";
    show(dom.objective);
    const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
    const bossDistance = DESKTOP_MODE ? 660 : 390;
    const x = Phaser.Math.Clamp(this.player.x + Math.cos(angle) * bossDistance, 50, WORLD - 50);
    const y = Phaser.Math.Clamp(this.player.y + Math.sin(angle) * bossDistance, 50, WORLD - 50);
    const hp = 820 + this.state.level * 55;
    const sprite = this.add.image(x, y, "boss").setScale(DESKTOP_MODE ? 1.18 : 1).setDepth(7);
    this.boss = { sprite, type: "boss", hp, maxHp: hp, speed: 42, damage: 24, radius: DESKTOP_MODE ? 45 : 38, hitAt: 0, isBoss: true, enraged: false };
    this.enemies.push(this.boss);
  }

  bossVolley(enemy) {
    const count = enemy.enraged ? 12 : 8;
    const offset = Math.atan2(this.player.y - enemy.sprite.y, this.player.x - enemy.sprite.x);
    for (let i = 0; i < count; i += 1) {
      const angle = offset + i * Math.PI * 2 / count;
      const sprite = this.add.image(enemy.sprite.x, enemy.sprite.y, "enemyBullet").setDepth(8);
      this.enemyBullets.push({ sprite, vx: Math.cos(angle) * (enemy.enraged ? 190 : 145), vy: Math.sin(angle) * (enemy.enraged ? 190 : 145), life: 4 });
    }
    this.cameras.main.shake(90, .0025);
  }

  updateEnemyBullets(dt) {
    for (let i = this.enemyBullets.length - 1; i >= 0; i -= 1) {
      const bullet = this.enemyBullets[i];
      bullet.sprite.x += bullet.vx * dt;
      bullet.sprite.y += bullet.vy * dt;
      bullet.life -= dt;
      const hit = this.playerCollisionHitsCircle(bullet.sprite.x, bullet.sprite.y, 7);
      if (hit && this.damageGrace <= 0) this.damagePlayer(14);
      if (hit || bullet.life <= 0) { bullet.sprite.destroy(); this.enemyBullets.splice(i, 1); }
    }
  }

  enrageBoss() {
    if (!this.boss || this.boss.enraged) return;
    this.boss.enraged = true;
    this.boss.speed *= 1.35;
    this.boss.sprite.setTint(0xff4f71);
    toast("THE WARDEN IS ENRAGED");
  }

  damagePlayer(amount) {
    this.damageGrace = .62;
    this.state.hp = Math.max(0, this.state.hp - amount);
    this.player.setTintFill(0xff4f71);
    this.cameras.main.shake(110, .007);
    this.time.delayedCall(85, () => this.player?.active && this.player.clearTint());
    if (this.state.hp <= 0) this.lose();
  }

  heal(amount) { this.state.hp = Math.min(this.state.maxHp, this.state.hp + amount); }

  win() { this.finish(true); }
  lose() { this.finish(false); }

  finish(won) {
    if (this.state.ended) return;
    this.state.ended = true;
    this.scene.pause();
    hide(dom.hud); hide(dom.upgrade); hide(dom.pause);
    const earned = this.state.scrap + Math.floor(this.state.kills / 8) + (won ? 25 : 0);
    save.scrap += earned;
    save.bestKills = Math.max(save.bestKills, this.state.kills);
    if (won) save.clears += 1;
    writeSave();
    dom.resultKicker.textContent = won ? "DISTRICT SECURED" : "SIGNAL LOST";
    dom.resultTitle.innerHTML = won ? "Light<br>restored." : "The dark<br>closed in.";
    dom.resultCopy.textContent = won ? "The storm recedes—for tonight." : "Scrap recovered. Adjust the build and go again.";
    dom.resultTime.textContent = formatTime(this.state.elapsed);
    dom.resultKills.textContent = this.state.kills;
    dom.resultLevel.textContent = this.state.level;
    dom.resultScrap.textContent = `+${earned}`;
    show(dom.result);
  }

  pauseRun() {
    if (this.state.ended || this.scene.isPaused()) return;
    this.scene.pause();
    this.endPointer();
    dom.buildSummary.innerHTML = [
      ["Pulse damage", Math.round(this.state.damage)],
      ["Fire interval", `${Math.round(this.state.fireRate)}ms`],
      ["Projectiles", this.state.projectiles],
    ].map(([label, value]) => `<div><span>${label}</span><b>${value}</b></div>`).join("");
    show(dom.pause);
  }

  resumeRun() { hide(dom.pause); this.scene.resume(); }

  cleanup() {
    hide(dom.hud); hide(dom.upgrade); hide(dom.pause);
  }
}

const upgrades = [
  { id: "damage", name: "Pulse Amplifier", type: "WEAPON", icon: "P+", color: "#efff55", max: 8, description: "+7 pulse damage. Reliable power against elites.", apply: (s) => { s.state.damage += 7; } },
  { id: "rate", name: "Rapid Cycle", type: "WEAPON", icon: "R", color: "#efff55", max: 7, description: "Pulse Pistol fires 11% faster.", apply: (s) => { s.state.fireRate = Math.max(155, s.state.fireRate * .89); } },
  { id: "multi", name: "Split Lens", type: "EVOLUTION", icon: "×2", color: "#ff8b5c", max: 3, description: "+1 projectile per volley with a slight spread.", apply: (s) => { s.state.projectiles += 1; } },
  { id: "field", name: "Arc Field", type: "NEW WEAPON", icon: "◎", color: "#66f5dc", max: 5, description: "Periodic energy damage to all nearby threats.", apply: (s) => { s.state.field += 1; } },
  { id: "speed", name: "Kinetic Boots", type: "PASSIVE", icon: "↗", color: "#9aa8ff", max: 5, description: "+18 movement speed. Keep a path through the horde.", apply: (s) => { s.state.moveSpeed += 18; } },
  { id: "magnet", name: "Magnet Core", type: "PASSIVE", icon: "U", color: "#9aa8ff", max: 5, description: "+28 pickup radius. Pull energy through danger.", apply: (s) => { s.state.pickupRadius += 28; } },
  { id: "armor", name: "Reinforced Jacket", type: "PASSIVE", icon: "+", color: "#ff6d84", max: 5, description: "+20 maximum health and restore 20 health.", apply: (s) => { s.state.maxHp += 20; s.state.hp = Math.min(s.state.maxHp, s.state.hp + 20); } },
  { id: "velocity", name: "Hot Payload", type: "WEAPON", icon: "»", color: "#ff8b5c", max: 5, description: "+70 projectile speed and sharper response.", apply: (s) => { s.state.projectileSpeed += 70; } },
];

function chooseUpgrades(scene) {
  const available = upgrades.filter((u) => (scene.upgradeLevels[u.id] || 0) < u.max);
  Phaser.Utils.Array.Shuffle(available);
  return available.slice(0, 3);
}

function updateHud(state) {
  const remaining = Math.max(0, RUN_SECONDS - state.elapsed);
  dom.timer.textContent = formatTime(remaining);
  dom.healthFill.style.width = `${state.hp / state.maxHp * 100}%`;
  dom.healthText.textContent = `${Math.ceil(state.hp)} / ${state.maxHp}`;
  dom.xpFill.style.width = `${state.xp / state.xpNeed * 100}%`;
  dom.level.textContent = state.level;
  dom.kills.textContent = state.kills;
  dom.runScrap.textContent = state.scrap;
  const scene = game?.scene?.getScene("gameScene");
  if (scene?.boss?.sprite?.active) {
    dom.objectiveFill.style.width = `${Math.max(0, scene.boss.hp / scene.boss.maxHp) * 100}%`;
  }
}

function formatTime(seconds) {
  const value = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
}

let toastTimer;
function toast(message) {
  clearTimeout(toastTimer);
  dom.toast.textContent = message;
  show(dom.toast);
  toastTimer = setTimeout(() => hide(dom.toast), 1700);
}

function makeTextures(scene) {
  const g = scene.make.graphics({ x: 0, y: 0, add: false });
  g.fillStyle(0x52152d).fillCircle(42, 42, 40).lineStyle(5, 0xff4f71).strokeCircle(42, 42, 36).fillStyle(0xff4f71).fillTriangle(42, 8, 65, 58, 19, 58).fillStyle(0x160916).fillCircle(42, 42, 13).generateTexture("boss", 84, 84).clear();
  g.fillStyle(0xff4f71).fillCircle(7, 7, 6).lineStyle(2, 0xffa2b4).strokeCircle(7, 7, 5).generateTexture("enemyBullet", 14, 14).clear();
  drawLamp(g, false); g.generateTexture("lamp", 44, 76).clear();
  drawLamp(g, true); g.generateTexture("lampOn", 44, 76).destroy();
}

function registerPlayerAnimations(scene) {
  const definitions = [
    [PLAYER_ATLAS, PLAYER_ANIMATION, "walk", PLAYER_WALK_FPS],
    [PLAYER_IDLE_ATLAS, PLAYER_IDLE_ANIMATION, "idle_2", null],
  ];
  for (const [atlasKey, animationKey, animationName, frameRate] of definitions) {
    if (scene.anims.exists(animationKey)) continue;
    const atlasData = scene.cache.json.get(`${atlasKey}-data`);
    const definition = atlasData.animations[animationName];
    scene.anims.create({
      key: animationKey,
      frames: definition.frames.map((frame) => ({ key: atlasKey, frame })),
      frameRate: frameRate || definition.fps,
      repeat: definition.loop ? -1 : 0,
    });
  }
}

function registerHumanoidAnimations(scene) {
  const definitions = [
    [HUMANOID_WALK_ATLAS, HUMANOID_WALK_ANIMATION, "walk"],
    [HUMANOID_ATTACK_ATLAS, HUMANOID_ATTACK_ANIMATION, "attack"],
  ];
  for (const [atlasKey, animationKey, animationName] of definitions) {
    if (scene.anims.exists(animationKey)) continue;
    const atlasData = scene.cache.json.get(`${atlasKey}-data`);
    const definition = atlasData.animations[animationName];
    scene.anims.create({
      key: animationKey,
      frames: definition.frames.map((frame) => ({ key: atlasKey, frame })),
      frameRate: definition.fps,
      repeat: definition.loop ? -1 : 0,
    });
  }
}

function drawLamp(g, active) {
  g.fillStyle(0x212a38).fillRect(19, 24, 6, 52).fillRect(10, 72, 24, 4);
  g.fillStyle(active ? 0xefff55 : 0x4b5260).fillCircle(22, 19, 14);
  g.lineStyle(3, active ? 0xf8ff9b : 0x7a8190).strokeCircle(22, 19, 13);
  if (active) g.fillStyle(0xffffff).fillCircle(18, 15, 4);
}

function drawWorld(g, width, height, compact) {
  const step = compact ? 54 : 90;
  g.lineStyle(1, 0x1a2333, compact ? .45 : .7);
  for (let x = 0; x <= width; x += step) g.lineBetween(x, 0, x, height);
  for (let y = 0; y <= height; y += step) g.lineBetween(0, y, width, y);
  g.lineStyle(compact ? 2 : 8, 0x171f2d, .85);
  g.lineBetween(width * .1, 0, width * .62, height);
  g.lineBetween(width * .76, 0, width * .32, height);
  if (!compact) {
    g.lineStyle(2, 0xefff55, .08);
    for (let y = 120; y < height; y += 360) g.lineBetween(0, y, width, y + 240);
  }
}

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: "game",
  width: WIDTH,
  height: HEIGHT,
  resolution: Math.min(window.devicePixelRatio || 1, 2),
  backgroundColor: "#070a12",
  render: { antialias: true, pixelArt: false, powerPreference: "high-performance" },
  physics: { default: "arcade", arcade: { debug: false } },
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [BootScene, AttractScene, GameScene],
});

function startRun() {
  hide(dom.menu); hide(dom.result); hide(dom.pause); hide(dom.upgrade);
  const active = game.scene.getScene("gameScene");
  if (active.scene.isActive() || active.scene.isPaused()) game.scene.stop("gameScene");
  game.scene.stop("attract");
  game.scene.start("gameScene");
}

function goHome() {
  game.scene.stop("gameScene");
  game.scene.start("attract");
  hide(dom.hud); hide(dom.result); hide(dom.pause); hide(dom.upgrade); show(dom.menu);
  refreshMeta();
}

dom.startButton.addEventListener("click", startRun);
dom.retryButton.addEventListener("click", startRun);
dom.homeButton.addEventListener("click", goHome);
dom.pauseButton.addEventListener("click", () => game.scene.getScene("gameScene")?.pauseRun());
dom.resumeButton.addEventListener("click", () => game.scene.getScene("gameScene")?.resumeRun());
dom.quitButton.addEventListener("click", goHome);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) game.scene.getScene("gameScene")?.pauseRun();
});
