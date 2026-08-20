import { cp, mkdir, rm, writeFile } from "node:fs/promises";

const output = new URL("../pages-dist/", import.meta.url);
const catalog = new URL("../site/", import.meta.url);
const game = new URL("../games/last-light/public/", import.meta.url);
const lastLight = new URL("./last-light/", output);

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await cp(catalog, output, { recursive: true });
await mkdir(lastLight, { recursive: true });
await cp(game, lastLight, { recursive: true });
await writeFile(new URL("./.nojekyll", output), "");

console.log("Built GitHub Pages catalog and Last Light into pages-dist/");
