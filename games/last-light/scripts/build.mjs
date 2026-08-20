import { cp, mkdir, rm } from "node:fs/promises";

const source = new URL("../public/", import.meta.url);
const output = new URL("../dist/", import.meta.url);
const client = new URL("../dist/client/", import.meta.url);
const server = new URL("../dist/server/", import.meta.url);

await rm(output, { recursive: true, force: true });
await mkdir(client, { recursive: true });
await cp(source, client, { recursive: true });
await mkdir(server, { recursive: true });
await cp(new URL("./worker.mjs", import.meta.url), new URL("index.js", server));
console.log("Built Last Light into dist/");
