import { createReadStream } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";

const root = new URL("../public/", import.meta.url);

const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};

const rootPath = normalize(new URL(root).pathname);
const server = createServer((request, response) => {
  const requested = decodeURIComponent((request.url || "/").split("?")[0]);
  const relative = requested === "/" ? "index.html" : requested.replace(/^\/+/, "");
  const file = normalize(join(rootPath, relative));
  if (!file.startsWith(rootPath)) {
    response.writeHead(403).end("Forbidden");
    return;
  }
  const stream = createReadStream(file);
  stream.on("open", () => {
    response.writeHead(200, { "Content-Type": types[extname(file)] || "application/octet-stream" });
    stream.pipe(response);
  });
  stream.on("error", () => response.writeHead(404).end("Not found"));
});

server.listen(4173, "127.0.0.1", () => {
  console.log("Local: http://127.0.0.1:4173");
});
