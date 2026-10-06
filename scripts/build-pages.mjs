import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const output = new URL("../pages-dist/", import.meta.url);
const catalog = new URL("../site/", import.meta.url);
const game = new URL("../games/last-light/public/", import.meta.url);
const lastLight = new URL("./last-light/", output);
const emberhold = new URL("./emberhold/", output);

// Rebuild from source, never publish a stale local export. Linux CI installs
// the pinned Godot engine and templates through the game's build helper.
const build = spawnSync(process.execPath, [fileURLToPath(new URL("../games/emberhold/tools/build.mjs", import.meta.url))], { stdio: "inherit" });
if (build.status !== 0) process.exit(build.status || 1);

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await cp(catalog, output, { recursive: true });
await mkdir(lastLight, { recursive: true });
await cp(game, lastLight, { recursive: true });
await mkdir(emberhold, { recursive: true });
await cp(new URL("../games/emberhold/dist/", import.meta.url), emberhold, { recursive: true, filter: (source) => !source.endsWith('.import') });
await writeFile(new URL("./.nojekyll", output), "");

console.log("Built GitHub Pages catalog, Last Light and Emberhold into pages-dist/");
