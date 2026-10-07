/* Хичээл — service worker: офлайн кэш ба push мэдэгдэл */
const CACHE = "hicheel-v24";
const CORE = ["/", "/index.html", "/css/style.css?v=24", "/manifest.json", "/img/logo-zh.png", "/img/logo-zh-dark.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).catch(() => {}).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin || url.pathname.startsWith("/api/")) return;
  const isPage = req.mode === "navigate" || url.pathname === "/" || url.pathname.endsWith(".html");
  if (isPage) {
    // HTML: сүлжээ эхэлж, байхгүй бол кэш
    e.respondWith(fetch(req).then((r) => { const cp = r.clone(); caches.open(CACHE).then((c) => c.put(req, cp)); return r; }).catch(() => caches.match(req).then((r) => r || caches.match("/index.html"))));
    return;
  }
  // Статик (js/css/img): кэш эхэлж, ард нь шинэчилнэ
  e.respondWith(caches.match(req).then((hit) => {
    const net = fetch(req).then((r) => { if (r.ok) { const cp = r.clone(); caches.open(CACHE).then((c) => c.put(req, cp)); } return r; }).catch(() => hit);
    return hit || net;
  }));
});

self.addEventListener("push", (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (x) { d = { body: e.data && e.data.text() }; }
  e.waitUntil(self.registration.showNotification(d.title || "Хичээл", {
    body: d.body || "",
    icon: "/img/logo-zh.png",
    badge: "/img/logo-zh.png",
    tag: d.tag || undefined,
    data: { link: d.link || "#/notifications" }
  }));
});
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const link = (e.notification.data && e.notification.data.link) || "#/notifications";
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((cs) => {
    for (const c of cs) { if ("focus" in c) { c.postMessage({ link }); return c.focus(); } }
    return self.clients.openWindow("/" + (link.startsWith("#") ? link : "#" + link));
  }));
});
