/* Хичээл — нэгдсэн API (Vercel serverless функц).
   vercel.json дахь rewrite нь /api/<зам> бүрийг /api/index?path=<зам> руу чиглүүлнэ.
   Орчны хувьсагч: DATABASE_URL (Postgres), AUTH_SECRET (урт санамсаргүй мөр). */
const crypto = require("crypto");
const bcrypt = require("bcryptjs");

let prisma = null;
function db() {
  if (!prisma) {
    const { PrismaClient } = require("@prisma/client");
    prisma = globalThis.__prisma || new PrismaClient();
    globalThis.__prisma = prisma;
  }
  return prisma;
}

/* ---------------- Туслах ---------------- */
class HttpError extends Error { constructor(status, msg) { super(msg); this.status = status; } }
const fail = (status, msg) => { throw new HttpError(status, msg); };

function send(res, status, data, headers) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  if (headers) Object.entries(headers).forEach(([k, v]) => res.setHeader(k, v));
  res.end(JSON.stringify(data));
}

async function readBody(req) {
  if (req.body !== undefined && req.body !== null && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") { try { return JSON.parse(req.body || "{}"); } catch (e) { return {}; } }
  const chunks = [];
  let size = 0;
  for await (const c of req) {
    size += c.length;
    if (size > 3 * 1024 * 1024) fail(413, "Хэт том өгөгдөл");
    chunks.push(c);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}"); } catch (e) { return {}; }
}

const str = (v, max) => String(v == null ? "" : v).trim().slice(0, max);

function secret() {
  const s = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  if (!s || s.length < 16) fail(500, "AUTH_SECRET тохируулаагүй байна (Vercel → Settings → Environment Variables).");
  return s;
}
const b64u = (buf) => Buffer.from(buf).toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
function sign(payload) {
  const body = b64u(JSON.stringify(payload));
  const sig = b64u(crypto.createHmac("sha256", secret()).update(body).digest());
  return body + "." + sig;
}
function verify(token) {
  if (!token || token.indexOf(".") < 0) return null;
  const [body, sig] = token.split(".");
  const want = b64u(crypto.createHmac("sha256", secret()).update(body).digest());
  if (sig.length !== want.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(want))) return null;
  try {
    const p = JSON.parse(Buffer.from(body.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8"));
    return p.exp > Date.now() ? p : null;
  } catch (e) { return null; }
}
function cookies(req) {
  const out = {};
  String(req.headers.cookie || "").split(";").forEach((p) => {
    const i = p.indexOf("=");
    if (i > 0) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim());
  });
  return out;
}
const COOKIE = "hc_session";
const MAX_AGE = 60 * 60 * 24 * 30;
function sessionCookie(req, uid) {
  const secure = (req.headers["x-forwarded-proto"] || "").includes("https") ? "; Secure" : "";
  if (!uid) return `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
  const token = sign({ uid, exp: Date.now() + MAX_AGE * 1000 });
  return `${COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${MAX_AGE}${secure}`;
}
async function currentUser(req, required) {
  const p = verify(cookies(req)[COOKIE]);
  const user = p ? await db().user.findUnique({ where: { id: p.uid } }) : null;
  if (!user && required) fail(401, "Нэвтэрнэ үү.");
  return user;
}

const avatarUrl = (u) => (u.avatar ? `/api/avatar?id=${u.id}&v=${u.avatarAt ? new Date(u.avatarAt).getTime() : 0}` : null);
const publicUser = (u) => ({ id: u.id, name: u.name, avatarUrl: avatarUrl(u) });
const meUser = (u) => ({ id: u.id, email: u.email, name: u.name, bio: u.bio, created: u.createdAt, avatarUrl: avatarUrl(u) });
const isDataImage = (s, max) => typeof s === "string" && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(s) && s.length <= max;

async function notify(userId, text, link) {
  try { await db().notification.create({ data: { userId, text: str(text, 300), link: link || "" } }); } catch (e) { /* ignore */ }
}
async function areFriends(a, b) {
  const f = await db().friend.findFirst({ where: { status: "accepted", OR: [{ fromId: a, toId: b }, { fromId: b, toId: a }] } });
  return !!f;
}
const dmRoom = (a, b) => "dm:" + [a, b].sort().join(":");

/* ---------------- Маршрутууд ---------------- */
const routes = [];
const on = (method, pattern, fn) => routes.push({ method, re: new RegExp("^" + pattern.replace(/:(\w+)/g, "(?<$1>[^/]+)") + "$"), fn });

on("GET", "health", async () => {
  await db().$queryRaw`SELECT 1`;
  return { ok: true };
});

/* --- Бүртгэл / нэвтрэх --- */
on("POST", "auth/register", async (req, res, { body }) => {
  const name = str(body.name, 40), email = str(body.email, 120).toLowerCase(), password = String(body.password || "");
  if (name.length < 2) fail(400, "Нэр хамгийн багадаа 2 тэмдэгт байна.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail(400, "Имэйл хаяг буруу байна.");
  if (password.length < 6) fail(400, "Нууц үг хамгийн багадаа 6 тэмдэгт байна.");
  if (await db().user.findUnique({ where: { email } })) fail(409, "Энэ имэйлээр бүртгэл үүссэн байна.");
  const user = await db().user.create({ data: { name, email, passwordHash: await bcrypt.hash(password, 10) } });
  res.setHeader("Set-Cookie", sessionCookie(req, user.id));
  return { user: meUser(user) };
});
on("POST", "auth/login", async (req, res, { body }) => {
  const email = str(body.email, 120).toLowerCase();
  const user = await db().user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(String(body.password || ""), user.passwordHash))) fail(401, "Имэйл эсвэл нууц үг буруу байна.");
  res.setHeader("Set-Cookie", sessionCookie(req, user.id));
  return { user: meUser(user) };
});
on("POST", "auth/logout", async (req, res) => {
  res.setHeader("Set-Cookie", sessionCookie(req, null));
  return { ok: true };
});
on("GET", "auth/me", async (req) => {
  const u = await currentUser(req, true);
  return { user: meUser(u) };
});

/* --- Ахиц --- */
on("GET", "progress", async (req) => {
  const u = await currentUser(req, true);
  const p = await db().progress.findUnique({ where: { userId: u.id } });
  return { data: p ? p.data : null, updatedAt: p ? p.updatedAt : null };
});
on("PUT", "progress", async (req, res, { body }) => {
  const u = await currentUser(req, true);
  const data = body.data;
  if (!data || typeof data !== "object") fail(400, "Өгөгдөл буруу.");
  if (JSON.stringify(data).length > 2_000_000) fail(413, "Ахицын өгөгдөл хэт том байна.");
  const xp = Math.max(0, Math.min(1e9, parseInt(data.xp, 10) || 0));
  const streak = Math.max(0, Math.min(1e5, parseInt(data.streak, 10) || 0));
  const learned = data.learned && typeof data.learned === "object" ? Object.keys(data.learned).length : 0;
  const track = body.track === "en" ? "en" : "zh";
  await db().progress.upsert({
    where: { userId: u.id },
    create: { userId: u.id, data, xp, streak, learned, track },
    update: { data, xp, streak, learned, track }
  });
  return { ok: true };
});

/* --- Профайл --- */
on("PUT", "profile", async (req, res, { body }) => {
  const u = await currentUser(req, true);
  const data = {};
  if (body.name !== undefined) {
    const name = str(body.name, 40);
    if (name.length < 2) fail(400, "Нэр хамгийн багадаа 2 тэмдэгт байна.");
    data.name = name;
  }
  if (body.bio !== undefined) data.bio = str(body.bio, 300);
  if (body.avatar !== undefined) {
    if (body.avatar === null) { data.avatar = null; data.avatarAt = null; }
    else if (isDataImage(body.avatar, 300_000)) { data.avatar = body.avatar; data.avatarAt = new Date(); }
    else fail(400, "Зураг буруу эсвэл хэт том байна (300KB хүртэл).");
  }
  const nu = await db().user.update({ where: { id: u.id }, data });
  return { user: meUser(nu) };
});
on("POST", "profile/password", async (req, res, { body }) => {
  const u = await currentUser(req, true);
  if (!(await bcrypt.compare(String(body.old || ""), u.passwordHash))) fail(400, "Одоогийн нууц үг буруу байна.");
  if (String(body.new || "").length < 6) fail(400, "Шинэ нууц үг хамгийн багадаа 6 тэмдэгт байна.");
  await db().user.update({ where: { id: u.id }, data: { passwordHash: await bcrypt.hash(String(body.new), 10) } });
  return { ok: true };
});
on("DELETE", "profile", async (req, res) => {
  const u = await currentUser(req, true);
  await db().user.delete({ where: { id: u.id } });
  res.setHeader("Set-Cookie", sessionCookie(req, null));
  return { ok: true };
});

/* Профайлын зураг (кэштэй) */
on("GET", "avatar", async (req, res, { query }) => {
  const u = await db().user.findUnique({ where: { id: str(query.id, 40) }, select: { avatar: true } });
  if (!u || !u.avatar) fail(404, "Зураг алга");
  const m = u.avatar.match(/^data:(image\/\w+);base64,(.+)$/);
  res.statusCode = 200;
  res.setHeader("Content-Type", m[1]);
  res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  res.end(Buffer.from(m[2], "base64"));
  return undefined;
});

/* --- Хэрэглэгчид, тэргүүлэгчид --- */
on("GET", "leaderboard", async (req, res, { query }) => {
  const me = await currentUser(req, false);
  const where = query.track === "zh" || query.track === "en" ? { track: query.track } : {};
  const rows = await db().progress.findMany({ where, orderBy: [{ xp: "desc" }, { updatedAt: "asc" }], take: 50, include: { user: true } });
  const list = rows.map((r, i) => ({ rank: i + 1, ...publicUser(r.user), xp: r.xp, streak: r.streak, learned: r.learned, track: r.track, me: !!me && r.userId === me.id }));
  let mine = null;
  if (me && !list.some((x) => x.me)) {
    const p = await db().progress.findUnique({ where: { userId: me.id } });
    if (p) mine = { rank: (await db().progress.count({ where: { ...where, xp: { gt: p.xp } } })) + 1, ...publicUser(me), xp: p.xp, streak: p.streak, learned: p.learned, me: true };
  }
  return { list, mine };
});
on("GET", "users", async (req, res, { query }) => {
  const me = await currentUser(req, true);
  const q = str(query.q, 40);
  if (!q) return { users: [] };
  const users = await db().user.findMany({ where: { name: { contains: q, mode: "insensitive" }, NOT: { id: me.id } }, take: 20 });
  return { users: users.map(publicUser) };
});
on("GET", "users/:id", async (req, res, { params }) => {
  const me = await currentUser(req, true);
  const u = await db().user.findUnique({ where: { id: params.id }, include: { progress: true } });
  if (!u) fail(404, "Хэрэглэгч олдсонгүй.");
  const rel = await db().friend.findFirst({ where: { OR: [{ fromId: me.id, toId: u.id }, { fromId: u.id, toId: me.id }] } });
  const posts = await db().post.count({ where: { userId: u.id } });
  return {
    user: { ...publicUser(u), bio: u.bio, created: u.createdAt, xp: u.progress ? u.progress.xp : 0, streak: u.progress ? u.progress.streak : 0, learned: u.progress ? u.progress.learned : 0, posts },
    friend: !rel ? "none" : rel.status === "accepted" ? "friends" : rel.fromId === me.id ? "sent" : "received",
    self: me.id === u.id
  };
});

/* --- Найзууд --- */
on("GET", "friends", async (req) => {
  const me = await currentUser(req, true);
  const rows = await db().friend.findMany({ where: { OR: [{ fromId: me.id }, { toId: me.id }] }, include: { from: true, to: true }, orderBy: { createdAt: "desc" } });
  const friends = [], incoming = [], outgoing = [];
  rows.forEach((r) => {
    const other = r.fromId === me.id ? r.to : r.from;
    if (r.status === "accepted") friends.push(publicUser(other));
    else if (r.toId === me.id) incoming.push(publicUser(other));
    else outgoing.push(publicUser(other));
  });
  return { friends, incoming, outgoing };
});
on("POST", "friends/request", async (req, res, { body }) => {
  const me = await currentUser(req, true);
  const id = str(body.id, 40);
  if (id === me.id) fail(400, "Өөрийгөө нэмэх боломжгүй.");
  const other = await db().user.findUnique({ where: { id } });
  if (!other) fail(404, "Хэрэглэгч олдсонгүй.");
  const rev = await db().friend.findUnique({ where: { fromId_toId: { fromId: id, toId: me.id } } });
  if (rev) {
    await db().friend.update({ where: { id: rev.id }, data: { status: "accepted" } });
    await notify(id, `${me.name} таны найзын хүсэлтийг зөвшөөрлөө 🎉`, `#/u/${me.id}`);
    return { status: "friends" };
  }
  await db().friend.upsert({ where: { fromId_toId: { fromId: me.id, toId: id } }, create: { fromId: me.id, toId: id }, update: {} });
  await notify(id, `${me.name} танд найзын хүсэлт илгээлээ`, "#/friends");
  return { status: "sent" };
});
on("POST", "friends/accept", async (req, res, { body }) => {
  const me = await currentUser(req, true);
  const id = str(body.id, 40);
  const r = await db().friend.findUnique({ where: { fromId_toId: { fromId: id, toId: me.id } } });
  if (!r) fail(404, "Хүсэлт олдсонгүй.");
  await db().friend.update({ where: { id: r.id }, data: { status: "accepted" } });
  await notify(id, `${me.name} таны найзын хүсэлтийг зөвшөөрлөө 🎉`, `#/u/${me.id}`);
  return { status: "friends" };
});
on("POST", "friends/remove", async (req, res, { body }) => {
  const me = await currentUser(req, true);
  const id = str(body.id, 40);
  await db().friend.deleteMany({ where: { OR: [{ fromId: me.id, toId: id }, { fromId: id, toId: me.id }] } });
  return { status: "none" };
});

/* --- Чат --- */
async function checkRoom(me, room) {
  if (room === "public" || room === "zh" || room === "en") return room;
  const m = /^dm:(.+)$/.exec(room);
  if (!m) fail(400, "Өрөө буруу.");
  const other = m[1];
  if (!(await areFriends(me.id, other))) fail(403, "Зөвхөн найзууддаа хувийн зурвас бичих боломжтой.");
  return dmRoom(me.id, other);
}
on("GET", "chat", async (req, res, { query }) => {
  const me = await currentUser(req, true);
  const room = await checkRoom(me, str(query.room || "public", 80));
  const where = { room };
  if (query.after) where.createdAt = { gt: new Date(String(query.after)) };
  const msgs = await db().chatMessage.findMany({ where, orderBy: { createdAt: "desc" }, take: 60, include: { user: true } });
  return { room, messages: msgs.reverse().map((m) => ({ id: m.id, text: m.text, createdAt: m.createdAt, user: publicUser(m.user), mine: m.userId === me.id })) };
});
on("POST", "chat", async (req, res, { body }) => {
  const me = await currentUser(req, true);
  const room = await checkRoom(me, str(body.room || "public", 80));
  const text = str(body.text, 1000);
  if (!text) fail(400, "Хоосон зурвас.");
  const m = await db().chatMessage.create({ data: { room, userId: me.id, text } });
  if (room.startsWith("dm:")) {
    const other = room.slice(3).split(":").find((x) => x !== me.id);
    await notify(other, `💬 ${me.name}: ${text.slice(0, 80)}`, `#/chat/dm/${me.id}`);
  }
  return { id: m.id };
});
on("GET", "chat/rooms", async (req) => {
  const me = await currentUser(req, true);
  const rows = await db().friend.findMany({ where: { status: "accepted", OR: [{ fromId: me.id }, { toId: me.id }] }, include: { from: true, to: true } });
  return { friends: rows.map((r) => publicUser(r.fromId === me.id ? r.to : r.from)) };
});

/* --- Сошиал пост --- */
const KINDS = ["like", "love", "wow"];
async function postView(p, meId) {
  const counts = {};
  KINDS.forEach((k) => (counts[k] = 0));
  p.reactions.forEach((r) => { counts[r.kind] = (counts[r.kind] || 0) + 1; });
  return {
    id: p.id, text: p.text, image: p.image, createdAt: p.createdAt, user: publicUser(p.user), mine: p.userId === meId,
    reactions: counts, myReactions: p.reactions.filter((r) => r.userId === meId).map((r) => r.kind), comments: p._count.comments
  };
}
on("GET", "posts", async (req, res, { query }) => {
  const me = await currentUser(req, true);
  const where = query.user ? { userId: str(query.user, 40) } : {};
  if (query.before) where.createdAt = { lt: new Date(String(query.before)) };
  const posts = await db().post.findMany({ where, orderBy: { createdAt: "desc" }, take: 15, include: { user: true, reactions: true, _count: { select: { comments: true } } } });
  return { posts: await Promise.all(posts.map((p) => postView(p, me.id))) };
});
on("POST", "posts", async (req, res, { body }) => {
  const me = await currentUser(req, true);
  const text = str(body.text, 2000);
  const image = body.image ? (isDataImage(body.image, 900_000) ? body.image : fail(400, "Зураг буруу эсвэл хэт том байна.")) : null;
  if (!text && !image) fail(400, "Пост хоосон байна.");
  const p = await db().post.create({ data: { userId: me.id, text, image } });
  return { id: p.id };
});
on("DELETE", "posts/:id", async (req, res, { params }) => {
  const me = await currentUser(req, true);
  const p = await db().post.findUnique({ where: { id: params.id } });
  if (!p || p.userId !== me.id) fail(404, "Пост олдсонгүй.");
  await db().post.delete({ where: { id: p.id } });
  return { ok: true };
});
on("POST", "posts/:id/react", async (req, res, { params, body }) => {
  const me = await currentUser(req, true);
  const kind = KINDS.includes(body.kind) ? body.kind : "like";
  const p = await db().post.findUnique({ where: { id: params.id } });
  if (!p) fail(404, "Пост олдсонгүй.");
  const ex = await db().reaction.findUnique({ where: { postId_userId_kind: { postId: p.id, userId: me.id, kind } } });
  if (ex) await db().reaction.delete({ where: { id: ex.id } });
  else {
    await db().reaction.create({ data: { postId: p.id, userId: me.id, kind } });
    if (p.userId !== me.id) await notify(p.userId, `${me.name} таны постод ${{ like: "👍", love: "❤️", wow: "😮" }[kind]} дарлаа`, "#/social");
  }
  return { on: !ex };
});
on("GET", "posts/:id/comments", async (req, res, { params }) => {
  await currentUser(req, true);
  const cs = await db().comment.findMany({ where: { postId: params.id }, orderBy: { createdAt: "asc" }, take: 100, include: { user: true } });
  return { comments: cs.map((c) => ({ id: c.id, text: c.text, createdAt: c.createdAt, user: publicUser(c.user) })) };
});
on("POST", "posts/:id/comments", async (req, res, { params, body }) => {
  const me = await currentUser(req, true);
  const text = str(body.text, 1000);
  if (!text) fail(400, "Сэтгэгдэл хоосон байна.");
  const p = await db().post.findUnique({ where: { id: params.id } });
  if (!p) fail(404, "Пост олдсонгүй.");
  await db().comment.create({ data: { postId: p.id, userId: me.id, text } });
  if (p.userId !== me.id) await notify(p.userId, `${me.name} таны постод сэтгэгдэл бичлээ: ${text.slice(0, 60)}`, "#/social");
  return { ok: true };
});

/* --- Мэдэгдэл --- */
on("GET", "notifications", async (req) => {
  const me = await currentUser(req, true);
  const list = await db().notification.findMany({ where: { userId: me.id }, orderBy: { createdAt: "desc" }, take: 40 });
  const unread = await db().notification.count({ where: { userId: me.id, read: false } });
  const incoming = await db().friend.count({ where: { toId: me.id, status: "pending" } });
  return { list, unread, incoming };
});
on("POST", "notifications/read", async (req) => {
  const me = await currentUser(req, true);
  await db().notification.updateMany({ where: { userId: me.id, read: false }, data: { read: true } });
  return { ok: true };
});
on("DELETE", "notifications", async (req) => {
  const me = await currentUser(req, true);
  await db().notification.deleteMany({ where: { userId: me.id } });
  return { ok: true };
});

/* ---------------- Үндсэн handler ---------------- */
module.exports = async function handler(req, res) {
  const url = new URL(req.url, "http://x");
  const query = Object.fromEntries(url.searchParams.entries());
  let path = String(query.path || url.pathname.replace(/^\/api\/?/, "").replace(/^index\/?/, "")).replace(/^\/+|\/+$/g, "");
  delete query.path;
  try {
    const route = routes.find((r) => r.method === req.method && r.re.test(path));
    if (!route) {
      if (routes.some((r) => r.re.test(path))) fail(405, "Method not allowed");
      fail(404, "API олдсонгүй: " + path);
    }
    const params = route.re.exec(path).groups || {};
    const body = req.method === "GET" || req.method === "HEAD" ? {} : await readBody(req);
    const out = await route.fn(req, res, { body, query, params });
    if (out !== undefined && !res.writableEnded) send(res, 200, out);
  } catch (e) {
    const status = e.status || 500;
    if (status === 500) console.error(e);
    if (!res.writableEnded) send(res, status, { error: status === 500 && !e.status ? "Серверийн алдаа: " + (e.message || "").slice(0, 200) : e.message });
  }
};
