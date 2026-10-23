import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { LEVELS } from '../public/levels.js';
import { WIDTH, HEIGHT, circleOverlapsRect } from '../public/world.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const media = path.join(root, 'media');
const screenshots = path.join(media, 'screenshots');
const frames = path.join(root, '.recording-frames');
const endpoint = process.env.BLACKOUT_CDP_HTTP || 'http://127.0.0.1:9229';
const pageUrl = process.env.BLACKOUT_URL || 'http://127.0.0.1:4175/';
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
await fs.mkdir(screenshots, { recursive: true });
await fs.rm(frames, { recursive: true, force: true });
await fs.mkdir(frames, { recursive: true });

const tabs = await (await fetch(endpoint + '/json/list')).json();
const tab = tabs.find(item => item.url === pageUrl);
if (!tab) throw new Error('Open BLACKOUT in a Chrome CDP tab first');
const socket = new WebSocket(tab.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }); });
let serial = 0;
let frameCount = 0;
let recording = false;
const pending = new Map();
const frameWrites = [];
socket.addEventListener('message', event => {
  const message = JSON.parse(event.data);
  if (pending.has(message.id)) { pending.get(message.id)(message); pending.delete(message.id); }
  if (message.method === 'Page.screencastFrame') {
    if (recording) {
      const filename = path.join(frames, String(frameCount++).padStart(6, '0') + '.jpg');
      frameWrites.push(fs.writeFile(filename, Buffer.from(message.params.data, 'base64')));
    }
    socket.send(JSON.stringify({ id: ++serial, method: 'Page.screencastFrameAck', params: { sessionId: message.params.sessionId } }));
  }
});
const send = (method, params = {}) => new Promise(resolve => {
  const id = ++serial; pending.set(id, resolve);
  socket.send(JSON.stringify({ id, method, params }));
});
async function evaluate(expression) {
  const response = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (response.error || response.result?.exceptionDetails) throw new Error(JSON.stringify(response));
  return response.result.result.value;
}
async function click(selector) { await evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`); }
async function screenshot(name) {
  const response = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  await fs.writeFile(path.join(screenshots, name + '.png'), Buffer.from(response.result.data, 'base64'));
  console.log('SCREENSHOT', name);
}
const held = new Set();
async function setKeys(next) {
  for (const code of [...held]) if (!next.has(code)) {
    await send('Input.dispatchKeyEvent', { type: 'keyUp', code, key: code.slice(3).toLowerCase(), windowsVirtualKeyCode: code.charCodeAt(3) });
    held.delete(code);
  }
  for (const code of next) if (!held.has(code)) {
    await send('Input.dispatchKeyEvent', { type: 'keyDown', code, key: code.slice(3).toLowerCase(), windowsVirtualKeyCode: code.charCodeAt(3) });
    held.add(code);
  }
}
async function tap(code) { await setKeys(new Set([...held, code])); await sleep(75); await setKeys(new Set([...held].filter(item => item !== code))); }
const cell = 20, columns = WIDTH / cell, rows = HEIGHT / cell;
const cellKey = ([x, y]) => `${x},${y}`;
function route(from, to, mission) {
  const start = [Math.floor(from.x / cell), Math.floor(from.y / cell)];
  const goal = [Math.floor(to.x / cell), Math.floor(to.y / cell)];
  const blocked = ([x, y]) => x < 0 || y < 0 || x >= columns || y >= rows || mission.obstacles.some(rect => circleOverlapsRect(x * cell + 10, y * cell + 10, 17, rect));
  const frontier = [{ point: start, score: 0 }], previous = new Map(), cost = new Map([[cellKey(start), 0]]);
  while (frontier.length) {
    frontier.sort((a, b) => a.score - b.score);
    const current = frontier.shift().point;
    if (cellKey(current) === cellKey(goal)) {
      const points = [current]; let step = current;
      while (cellKey(step) !== cellKey(start)) { step = previous.get(cellKey(step)); points.push(step); }
      return points.reverse().map(([x, y]) => ({ x: x * cell + 10, y: y * cell + 10 })).slice(1).concat([to]);
    }
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const next = [current[0] + dx, current[1] + dy], nextKey = cellKey(next), nextCost = cost.get(cellKey(current)) + 1;
      if (blocked(next) || nextCost >= (cost.get(nextKey) ?? Infinity)) continue;
      cost.set(nextKey, nextCost); previous.set(nextKey, current);
      frontier.push({ point: next, score: nextCost + Math.abs(next[0] - goal[0]) + Math.abs(next[1] - goal[1]) });
    }
  }
  throw new Error('No route to objective');
}

try {
  await send('Page.enable'); await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: pageUrl });
  await sleep(900);
  await screenshot('01-title');
  await click('#start-button'); await sleep(350); await screenshot('02-operations');
  await click('.mission-card:nth-child(1)'); await sleep(350); await screenshot('03-briefing');

  recording = true;
  await send('Page.startScreencast', { format: 'jpeg', quality: 82, maxWidth: 1280, maxHeight: 720, everyNthFrame: 4 });
  await sleep(900);
  await click('#launch-button');
  const mission = LEVELS[0];
  let state = await evaluate('window.BLACKOUT_STATE');
  let waypoints = route(state.player, mission.core, mission), waypoint = 0;
  let tookObjective = false, capturedGameplay = false, capturedCombat = false, capturedLoot = false;
  let finished = false, lastReport = -1, stationary = 0, lastPosition = state.player;
  for (let iteration = 0; iteration < 1800; iteration++) {
    state = await evaluate('window.BLACKOUT_STATE');
    if (state.mode === 'loot') {
      if (!capturedLoot) { await sleep(300); await screenshot('05-pistol-cache'); capturedLoot = true; await sleep(750); }
      await tap('KeyE'); continue;
    }
    if (state.mode === 'won') { finished = true; await setKeys(new Set()); await sleep(800); await screenshot('07-extraction'); await sleep(1000); break; }
    if (state.mode !== 'playing') throw new Error('Autoplay ended in ' + state.mode);
    if (Math.floor(state.time / 5) !== lastReport) {
      lastReport = Math.floor(state.time / 5);
      console.log('PROGRESS', state.time.toFixed(1), waypoint + '/' + waypoints.length, Math.round(state.alert), JSON.stringify(state.player));
    }
    if (state.time > 4 && !capturedGameplay) { await screenshot('04-gameplay'); capturedGameplay = true; }
    if (state.time > 9 && !capturedCombat) { await screenshot('06-security'); capturedCombat = true; }
    const prompt = await evaluate("document.querySelector('#prompt').classList.contains('hidden') ? '' : document.querySelector('#prompt-text').textContent");
    if (prompt.startsWith('TAKE ') || prompt === 'EXTRACT' || prompt === 'OPEN SUPPLY CACHE') await tap('KeyE');
    if (state.alert > 25 && state.empCooldown === 0) await tap('KeyQ');
    if (state.coreTaken && !tookObjective) { waypoints = route(state.player, mission.exit, mission); waypoint = 0; tookObjective = true; }
    if (waypoint >= waypoints.length) { await setKeys(new Set()); await sleep(70); continue; }
    const target = waypoints[waypoint], dx = target.x - state.player.x, dy = target.y - state.player.y;
    if (Math.hypot(dx, dy) < 11) { waypoint++; stationary = 0; continue; }
    const next = new Set();
    if (Math.abs(dx) > 2) next.add(dx > 0 ? 'KeyD' : 'KeyA');
    if (Math.abs(dy) > 2) next.add(dy > 0 ? 'KeyS' : 'KeyW');
    if (state.guards.some(guard => !guard.disabled && guard.seeingPlayer && Math.hypot(guard.x - state.player.x, guard.y - state.player.y) < 380)) next.add('Space');
    await setKeys(next);
    await sleep(Math.min(70, Math.max(30, Math.hypot(dx, dy) / 190 * 650)));
    await setKeys(new Set());
    stationary = Math.hypot(state.player.x - lastPosition.x, state.player.y - lastPosition.y) < .4 ? stationary + 1 : 0;
    lastPosition = state.player;
    if (stationary > 10) { waypoint++; stationary = 0; console.log('SKIP BLOCKED WAYPOINT', waypoint); }
  }
  if (!finished) throw new Error('Autoplay did not extract within the recording limit');
  recording = false;
  await send('Page.stopScreencast');
  await Promise.all(frameWrites);
  await fs.writeFile(path.join(media, 'recording.json'), JSON.stringify({ frames: frameCount, nominalFps: 15, mission: mission.name, extracted: finished }, null, 2) + '\n');
  console.log('RECORDED', frameCount, 'frames');
} finally {
  recording = false;
  await setKeys(new Set());
  socket.close();
}
