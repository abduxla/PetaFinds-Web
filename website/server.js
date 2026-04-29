const http = require("http");
const fs = require("fs");
const path = require("path");

const root = __dirname;
const preferredPort = Number(process.env.PORT || 3000);
const maxPort = preferredPort + 20;
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};

function send(res, status, body, type = "text/plain; charset=utf-8") {
  res.writeHead(status, { "Content-Type": type });
  res.end(body);
}

function createStaticServer() {
  return http.createServer((req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const requested = url.pathname === "/" ? "/index.html" : decodeURIComponent(url.pathname);
    const filePath = path.normalize(path.join(root, requested));

    if (!filePath.startsWith(root)) {
      send(res, 403, "Forbidden");
      return;
    }

    fs.readFile(filePath, (error, data) => {
      if (error) {
        send(res, 404, "Not found");
        return;
      }

      send(res, 200, data, types[path.extname(filePath)] || "application/octet-stream");
    });
  });
}

function start(port) {
  const server = createStaticServer();

  server.on("error", (error) => {
    if (error.code === "EADDRINUSE" && !process.env.PORT && port < maxPort) {
      console.log(`Port ${port} busy, trying ${port + 1}...`);
      start(port + 1);
      return;
    }

    if (error.code === "EADDRINUSE") {
      console.error(`Port ${port} is already in use. Try: $env:PORT=3001; npm run dev`);
      process.exit(1);
    }

    throw error;
  });

  server.listen(port, () => {
    console.log(`PetaFinds website running at http://localhost:${port}`);
  });
}

start(preferredPort);
