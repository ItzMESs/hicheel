// Локал хөгжүүлэлтийн сервер: статик файл + /api (Vercel-тэй ижил handler).
// Ашиглах: .env файлд DATABASE_URL, AUTH_SECRET бичээд `npm run dev` → http://localhost:3000
const http = require("http");
const fs = require("fs");
const path = require("path");
const root = path.join(__dirname, "..");
const envFile = path.join(root, ".env");
if (fs.existsSync(envFile)) {
  fs.readFileSync(envFile, "utf8").split(/\r?\n/).forEach((l) => {
    const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*"?(.*?)"?\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  });
}
const api = require("../api/index.js");
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json", ".png": "image/png", ".svg": "image/svg+xml", ".ico": "image/x-icon" };
const port = +process.env.PORT || 3000;
http.createServer((req, res) => {
  const u = new URL(req.url, "http://x");
  if (u.pathname.startsWith("/api/")) {
    u.searchParams.set("path", u.pathname.slice(5));
    req.url = "/api/index?" + u.searchParams.toString();
    return api(req, res);
  }
  let file = path.join(root, decodeURIComponent(u.pathname));
  if (!file.startsWith(root)) { res.statusCode = 403; return res.end(); }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, "index.html");
  fs.readFile(file, (err, data) => {
    if (err) { res.statusCode = 404; return res.end("Not found"); }
    res.setHeader("Content-Type", TYPES[path.extname(file)] || "application/octet-stream");
    res.end(data);
  });
}).listen(port, () => console.log(`Хичээл: http://localhost:${port}`));
