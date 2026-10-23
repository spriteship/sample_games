import { WIDTH, HEIGHT, clamp, distance, distanceToRect, circleOverlapsRect, moveCircle, sees, hasLineOfSight, rayDistance } from './world.js';
import { PISTOLS, CACHE_WEAPONS } from './weapons.js';
import { LEVELS } from './levels.js';

const canvas = document.querySelector('#game');
const ctx = canvas.getContext('2d');
const $ = selector => document.querySelector(selector);
const ui = {
  hud: $('#hud'), ability: $('#ability'), weapon: $('#weapon'), menu: $('#menu'), pause: $('#pause'), loot: $('#loot'), result: $('#result'),
  objectiveLabel: $('#objective-label'), objectiveText: $('#objective-text'), objectiveHint: $('#objective-hint'),
  timer: $('#timer'), alertNumber: $('#alert-number'), alertFill: $('#alert-fill'),
  abilityState: $('#ability-state'), cooldownFill: $('#cooldown-fill'), weaponName: $('#weapon-name'), ammoCount: $('#ammo-count'), weaponState: $('#weapon-state'), prompt: $('#prompt'), promptText: $('#prompt-text'), toast: $('#toast')
};
const images = {};
let game;
let selectedLevel = 0;
let unlockedLevel = Math.min(LEVELS.length - 1, Math.max(0, Number(localStorage.getItem('blackout-unlocked') || 0) || 0));
let retainedWeapon = 'service';
const level = () => game?.level || LEVELS[selectedLevel];
const solids = () => level().obstacles;
const visible = (a, b) => hasLineOfSight(a, b, solids());
let last = performance.now();
let toastTimer = 0;
let audio;
const keys = new Set();
const touch = { x: 0, y: 0, pointer: null };
const aimPointer = { x: 0, y: 0, down: false };
let touchFiring = false;
const PLAYER_WALK_FPS = 48;
const PLAYER_SPRINT_FPS = 60;
const rain = Array.from({ length: 125 }, (_, index) => ({ x: ((index * 283 + 71) % 1280), y: ((index * 137 + 94) % 720), len: 8 + (index % 5) * 5, speed: 280 + (index % 7) * 65 }));
const supplyBoxes = () => level().covers.map((box, index) => ({ box, index })).filter(({ box }) => box.art === 'crate' || box.art === 'stack');
function resizeCanvas() {
  canvas.height = 720;
  canvas.width = Math.max(300, Math.round(720 * innerWidth / innerHeight));
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

async function loadArt() {
  try {
    const response = await fetch('./assets/spriteship/runtime.json');
    if (!response.ok) return;
    const manifest = await response.json();
    const cache = new Map();
    const atlasCache = new Map();
    await Promise.all(Object.entries(manifest).map(async ([name, file]) => {
      const path = typeof file === 'string' ? file : file?.file;
      if (!path) return;
      if (!cache.has(path)) {
        const img = new Image(); img.src = './assets/spriteship/' + path;
        cache.set(path, img.decode().then(() => img).catch(() => null));
      }
      const img = await cache.get(path);
      if (img) {
        let frames = null;
        if (file?.atlas) {
          if (!atlasCache.has(file.atlas)) atlasCache.set(file.atlas, fetch('./assets/spriteship/' + file.atlas).then(result => result.json()).then(atlas => Object.values(atlas.frames).map(value => value.frame)).catch(() => null));
          frames = await atlasCache.get(file.atlas);
        }
        images[name] = { img, frame: file?.frame || null, frames };
      }
    }));
    if (game?.mode === 'loot') drawLootArt();
  } catch { /* Local art may still be generating. */ }
}
loadArt();

function beep(frequency, duration, type = 'sine', volume = .06, slide = 0) {
  try {
    audio ||= new (window.AudioContext || window.webkitAudioContext)();
    const now = audio.currentTime;
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);
    if (slide) oscillator.frequency.exponentialRampToValueAtTime(Math.max(30, frequency + slide), now + duration);
    gain.gain.setValueAtTime(.001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + .015);
    gain.gain.exponentialRampToValueAtTime(.001, now + duration);
    oscillator.connect(gain).connect(audio.destination);
    oscillator.start(now); oscillator.stop(now + duration + .01);
  } catch { /* Audio is optional. */ }
}

function notify(message, seconds = 2.8) {
  ui.toast.textContent = message;
  ui.toast.classList.remove('hidden');
  toastTimer = seconds;
}

function formatTime(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

function safeGuardPosition(point, mission) {
  const open = candidate => !mission.obstacles.some(rect => circleOverlapsRect(candidate.x, candidate.y, 15, rect));
  if (open(point)) return point;
  for (let radius = 20; radius <= 100; radius += 20) {
    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 6) {
      const candidate = { x: point.x + Math.cos(angle) * radius, y: point.y + Math.sin(angle) * radius };
      if (open(candidate)) return candidate;
    }
  }
  return point;
}

function newGame() {
  const mission = LEVELS[selectedLevel];
  const carried = PISTOLS[retainedWeapon] ? retainedWeapon : 'service';
  game = {
    level: mission, mode: 'playing', time: 0, player: { ...mission.start, angle: -.6, step: 0, fireFlash: 0 },
    guards: mission.guardPaths.map((path, index) => ({ ...safeGuardPosition(path[0], mission), angle: 0, path, waypoint: 1, blockedTime: 0, stunned: 0, shotCooldown: .3 + index * .2, fireFlash: 0, hitFlash: 0, health: 2, disabled: false, index })),
    cameras: mission.cameras.map((camera, index) => ({ ...camera, index, angle: camera.base, stunned: 0 })),
    bullets: [], playerBullets: [], openedBoxes: new Set(), boxWeapons: new Map(), lootIndex: null, hitFlash: 0,
    weaponId: carried, ammo: PISTOLS[carried].magazine, shotCooldown: 0, reloadTimer: 0, playerShotsFired: 0,
    alert: 0, peakAlert: 0, coreTaken: false, escapeTime: mission.escapeTime,
    empCooldown: 0, empUsed: 0, pulse: 0, terminalTime: 0, terminalUsed: false,
    shake: 0, flash: 0
  };
  ui.menu.classList.add('hidden'); ui.pause.classList.add('hidden'); ui.loot.classList.add('hidden'); ui.result.classList.add('hidden');
  $('#operations').classList.add('hidden'); $('#mission-briefing').classList.add('hidden');
  ui.hud.classList.remove('hidden'); ui.ability.classList.remove('hidden'); ui.weapon.classList.remove('hidden');
  aimPointer.down = false; touchFiring = false;
  if (matchMedia('(pointer: coarse)').matches) $('#touch').classList.remove('hidden');
  $('.brand-small i').textContent = '// ' + String(mission.id + 1).padStart(2, '0');
  ui.toast.classList.add('hidden'); toastTimer = 0;
  beep(440, .16, 'triangle', .05, 180);
}

function endGame(won, reason) {
  if (game.mode !== 'playing') return;
  game.mode = won ? 'won' : 'lost';
  if (won) {
    retainedWeapon = game.weaponId;
    unlockedLevel = Math.max(unlockedLevel, Math.min(LEVELS.length - 1, game.level.id + 1));
    localStorage.setItem('blackout-unlocked', String(unlockedLevel));
  }
  ui.result.classList.remove('hidden');
  $('#result-kicker').textContent = `${won ? 'EXTRACTION COMPLETE' : 'MISSION COMPROMISED'} // ${String(game.level.id + 1).padStart(2, '0')} / 11`;
  $('#result-title').textContent = won ? game.level.name + ' clear.' : 'Lights out.';
  $('#result-copy').textContent = won ? (game.level.id === LEVELS.length - 1 ? 'Campaign complete. Every operation is yours to replay.' : `${game.level.objective} secured. ${LEVELS[game.level.id + 1].name} is now unlocked.`) : reason;
  $('#next-button').classList.toggle('hidden', !won || game.level.id === LEVELS.length - 1);
  $('#restart-button span').textContent = won ? 'REPLAY MISSION' : 'TRY AGAIN';
  $('#result-time').textContent = formatTime(game.time);
  $('#result-alert').textContent = Math.round(game.peakAlert) + '%';
  $('#result-emp').textContent = String(game.empUsed);
  beep(won ? 520 : 130, .8, won ? 'triangle' : 'sawtooth', .055, won ? 250 : -80);
}

function renderOperations() {
  const grid = $('#mission-grid');
  grid.replaceChildren();
  for (const mission of LEVELS) {
    const button = document.createElement('button');
    button.className = 'mission-card' + (mission.id > unlockedLevel ? ' locked' : '');
    button.disabled = mission.id > unlockedLevel;
    button.style.setProperty('--mission-accent', mission.accent);
    const top = document.createElement('span'); top.className = 'card-top';
    top.textContent = `OP ${String(mission.id + 1).padStart(2, '0')} / 11`;
    const name = document.createElement('strong'); name.textContent = mission.name;
    const place = document.createElement('span'); place.textContent = mission.place;
    const difficulty = document.createElement('small'); difficulty.textContent = button.disabled ? 'LOCKED · CLEAR PREVIOUS MISSION' : `${mission.difficulty.toUpperCase()} · ${mission.challenge}`;
    button.append(top, name, place, difficulty);
    button.addEventListener('click', () => showBriefing(mission.id));
    grid.append(button);
  }
}

function showOperations() {
  if (game?.mode === 'playing') game.mode = 'paused';
  ui.menu.classList.add('hidden'); ui.pause.classList.add('hidden'); ui.result.classList.add('hidden'); ui.loot.classList.add('hidden');
  $('#mission-briefing').classList.add('hidden');
  ui.hud.classList.add('hidden'); ui.ability.classList.add('hidden'); ui.weapon.classList.add('hidden'); $('#touch').classList.add('hidden');
  game = undefined;
  renderOperations();
  $('#operations').classList.remove('hidden');
}

function showMenu() {
  $('#operations').classList.add('hidden'); $('#mission-briefing').classList.add('hidden');
  ui.menu.classList.remove('hidden');
}

function showBriefing(index) {
  if (index > unlockedLevel || index < 0 || index >= LEVELS.length) return;
  selectedLevel = index;
  const mission = LEVELS[index];
  $('#briefing-kicker').textContent = `OPERATION ${String(index + 1).padStart(2, '0')} / 11`;
  $('#briefing-title').textContent = mission.name;
  $('#briefing-place').textContent = mission.place;
  $('#briefing-difficulty').textContent = mission.difficulty.toUpperCase();
  $('#briefing-challenge').textContent = mission.challenge;
  $('#briefing-objective').textContent = mission.objective;
  $('#briefing-copy').textContent = mission.briefing;
  $('#operations').classList.add('hidden'); ui.result.classList.add('hidden');
  $('#mission-briefing').classList.remove('hidden');
}

function pause() {
  if (game?.mode === 'playing') { game.mode = 'paused'; ui.pause.classList.remove('hidden'); }
  else if (game?.mode === 'paused') { game.mode = 'playing'; ui.pause.classList.add('hidden'); }
}

function nearbySupply() {
  if (!game) return null;
  return supplyBoxes().filter(({ box, index }) => (!game.openedBoxes.has(index) || game.boxWeapons.has(index)) && distanceToRect(game.player, box) < 45)
    .sort((a, b) => distanceToRect(game.player, a.box) - distanceToRect(game.player, b.box))[0] || null;
}

function drawLootArt() {
  const canvas = $('#loot-art'), target = canvas.getContext('2d');
  target.clearRect(0, 0, canvas.width, canvas.height);
  const weapon = PISTOLS[game.boxWeapons.get(game.lootIndex)];
  if (!weapon) return;
  const asset = images[weapon.art];
  if (asset) {
    const frame = asset.frame;
    target.shadowColor = weapon.color; target.shadowBlur = 28;
    if (frame) target.drawImage(asset.img, ...frame, 27, 0, 186, 180);
    else target.drawImage(asset.img, 27, 0, 186, 180);
    target.shadowBlur = 0;
  } else {
    target.fillStyle = weapon.color; target.shadowColor = weapon.color; target.shadowBlur = 24;
    target.fillRect(45, 68, 150, 23); target.fillRect(120, 86, 25, 60); target.fillRect(27, 73, 30, 12);
    target.shadowBlur = 0;
  }
}

function showLoot(index) {
  const firstOpen = !game.openedBoxes.has(index);
  if (firstOpen) {
    game.openedBoxes.add(index);
    game.boxWeapons.set(index, CACHE_WEAPONS[index]);
    game.empCooldown = 0;
    game.ammo = PISTOLS[game.weaponId].magazine;
    game.reloadTimer = 0;
    game.alert = Math.max(0, game.alert - 18);
    if (game.coreTaken) game.escapeTime = Math.min(game.level.escapeTime, game.escapeTime + 8);
  }
  game.mode = 'loot'; game.lootIndex = index;
  const weapon = PISTOLS[game.boxWeapons.get(index)];
  $('#loot-tag').textContent = weapon.tag;
  $('#loot-title').textContent = weapon.name;
  $('#loot-description').textContent = weapon.description;
  $('#loot-damage').textContent = 'DAMAGE ' + weapon.damage;
  $('#loot-rate').textContent = Math.round(60 / weapon.interval) + ' RPM';
  $('#loot-magazine').textContent = weapon.magazine + ' ROUNDS';
  $('#loot-bonus').textContent = firstOpen ? 'EMP READY · AMMO REFILLED · −18 EXPOSURE' + (game.coreTaken ? ' · +8S LOCKDOWN' : '') : 'PISTOL SWAP · SUPPLIES ALREADY TAKEN';
  $('#loot-current').textContent = PISTOLS[game.weaponId].name;
  ui.loot.classList.remove('hidden');
  drawLootArt();
  updateUI();
  beep(480, .2, 'triangle', .045, 380);
}

function leaveLoot() {
  if (game?.mode !== 'loot') return;
  game.mode = 'playing'; game.lootIndex = null; ui.loot.classList.add('hidden');
  notify('Pistol left in the cache. Return to swap later.', 2.8);
}

function equipLoot() {
  if (game?.mode !== 'loot') return;
  const next = game.boxWeapons.get(game.lootIndex), previous = game.weaponId;
  game.weaponId = next;
  game.boxWeapons.set(game.lootIndex, previous);
  game.ammo = PISTOLS[next].magazine; game.reloadTimer = 0; game.shotCooldown = 0;
  game.mode = 'playing'; game.lootIndex = null; ui.loot.classList.add('hidden');
  notify(PISTOLS[next].name + ' equipped · ' + PISTOLS[next].tag, 3);
  updateUI();
  beep(570, .2, 'triangle', .05, 250);
}

function interact() {
  if (game?.mode === 'loot') { equipLoot(); return; }
  if (game?.mode !== 'playing') return;
  const p = game.player;
  if (!game.coreTaken && distance(p, game.level.core) < 75) {
    game.coreTaken = true; game.alert = Math.max(game.alert, 25); game.empCooldown = 0; game.flash = .8; game.shake = 8;
    notify(game.level.objective + ' SECURED · Reach extraction', 4); beep(620, .32, 'triangle', .09, 480);
  } else if (game.coreTaken && distance(p, game.level.exit) < 86) {
    endGame(true);
  } else if (!game.terminalUsed && distance(p, game.level.terminal) < 78) {
    game.terminalUsed = true; game.terminalTime = 25;
    game.cameras.forEach(camera => camera.stunned = 25);
    notify('Surveillance offline for 25 seconds', 3.3); beep(660, .17, 'square', .035, -260);
  } else {
    const supply = nearbySupply();
    if (!supply) return;
    showLoot(supply.index);
  }
}

function emp() {
  if (game?.mode !== 'playing' || game.empCooldown > 0) return;
  game.empCooldown = 16; game.empUsed++; game.pulse = .55; game.flash = .32;
  for (const guard of game.guards) if (distance(guard, game.player) < 205) guard.stunned = 4.8;
  for (const camera of game.cameras) if (distance(camera, game.player) < 205) camera.stunned = 5;
  game.alert = Math.max(0, game.alert - 28);
  notify('EMP pulse · Nearby security stunned', 1.8);
  beep(95, .38, 'sawtooth', .085, 740);
}

function reload() {
  if (game?.mode !== 'playing' || game.reloadTimer > 0) return;
  const weapon = PISTOLS[game.weaponId];
  if (game.ammo >= weapon.magazine) return;
  game.reloadTimer = 1.15;
  notify('Reloading ' + weapon.name, 1.15);
  beep(320, .09, 'square', .025, -110);
}

function shoot(aim = null) {
  if (game?.mode !== 'playing' || game.shotCooldown > 0 || game.reloadTimer > 0) return;
  if (game.ammo <= 0) { reload(); return; }
  const weapon = PISTOLS[game.weaponId], player = game.player;
  let target = null;
  if (aim) {
    target = game.guards.filter(guard => !guard.disabled && visible(player, guard) && distance(aim, { x: guard.x, y: guard.y - 18 }) < 55)
      .sort((a, b) => distance(aim, a) - distance(aim, b))[0] || null;
  } else {
    target = game.guards.filter(guard => !guard.disabled && distance(player, guard) < 440 && visible(player, guard))
      .sort((a, b) => distance(player, a) - distance(player, b))[0] || null;
  }
  if (target) {
    const travel = distance(player, target) / weapon.speed;
    aim = { x: target.x + (target.stunned ? 0 : Math.cos(target.angle) * 72 * travel), y: target.y + (target.stunned ? 0 : Math.sin(target.angle) * 72 * travel) };
  }
  const angle = aim ? Math.atan2(aim.y - player.y, aim.x - player.x) : player.angle;
  const count = weapon.pellets || 1;
  for (let index = 0; index < count; index++) {
    const spread = count === 2 ? (index ? 1 : -1) * weapon.spread : (Math.random() - .5) * (weapon.spread || 0);
    const direction = angle + spread;
    game.playerBullets.push({
      x: player.x + Math.cos(direction) * 23, y: player.y + Math.sin(direction) * 23,
      vx: Math.cos(direction) * weapon.speed, vy: Math.sin(direction) * weapon.speed,
      life: .58, damage: weapon.damage, stun: weapon.stun || 0, color: weapon.color
    });
  }
  player.fireAngle = angle; player.fireFlash = .14;
  game.ammo--; game.shotCooldown = weapon.interval; game.playerShotsFired++;
  game.alert = Math.min(100, game.alert + weapon.noise);
  beep(weapon.damage === 2 ? 120 : 210, .08, 'triangle', weapon.damage === 2 ? .05 : .025, -80);
}

function updatePlayerBullets(dt) {
  game.playerBullets = game.playerBullets.filter(bullet => {
    const previous = { x: bullet.x, y: bullet.y };
    bullet.x += bullet.vx * dt; bullet.y += bullet.vy * dt; bullet.life -= dt;
    if (bullet.life <= 0 || !visible(previous, bullet)) return false;
    const guard = game.guards.find(candidate => !candidate.disabled && distance(candidate, bullet) < 26);
    if (!guard) return true;
    guard.health -= bullet.damage; guard.hitFlash = .22;
    if (guard.health <= 0) {
      guard.disabled = true; guard.stunned = 0; game.alert = Math.max(0, game.alert - 8);
      notify('GUARD DISABLED', 1.7);
      beep(260, .22, 'triangle', .04, -160);
    } else {
      guard.stunned = Math.max(guard.stunned, bullet.stun || .25);
      beep(370, .1, 'square', .025, -180);
    }
    return false;
  });
}

function fireGuard(guard, player) {
  const angle = Math.atan2(player.y - guard.y, player.x - guard.x);
  const speed = 610;
  game.bullets.push({ x: guard.x + Math.cos(angle) * 25, y: guard.y + Math.sin(angle) * 25, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: .65 });
  guard.fireFlash = .17;
  guard.fireAngle = angle;
  guard.shotCooldown = 1.15 + guard.index * .09;
  game.shotsFired = (game.shotsFired || 0) + 1;
  beep(145, .08, 'sawtooth', .018, -70);
}

function updateBullets(dt) {
  game.bullets = game.bullets.filter(bullet => {
    const previous = { x: bullet.x, y: bullet.y };
    bullet.x += bullet.vx * dt; bullet.y += bullet.vy * dt; bullet.life -= dt;
    if (bullet.life <= 0 || !visible(previous, bullet)) return false;
    if (distance(bullet, game.player) < 24) {
      game.alert = Math.min(100, game.alert + 35);
      game.hitFlash = .42; game.shake = 9;
      notify('HIT · Break line of sight or use EMP', 1.5);
      beep(95, .22, 'sawtooth', .07, -50);
      return false;
    }
    return true;
  });
}

function tick(dt) {
  if (toastTimer > 0) { toastTimer -= dt; if (toastTimer <= 0) ui.toast.classList.add('hidden'); }
  if (!game || game.mode !== 'playing') return;
  game.time += dt;
  const p = game.player;
  let mx = Number(keys.has('KeyD') || keys.has('ArrowRight')) - Number(keys.has('KeyA') || keys.has('ArrowLeft')) + touch.x;
  let my = Number(keys.has('KeyS') || keys.has('ArrowDown')) - Number(keys.has('KeyW') || keys.has('ArrowUp')) + touch.y;
  const length = Math.hypot(mx, my);
  const sprinting = (keys.has('ShiftLeft') || keys.has('ShiftRight')) && length > .1;
  if (length > 0) {
    mx /= Math.max(1, length); my /= Math.max(1, length);
    const speed = sprinting ? 276 : 190;
    Object.assign(p, moveCircle(p, mx * speed * dt, my * speed * dt, 17, solids()));
    p.angle = Math.atan2(my, mx); p.step += dt * (sprinting ? PLAYER_SPRINT_FPS : PLAYER_WALK_FPS);
  }
  p.moving = length > .05;
  game.shotCooldown = Math.max(0, game.shotCooldown - dt);
  if (game.reloadTimer > 0) {
    game.reloadTimer = Math.max(0, game.reloadTimer - dt);
    if (game.reloadTimer === 0) { game.ammo = PISTOLS[game.weaponId].magazine; beep(460, .09, 'triangle', .03, 120); }
  }
  p.fireFlash = Math.max(0, p.fireFlash - dt);
  if (keys.has('Space') || keys.has('KeyF') || aimPointer.down || touchFiring) shoot(aimPointer.down ? aimPointer : null);
  game.empCooldown = Math.max(0, game.empCooldown - dt);
  game.terminalTime = Math.max(0, game.terminalTime - dt);
  game.pulse = Math.max(0, game.pulse - dt);
  game.shake = Math.max(0, game.shake - dt * 25);
  game.flash = Math.max(0, game.flash - dt);
  game.hitFlash = Math.max(0, game.hitFlash - dt);

  let seen = 0;
  for (const guard of game.guards) {
    guard.stunned = Math.max(0, guard.stunned - dt);
    guard.shotCooldown = Math.max(0, guard.shotCooldown - dt);
    guard.fireFlash = Math.max(0, guard.fireFlash - dt);
    guard.hitFlash = Math.max(0, guard.hitFlash - dt);
    if (guard.disabled) continue;
    if (guard.stunned > 0) continue;
    const target = guard.path[guard.waypoint];
    const dx = target.x - guard.x, dy = target.y - guard.y;
    const d = Math.hypot(dx, dy);
    if (d < 10) guard.waypoint = (guard.waypoint + 1) % guard.path.length;
    else {
      const speed = game.coreTaken ? game.level.guardSpeed * 1.25 : game.level.guardSpeed;
      const next = moveCircle(guard, dx / d * Math.min(d, speed * dt), dy / d * Math.min(d, speed * dt), 15, solids());
      guard.blockedTime = distance(guard, next) < .2 ? guard.blockedTime + dt : 0;
      guard.x = next.x; guard.y = next.y;
      if (guard.blockedTime > .7) { guard.waypoint = (guard.waypoint + 1) % guard.path.length; guard.blockedTime = 0; }
      guard.angle = Math.atan2(dy, dx);
      guard.step = (guard.step || 0) + dt * 27;
    }
    if (sees(guard, p, game.level.sightRange * (sprinting ? 1.18 : 1), .52, solids())) {
      seen += sprinting ? 1.35 : 1;
      if (guard.shotCooldown <= 0) fireGuard(guard, p);
    }
    if (distance(guard, p) < 30) seen += 2;
  }
  for (const camera of game.cameras) {
    camera.stunned = Math.max(0, camera.stunned - dt);
    camera.angle = camera.base + Math.sin(game.time * .7 + camera.phase) * camera.arc;
    if (!camera.stunned && sees(camera, p, 280, .34, solids())) seen += 1.4;
  }
  updateBullets(dt);
  updatePlayerBullets(dt);
  game.alert = clamp(game.alert + (seen ? seen * dt * game.level.alertRate : -dt * 20), 0, 100);
  game.peakAlert = Math.max(game.peakAlert, game.alert);
  if (game.alert >= 100) endGame(false, 'Security locked on to your position. The operation is over.');
  if (game.coreTaken) {
    game.escapeTime -= dt;
    if (game.escapeTime <= 0) endGame(false, 'Lockdown sealed the extraction gate before you reached it.');
  }
  updateUI();
}

function updateUI() {
  const p = game.player;
  ui.timer.textContent = game.coreTaken ? formatTime(game.escapeTime) : formatTime(game.time);
  $('.clock small').textContent = game.coreTaken ? 'LOCKDOWN' : 'ELAPSED';
  ui.alertNumber.textContent = Math.round(game.alert) + '%';
  ui.alertFill.style.width = game.alert + '%';
  ui.objectiveLabel.textContent = game.coreTaken ? 'EXTRACTION · LOCKDOWN COUNTDOWN' : `MISSION ${String(game.level.id + 1).padStart(2, '0')} / 11 · ${game.level.place.toUpperCase()}`;
  ui.objectiveText.textContent = game.coreTaken ? 'Reach the extraction gate' : game.level.objective;
  ui.objectiveHint.textContent = game.coreTaken ? 'Follow the amber extraction beacon' : 'Follow the cyan objective marker · E to collect';
  ui.abilityState.textContent = game.empCooldown ? Math.ceil(game.empCooldown) + 'S COOLDOWN' : 'READY';
  ui.cooldownFill.style.width = ((16 - game.empCooldown) / 16 * 100) + '%';
  const weapon = PISTOLS[game.weaponId];
  ui.weaponName.textContent = weapon.name.toUpperCase();
  ui.ammoCount.textContent = String(game.ammo).padStart(2, '0') + ' / ' + String(weapon.magazine).padStart(2, '0');
  ui.weaponState.textContent = game.reloadTimer > 0 ? 'RELOADING' : game.ammo ? 'SPACE / CLICK TO FIRE' : 'PRESS R TO RELOAD';
  let prompt = '';
  if (!game.coreTaken && distance(p, game.level.core) < 75) prompt = 'TAKE ' + game.level.objective.replace(/^(RETRIEVE|RECOVER|SECURE|COLLECT|RECLAIM|STEAL|CAPTURE|TAKE)\s+/, '');
  else if (game.coreTaken && distance(p, game.level.exit) < 86) prompt = 'EXTRACT';
  else if (!game.terminalUsed && distance(p, game.level.terminal) < 78) prompt = 'DISABLE CAMERAS';
  else {
    const supply = nearbySupply();
    if (supply) prompt = game.openedBoxes.has(supply.index) ? 'INSPECT PISTOL CACHE' : 'OPEN SUPPLY CACHE';
  }
  ui.prompt.classList.toggle('hidden', !prompt);
  ui.promptText.textContent = prompt;
}

function hash(x, y) { let n = (x * 374761393 + y * 668265263) | 0; n = (n ^ (n >>> 13)) * 1274126177; return ((n ^ (n >>> 16)) >>> 0) / 4294967295; }
function roundRect(x, y, w, h, r, fill, stroke) {
  ctx.beginPath(); ctx.roundRect(x, y, w, h, r);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.stroke(); }
}
function glow(x, y, radius, color, strength = 1) {
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
  gradient.addColorStop(0, color.replace('ALPHA', String(.29 * strength)));
  gradient.addColorStop(.42, color.replace('ALPHA', String(.11 * strength)));
  gradient.addColorStop(1, color.replace('ALPHA', '0'));
  ctx.fillStyle = gradient; ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
}
function reflection(x, y, color, height = 120) {
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let index = 0; index < 5; index++) {
    const offset = (index - 2) * 11;
    const gradient = ctx.createLinearGradient(0, y + 12, 0, y + height);
    gradient.addColorStop(0, color.replace('ALPHA', index === 2 ? '.15' : '.07'));
    gradient.addColorStop(1, color.replace('ALPHA', '0'));
    ctx.fillStyle = gradient;
    ctx.fillRect(x + offset - 2, y + 12 + index * 4, 4 + (index % 2) * 2, height - index * 11);
  }
  ctx.restore();
}
function drawImage(role, x, y, w, h, alpha = 1, frameIndex = 0) {
  const asset = images[role];
  if (!asset) return false;
  const { img } = asset;
  const frame = asset.frames?.length ? asset.frames[frameIndex % asset.frames.length] : asset.frame;
  const bounds = Array.isArray(frame) ? frame : frame && [frame.x, frame.y, frame.w, frame.h];
  const sourceW = bounds?.[2] || img.width, sourceH = bounds?.[3] || img.height;
  ctx.save(); ctx.globalAlpha = alpha;
  const ratio = Math.min(w / sourceW, h / sourceH);
  const iw = sourceW * ratio, ih = sourceH * ratio;
  if (bounds) ctx.drawImage(img, bounds[0], bounds[1], sourceW, sourceH, x - iw / 2, y - ih / 2, iw, ih);
  else ctx.drawImage(img, x - iw / 2, y - ih / 2, iw, ih);
  ctx.restore(); return true;
}

function drawFloor() {
  const mission = level();
  ctx.fillStyle = '#08121e'; ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.fillStyle = '#162a36'; ctx.fillRect(48, 48, 1504, 904);
  const floor = images[mission.floorRole] || images.ground;
  if (floor) {
    ctx.save(); ctx.beginPath(); ctx.rect(48, 48, 1504, 904); ctx.clip();
    ctx.globalAlpha = mission.id === 10 ? .2 : mission.id === 6 ? .29 : mission.id ? .39 : .31;
    for (let y = 48; y < 952; y += 230) for (let x = 48; x < 1552; x += 230) ctx.drawImage(floor.img, x, y, 230, 230);
    ctx.restore();
  }
  ctx.fillStyle = mission.accent + '16';
  if (mission.axis === 'vertical') ctx.fillRect(900, 48, 652, 904);
  else ctx.fillRect(48, 48, 1504, 350);
  for (let y = 64; y < HEIGHT; y += 80) for (let x = 64; x < WIDTH; x += 80) {
    const n = hash(x, y);
    ctx.strokeStyle = n > .6 ? '#8ab2be13' : '#728e9a0c'; ctx.lineWidth = 1;
    ctx.strokeRect(x + 2, y + 2, 77, 77);
    if (n > .74) { ctx.fillStyle = '#9bd8e510'; ctx.fillRect(x + 11, y + 17, 31, 2); ctx.fillRect(x + 12, y + 21, 16, 1); }
  }
  ctx.strokeStyle = mission.accent + '9a'; ctx.lineWidth = 3; ctx.setLineDash([25, 18]);
  ctx.beginPath();
  if (mission.axis === 'vertical') { ctx.moveTo(62, mission.waypoints[0].y); ctx.lineTo(1460, mission.waypoints[0].y); }
  else { ctx.moveTo(mission.waypoints[0].x, 60); ctx.lineTo(mission.waypoints[0].x, 940); }
  ctx.stroke(); ctx.setLineDash([]);
  for (const [x, y, rx, ry] of [[160, 450, 155, 42], [640, 855, 170, 35], [1160, 475, 155, 40], [1320, 830, 135, 30]]) {
    ctx.save(); ctx.translate(x, y); ctx.scale(rx, ry);
    const puddle = ctx.createRadialGradient(0, 0, .2, 0, 0, 1);
    puddle.addColorStop(0, '#477b8b41'); puddle.addColorStop(.7, '#3262731c'); puddle.addColorStop(1, '#32627300');
    ctx.fillStyle = puddle; ctx.beginPath(); ctx.arc(0, 0, 1, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  }
  ctx.strokeStyle = mission.accent + '5a'; ctx.lineWidth = 2; ctx.strokeRect(1205, 105, 325, 200);
  ctx.strokeStyle = '#9cabb219'; ctx.strokeRect(88, 735, 165, 165);
  for (let i = 0; i < 5; i++) {
    ctx.strokeStyle = '#77e7ef18'; ctx.strokeRect(1165 + i * 58, 95, 44, 24);
  }
  for (const [role, x, y, w, h] of level().decor || [
    ['drain', 152, 555, 72, 72], ['hatch', 382, 730, 75, 75], ['drain', 718, 460, 76, 76],
    ['hatch', 895, 882, 74, 74], ['drain', 1120, 485, 72, 72], ['hatch', 1450, 845, 88, 88],
    ...mission.waypoints.map(point => ['floorlight', point.x, point.y, 95, 45])
  ]) drawImage(role, x, y, w, h, .68);
}
function drawWall(rect) {
  ctx.fillStyle = '#01080fc0'; ctx.fillRect(rect.x + 8, rect.y + 10, rect.w, rect.h);
  ctx.fillStyle = '#344852'; ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.fillStyle = '#1d303b'; ctx.fillRect(rect.x + 5, rect.y + 5, Math.max(0, rect.w - 10), Math.max(0, rect.h - 10));
  ctx.strokeStyle = '#87a9ae53'; ctx.lineWidth = 2; ctx.strokeRect(rect.x + 1, rect.y + 1, rect.w - 2, rect.h - 2);
  if (rect.h > rect.w * 2) { ctx.fillStyle = '#e2a66373'; ctx.fillRect(rect.x + rect.w - 6, rect.y + 12, 3, rect.h - 24); }
}
function drawCover(box) {
  const cx = box.x + box.w / 2, cy = box.y + box.h / 2;
  ctx.save(); ctx.translate(cx + 7, cy + box.h * .28); ctx.scale(box.w * .8, box.h * .54);
  const shadow = ctx.createRadialGradient(0, 0, .15, 0, 0, 1);
  shadow.addColorStop(0, '#00070ad0'); shadow.addColorStop(1, '#00070a00');
  ctx.fillStyle = shadow; ctx.beginPath(); ctx.arc(0, 0, 1, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  if (drawImage(box.art, cx, cy - 5, box.w * 1.3, box.h * 1.6)) return;
  roundRect(box.x, box.y, box.w, box.h, 5, '#304754', '#62808a');
  roundRect(box.x + 7, box.y + 7, box.w - 14, box.h - 14, 2, '#253a46', '#54717e');
  ctx.fillStyle = box.art === 'server' ? '#46dbe2' : '#bb8f64';
  ctx.fillRect(box.x + 12, box.y + 12, Math.min(24, box.w - 24), 3);
  if (box.art === 'server') for (let i = 0; i < 3; i++) { ctx.fillStyle = i === 1 ? '#f2b775' : '#50e7eb'; ctx.fillRect(box.x + 14 + i * 16, box.y + box.h - 15, 5, 2); }
}
function drawCone(x, y, angle, radius, halfAngle, color, alpha) {
  ctx.save();
  const gradient = ctx.createRadialGradient(x, y, 15, x, y, radius);
  gradient.addColorStop(0, color.replace('ALPHA', String(alpha * .7)));
  gradient.addColorStop(1, color.replace('ALPHA', '0'));
  ctx.beginPath(); ctx.moveTo(x, y);
  for (let index = 0; index <= 36; index++) {
    const direction = angle - halfAngle + index / 36 * halfAngle * 2;
    const reach = rayDistance({ x, y }, direction, radius, solids());
    ctx.lineTo(x + Math.cos(direction) * reach, y + Math.sin(direction) * reach);
  }
  ctx.closePath();
  ctx.fillStyle = gradient; ctx.fill();
  ctx.strokeStyle = color.replace('ALPHA', String(alpha * .4)); ctx.lineWidth = 1; ctx.stroke();
  ctx.restore();
}
function drawSecurity() {
  const guardColor = game.coreTaken ? 'rgba(255,102,88,ALPHA)' : 'rgba(255,178,89,ALPHA)';
  for (const guard of game.guards) if (!guard.disabled && guard.stunned <= 0) drawCone(guard.x, guard.y, guard.angle, 225, .52, guardColor, .30);
  for (const camera of game.cameras) if (camera.stunned <= 0) drawCone(camera.x, camera.y, camera.angle, 280, .34, 'rgba(255,130,77,ALPHA)', .31);
}
function drawObjective(x, y, variant) {
  const t = game?.time || performance.now() / 1000;
  ctx.save(); ctx.translate(x, y);
  const pickup = variant !== 'exit';
  const active = pickup ? !game?.coreTaken : Boolean(game?.coreTaken);
  const color = pickup ? level().accent : '#fbb675';
  ctx.fillStyle = '#091a25'; ctx.beginPath(); ctx.ellipse(0, 17, 55, 29, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = color; ctx.globalAlpha = active ? .6 + Math.sin(t * 4) * .16 : .2; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.ellipse(0, 14, 59 + Math.sin(t * 3) * 4, 31 + Math.sin(t * 3) * 2, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.globalAlpha = 1;
  if (active && drawImage(pickup ? level().artifactRole : 'exit', 0, -15, pickup ? 87 : 74, 98)) { ctx.restore(); return; }
  if (pickup) {
    roundRect(-36, -10, 72, 52, 10, '#263e4a', '#66868e');
    ctx.fillStyle = active ? '#55e7ed' : '#405f68'; ctx.shadowColor = '#55ecf0'; ctx.shadowBlur = active ? 30 : 0;
    ctx.beginPath(); ctx.moveTo(0, -43); ctx.lineTo(22, -12); ctx.lineTo(0, 21); ctx.lineTo(-22, -12); ctx.closePath(); ctx.fill();
  } else {
    roundRect(-34, -10, 68, 45, 4, '#293c44', '#85969c');
    ctx.fillStyle = active ? '#ffbd72' : '#5c757f'; ctx.shadowColor = '#ffae54'; ctx.shadowBlur = active ? 26 : 0;
    ctx.fillRect(-17, -27, 34, 22);
  }
  ctx.restore();
}
function drawTerminal() {
  const terminal = level().terminal;
  if (drawImage('terminal', terminal.x, terminal.y - 8, 75, 94)) return;
  roundRect(terminal.x - 26, terminal.y - 29, 52, 58, 6, '#25404d', '#75939f');
  roundRect(terminal.x - 20, terminal.y - 24, 40, 28, 2, game?.terminalUsed ? '#344954' : '#248caa');
  ctx.fillStyle = game?.terminalUsed ? '#55727b' : '#8decf2'; ctx.fillRect(terminal.x - 12, terminal.y - 15, 24, 2);
}
function drawPerson(person, role, color) {
  const wobble = Math.sin((person.step || game.time * 2) * .5) * 1.2;
  ctx.save(); ctx.translate(person.x, person.y);
  if (person.disabled) ctx.globalAlpha = .48;
  ctx.fillStyle = '#02080dbb'; ctx.beginPath(); ctx.ellipse(0, 20, 31, 13, 0, 0, Math.PI * 2); ctx.fill();
  const facing = Math.abs(Math.cos(person.angle)) > Math.abs(Math.sin(person.angle)) ? (Math.cos(person.angle) >= 0 ? 'Right' : 'Left') : (Math.sin(person.angle) >= 0 ? 'Down' : 'Up');
  const animation = role + (person.moving || (role === 'guard' && !person.stunned) ? 'Walk' : 'Idle') + facing;
  if (drawImage(animation, 0, -15 + wobble, role === 'hero' ? 86 : 88, 91, 1, Math.floor(person.step || 0)) || drawImage(role, 0, -15 + wobble, role === 'hero' ? 75 : 72, 86)) { ctx.restore(); return; }
  ctx.rotate(person.angle + Math.PI / 2);
  ctx.fillStyle = '#0a1822'; ctx.beginPath(); ctx.ellipse(0, 2, 25, 31, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = color; ctx.beginPath(); ctx.ellipse(0, 0, 20, 25, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#142631'; ctx.beginPath(); ctx.ellipse(0, -7, 12, 13, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = role === 'hero' ? '#62edf4' : '#e9a260'; ctx.fillRect(-9, -24, 18, 5);
  ctx.restore();
}
function guidance() {
  const mission = game.level, p = game.player;
  const progress = point => mission.axis === 'vertical' ? point.x : -point.y;
  const steps = [...mission.waypoints].sort((a, b) => progress(a) - progress(b));
  if (!game.coreTaken) {
    const next = steps.find(point => progress(p) < progress(point) - 22);
    return next ? { ...next, label: 'ACCESS ROUTE' } : { ...mission.core, label: 'OBJECTIVE' };
  }
  const next = steps.reverse().find(point => progress(p) > progress(point) + 22);
  return next ? { ...next, label: 'RETURN ROUTE' } : { ...mission.exit, label: 'EXTRACTION' };
}
function viewTransform() {
  const mobile = innerWidth < 650;
  const scale = mobile ? .69 : .73;
  const viewW = canvas.width / scale, viewH = canvas.height / scale;
  const p = game?.player || level().start;
  const camX = mobile ? p.x - viewW / 2 : viewW >= WIDTH ? (WIDTH - viewW) / 2 : clamp(p.x - viewW / 2, 0, WIDTH - viewW);
  const camY = mobile ? p.y - viewH / 2 : viewH >= HEIGHT ? (HEIGHT - viewH) / 2 : clamp(p.y - viewH / 2, 0, HEIGHT - viewH);
  return { scale, camX, camY };
}
function drawWorld() {
  const { scale, camX, camY } = viewTransform();
  const p = game?.player || level().start;
  ctx.save();
  ctx.fillStyle = '#06111c'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.setTransform(scale, 0, 0, scale, -camX * scale + (Math.random() - .5) * (game?.shake || 0), -camY * scale + (Math.random() - .5) * (game?.shake || 0));
  drawFloor();
  for (const lamp of level().lamps) reflection(lamp.x, lamp.y, lamp.c === 'amber' ? 'rgba(255,171,83,ALPHA)' : 'rgba(76,228,248,ALPHA)');
  if (!game?.coreTaken) reflection(level().core.x, level().core.y, 'rgba(76,228,248,ALPHA)', 180);
  if (game) drawSecurity();
  for (const wall of level().walls) drawWall(wall);
  for (const [role, x, y, w, h] of [
    ['vent', 185, 250, 90, 90], ['pipe', 400, 160, 128, 95], ['cart', 620, 870, 77, 77],
    ['plant', 925, 120, 68, 79], ['cable', 938, 580, 78, 78], ['vent', 1100, 140, 88, 88],
    ['plant', 1490, 710, 68, 79], ['bollard', 1083, 578, 62, 80], ['bollard', 450, 365, 62, 80]
  ]) drawImage(role, x, y, w, h);
  for (const [index, cover] of level().covers.entries()) {
    drawCover(cover);
    if (game && (cover.art === 'crate' || cover.art === 'stack')) {
      const opened = game.openedBoxes.has(index);
      const x = cover.x + cover.w - 12, y = cover.y + 11;
      ctx.fillStyle = opened ? '#f5ad6a' : '#55e7ed';
      ctx.shadowColor = opened ? '#f5ad6a' : '#5feefa'; ctx.shadowBlur = 13;
      ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
      if (opened) { ctx.strokeStyle = '#ffe4b7'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, y, 9, 0, Math.PI * 2); ctx.stroke(); }
    }
  }
  for (const lamp of level().lamps) {
    if (drawImage('lamp', lamp.x, lamp.y - 16, 61, 91)) continue;
    const color = lamp.c === 'amber' ? '#f4b071' : '#53d5e6';
    ctx.fillStyle = '#283c48'; ctx.beginPath(); ctx.arc(lamp.x, lamp.y, 10, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = color; ctx.shadowColor = color; ctx.shadowBlur = 15; ctx.beginPath(); ctx.arc(lamp.x, lamp.y, 4, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
  }
  for (const camera of game?.cameras || []) {
    if (drawImage('camera', camera.x, camera.y, 60, 60, camera.stunned ? .5 : 1)) continue;
    ctx.fillStyle = '#445e68'; ctx.beginPath(); ctx.arc(camera.x, camera.y, 12, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = camera.stunned ? '#5d7782' : '#ffae63'; ctx.beginPath(); ctx.arc(camera.x, camera.y, 5, 0, Math.PI * 2); ctx.fill();
  }
  drawTerminal();
  drawImage('pedestal', level().core.x, level().core.y + 29, 100, 100);
  drawObjective(level().core.x, level().core.y, 'artifact'); drawObjective(level().exit.x, level().exit.y, 'exit');
  if (game) {
    for (const guard of game.guards) {
      drawPerson(guard, 'guard', guard.stunned ? '#496c79' : '#596c73');
      if (guard.stunned) { ctx.strokeStyle = '#70eefa'; ctx.beginPath(); ctx.arc(guard.x, guard.y - 38, 22, 0, Math.PI * 1.7); ctx.stroke(); }
      if (guard.fireFlash) {
        const x = guard.x + Math.cos(guard.fireAngle) * 27, y = guard.y + Math.sin(guard.fireAngle) * 27;
        glow(x, y, 40, 'rgba(255,152,78,ALPHA)', guard.fireFlash * 7);
        ctx.fillStyle = '#ffe6ab'; ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill();
      }
      if (guard.hitFlash) glow(guard.x, guard.y, 55, 'rgba(255,224,163,ALPHA)', guard.hitFlash * 6);
      if (guard.disabled) { ctx.strokeStyle = '#7eabb477'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(guard.x, guard.y, 24, 0, Math.PI * 2); ctx.stroke(); }
    }
    drawPerson(game.player, 'hero', '#40545c');
    if (game.player.fireFlash) {
      const x = game.player.x + Math.cos(game.player.fireAngle) * 27, y = game.player.y + Math.sin(game.player.fireAngle) * 27;
      glow(x, y, 42, 'rgba(255,222,154,ALPHA)', game.player.fireFlash * 7);
      ctx.fillStyle = '#fff0c7'; ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill();
    }
    for (const bullet of game.bullets) {
      ctx.strokeStyle = '#ff7959'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.shadowColor = '#ff5b3e'; ctx.shadowBlur = 16;
      ctx.beginPath(); ctx.moveTo(bullet.x - bullet.vx * .035, bullet.y - bullet.vy * .035); ctx.lineTo(bullet.x, bullet.y); ctx.stroke();
      ctx.fillStyle = '#ffe4aa'; ctx.beginPath(); ctx.arc(bullet.x, bullet.y, 4, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
    }
    for (const bullet of game.playerBullets) {
      ctx.strokeStyle = bullet.color; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.shadowColor = bullet.color; ctx.shadowBlur = 15;
      ctx.beginPath(); ctx.moveTo(bullet.x - bullet.vx * .035, bullet.y - bullet.vy * .035); ctx.lineTo(bullet.x, bullet.y); ctx.stroke();
      ctx.fillStyle = '#fff8e7'; ctx.beginPath(); ctx.arc(bullet.x, bullet.y, 3, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
    }
  }
  ctx.globalCompositeOperation = 'lighter';
  for (const lamp of level().lamps) glow(lamp.x, lamp.y, lamp.c === 'amber' ? 185 : 165, lamp.c === 'amber' ? 'rgba(242,166,74,ALPHA)' : 'rgba(66,219,238,ALPHA)', .95);
  glow(level().core.x, level().core.y, 205, 'rgba(56,227,248,ALPHA)', game?.coreTaken ? .25 : 1.4);
  glow(level().exit.x, level().exit.y, 135, 'rgba(250,166,92,ALPHA)', game?.coreTaken ? 1.2 : .42);
  if (game?.coreTaken) {
    const alarmStrength = .45 + Math.sin(game.time * 5) * .22;
    for (const { x, y } of [...level().waypoints, level().core]) glow(x, y, 180, 'rgba(255,68,66,ALPHA)', alarmStrength);
  }
  if (game?.pulse) { ctx.strokeStyle = `rgba(105,240,255,${game.pulse / .55})`; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(p.x, p.y, 210 * (1 - game.pulse / .55), 0, Math.PI * 2); ctx.stroke(); }
  ctx.globalCompositeOperation = 'source-over';
  ctx.restore();
  if (game?.mode === 'playing') {
    const target = guidance();
    const tx = (target.x - camX) * scale, ty = (target.y - camY) * scale;
    if (tx < 55 || tx > canvas.width - 55 || ty < 160 || ty > canvas.height - 75) {
      const mx = clamp(tx, 55, canvas.width - 55), my = clamp(ty, 165, canvas.height - 80);
      const color = game.coreTaken ? '#ffc47a' : '#70f3fc';
      ctx.save(); ctx.translate(mx, my); ctx.rotate(Math.PI / 4); ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.strokeRect(-11, -11, 22, 22); ctx.restore();
      ctx.fillStyle = color; ctx.font = '700 11px Inter, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(target.label, mx, my + 32);
    }
  }
  ctx.fillStyle = '#05111e0a'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (const drop of rain) {
    const y = (drop.y + (game?.time || performance.now() / 1000) * drop.speed) % (canvas.height + 40) - 20;
    const x = (drop.x + y * .11) % (canvas.width + 30) - 10;
    ctx.strokeStyle = '#a1dce321'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 5, y + drop.len); ctx.stroke();
  }
  const vignette = ctx.createRadialGradient(canvas.width / 2, canvas.height / 2, innerWidth < 650 ? 90 : 140, canvas.width / 2, canvas.height / 2, Math.max(canvas.width, canvas.height) * .62);
  vignette.addColorStop(0, '#00000000'); vignette.addColorStop(1, '#010712a8');
  ctx.fillStyle = vignette; ctx.fillRect(0, 0, canvas.width, canvas.height);
  if (game?.flash) { ctx.fillStyle = `rgba(128,241,255,${game.flash * .11})`; ctx.fillRect(0, 0, canvas.width, canvas.height); }
  if (game?.hitFlash) { ctx.fillStyle = `rgba(255,74,51,${game.hitFlash * .35})`; ctx.fillRect(0, 0, canvas.width, canvas.height); }
  if (game?.alert > 65) { ctx.strokeStyle = `rgba(255,75,70,${(game.alert - 65) / 175})`; ctx.lineWidth = 40; ctx.strokeRect(0, 0, canvas.width, canvas.height); }
}

function frame(now) {
  const dt = Math.min(.035, (now - last) / 1000 || 0);
  last = now; tick(dt); drawWorld(); requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

document.addEventListener('keydown', event => {
  if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(event.code)) event.preventDefault();
  keys.add(event.code);
  if (event.repeat) return;
  if (event.code === 'Enter' && !$('#mission-briefing').classList.contains('hidden')) newGame();
  else if (event.code === 'Enter' && game?.mode === 'won' && game.level.id < LEVELS.length - 1) showBriefing(game.level.id + 1);
  else if (event.code === 'Enter' && game?.mode === 'lost') newGame();
  else if (event.code === 'Escape') {
    if (!$('#mission-briefing').classList.contains('hidden')) showOperations();
    else if (!$('#operations').classList.contains('hidden')) showMenu();
    else if (game?.mode === 'loot') leaveLoot();
    else pause();
  }
  else if (event.code === 'KeyE') interact();
  else if (event.code === 'KeyQ') emp();
  else if (event.code === 'KeyR') reload();
  else if (event.code === 'Space' || event.code === 'KeyF') shoot();
});
document.addEventListener('keyup', event => keys.delete(event.code));
window.addEventListener('blur', () => { keys.clear(); aimPointer.down = false; touchFiring = false; if (game?.mode === 'playing') pause(); });
function updatePointer(event) {
  const bounds = canvas.getBoundingClientRect(), { scale, camX, camY } = viewTransform();
  aimPointer.x = camX + (event.clientX - bounds.left) * canvas.width / bounds.width / scale;
  aimPointer.y = camY + (event.clientY - bounds.top) * canvas.height / bounds.height / scale;
}
canvas.addEventListener('pointermove', updatePointer);
canvas.addEventListener('pointerdown', event => { if (event.button !== 0) return; updatePointer(event); aimPointer.down = true; shoot(aimPointer); });
window.addEventListener('pointerup', () => { aimPointer.down = false; touchFiring = false; });
window.addEventListener('pointercancel', () => { aimPointer.down = false; touchFiring = false; });
$('#start-button').addEventListener('click', showOperations);
$('#operations-back').addEventListener('click', showMenu);
$('#briefing-back').addEventListener('click', showOperations);
$('#launch-button').addEventListener('click', newGame);
$('#restart-button').addEventListener('click', newGame);
$('#next-button').addEventListener('click', () => showBriefing(game.level.id + 1));
$('#operations-result').addEventListener('click', showOperations);
$('#restart-pause').addEventListener('click', newGame);
$('#operations-pause').addEventListener('click', showOperations);
$('#pause-button').addEventListener('click', pause);
$('#resume-button').addEventListener('click', pause);
$('#equip-button').addEventListener('click', equipLoot);
$('#leave-button').addEventListener('click', leaveLoot);
$('#touch-emp').addEventListener('click', emp);
$('#touch-interact').addEventListener('click', interact);
$('#touch-fire').addEventListener('pointerdown', event => { event.preventDefault(); touchFiring = true; shoot(); });
const stick = $('#stick');
stick.addEventListener('pointerdown', event => { touch.pointer = event.pointerId; stick.setPointerCapture(event.pointerId); });
stick.addEventListener('pointermove', event => {
  if (touch.pointer !== event.pointerId) return;
  const box = stick.getBoundingClientRect();
  const x = (event.clientX - box.left - box.width / 2) / (box.width / 2);
  const y = (event.clientY - box.top - box.height / 2) / (box.height / 2);
  const d = Math.max(1, Math.hypot(x, y)); touch.x = x / d; touch.y = y / d;
  stick.firstElementChild.style.transform = `translate(${touch.x * 27}px,${touch.y * 27}px)`;
});
for (const type of ['pointerup', 'pointercancel']) stick.addEventListener(type, () => { touch.pointer = null; touch.x = touch.y = 0; stick.firstElementChild.style.transform = ''; });

// Read-only diagnostics for browser acceptance tests.
Object.defineProperty(window, 'BLACKOUT_STATE', { get: () => ({ selectedLevel, unlockedLevel, mode: game?.mode || 'menu', ...(game ? { level: game.level.id, player: { x: game.player.x, y: game.player.y }, time: game.time, alert: game.alert, coreTaken: game.coreTaken, escapeTime: game.escapeTime, empCooldown: game.empCooldown, terminalUsed: game.terminalUsed, openedBoxes: game.openedBoxes.size, boxWeapons: Object.fromEntries(game.boxWeapons), bullets: game.bullets.length, shotsFired: game.shotsFired || 0, playerBullets: game.playerBullets.length, playerShotsFired: game.playerShotsFired, weaponId: game.weaponId, ammo: game.ammo, reloadTimer: game.reloadTimer, guards: game.guards.map(guard => ({ x: guard.x, y: guard.y, angle: guard.angle, health: guard.health, disabled: guard.disabled, seeingPlayer: !guard.disabled && sees(guard, game.player, game.level.sightRange, .52, solids()) })) } : {}) }) });
