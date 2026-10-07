/* Үндсэн туслах функцууд: хадгалалт, бүртгэл, курс, дуу хоолой */
(function () {
  "use strict";

  const STORE_KEY = "hicheel_v1";

  /* ---------- Туслах ---------- */
  const esc = (s) =>
    String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const shuffle = (arr) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  const sample = (arr, n) => shuffle(arr).slice(0, n);
  // Локал цагийн огноо (YYYY-MM-DD)
  const dayKey = (d) => { d = d || new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };
  const today = () => dayKey();

  /* ---------- Хадгалалт (localStorage) ---------- */
  let memory = null; // localStorage ажиллахгүй үед
  function load() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) { /* ignore */ }
    return memory || { users: {}, session: null, progress: {} };
  }
  function save(db) {
    memory = db;
    try { localStorage.setItem(STORE_KEY, JSON.stringify(db)); } catch (e) { /* ignore */ }
  }

  /* ---------- Бүртгэл / Нэвтрэх ---------- */
  async function hash(password, salt) {
    const data = salt + ":" + password;
    if (window.crypto && crypto.subtle && window.TextEncoder) {
      const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(data));
      return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
    }
    // Нөөц хувилбар (crypto.subtle байхгүй орчинд)
    let h = 5381;
    for (let i = 0; i < data.length; i++) h = ((h << 5) + h + data.charCodeAt(i)) | 0;
    return "f" + (h >>> 0).toString(16);
  }
  const randomSalt = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
  const normEmail = (e) => String(e || "").trim().toLowerCase();

  /* ---------- Сервер (Vercel + Postgres) ----------
     /api/health хариу өгвөл бүх бүртгэл, ахиц серверт хадгалагдана.
     Сервергүй (жишээ нь GitHub Pages, файлаар нээх) үед хөтчийн localStorage ашиглана. */
  const Remote = {
    on: false,
    features: {},
    async call(method, path, body) {
      const opt = { method, credentials: "same-origin", headers: {} };
      if (body !== undefined) { opt.headers["Content-Type"] = "application/json"; opt.body = JSON.stringify(body); }
      let r;
      try { r = await fetch("/api/" + path, opt); } catch (e) { throw new Error("Сервертэй холбогдож чадсангүй."); }
      let d = {};
      try { d = await r.json(); } catch (e) { /* ignore */ }
      if (!r.ok) { const err = new Error(d.error || "Алдаа гарлаа (" + r.status + ")"); err.status = r.status; throw err; }
      return d;
    },
    async init() {
      if (location.protocol === "file:") return;
      try {
        const ctl = new AbortController();
        const t = setTimeout(() => ctl.abort(), 4000);
        const r = await fetch("/api/health", { signal: ctl.signal, credentials: "same-origin" });
        clearTimeout(t);
        this.on = r.ok;
        if (r.ok) { try { this.features = (await r.json()).features || {}; } catch (e) { /* ignore */ } }
      } catch (e) { this.on = false; }
      if (!this.on) return;
      try {
        const { user } = await this.call("GET", "auth/me");
        adopt(user);
        await Promise.all([this.pull(user), loadContent()]);
      } catch (e) {
        if (e.status === 401) { const db = load(); db.session = null; save(db); }
      }
    },
    async pull(user) {
      const { data } = await this.call("GET", "progress");
      const db = load();
      if (data) { db.progress[user.email] = data; save(db); }
      else this.pushNow();
    },
    timer: null,
    pushSoon() {
      if (!this.on) return;
      clearTimeout(this.timer);
      this.timer = setTimeout(() => this.pushNow(), 1200);
    },
    pushNow(keepalive) {
      if (!this.on) return;
      clearTimeout(this.timer);
      const db = load();
      if (!db.session) return;
      const body = JSON.stringify({ data: db.progress[db.session] || newProgress(), track: (window.App.track && window.App.track()) || "zh" });
      const email = db.session;
      fetch("/api/progress", { method: "PUT", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body, keepalive: !!keepalive })
        .then((r) => (r.ok ? r.json() : null))
        .then((r) => {
          // Сервер XP эсвэл дараалсан өдрийг хязгаарласан бол локал утгыг тааруулна
          if (!r) return;
          const d2 = load(), pr = d2.progress[email];
          if (pr && (pr.xp !== r.xp || pr.streak !== r.streak)) { pr.xp = r.xp; pr.streak = r.streak; save(d2); }
        })
        .catch(() => {});
    }
  };
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden" && Remote.timer) Remote.pushNow(true); });

  // Серверээс ирсэн хэрэглэгчийг локал кэшэд хадгалах
  function adopt(user) {
    const db = load();
    const old = db.users[user.email] || {};
    db.users[user.email] = Object.assign({}, old, { id: user.id, name: user.name, email: user.email, bio: user.bio || "", avatarUrl: user.avatarUrl || null, isAdmin: !!user.isAdmin, premium: user.premium || {}, created: user.created ? new Date(user.created).getTime() : old.created || Date.now(), remote: true });
    db.session = user.email;
    if (!db.progress[user.email]) db.progress[user.email] = newProgress();
    save(db);
    return db.users[user.email];
  }

  const Auth = {
    async refresh() { const { user } = await Remote.call("GET", "auth/me"); const u = adopt(user); await loadContent(); return u; },
    current() {
      const db = load();
      return db.session && db.users[db.session] ? db.users[db.session] : null;
    },
    avatar(u) { return u ? u.avatarUrl || u.avatar || null : null; },
    async register({ name, email, password }) {
      if (Remote.on) {
        const { user } = await Remote.call("POST", "auth/register", { name, email, password });
        const u = adopt(user);
        const db = load();
        db.progress[user.email] = newProgress();
        save(db);
        Remote.pushNow();
        return u;
      }
      email = normEmail(email);
      name = String(name || "").trim();
      if (name.length < 2) throw new Error("Нэр хамгийн багадаа 2 тэмдэгт байна.");
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Имэйл хаяг буруу байна.");
      if (String(password).length < 6) throw new Error("Нууц үг хамгийн багадаа 6 тэмдэгт байна.");
      const db = load();
      if (db.users[email]) throw new Error("Энэ имэйлээр бүртгэл үүссэн байна.");
      const salt = randomSalt();
      db.users[email] = { id: "local:" + email, name, email, salt, pass: await hash(password, salt), created: Date.now(), bio: "" };
      db.progress[email] = newProgress();
      db.session = email;
      save(db);
      return db.users[email];
    },
    async login({ email, password }) {
      if (Remote.on) {
        const { user } = await Remote.call("POST", "auth/login", { email, password });
        const u = adopt(user);
        await Promise.all([Remote.pull(user), loadContent()]);
        return u;
      }
      email = normEmail(email);
      const db = load();
      const u = db.users[email];
      if (!u || !u.pass || (await hash(password, u.salt)) !== u.pass) throw new Error("Имэйл эсвэл нууц үг буруу байна.");
      db.session = email;
      save(db);
      return u;
    },
    async forgot(email) {
      if (!Remote.on) throw new Error("Нууц үг сэргээх нь сервертэй үед л ажиллана.");
      await Remote.call("POST", "auth/forgot", { email });
    },
    async reset(token, password) {
      const { user } = await Remote.call("POST", "auth/reset", { token, password });
      const u = adopt(user);
      await Promise.all([Remote.pull(user), loadContent()]);
      return u;
    },
    async logout() {
      if (Remote.on) { Remote.pushNow(true); try { await Remote.call("POST", "auth/logout", {}); } catch (e) { /* ignore */ } }
      const db = load();
      db.session = null;
      save(db);
    },
    async updateProfile({ name, bio, avatar }) {
      if (name !== undefined && String(name).trim().length < 2) throw new Error("Нэр хамгийн багадаа 2 тэмдэгт байна.");
      if (Remote.on) {
        const payload = {};
        if (name !== undefined) payload.name = name;
        if (bio !== undefined) payload.bio = bio;
        if (avatar !== undefined) payload.avatar = avatar;
        const { user } = await Remote.call("PUT", "profile", payload);
        return adopt(user);
      }
      const db = load();
      const u = db.users[db.session];
      if (name !== undefined) u.name = String(name).trim().slice(0, 40);
      if (bio !== undefined) u.bio = String(bio).slice(0, 300);
      if (avatar !== undefined) u.avatar = avatar;
      save(db);
      return u;
    },
    updateName(name) { return this.updateProfile({ name }); },
    async changePassword(oldPass, newPass) {
      if (Remote.on) { await Remote.call("POST", "profile/password", { old: oldPass, new: newPass }); return; }
      const db = load();
      const u = db.users[db.session];
      if ((await hash(oldPass, u.salt)) !== u.pass) throw new Error("Одоогийн нууц үг буруу байна.");
      if (String(newPass).length < 6) throw new Error("Шинэ нууц үг хамгийн багадаа 6 тэмдэгт байна.");
      u.salt = randomSalt();
      u.pass = await hash(newPass, u.salt);
      save(db);
    },
    async deleteAccount() {
      if (Remote.on) await Remote.call("DELETE", "profile");
      const db = load();
      delete db.users[db.session];
      delete db.progress[db.session];
      db.session = null;
      save(db);
    },
    // Локал горимд: энэ төхөөрөмжийн бүх бүртгэлээр тэргүүлэгчдийн жагсаалт
    localBoard() {
      const db = load();
      return Object.values(db.users).map((u) => {
        const p = db.progress[u.email] || {};
        return { id: u.id || u.email, name: u.name, avatarUrl: u.avatarUrl || u.avatar || null, xp: p.xp || 0, streak: p.streak || 0, learned: Object.keys(p.learned || {}).length, me: u.email === db.session };
      }).sort((a, b) => b.xp - a.xp).map((x, i) => Object.assign(x, { rank: i + 1 }));
    }
  };

  /* ---------- Өдрийн тоолуур (даалгаварт) ---------- */
  function bump(p, kind, n) {
    const t = today();
    p.daily = p.daily || {};
    if (!p.daily[t]) p.daily = { [t]: {} };
    p.daily[t][kind] = (p.daily[t][kind] || 0) + (n || 1);
  }

  /* ---------- Ахиц ---------- */
  function newProgress() {
    return { xp: 0, learned: {}, favorites: [], tests: [], games: 0, listening: 0, streak: 0, lastDay: null, srs: {}, activity: {}, goal: 20, writing: {} };
  }
  const Progress = {
    get() {
      const db = load();
      if (!db.session) return newProgress();
      return Object.assign(newProgress(), db.progress[db.session] || {});
    },
    update(fn) {
      const db = load();
      if (!db.session) return;
      const p = Object.assign(newProgress(), db.progress[db.session] || {});
      fn(p);
      // Өдөр дараалсан идэвх
      const t = today();
      if (p.lastDay !== t) {
        const y = dayKey(new Date(Date.now() - 864e5));
        p.streak = p.lastDay === y ? p.streak + 1 : 1;
        p.lastDay = t;
      }
      db.progress[db.session] = p;
      save(db);
      Remote.pushSoon();
    },
    addXP(n) { this.update((p) => { p.xp += n; }); },
    toggleLearned(id) {
      let on = false;
      this.update((p) => {
        if (p.learned[id]) delete p.learned[id];
        else { p.learned[id] = 1; p.xp += 2; on = true; bump(p, "words"); }
      });
      return on;
    },
    toggleFav(id) {
      let on = false;
      this.update((p) => {
        const i = p.favorites.indexOf(id);
        if (i >= 0) p.favorites.splice(i, 1);
        else { p.favorites.push(id); on = true; }
      });
      return on;
    },
    reset() { this.update((p) => Object.assign(p, newProgress())); },
    setGoal(n) { this.update((p) => { p.goal = Math.max(5, Math.min(300, +n || 20)); }); },
    // Өдрийн даалгаврын тоолуур: kind = reviews | tests | games | listening | words | writing | ai | duel
    count(kind, n) { this.update((p) => bump(p, kind, n)); }
  };

  /* ---------- Давталт (SRS, Anki маягийн SM-2 хялбаршуулсан) ----------
     Карт бүр: { due: ms, ivl: өдөр, ease, reps, lapses } */
  const MIN = 6e4, DAY = 864e5;
  const SRS = {
    card(id) { return Progress.get().srs[id] || null; },
    // Үнэлгээ бүрийн дараагийн интервалыг тооцох (өдрөөр; 0 = 10 минут)
    next(c, rating) {
      c = c ? Object.assign({}, c) : { ivl: 0, ease: 2.5, reps: 0, lapses: 0 };
      const isNew = !c.reps;
      if (rating === "again") {
        c.lapses++; c.reps = 0; c.ease = Math.max(1.3, c.ease - 0.2); c.ivl = 0;
      } else if (rating === "hard") {
        c.ivl = isNew ? 1 : Math.max(1, Math.round(c.ivl * 1.2)); c.ease = Math.max(1.3, c.ease - 0.15); c.reps++;
      } else if (rating === "good") {
        c.ivl = isNew ? 1 : c.reps === 1 ? 3 : Math.round(c.ivl * c.ease); c.reps++;
      } else {
        c.ivl = isNew ? 4 : Math.round(Math.max(c.ivl, 1) * c.ease * 1.3); c.ease += 0.15; c.reps++;
      }
      c.due = Date.now() + (c.ivl ? c.ivl * DAY : 10 * MIN);
      return c;
    },
    label(c, rating) {
      const n = this.next(c, rating);
      if (!n.ivl) return "10 мин";
      if (n.ivl < 30) return n.ivl + " өдөр";
      if (n.ivl < 365) return Math.round(n.ivl / 30) + " сар";
      return (n.ivl / 365).toFixed(1) + " жил";
    },
    rate(id, rating) {
      Progress.update((p) => {
        const c = SRS.next(p.srs[id], rating);
        p.srs[id] = c;
        const t = today();
        p.activity[t] = (p.activity[t] || 0) + 1;
        p.xp += rating === "again" ? 0 : 1;
        bump(p, "reviews");
        if (c.ivl >= 21) p.learned[id] = 1;
      });
    },
    dueIds(ids) {
      const s = Progress.get().srs, now = Date.now();
      return ids.filter((id) => s[id] && s[id].due <= now);
    },
    stats(ids) {
      const s = Progress.get().srs, now = Date.now();
      let fresh = 0, due = 0, learning = 0, mature = 0;
      ids.forEach((id) => {
        const c = s[id];
        if (!c) fresh++;
        else if (c.due <= now) due++;
        else if (c.ivl >= 21) mature++;
        else learning++;
      });
      return { fresh, due, learning, mature };
    },
    allDue() {
      const s = Progress.get().srs, now = Date.now();
      return Object.keys(s).filter((id) => s[id].due <= now).length;
    }
  };

  /* ---------- Өнгөний горим ---------- */
  const Theme = {
    get() { try { return localStorage.getItem("hicheel_theme") || "system"; } catch (e) { return "system"; } },
    apply(t) {
      t = t || this.get();
      if (t === "system") document.documentElement.removeAttribute("data-theme");
      else document.documentElement.setAttribute("data-theme", t);
    },
    set(t) { try { localStorage.setItem("hicheel_theme", t); } catch (e) { /* ignore */ } this.apply(t); }
  };
  Theme.apply();

  /* ---------- Курс ---------- */
  const COURSES = {
    hsk2: { id: "hsk2", lang: "zh", title: "HSK 2.0 (хуучин)", short: "HSK 2.0", data: () => window.HSK2, levelLabel: (l) => "HSK " + l },
    hsk3: { id: "hsk3", lang: "zh", title: "HSK 3.0 (шинэ)", short: "HSK 3.0", data: () => window.HSK3, levelLabel: (l) => "HSK " + l },
    ielts: { id: "ielts", lang: "en", title: "IELTS англи хэл", short: "IELTS", data: () => window.IELTS, levelLabel: (l) => l }
  };

  function wordObj(courseId, level, w) {
    const c = COURSES[courseId];
    if (c.lang === "zh") {
      // Монгол орчуулга байхгүй бол англи утгыг харуулна
      return { id: "zh:" + w[0], lang: "zh", course: courseId, level, term: w[0], reading: w[1], gloss: w[3] ? w[2] : "", meaning: w[3] || w[2], noMn: !w[3], example: "" };
    }
    return { id: "en:" + w[0], lang: "en", course: courseId, level, term: w[0], reading: w[4] ? w[1] + " " + w[4] : w[1], gloss: "", meaning: w[2], example: w[3] };
  }

  /* ---- Багц: зөвхөн HSK 1 / IELTS A1 үнэгүй, бусад түвшин багцтай ---- */
  const FREE_LEVELS = { hsk2: ["1"], hsk3: ["1"], ielts: ["A1"] };
  function hasAccess(lang) {
    if (!Remote.on) return true; // локал горимд төлбөргүй
    const u = Auth.current();
    if (!u) return false;
    if (u.isAdmin) return true;
    const d = u.premium && u.premium[lang];
    return !!d && new Date(d).getTime() > Date.now();
  }
  function isLocked(courseId, level) {
    return !(FREE_LEVELS[courseId] || []).includes(level) && !hasAccess(COURSES[courseId].lang);
  }

  function getLevel(courseId, level) {
    const L = fullLevel(courseId, level);
    if (!isLocked(courseId, level)) return L;
    // Түгжээтэй түвшин: агуулга огт өгөхгүй (зөвхөн тоо)
    const n = (window.CONTENT_COUNTS && window.CONTENT_COUNTS[courseId] && window.CONTENT_COUNTS[courseId][level]) || {};
    return Object.assign({}, L, { locked: true, total: n.words || L.words.length, totalGrammar: n.grammar || L.grammar.length, words: [], grammar: [], sentences: [], reading: null });
  }
  // Нийт үгийн тоо (хамгаалагдсан өгөгдөл ачаалагдаагүй байсан ч)
  function totalWords(lang) {
    const c = window.CONTENT_COUNTS;
    return (c && c.unique && c.unique[lang]) || 0;
  }

  /* ---- Хамгаалагдсан хичээлийн өгөгдлийг серверээс ачаалах (багцтай хэрэглэгч) ---- */
  const contentLoaded = { zh: false, en: false };
  function applyContent(lang, d) {
    if (lang === "zh") {
      for (const cid of ["hsk2", "hsk3"]) { const C = cid === "hsk2" ? window.HSK2 : window.HSK3; Object.assign(C.words, (d.words || {})[cid] || {}); }
      Object.assign(window.ZH_EXTRA.sentences, d.sentences || {});
      Object.assign(window.ZH_EXTRA.grammar, d.grammar || {});
      Object.assign(window.ZH_READING, d.reading || {});
    } else {
      const I = window.IELTS;
      Object.assign(I.words, d.words || {}); Object.assign(I.sentences, d.sentences || {});
      Object.assign(I.grammar, d.grammar || {}); Object.assign(I.reading, d.reading || {});
      if (d.practice) Object.assign(window.IELTS_PRACTICE, d.practice);
    }
    (d.dialogues || []).forEach((full) => {
      const i = window.DIALOGUES.findIndex((x) => x.id === full.id);
      if (i >= 0) window.DIALOGUES[i] = full; else window.DIALOGUES.push(full);
    });
    window.TOPICS[lang] = Object.assign({}, window.TOPICS[lang], d.topics || {});
    if (window.WORD_REL) window.WORD_REL[lang] = Object.assign({}, window.WORD_REL[lang], d.rel || {});
    if (window.STORIES) (d.stories || []).forEach((full) => {
      const arr = window.STORIES[lang], i = arr.findIndex((x) => x.id === full.id);
      if (i >= 0) arr[i] = full; else arr.push(full);
    });
    if (window.CULTURE) Object.entries(d.culture || {}).forEach(([id, c]) => { const x = window.CULTURE.find((y) => y.id === id); if (x) x[lang] = c; });
    contentLoaded[lang] = true;
    window.dispatchEvent(new Event("content-loaded"));
  }
  async function loadContent() {
    if (!Remote.on || !Auth.current()) return;
    for (const lang of ["zh", "en"]) {
      if (contentLoaded[lang] || !hasAccess(lang)) continue;
      try { applyContent(lang, await Remote.call("GET", "content/" + lang)); } catch (e) { console.warn("content", lang, e.message); }
    }
  }
  function fullLevel(courseId, level) {
    const c = COURSES[courseId];
    const d = c.data();
    const words = (d.words[level] || []).map((w) => wordObj(courseId, level, w));
    let sentences, grammar, reading = null;
    if (c.lang === "zh") {
      const tier = window.ZH_EXTRA.tier[courseId][level];
      sentences = (window.ZH_EXTRA.sentences[tier] || window.ZH_EXTRA.sentences[6]).map((s) => ({ text: s[0], reading: s[1], meaning: s[2] }));
      grammar = window.ZH_EXTRA.grammar[tier];
    } else {
      sentences = d.sentences[level].map((s) => ({ text: s[0], reading: "", meaning: s[1] }));
      grammar = d.grammar[level];
      reading = d.reading[level];
    }
    return { course: c, level, label: c.levelLabel(level), info: d.info[level], words, sentences, grammar, reading };
  }

  function allWords() {
    const out = [];
    const seen = {};
    Object.keys(COURSES).forEach((cid) => {
      const d = COURSES[cid].data();
      d.levels.forEach((lv) => {
        (d.words[lv] || []).forEach((w) => {
          const o = wordObj(cid, lv, w);
          const key = cid + o.id;
          if (!seen[key]) { seen[key] = 1; out.push(o); }
        });
      });
    });
    return out;
  }

  /* ---------- Дуу хоолой (Web Speech API) ---------- */
  const Speech = {
    rate: 0.9,
    supported: "speechSynthesis" in window,
    voiceFor(lang) {
      if (!this.supported) return null;
      const voices = speechSynthesis.getVoices();
      const want = lang === "zh" ? ["zh-CN", "zh_CN", "zh"] : ["en-GB", "en_GB", "en-US", "en"];
      for (const w of want) {
        const v = voices.find((x) => x.lang && x.lang.replace("_", "-").toLowerCase().startsWith(w.replace("_", "-").toLowerCase()));
        if (v) return v;
      }
      return null;
    },
    speak(text, lang, rate) {
      if (!this.supported) {
        UI.toast("Таны хөтөч дуу унших боломжгүй байна.", "warn");
        return;
      }
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = lang === "zh" ? "zh-CN" : "en-GB";
      const v = this.voiceFor(lang);
      if (v) u.voice = v;
      u.rate = rate || this.rate;
      speechSynthesis.speak(u);
    }
  };
  if (Speech.supported) speechSynthesis.getVoices();

  /* ---------- UI туслах ---------- */
  const UI = {
    toast(msg, type) {
      let box = document.getElementById("toasts");
      if (!box) {
        box = document.createElement("div");
        box.id = "toasts";
        document.body.appendChild(box);
      }
      const t = document.createElement("div");
      t.className = "toast " + (type || "");
      t.textContent = msg;
      box.appendChild(t);
      setTimeout(() => t.classList.add("hide"), 2600);
      setTimeout(() => t.remove(), 3000);
    }
  };

  // Пиньинийн аялгуу тэмдгийг арилгах (харьцуулахад)
  const stripTones = (s) => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ü/g, "v").toLowerCase().replace(/[^a-z0-9一-鿿]/g, "");

  window.App = Object.assign(window.App || {}, { hasAccess, isLocked, FREE_LEVELS, totalWords, loadContent, contentLoaded, bump, Remote, esc, shuffle, sample, today, dayKey, SRS, Theme, Auth, Progress, COURSES, getLevel, allWords, Speech, UI, stripTones });
})();
