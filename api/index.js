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
  if (user && user.banned && required) fail(403, "Таны бүртгэл админаар хаагдсан байна.");
  if (user && Date.now() - new Date(user.lastSeen).getTime() > 5 * 60 * 1000) {
    db().user.update({ where: { id: user.id }, data: { lastSeen: new Date() } }).catch(() => {});
  }
  return user;
}
const ADMIN_EMAILS = () => String(process.env.ADMIN_EMAILS || "").toLowerCase().split(",").map((x) => x.trim()).filter(Boolean);
const isAdmin = (u) => !!u && (u.isAdmin || ADMIN_EMAILS().includes(u.email));
async function adminUser(req) {
  const u = await currentUser(req, true);
  if (!isAdmin(u)) fail(403, "Зөвхөн админ хандах эрхтэй.");
  return u;
}
function origin(req) {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/+$/, "");
  const host = req.headers["x-forwarded-host"] || req.headers.host || "localhost:3000";
  const proto = String(req.headers["x-forwarded-proto"] || (host.startsWith("localhost") ? "http" : "https")).split(",")[0];
  return `${proto}://${host}`;
}
// Хурдны хязгаар: тухайн хугацаанд хэдэн бичлэг хийсэн бэ
async function limit(model, userId, seconds, max, msg, field) {
  const n = await db()[model].count({ where: { [field || "userId"]: userId, createdAt: { gt: new Date(Date.now() - seconds * 1000) } } });
  if (n >= max) fail(429, msg || "Хэт олон удаа илгээлээ. Түр хүлээгээд дахин оролдоно уу.");
}
// Блоклосон / блоклогдсон хэрэглэгчдийн ID
async function blockedIds(meId) {
  const rows = await db().block.findMany({ where: { OR: [{ blockerId: meId }, { blockedId: meId }] } });
  return rows.map((r) => (r.blockerId === meId ? r.blockedId : r.blockerId));
}

const avatarUrl = (u) => (u.avatar ? `/api/avatar?id=${u.id}&v=${u.avatarAt ? new Date(u.avatarAt).getTime() : 0}` : null);
const SYSTEM_EMAIL = "system@hicheel.invalid";
const publicUser = (u) => (u.email === SYSTEM_EMAIL ? { id: u.id, name: u.name, avatarUrl: null, system: true } : { id: u.id, name: u.name, avatarUrl: avatarUrl(u) });
let systemUserCache = null;
async function systemUser() {
  if (systemUserCache) return systemUserCache;
  systemUserCache = await db().user.upsert({
    where: { email: SYSTEM_EMAIL },
    create: { email: SYSTEM_EMAIL, name: "Систем", passwordHash: await bcrypt.hash(crypto.randomBytes(24).toString("hex"), 10) },
    update: {}
  });
  return systemUserCache;
}
const meUser = (u) => ({ id: u.id, email: u.email, name: u.name, bio: u.bio, created: u.createdAt, avatarUrl: avatarUrl(u), isAdmin: isAdmin(u), premium: { zh: u.premiumZh || null, en: u.premiumEn || null } });
const isDataImage = (s, max) => typeof s === "string" && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(s) && s.length <= max;

async function notify(userId, text, link, actorId) {
  try {
    const n = await db().notification.create({ data: { userId, text: str(text, 300), link: link || "", actorId: actorId || null } });
    await sendPush(userId, { title: "Хичээл", body: n.text, link: n.link, tag: n.id });
  } catch (e) { /* ignore */ }
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
  return {
    ok: true,
    features: { email: !!process.env.RESEND_API_KEY, push: true }
  };
});

/* --- Бүртгэл / нэвтрэх --- */
on("POST", "auth/register", async (req, res, { body }) => {
  const name = str(body.name, 40), email = str(body.email, 120).toLowerCase(), password = String(body.password || "");
  if (name.length < 2) fail(400, "Нэр хамгийн багадаа 2 тэмдэгт байна.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail(400, "Имэйл хаяг буруу байна.");
  if (password.length < 6) fail(400, "Нууц үг хамгийн багадаа 6 тэмдэгт байна.");
  if (email === SYSTEM_EMAIL || (await db().user.findUnique({ where: { email } }))) fail(409, "Энэ имэйлээр бүртгэл үүссэн байна.");
  const user = await db().user.create({ data: { name, email, passwordHash: await bcrypt.hash(password, 10) } });
  res.setHeader("Set-Cookie", sessionCookie(req, user.id));
  return { user: meUser(user) };
});
on("POST", "auth/login", async (req, res, { body }) => {
  const email = str(body.email, 120).toLowerCase();
  const user = await db().user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(String(body.password || ""), user.passwordHash))) fail(401, "Имэйл эсвэл нууц үг буруу байна.");
  if (user.banned) fail(403, "Таны бүртгэл админаар хаагдсан байна.");
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
  let xp = Math.max(0, Math.min(1e9, parseInt(data.xp, 10) || 0));
  const days = Math.floor((Date.now() - new Date(u.createdAt).getTime()) / 864e5) + 1;
  const streak = Math.max(0, Math.min(days, parseInt(data.streak, 10) || 0)); // бүртгэлээс урт байж болохгүй
  const learned = data.learned && typeof data.learned === "object" ? Object.keys(data.learned).length : 0;
  const track = body.track === "en" ? "en" : "zh";
  // XP-г хуурамчаар өсгөхөөс хамгаалах: минутад ~60, нэг дор 200, өдөрт 3000 XP-ээс илүү нэмэгдэхгүй
  const prev = await db().progress.findUnique({ where: { userId: u.id } });
  const today = new Date().toISOString().slice(0, 10);
  const XP_BURST = 200, XP_PER_MIN = 60, XP_DAY = 3000;
  let xpMeta = {}, clamped = false;
  const prevXp = prev ? prev.xp : 0;
  if (xp > prevXp) {
    const dayGain = prev && prev.xpDay === today ? prev.xpDayGain : 0;
    // Хуримтлагдах хязгаар (token bucket): xpAt нь «сав хоосон байх» агшин
    // Өдрийн анхны XP-д сав дүүрэн байна (шинэ хэрэглэгч ч мөн адил)
    const tokens = prev && prev.xpDay === today ? Math.min(XP_BURST, Math.max(0, ((Date.now() - new Date(prev.xpAt).getTime()) / 60000) * XP_PER_MIN)) : XP_BURST;
    const allowed = Math.max(0, Math.min(Math.floor(tokens), XP_DAY - dayGain));
    const grant = Math.min(xp - prevXp, allowed);
    clamped = grant < xp - prevXp;
    xp = prevXp + grant;
    xpMeta = { xpAt: new Date(Date.now() - ((tokens - grant) / XP_PER_MIN) * 60000), xpDay: today, xpDayGain: dayGain + grant };
  }
  const saved = Object.assign({}, data, { xp, streak });
  await db().progress.upsert({
    where: { userId: u.id },
    create: Object.assign({ userId: u.id, data: saved, xp, streak, learned, track }, xpMeta),
    update: Object.assign({ data: saved, xp, streak, learned, track }, xpMeta)
  });
  if (prev) {
    // Ахицын үйл явдал: түвшин ахих (3+), шинэ тэмдэг, дараалсан өдрийн чухал тоо
    const oldBadges = new Set((prev.data && prev.data.badges) || []);
    const newBadge = (Array.isArray(data.badges) ? data.badges : []).find((b) => !oldBadges.has(b) && BADGE_NAMES[b]);
    let ev = null;
    if (lvlOf(xp) > lvlOf(prevXp) && lvlOf(xp) >= 3) ev = { kind: "level", n: lvlOf(xp) };
    else if (newBadge) ev = { kind: "badge", id: newBadge };
    else if ([7, 30, 50, 100, 200, 365].includes(streak) && (prev.streak || 0) < streak) ev = { kind: "streak", n: streak };
    if (ev) await celebrate(u, ev);
  }
  return { ok: true, xp, streak, clamped };
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
  const where = { user: { banned: false } };
  if (query.track === "zh" || query.track === "en") where.track = query.track;
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
  const bl = await blockedIds(me.id);
  const users = await db().user.findMany({ where: { name: { contains: q, mode: "insensitive" }, banned: false, email: { not: SYSTEM_EMAIL }, id: { notIn: [me.id, ...bl] } }, take: 20 });
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
    blocked: !!(await db().block.findUnique({ where: { blockerId_blockedId: { blockerId: me.id, blockedId: u.id } } })),
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
  if ((await blockedIds(me.id)).includes(id)) fail(403, "Энэ хэрэглэгчтэй харилцах боломжгүй.");
  const recent = await db().friend.count({ where: { fromId: me.id, createdAt: { gt: new Date(Date.now() - 3600e3) } } });
  if (recent >= 30) fail(429, "Цагт 30-аас олон найзын хүсэлт илгээх боломжгүй.");
  const rev = await db().friend.findUnique({ where: { fromId_toId: { fromId: id, toId: me.id } } });
  if (rev) {
    await db().friend.update({ where: { id: rev.id }, data: { status: "accepted" } });
    await notify(id, `${me.name} таны найзын хүсэлтийг зөвшөөрлөө 🎉`, `#/u/${me.id}`, me.id);
    return { status: "friends" };
  }
  await db().friend.upsert({ where: { fromId_toId: { fromId: me.id, toId: id } }, create: { fromId: me.id, toId: id }, update: {} });
  await notify(id, `${me.name} танд найзын хүсэлт илгээлээ`, `#/friends?from=${me.id}`, me.id);
  return { status: "sent" };
});
on("POST", "friends/accept", async (req, res, { body }) => {
  const me = await currentUser(req, true);
  const id = str(body.id, 40);
  const r = await db().friend.findUnique({ where: { fromId_toId: { fromId: id, toId: me.id } } });
  if (!r) fail(404, "Хүсэлт олдсонгүй.");
  await db().friend.update({ where: { id: r.id }, data: { status: "accepted" } });
  await notify(id, `${me.name} таны найзын хүсэлтийг зөвшөөрлөө 🎉`, `#/u/${me.id}`, me.id);
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
  if ((await blockedIds(me.id)).includes(other)) fail(403, "Энэ хэрэглэгчтэй харилцах боломжгүй.");
  return dmRoom(me.id, other);
}
const reactOut = (rs, meId) => ({ count: rs.length, mine: rs.some((r) => r.userId === meId), users: rs.slice(0, 3).map((r) => publicUser(r.user)) });
const chatOut = (m, meId) => ({ id: m.id, text: m.text, image: m.image || null, createdAt: m.createdAt, user: publicUser(m.user), mine: m.userId === meId, system: m.system, meta: m.meta || null, pinned: m.pinned, react: reactOut(m.reactions || [], meId) });
async function canSeeRoom(me, room) {
  if (room === "public" || room === "zh" || room === "en") return true;
  return room.startsWith("dm:") && room.slice(3).split(":").includes(me.id);
}
on("POST", "chat/:id/react", async (req, res, { params }) => {
  const me = await currentUser(req, true);
  const m = await db().chatMessage.findUnique({ where: { id: params.id } });
  if (!m || !(await canSeeRoom(me, m.room))) fail(404, "Зурвас олдсонгүй.");
  const ex = await db().chatReaction.findUnique({ where: { messageId_userId: { messageId: m.id, userId: me.id } } });
  if (ex) await db().chatReaction.delete({ where: { id: ex.id } });
  else await db().chatReaction.create({ data: { messageId: m.id, userId: me.id } });
  const rs = await db().chatReaction.findMany({ where: { messageId: m.id }, include: { user: true }, orderBy: { createdAt: "desc" } });
  return { react: reactOut(rs, me.id) };
});
on("GET", "chat/:id/reactions", async (req, res, { params }) => {
  const me = await currentUser(req, true);
  const m = await db().chatMessage.findUnique({ where: { id: params.id } });
  if (!m || !(await canSeeRoom(me, m.room))) fail(404, "Зурвас олдсонгүй.");
  const rs = await db().chatReaction.findMany({ where: { messageId: m.id }, include: { user: true }, orderBy: { createdAt: "desc" }, take: 200 });
  return { users: rs.map((r) => publicUser(r.user)) };
});
on("POST", "chat/:id/pin", async (req, res, { params }) => {
  await adminUser(req);
  const m = await db().chatMessage.findUnique({ where: { id: params.id } });
  if (!m) fail(404, "Зурвас олдсонгүй.");
  if (!m.pinned) await db().chatMessage.updateMany({ where: { room: m.room, pinned: true }, data: { pinned: false } });
  await db().chatMessage.update({ where: { id: m.id }, data: { pinned: !m.pinned } });
  return { pinned: !m.pinned };
});

/* --- Ахиц гаргасан хэрэглэгчид нийтийн чатад баяр хүргэх --- */
const BADGE_NAMES = { w1: "Анхны үг", w50: "50 үг", w200: "200 үг", w1000: "Мянган үг", s3: "3 өдөр дараалан", s7: "7 хоног дараалан", s30: "Сар дараалан", t1: "Анхны тест", t10: "10 тест", t100: "Төгс оноо", r100: "Картын мастер", g10: "Тоглогч", l10: "Чих сайтай", wr3: "Зохиолч", m1: "Жишиг шалгалт", lv10: "10-р түвшин", xp5k: "5000 XP", q7: "Даалгаврын баатар" };
const lvlOf = (x) => Math.floor(Math.sqrt((x || 0) / 25)) + 1;
async function celebrate(u, ev) {
  try {
    const sys = await systemUser();
    // Нэг хэрэглэгчид 10 минутад нэгээс олон баяр хүргэлт гаргахгүй
    const recent = await db().chatMessage.findFirst({ where: { system: true, createdAt: { gt: new Date(Date.now() - 600e3) }, meta: { path: ["uid"], equals: u.id } } });
    if (recent) return;
    const at = "@" + u.name;
    const t = ev.kind === "level" ? [`${at} ${ev.n}-р түвшинд хүрлээ! Баяр хүргэе! 🎉`, `${at} 升到了第${ev.n}级，祝贺！🎉`]
      : ev.kind === "badge" ? [`${at} «${BADGE_NAMES[ev.id]}» тэмдэг авлаа! Баяр хүргэе! 🏅`, `${at} 获得了新徽章，祝贺！🏅`]
      : ev.kind === "streak" ? [`${at} ${ev.n} өдөр дараалан хичээллэлээ! Баяр хүргэе! 🔥`, `${at} 连续学习${ev.n}天，祝贺！🔥`]
      : [`${at} явцаа ахиулж чадлаа. Баяр хүргэе! 🎉`, `${at} 取得了学习进步，祝贺！🎉`];
    await db().chatMessage.create({ data: { room: "public", userId: sys.id, system: true, text: t.join("\n"), meta: Object.assign({ uid: u.id, name: u.name }, ev) } });
  } catch (e) { console.error("celebrate", e.message); }
}

on("GET", "chat", async (req, res, { query }) => {
  const me = await currentUser(req, true);
  const room = await checkRoom(me, str(query.room || "public", 80));
  const where = { room };
  const bl = await blockedIds(me.id);
  if (bl.length) where.userId = { notIn: bl };
  if (query.after) where.createdAt = { gt: new Date(String(query.after)) };
  const msgs = await db().chatMessage.findMany({ where, orderBy: { createdAt: "desc" }, take: 60, include: { user: true, reactions: { include: { user: true }, orderBy: { createdAt: "desc" } } } });
  const pin = query.after ? null : await db().chatMessage.findFirst({ where: { room, pinned: true }, orderBy: { createdAt: "desc" }, include: { user: true } });
  return {
    room, messages: msgs.reverse().map((m) => chatOut(m, me.id)),
    pinned: pin ? { id: pin.id, text: pin.text, user: publicUser(pin.user), createdAt: pin.createdAt } : null
  };
});
on("POST", "chat", async (req, res, { body }) => {
  const me = await currentUser(req, true);
  const room = await checkRoom(me, str(body.room || "public", 80));
  const text = str(body.text, 1000);
  const image = body.image ? (isDataImage(body.image, 900_000) ? body.image : fail(400, "Зураг буруу эсвэл хэт том байна.")) : null;
  if (!text && !image) fail(400, "Хоосон зурвас.");
  await limit("chatMessage", me.id, 60, 15, "Минутад 15-аас олон зурвас илгээх боломжгүй. Түр хүлээнэ үү.");
  const lastMsg = await db().chatMessage.findFirst({ where: { userId: me.id }, orderBy: { createdAt: "desc" } });
  if (lastMsg && Date.now() - new Date(lastMsg.createdAt).getTime() < 1200) fail(429, "Хэт хурдан бичиж байна.");
  if (lastMsg && text && lastMsg.text === text && Date.now() - new Date(lastMsg.createdAt).getTime() < 30000) fail(429, "Ижил зурвасыг давтан илгээх боломжгүй.");
  const m = await db().chatMessage.create({ data: { room, userId: me.id, text, image } });
  if (room.startsWith("dm:")) {
    const other = room.slice(3).split(":").find((x) => x !== me.id);
    await notify(other, `💬 ${me.name}: ${text ? text.slice(0, 80) : "📷 Зураг илгээлээ"}`, `#/chat/dm/${me.id}`, me.id);
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
    reactions: counts, myReactions: p.reactions.filter((r) => r.userId === meId).map((r) => r.kind), comments: p._count.comments,
    views: p._count.views || 0, viewers: p.viewers || null
  };
}
on("GET", "posts", async (req, res, { query }) => {
  const me = await currentUser(req, true);
  const where = query.user ? { userId: str(query.user, 40) } : {};
  const bl = await blockedIds(me.id);
  if (bl.length && !query.user) where.userId = { notIn: bl };
  if (query.before) where.createdAt = { lt: new Date(String(query.before)) };
  const posts = await db().post.findMany({ where, orderBy: { createdAt: "desc" }, take: 15, include: { user: true, reactions: true, _count: { select: { comments: true, views: true } } } });
  // Өөрийн постыг хэн үзсэнийг харуулна
  const mineIds = posts.filter((p) => p.userId === me.id).map((p) => p.id);
  if (mineIds.length) {
    const vs = await db().postView.findMany({ where: { postId: { in: mineIds } }, include: { user: true }, orderBy: { createdAt: "desc" }, take: 500 });
    posts.forEach((p) => { if (p.userId === me.id) p.viewers = vs.filter((v) => v.postId === p.id).slice(0, 40).map((v) => publicUser(v.user)); });
  }
  return { posts: await Promise.all(posts.map((p) => postView(p, me.id))) };
});
on("POST", "posts/views", async (req, res, { body }) => {
  const me = await currentUser(req, true);
  const ids = (Array.isArray(body.ids) ? body.ids : []).map((x) => str(x, 40)).filter(Boolean).slice(0, 30);
  if (!ids.length) return { ok: true };
  const own = await db().post.findMany({ where: { id: { in: ids } }, select: { id: true, userId: true } });
  const data = own.filter((p) => p.userId !== me.id).map((p) => ({ postId: p.id, userId: me.id }));
  if (data.length) await db().postView.createMany({ data, skipDuplicates: true });
  return { ok: true };
});
on("POST", "posts", async (req, res, { body }) => {
  const me = await currentUser(req, true);
  const text = str(body.text, 2000);
  const image = body.image ? (isDataImage(body.image, 900_000) ? body.image : fail(400, "Зураг буруу эсвэл хэт том байна.")) : null;
  if (!text && !image) fail(400, "Пост хоосон байна.");
  await limit("post", me.id, 3600, 10, "Цагт 10-аас олон пост оруулах боломжгүй.");
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
    if (p.userId !== me.id) await notify(p.userId, `${me.name} таны постод ${{ like: "👍", love: "❤️", wow: "😮" }[kind]} дарлаа`, "#/social", me.id);
  }
  return { on: !ex };
});
on("GET", "posts/:id/comments", async (req, res, { params }) => {
  const me0 = await currentUser(req, true);
  const bl = await blockedIds(me0.id);
  const cs = await db().comment.findMany({ where: { postId: params.id, ...(bl.length ? { userId: { notIn: bl } } : {}) }, orderBy: { createdAt: "asc" }, take: 100, include: { user: true } });
  return { comments: cs.map((c) => ({ id: c.id, text: c.text, createdAt: c.createdAt, user: publicUser(c.user) })) };
});
on("POST", "posts/:id/comments", async (req, res, { params, body }) => {
  const me = await currentUser(req, true);
  const text = str(body.text, 1000);
  if (!text) fail(400, "Сэтгэгдэл хоосон байна.");
  await limit("comment", me.id, 3600, 40, "Цагт 40-өөс олон сэтгэгдэл бичих боломжгүй.");
  const p = await db().post.findUnique({ where: { id: params.id } });
  if (!p) fail(404, "Пост олдсонгүй.");
  await db().comment.create({ data: { postId: p.id, userId: me.id, text } });
  if (p.userId !== me.id) await notify(p.userId, `${me.name} таны постод сэтгэгдэл бичлээ: ${text.slice(0, 60)}`, "#/social", me.id);
  return { ok: true };
});

/* --- Мэдэгдэл --- */
on("GET", "notifications", async (req) => {
  const me = await currentUser(req, true);
  const rows = await db().notification.findMany({ where: { userId: me.id }, orderBy: { createdAt: "desc" }, take: 40, include: { actor: true } });
  const pendingFrom = new Set((await db().friend.findMany({ where: { toId: me.id, status: "pending" }, select: { fromId: true } })).map((f) => f.fromId));
  const list = rows.map((n) => ({ id: n.id, text: n.text, link: n.link, read: n.read, createdAt: n.createdAt, actor: n.actor ? publicUser(n.actor) : null, request: !!(n.actorId && pendingFrom.has(n.actorId) && n.link.startsWith("#/friends")) }));
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


/* --- Блок ба мэдээлэх (report) --- */
on("POST", "block", async (req, res, { body }) => {
  const me = await currentUser(req, true);
  const id = str(body.id, 40);
  if (id === me.id) fail(400, "Өөрийгөө блоклох боломжгүй.");
  if (body.on === false) {
    await db().block.deleteMany({ where: { blockerId: me.id, blockedId: id } });
    return { blocked: false };
  }
  await db().block.upsert({ where: { blockerId_blockedId: { blockerId: me.id, blockedId: id } }, create: { blockerId: me.id, blockedId: id }, update: {} });
  await db().friend.deleteMany({ where: { OR: [{ fromId: me.id, toId: id }, { fromId: id, toId: me.id }] } });
  return { blocked: true };
});
on("GET", "blocks", async (req) => {
  const me = await currentUser(req, true);
  const rows = await db().block.findMany({ where: { blockerId: me.id }, include: { blocked: true } });
  return { users: rows.map((r) => publicUser(r.blocked)) };
});
on("POST", "report", async (req, res, { body }) => {
  const me = await currentUser(req, true);
  const kind = ["post", "comment", "chat", "user", "story"].includes(body.kind) ? body.kind : fail(400, "Төрөл буруу.");
  const targetId = str(body.targetId, 40);
  await limit("report", me.id, 3600, 20, null, "reporterId");
  let preview = "";
  if (kind === "post") { const x = await db().post.findUnique({ where: { id: targetId } }); preview = x ? x.text : ""; }
  if (kind === "comment") { const x = await db().comment.findUnique({ where: { id: targetId } }); preview = x ? x.text : ""; }
  if (kind === "chat") { const x = await db().chatMessage.findUnique({ where: { id: targetId } }); preview = x ? x.text || "📷" : ""; }
  if (kind === "user") { const x = await db().user.findUnique({ where: { id: targetId } }); preview = x ? x.name : ""; }
  if (kind === "story") { const x = await db().story.findUnique({ where: { id: targetId } }); preview = x ? x.text || "📷" : ""; }
  await db().report.create({ data: { reporterId: me.id, kind, targetId, reason: str(body.reason, 300), preview: str(preview, 300) } });
  return { ok: true };
});
// Хэрэглэгч өөрийн мессеж, сэтгэгдлээ устгах
on("DELETE", "chat/:id", async (req, res, { params }) => {
  const me = await currentUser(req, true);
  const m = await db().chatMessage.findUnique({ where: { id: params.id } });
  if (!m || (m.userId !== me.id && !isAdmin(me))) fail(404, "Олдсонгүй.");
  await db().chatMessage.delete({ where: { id: m.id } });
  return { ok: true };
});
on("DELETE", "comments/:id", async (req, res, { params }) => {
  const me = await currentUser(req, true);
  const c = await db().comment.findUnique({ where: { id: params.id }, include: { post: true } });
  if (!c || (c.userId !== me.id && c.post.userId !== me.id && !isAdmin(me))) fail(404, "Олдсонгүй.");
  await db().comment.delete({ where: { id: c.id } });
  return { ok: true };
});

/* --- Админ --- */
on("GET", "admin/stats", async (req) => {
  await adminUser(req);
  const day = new Date(Date.now() - 864e5), week = new Date(Date.now() - 7 * 864e5);
  const [users, active24, active7, newUsers, posts, messages, reports, banned] = await Promise.all([
    db().user.count(), db().user.count({ where: { lastSeen: { gt: day } } }), db().user.count({ where: { lastSeen: { gt: week } } }),
    db().user.count({ where: { createdAt: { gt: week } } }), db().post.count(), db().chatMessage.count(),
    db().report.count({ where: { resolved: false } }), db().user.count({ where: { banned: true } })
  ]);
  const now = new Date();
  const [orders, premium] = await Promise.all([
    db().order.count({ where: { status: "pending" } }),
    db().user.count({ where: { OR: [{ premiumZh: { gt: now } }, { premiumEn: { gt: now } }] } })
  ]);
  return { users, active24, active7, newUsers, posts, messages, reports, banned, orders, premium };
});
on("GET", "admin/users", async (req, res, { query }) => {
  await adminUser(req);
  const q = str(query.q, 60);
  const where = q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }] } : {};
  const users = await db().user.findMany({ where, orderBy: { createdAt: "desc" }, take: 50, include: { progress: true } });
  return { users: users.map((u) => ({ ...publicUser(u), email: u.email, banned: u.banned, isAdmin: isAdmin(u), created: u.createdAt, lastSeen: u.lastSeen, xp: u.progress ? u.progress.xp : 0, premium: { zh: u.premiumZh, en: u.premiumEn } })) };
});
on("POST", "admin/users/:id/ban", async (req, res, { params, body }) => {
  const me = await adminUser(req);
  if (params.id === me.id) fail(400, "Өөрийгөө хаах боломжгүй.");
  const u = await db().user.update({ where: { id: params.id }, data: { banned: !!body.banned } });
  return { banned: u.banned };
});
on("POST", "admin/users/:id/admin", async (req, res, { params, body }) => {
  const me = await adminUser(req);
  if (!ADMIN_EMAILS().includes(me.email)) fail(403, "Админ эрх олгох нь зөвхөн үндсэн админд (ADMIN_EMAILS) боломжтой.");
  const u = await db().user.update({ where: { id: params.id }, data: { isAdmin: !!body.isAdmin } });
  return { isAdmin: u.isAdmin };
});
on("DELETE", "admin/users/:id", async (req, res, { params }) => {
  const me = await adminUser(req);
  if (params.id === me.id) fail(400, "Өөрийгөө устгах боломжгүй.");
  await db().user.delete({ where: { id: params.id } });
  return { ok: true };
});
on("GET", "admin/reports", async (req) => {
  await adminUser(req);
  const list = await db().report.findMany({ where: { resolved: false }, orderBy: { createdAt: "desc" }, take: 100, include: { reporter: true } });
  return { reports: list.map((r) => ({ id: r.id, kind: r.kind, targetId: r.targetId, reason: r.reason, preview: r.preview, createdAt: r.createdAt, reporter: publicUser(r.reporter) })) };
});
on("POST", "admin/reports/:id/resolve", async (req, res, { params, body }) => {
  await adminUser(req);
  const r = await db().report.findUnique({ where: { id: params.id } });
  if (!r) fail(404, "Олдсонгүй.");
  if (body.remove) {
    const t = r.targetId;
    if (r.kind === "post") await db().post.deleteMany({ where: { id: t } });
    if (r.kind === "comment") await db().comment.deleteMany({ where: { id: t } });
    if (r.kind === "chat") await db().chatMessage.deleteMany({ where: { id: t } });
    if (r.kind === "story") await db().story.deleteMany({ where: { id: t } });
    if (r.kind === "user") await db().user.updateMany({ where: { id: t }, data: { banned: true } });
  }
  await db().report.updateMany({ where: { kind: r.kind, targetId: r.targetId }, data: { resolved: true } });
  return { ok: true };
});
on("GET", "admin/content", async (req, res, { query }) => {
  await adminUser(req);
  if (query.kind === "chat") {
    const m = await db().chatMessage.findMany({ orderBy: { createdAt: "desc" }, take: 60, include: { user: true } });
    return { items: m.map((x) => ({ id: x.id, kind: "chat", text: x.text || (x.image ? "📷 Зураг" : ""), room: x.room, createdAt: x.createdAt, user: publicUser(x.user) })) };
  }
  const p = await db().post.findMany({ orderBy: { createdAt: "desc" }, take: 40, include: { user: true } });
  return { items: p.map((x) => ({ id: x.id, kind: "post", text: x.text || (x.image ? "📷 Зураг" : ""), createdAt: x.createdAt, user: publicUser(x.user) })) };
});
on("DELETE", "admin/content/:kind/:id", async (req, res, { params }) => {
  await adminUser(req);
  const map = { post: "post", chat: "chatMessage", comment: "comment", story: "story" };
  if (!map[params.kind]) fail(400, "Төрөл буруу.");
  await db()[map[params.kind]].deleteMany({ where: { id: params.id } });
  return { ok: true };
});
on("POST", "admin/announce", async (req, res, { body }) => {
  await adminUser(req);
  const text = str(body.text, 300);
  if (!text) fail(400, "Хоосон байна.");
  const users = await db().user.findMany({ where: { banned: false }, select: { id: true } });
  await db().notification.createMany({ data: users.map((u) => ({ userId: u.id, text: "📢 " + text, link: str(body.link, 200) })) });
  return { sent: users.length };
});

/* --- Нууц үг сэргээх (Resend имэйл) --- */
const sha = (t) => crypto.createHash("sha256").update(t).digest("hex");
async function sendMail(to, subject, html) {
  const key = process.env.RESEND_API_KEY;
  if (!key) fail(503, "Имэйл үйлчилгээ тохируулаагүй байна (RESEND_API_KEY). Админд хандана уу.");
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" },
    body: JSON.stringify({ from: process.env.MAIL_FROM || "Хичээл <onboarding@resend.dev>", to: [to], subject, html })
  });
  if (!r.ok) {
    const txt = await r.text().catch(() => "");
    console.error("resend", r.status, txt);
    // Resend-ийн алдааг ойлгомжтой болгох
    if (/own email address|verify a domain|domain is not verified/i.test(txt)) fail(502, "Имэйл илгээж чадсангүй: Resend туршилтын горимд зөвхөн Resend бүртгэлийн имэйл рүү илгээх боломжтой. Бүх хэрэглэгчид илгээхийн тулд Resend дээр домэйн баталгаажуулж, MAIL_FROM-оо тохируулна уу.");
    if (r.status === 401 || (r.status === 403 && /api key/i.test(txt))) fail(502, "Имэйл илгээж чадсангүй: RESEND_API_KEY буруу эсвэл хүчингүй болсон байна.");
    if (r.status === 422 && /from/i.test(txt)) fail(502, "Имэйл илгээж чадсангүй: MAIL_FROM хаяг буруу эсвэл баталгаажаагүй домэйн байна.");
    fail(502, "Имэйл илгээж чадсангүй.");
  }
}
on("POST", "auth/forgot", async (req, res, { body }) => {
  const email = str(body.email, 120).toLowerCase();
  if (!process.env.RESEND_API_KEY) fail(503, "Имэйл үйлчилгээ тохируулаагүй байна. Админд хандана уу.");
  const user = await db().user.findUnique({ where: { email } });
  if (user && !user.banned) {
    const recent = await db().passwordReset.count({ where: { userId: user.id, createdAt: { gt: new Date(Date.now() - 3600e3) } } });
    if (recent < 3) {
      const token = crypto.randomBytes(32).toString("hex");
      await db().passwordReset.create({ data: { userId: user.id, tokenHash: sha(token), expiresAt: new Date(Date.now() + 3600e3) } });
      const link = `${origin(req)}/#/reset/${token}`;
      await sendMail(email, "Хичээл — нууц үг сэргээх", `<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:24px;border:2px solid #0a0a0a">
        <h2 style="margin:0 0 12px">Нууц үг сэргээх</h2><p>Сайн байна уу, ${user.name.replace(/[<>&]/g, "")}!</p>
        <p>Доорх товч дээр дарж шинэ нууц үгээ тохируулна уу. Холбоос 1 цагийн дараа хүчингүй болно.</p>
        <p><a href="${link}" style="display:inline-block;background:#0a0a0a;color:#fff;padding:12px 20px;text-decoration:none;font-weight:bold">НУУЦ ҮГ СОЛИХ</a></p>
        <p style="color:#888;font-size:12px">Хэрэв та хүсэлт илгээгээгүй бол энэ имэйлийг үл тоомсорлоно уу.</p></div>`);
    }
  }
  return { ok: true }; // бүртгэл байгаа эсэхийг илчлэхгүй
});
on("POST", "auth/reset", async (req, res, { body }) => {
  const token = str(body.token, 100);
  const pw = String(body.password || "");
  if (pw.length < 6) fail(400, "Нууц үг хамгийн багадаа 6 тэмдэгт байна.");
  const r = await db().passwordReset.findUnique({ where: { tokenHash: sha(token) } });
  if (!r || r.used || new Date(r.expiresAt) < new Date()) fail(400, "Холбоос хүчингүй эсвэл хугацаа нь дууссан байна.");
  await db().user.update({ where: { id: r.userId }, data: { passwordHash: await bcrypt.hash(pw, 10) } });
  await db().passwordReset.update({ where: { id: r.id }, data: { used: true } });
  const user = await db().user.findUnique({ where: { id: r.userId } });
  res.setHeader("Set-Cookie", sessionCookie(req, user.id));
  return { user: meUser(user) };
});

/* --- Сторй (24 цаг) --- */
on("GET", "stories", async (req) => {
  const me = await currentUser(req, true);
  const bl = await blockedIds(me.id);
  const list = await db().story.findMany({ where: { createdAt: { gt: new Date(Date.now() - 864e5) }, userId: { notIn: bl }, user: { banned: false } }, orderBy: { createdAt: "asc" }, include: { user: true, views: { where: { story: { userId: me.id } }, include: { user: true }, orderBy: { createdAt: "desc" }, take: 100 } }, take: 200 });
  const groups = {};
  list.forEach((s) => {
    const g = groups[s.userId] || (groups[s.userId] = { user: publicUser(s.user), mine: s.userId === me.id, items: [] });
    const it = { id: s.id, text: s.text, image: s.image, bg: s.bg, createdAt: s.createdAt };
    if (s.userId === me.id) it.viewers = (s.views || []).map((v) => publicUser(v.user));
    g.items.push(it);
  });
  const arr = Object.values(groups).sort((a, b) => (b.mine - a.mine) || (new Date(b.items[b.items.length - 1].createdAt) - new Date(a.items[a.items.length - 1].createdAt)));
  return { groups: arr };
});
on("POST", "stories", async (req, res, { body }) => {
  const me = await currentUser(req, true);
  const text = str(body.text, 300);
  const image = body.image ? (isDataImage(body.image, 900_000) ? body.image : fail(400, "Зураг буруу эсвэл хэт том байна.")) : null;
  if (!text && !image) fail(400, "Сторй хоосон байна.");
  await limit("story", me.id, 864e2, 15, "Өдөрт 15-аас олон сторй оруулах боломжгүй.");
  const bg = /^#[0-9a-fA-F]{6}$/.test(body.bg || "") ? body.bg : "#0a0a0a";
  const s0 = await db().story.create({ data: { userId: me.id, text, image, bg } });
  // Найзуудад мэдэгдэх (6 цагт нэг удаа)
  const prevStory = await db().story.findFirst({ where: { userId: me.id, id: { not: s0.id }, createdAt: { gt: new Date(Date.now() - 6 * 3600e3) } } });
  if (!prevStory) {
    const fr = await db().friend.findMany({ where: { status: "accepted", OR: [{ fromId: me.id }, { toId: me.id }] }, select: { fromId: true, toId: true } });
    for (const f of fr.slice(0, 200)) await notify(f.fromId === me.id ? f.toId : f.fromId, `${me.name} стори оруулаа 📷`, "#/social", me.id);
  }
  return { id: s0.id };
});
on("POST", "stories/:id/view", async (req, res, { params }) => {
  const me = await currentUser(req, true);
  const s0 = await db().story.findUnique({ where: { id: params.id } });
  if (!s0) fail(404, "Олдсонгүй.");
  if (s0.userId !== me.id) await db().storyView.upsert({ where: { storyId_userId: { storyId: s0.id, userId: me.id } }, create: { storyId: s0.id, userId: me.id }, update: {} });
  return { ok: true };
});
on("DELETE", "stories/:id", async (req, res, { params }) => {
  const me = await currentUser(req, true);
  const s0 = await db().story.findUnique({ where: { id: params.id } });
  if (!s0 || (s0.userId !== me.id && !isAdmin(me))) fail(404, "Олдсонгүй.");
  await db().story.delete({ where: { id: s0.id } });
  return { ok: true };
});

/* --- Үгийн тулаан (duel) --- */
const duelView = (d, meId) => ({
  id: d.id, course: d.course, level: d.level, status: d.status, createdAt: d.createdAt,
  from: publicUser(d.from), to: publicUser(d.to), fromScore: d.fromScore, toScore: d.toScore,
  mine: d.fromId === meId, canPlay: d.toId === meId && d.status === "pending",
  questions: d.toId === meId && d.status === "pending" ? d.questions : undefined
});
on("GET", "duels", async (req) => {
  const me = await currentUser(req, true);
  const list = await db().duel.findMany({ where: { OR: [{ fromId: me.id }, { toId: me.id }] }, orderBy: { createdAt: "desc" }, take: 40, include: { from: true, to: true } });
  return { duels: list.map((d) => duelView(d, me.id)) };
});
on("POST", "duels", async (req, res, { body }) => {
  const me = await currentUser(req, true);
  const toId = str(body.toId, 40);
  if (!(await areFriends(me.id, toId))) fail(403, "Зөвхөн найзтайгаа тулалдах боломжтой.");
  const qs = Array.isArray(body.questions) ? body.questions.slice(0, 20) : [];
  if (qs.length < 5 || JSON.stringify(qs).length > 50_000) fail(400, "Асуулт буруу.");
  const score = Math.max(0, Math.min(qs.length, parseInt(body.score, 10) || 0));
  await limit("duel", me.id, 3600, 20, "Цагт 20-оос олон тулаан эхлүүлэх боломжгүй.", "fromId");
  const d = await db().duel.create({ data: { fromId: me.id, toId, course: str(body.course, 10), level: str(body.level, 10), questions: qs, fromScore: score } });
  await notify(toId, `⚔️ ${me.name} таныг үгийн тулаанд урилаа!`, "#/duels", me.id);
  return { id: d.id };
});
on("POST", "duels/:id/play", async (req, res, { params, body }) => {
  const me = await currentUser(req, true);
  const d = await db().duel.findUnique({ where: { id: params.id }, include: { from: true, to: true } });
  if (!d || d.toId !== me.id || d.status !== "pending") fail(404, "Тулаан олдсонгүй.");
  const total = Array.isArray(d.questions) ? d.questions.length : 10;
  const score = Math.max(0, Math.min(total, parseInt(body.score, 10) || 0));
  const nd = await db().duel.update({ where: { id: d.id }, data: { toScore: score, status: "done" }, include: { from: true, to: true } });
  const res1 = score > d.fromScore ? `${me.name} яллаа 🏆` : score < d.fromScore ? `Та яллаа 🏆` : "Тэнцлээ 🤝";
  await notify(d.fromId, `⚔️ Тулаан: ${d.from.name} ${d.fromScore} — ${score} ${me.name}. ${res1}`, "#/duels");
  return { duel: duelView(nd, me.id) };
});
on("POST", "duels/:id/decline", async (req, res, { params }) => {
  const me = await currentUser(req, true);
  await db().duel.updateMany({ where: { id: params.id, toId: me.id, status: "pending" }, data: { status: "declined" } });
  return { ok: true };
});

/* --- Web push (VAPID түлхүүрийг санд нэг удаа үүсгэж хадгална) --- */
let vapid = null;
async function getVapid() {
  if (vapid) return vapid;
  const webpush = require("web-push");
  const row = await db().setting.findUnique({ where: { key: "vapid" } });
  if (row) vapid = JSON.parse(row.value);
  else {
    vapid = webpush.generateVAPIDKeys();
    await db().setting.upsert({ where: { key: "vapid" }, create: { key: "vapid", value: JSON.stringify(vapid) }, update: {} });
    vapid = JSON.parse((await db().setting.findUnique({ where: { key: "vapid" } })).value);
  }
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:admin@hicheel.app", vapid.publicKey, vapid.privateKey);
  return vapid;
}
async function sendPush(userId, payload) {
  const subs = await db().pushSub.findMany({ where: { userId } });
  if (!subs.length) return;
  const webpush = require("web-push");
  await getVapid();
  await Promise.all(subs.map(async (s0) => {
    try { await webpush.sendNotification({ endpoint: s0.endpoint, keys: { p256dh: s0.p256dh, auth: s0.auth } }, JSON.stringify(payload), { TTL: 3600 }); }
    catch (e) { if (e.statusCode === 404 || e.statusCode === 410) await db().pushSub.deleteMany({ where: { id: s0.id } }); }
  }));
}
on("GET", "push/key", async () => ({ publicKey: (await getVapid()).publicKey }));
on("POST", "push/subscribe", async (req, res, { body }) => {
  const me = await currentUser(req, true);
  const sub = body.subscription || {};
  if (!sub.endpoint || !sub.keys || !sub.keys.p256dh || !sub.keys.auth) fail(400, "Subscription буруу.");
  await db().pushSub.upsert({ where: { endpoint: sub.endpoint }, create: { userId: me.id, endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth }, update: { userId: me.id, p256dh: sub.keys.p256dh, auth: sub.keys.auth } });
  return { ok: true };
});
on("POST", "push/unsubscribe", async (req, res, { body }) => {
  await currentUser(req, true);
  await db().pushSub.deleteMany({ where: { endpoint: str(body.endpoint, 1000) } });
  return { ok: true };
});
on("POST", "push/test", async (req) => {
  const me = await currentUser(req, true);
  await sendPush(me.id, { title: "Хичээл", body: "🔔 Мэдэгдэл амжилттай ажиллаж байна!", link: "#/dashboard" });
  return { ok: true };
});

/* --- Багц ба төлбөр (данс руу шилжүүлэг, админ батална) --- */
const LANGS = { zh: "Хятад хэл", en: "Англи хэл", all: "Хятад + Англи" };
const DEFAULT_PLANS = [
  { name: "Хятад хэл · 1 сар", description: "HSK 2.0 ба 3.0-ийн бүх түвшин, үг, дүрэм, тест, тоглоом", price: 29900, months: 1, langs: "zh", sort: 1 },
  { name: "Англи хэл · 1 сар", description: "IELTS A1–C1 бүх түвшин, Writing, Speaking дасгал", price: 29900, months: 1, langs: "en", sort: 2 },
  { name: "Бүх хэл · 3 сар", description: "Хятад, англи хэлний бүх хичээл — хамгийн хэмнэлттэй", price: 119000, months: 3, langs: "all", sort: 3 }
];
async function getBank() {
  const row = await db().setting.findUnique({ where: { key: "bank" } });
  return row ? JSON.parse(row.value) : { bank: "", account: "", holder: "", note: "" };
}
const planOut = (p) => ({ id: p.id, name: p.name, description: p.description, price: p.price, months: p.months, langs: p.langs, active: p.active, sort: p.sort });
const orderOut = (o) => ({ id: o.id, code: o.code, amount: o.amount, months: o.months, langs: o.langs, status: o.status, note: o.note, createdAt: o.createdAt, decidedAt: o.decidedAt, plan: o.plan ? { id: o.plan.id, name: o.plan.name } : null, user: o.user ? { ...publicUser(o.user), email: o.user.email } : undefined });
async function grantPremium(userId, langs, months) {
  const u = await db().user.findUnique({ where: { id: userId } });
  const data = {};
  const ext = (cur) => new Date(Math.max(Date.now(), cur ? new Date(cur).getTime() : 0) + months * 30 * 864e5);
  if (langs === "zh" || langs === "all") data.premiumZh = ext(u.premiumZh);
  if (langs === "en" || langs === "all") data.premiumEn = ext(u.premiumEn);
  return db().user.update({ where: { id: userId }, data });
}
on("GET", "plans", async () => {
  if ((await db().plan.count()) === 0) await db().plan.createMany({ data: DEFAULT_PLANS });
  const plans = await db().plan.findMany({ where: { active: true }, orderBy: [{ sort: "asc" }, { price: "asc" }] });
  return { plans: plans.map(planOut), bank: await getBank() };
});
on("GET", "orders", async (req) => {
  const me = await currentUser(req, true);
  const orders = await db().order.findMany({ where: { userId: me.id }, orderBy: { createdAt: "desc" }, take: 20, include: { plan: true } });
  return { orders: orders.map(orderOut) };
});
on("POST", "orders", async (req, res, { body }) => {
  const me = await currentUser(req, true);
  const plan = await db().plan.findUnique({ where: { id: str(body.planId, 40) } });
  if (!plan || !plan.active) fail(404, "Багц олдсонгүй.");
  const pending = await db().order.count({ where: { userId: me.id, status: "pending" } });
  if (pending >= 3) fail(429, "Танд баталгаажаагүй 3 захиалга байна. Эхлээд тэдгээрийг төлөх эсвэл цуцална уу.");
  const ABC = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "H";
  for (const b of crypto.randomBytes(6)) code += ABC[b % ABC.length];
  const o = await db().order.create({ data: { userId: me.id, planId: plan.id, code, amount: plan.price, months: plan.months, langs: plan.langs }, include: { plan: true } });
  const admins = await db().user.findMany({ where: { OR: [{ isAdmin: true }, { email: { in: ADMIN_EMAILS() } }] }, select: { id: true } });
  for (const a of admins) await notify(a.id, `💳 Шинэ захиалга: ${me.name} — ${plan.name} (${plan.price.toLocaleString("en-US")}₮, код ${code})`, "#/admin/orders");
  return { order: orderOut(o), bank: await getBank() };
});
on("POST", "orders/:id/cancel", async (req, res, { params }) => {
  const me = await currentUser(req, true);
  const o = await db().order.findUnique({ where: { id: params.id } });
  if (!o || o.userId !== me.id || o.status !== "pending") fail(404, "Захиалга олдсонгүй.");
  await db().order.update({ where: { id: o.id }, data: { status: "cancelled", decidedAt: new Date() } });
  return { ok: true };
});
on("GET", "admin/plans", async (req) => {
  await adminUser(req);
  if ((await db().plan.count()) === 0) await db().plan.createMany({ data: DEFAULT_PLANS });
  const plans = await db().plan.findMany({ orderBy: [{ sort: "asc" }, { price: "asc" }] });
  return { plans: plans.map(planOut), bank: await getBank() };
});
on("POST", "admin/plans", async (req, res, { body }) => {
  await adminUser(req);
  const data = {
    name: str(body.name, 80), description: str(body.description, 300),
    price: Math.max(0, Math.round(+body.price || 0)), months: Math.max(1, Math.min(36, Math.round(+body.months || 1))),
    langs: ["zh", "en", "all"].includes(body.langs) ? body.langs : "all", active: body.active !== false, sort: Math.round(+body.sort || 0)
  };
  if (!data.name) fail(400, "Багцын нэр оруулна уу.");
  if (!data.price) fail(400, "Үнэ оруулна уу.");
  const p = body.id ? await db().plan.update({ where: { id: str(body.id, 40) }, data }) : await db().plan.create({ data });
  return { plan: planOut(p) };
});
on("POST", "admin/bank", async (req, res, { body }) => {
  await adminUser(req);
  const bank = { bank: str(body.bank, 60), account: str(body.account, 40), holder: str(body.holder, 80), note: str(body.note, 300) };
  await db().setting.upsert({ where: { key: "bank" }, create: { key: "bank", value: JSON.stringify(bank) }, update: { value: JSON.stringify(bank) } });
  return { bank };
});
on("GET", "admin/orders", async (req, res, { query }) => {
  await adminUser(req);
  const status = ["pending", "paid", "rejected", "cancelled"].includes(query.status) ? query.status : "pending";
  const q = str(query.q, 40).toUpperCase();
  const where = { status, ...(q ? { code: { contains: q } } : {}) };
  const orders = await db().order.findMany({ where, orderBy: { createdAt: "desc" }, take: 100, include: { plan: true, user: true } });
  const revenue = await db().order.aggregate({ where: { status: "paid", decidedAt: { gt: new Date(Date.now() - 30 * 864e5) } }, _sum: { amount: true }, _count: true });
  return { orders: orders.map(orderOut), revenue30: revenue._sum.amount || 0, paid30: revenue._count };
});
on("POST", "admin/orders/:id/approve", async (req, res, { params }) => {
  await adminUser(req);
  const o = await db().order.findUnique({ where: { id: params.id }, include: { plan: true } });
  if (!o || o.status !== "pending") fail(404, "Хүлээгдэж буй захиалга олдсонгүй.");
  await db().order.update({ where: { id: o.id }, data: { status: "paid", decidedAt: new Date() } });
  const u = await grantPremium(o.userId, o.langs, o.months);
  const until = new Date(o.langs === "en" ? u.premiumEn : u.premiumZh).toISOString().slice(0, 10);
  await notify(o.userId, `🎉 Таны «${o.plan ? o.plan.name : "багц"}» идэвхжлээ! ${until} хүртэл бүх хичээл нээлттэй.`, "#/pricing");
  return { ok: true };
});
on("POST", "admin/orders/:id/reject", async (req, res, { params, body }) => {
  await adminUser(req);
  const o = await db().order.findUnique({ where: { id: params.id } });
  if (!o || o.status !== "pending") fail(404, "Хүлээгдэж буй захиалга олдсонгүй.");
  const note = str(body.note, 200);
  await db().order.update({ where: { id: o.id }, data: { status: "rejected", note, decidedAt: new Date() } });
  await notify(o.userId, `Таны ${o.code} захиалга баталгаажсангүй.${note ? " " + note : ""}`, "#/pricing");
  return { ok: true };
});
on("POST", "admin/users/:id/premium", async (req, res, { params, body }) => {
  await adminUser(req);
  const langs = ["zh", "en", "all"].includes(body.langs) ? body.langs : "all";
  const months = Math.round(+body.months || 0);
  if (months < 0) {
    const data = {};
    if (langs !== "en") data.premiumZh = null;
    if (langs !== "zh") data.premiumEn = null;
    await db().user.update({ where: { id: params.id }, data });
  } else if (months > 0) {
    await grantPremium(params.id, langs, months);
    await notify(params.id, `🎁 Танд ${LANGS[langs]} багц ${months} сараар нээгдлээ!`, "#/pricing");
  }
  const u = await db().user.findUnique({ where: { id: params.id } });
  return { premium: { zh: u.premiumZh, en: u.premiumEn } };
});

/* --- Багцтай хэрэглэгчид хамгаалагдсан хичээлийн өгөгдөл (scripts/build-content.js) --- */
const CONTENT = {};
function contentOf(lang) {
  if (!CONTENT[lang]) CONTENT[lang] = JSON.stringify(lang === "zh" ? require("./_content/zh.json") : require("./_content/en.json"));
  return CONTENT[lang];
}
const alive = (d) => !!d && new Date(d).getTime() > Date.now();
on("GET", "content/:lang", async (req, res, { params }) => {
  const me = await currentUser(req, true);
  const lang = params.lang === "en" ? "en" : params.lang === "zh" ? "zh" : null;
  if (!lang) fail(404, "Олдсонгүй.");
  if (!isAdmin(me) && !alive(lang === "zh" ? me.premiumZh : me.premiumEn)) fail(403, "Энэ хичээл багцад багтана.");
  const body = contentOf(lang);
  res.statusCode = 200;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "private, max-age=3600");
  res.end(body);
  return undefined;
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
