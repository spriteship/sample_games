import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const output = fileURLToPath(new URL('../media/screenshots/', import.meta.url));
await fs.mkdir(output, { recursive: true });
const endpoint = process.env.BLACKOUT_CDP_HTTP || 'http://127.0.0.1:9229';
const pageUrl = process.env.BLACKOUT_URL || 'http://127.0.0.1:4175/';
const tabs = await (await fetch(endpoint + '/json/list')).json();
const tab = tabs.find(item => item.url === pageUrl);
if (!tab) throw new Error('Open BLACKOUT in a Chrome CDP tab first');
const socket = new WebSocket(tab.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  socket.addEventListener('open', resolve, { once: true });
  socket.addEventListener('error', reject, { once: true });
});
let id = 0;
const pending = new Map();
socket.addEventListener('message', event => {
  const message = JSON.parse(event.data);
  if (pending.has(message.id)) {
    pending.get(message.id)(message);
    pending.delete(message.id);
  }
});
const send = (method, params = {}) => new Promise(resolve => {
  const next = ++id;
  pending.set(next, resolve);
  socket.send(JSON.stringify({ id: next, method, params }));
});
const evaluate = async expression => {
  const response = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (response.error || response.result?.exceptionDetails) throw new Error(JSON.stringify(response));
  return response.result.result.value;
};
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const screenshot = async name => {
  const response = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  await fs.writeFile(path.join(output, name + '.png'), Buffer.from(response.result.data, 'base64'));
  console.log(name);
};

try {
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });
  if ((await evaluate('window.BLACKOUT_STATE?.mode')) === 'won') {
    // Refresh the extraction screen after visual changes without replaying the mission.
    await screenshot('07-extraction');
  }
  for (const [index, name] of [[1, '08-cargo-dock'], [3, '09-hydroponics'], [6, '10-cryo-lab'], [10, '11-command-spire']]) {
    await send('Page.navigate', { url: pageUrl });
    await sleep(550);
    await evaluate('localStorage.setItem("blackout-unlocked", "10")');
    await send('Page.navigate', { url: pageUrl });
    await sleep(550);
    await evaluate('document.querySelector("#start-button").click()');
    await sleep(150);
    await evaluate(`document.querySelectorAll('.mission-card')[${index}].click()`);
    await sleep(150);
    await evaluate('document.querySelector("#launch-button").click()');
    await sleep(900);
    await screenshot(name);
  }
  await evaluate(`(() => {
    document.querySelector('#result-kicker').textContent = 'EXTRACTION COMPLETE // 01 / 11';
    document.querySelector('#result-title').textContent = 'Core Heist clear.';
    document.querySelector('#result-copy').textContent = 'RETRIEVE POWER CORE secured. Flooded Cargo Dock is now unlocked.';
    document.querySelector('#result-time').textContent = '00:30';
    document.querySelector('#result-alert').textContent = '50%';
    document.querySelector('#result-emp').textContent = '2';
    document.querySelector('#restart-button span').textContent = 'REPLAY MISSION';
    document.querySelector('#next-button').classList.remove('hidden');
    document.querySelector('#result').classList.remove('hidden');
  })()`);
  await sleep(150);
  await screenshot('07-extraction');
} finally {
  socket.close();
}
