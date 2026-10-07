/* Нэмэлт боломжууд: админ, нууц үг сэргээх, даалгавар/тэмдэг/түвшин, бүтэн жишиг шалгалт,
   харилцан ярианы сонсгол, хиймэл оюун (AI багш, бичлэг/яриа үнэлгээ), тулаан, сторй, PWA/push. */
(function () {
  "use strict";
  const A = window.App;
  const { esc, UI, Auth, Progress, Remote, Speech, Quiz, getLevel, COURSES, shuffle, sample } = A;
  const P = A.Pages;
  const view = () => document.getElementById("view");
  const H = (t, s) => A.pageHead(t, s);

  /* =====================================================================
     Мэдээлэх (report) ба чатын мессежийн цэс
     ===================================================================== */
  A.reportItem = async function (kind, id) {
    const reason = prompt("Яагаад мэдээлж байна вэ? (жишээ: спам, доромжлол, зохисгүй агуулга)");
    if (reason === null) return;
    try { await Remote.call("POST", "report", { kind, targetId: id, reason }); UI.toast("Мэдээлэл админд илгээгдлээ. Баярлалаа!", "ok"); }
    catch (e) { UI.toast(e.message, "warn"); }
  };
  // Хэрэглэгчдийн жагсаалттай цонх (❤️ дарсан, үзсэн хүмүүс)
  A.userListModal = function (title, users) {
    const m = document.createElement("div");
    m.className = "modal";
    m.innerHTML = `<div class="modal-bg"></div><div class="modal-box ulist-box"><button class="modal-x">✕</button><h3>${esc(title)}</h3>
      <div class="ulist">${(users || []).map((u) => `<a class="ulist-row" href="#/u/${esc(u.id)}">${A.avatarHtml(u, 38)}<b>${esc(u.name)}</b></a>`).join("") || `<p class="muted">Хэн ч алга.</p>`}</div></div>`;
    document.body.appendChild(m);
    const close = () => m.remove();
    m.querySelector(".modal-bg").onclick = close; m.querySelector(".modal-x").onclick = close;
    m.querySelectorAll(".ulist-row").forEach((a) => a.addEventListener("click", close));
  };
  A.msgMenu = function (btn, bubble) {
    document.querySelectorAll(".msg-menu").forEach((m) => m.remove());
    const mine = !!bubble.dataset.mine;
    const me = Auth.current();
    const menu = document.createElement("div");
    menu.className = "msg-menu card";
    menu.innerHTML = (mine || (me && me.isAdmin) ? `<button data-a="del">🗑 Устгах</button>` : "") +
      (mine ? "" : `<button data-a="rep">⚑ Мэдээлэх</button><button data-a="block">🚫 Хэрэглэгчийг блоклох</button>`);
    bubble.appendChild(menu);
    const close = (e) => { if (!menu.contains(e.target) && e.target !== btn) { menu.remove(); document.removeEventListener("click", close, true); } };
    setTimeout(() => document.addEventListener("click", close, true));
    menu.onclick = async (e) => {
      const a = e.target.dataset.a;
      if (!a) return;
      menu.remove();
      try {
        if (a === "del") { await Remote.call("DELETE", "chat/" + bubble.dataset.mid); bubble.closest(".msg").remove(); }
        if (a === "pin") { const r = await Remote.call("POST", `chat/${bubble.dataset.mid}/pin`, {}); UI.toast(r.pinned ? "📌 Тогтоолоо" : "Тогтоолт болилоо", "ok"); A.go(location.hash); }
        if (a === "rep") await A.reportItem("chat", bubble.dataset.mid);
        if (a === "block" && confirm("Энэ хэрэглэгчийг блоклох уу?")) {
          await Remote.call("POST", "block", { id: bubble.dataset.uid, on: true });
          UI.toast("Блоклогдлоо", "ok");
          document.querySelectorAll(`.bubble-msg[data-uid="${bubble.dataset.uid}"]`).forEach((b) => b.closest(".msg").remove());
        }
      } catch (ex) { UI.toast(ex.message, "warn"); }
    };
  };

  /* =====================================================================
     Нууц үг сэргээх
     ===================================================================== */
  P.forgot = function () {
    const can = Remote.on && Remote.features.email;
    view().innerHTML = `
      <div class="auth card mn-card"><div class="mn-side" aria-hidden="true"><span>ᠬᠢᠴᠢᠶᠡᠯ</span></div>
        <i class="hamar big" aria-hidden="true"></i>
        <h2>Нууц үг сэргээх</h2>
        ${can ? `<p class="muted center">Бүртгэлтэй имэйлээ оруулбал нууц үг солих холбоос илгээнэ.</p>
        <form id="ff"><label>Имэйл<input class="input" name="email" type="email" required autocomplete="email"></label>
        <div class="error" id="err"></div><button class="btn full">Холбоос илгээх</button></form>`
        : `<p class="muted center">Имэйлээр нууц үг сэргээх үйлчилгээ одоогоор тохируулагдаагүй байна. Админтай холбогдоно уу.</p>`}
        <p class="muted center"><a href="#/login">← Нэвтрэх</a></p>
      </div>`;
    const f = document.getElementById("ff");
    if (f) f.onsubmit = async (e) => {
      e.preventDefault();
      try {
        await Auth.forgot(new FormData(f).get("email"));
        f.outerHTML = `<div class="card note-card">📧 Хэрэв энэ имэйлээр бүртгэл байгаа бол нууц үг солих холбоос илгээлээ. Имэйлээ (spam хавтсаа ч) шалгаарай. Холбоос 1 цаг хүчинтэй.</div>`;
      } catch (ex) { document.getElementById("err").textContent = ex.message; }
    };
  };
  P.reset = function (token) {
    view().innerHTML = `
      <div class="auth card mn-card"><div class="mn-side" aria-hidden="true"><span>ᠬᠢᠴᠢᠶᠡᠯ</span></div>
        <i class="hamar big" aria-hidden="true"></i>
        <h2>Шинэ нууц үг</h2>
        <form id="rf">
          <label>Шинэ нууц үг (6+ тэмдэгт)<input class="input" name="p1" type="password" minlength="6" required autocomplete="new-password"></label>
          <label>Давтах<input class="input" name="p2" type="password" required autocomplete="new-password"></label>
          <div class="error" id="err"></div><button class="btn full">Хадгалах</button>
        </form>
      </div>`;
    document.getElementById("rf").onsubmit = async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      if (fd.get("p1") !== fd.get("p2")) { document.getElementById("err").textContent = "Нууц үг таарахгүй байна."; return; }
      try { await Auth.reset(token, fd.get("p1")); UI.toast("Нууц үг шинэчлэгдлээ", "ok"); A.go("#/dashboard"); }
      catch (ex) { document.getElementById("err").textContent = ex.message; }
    };
  };

  /* =====================================================================
     Түвшин, өдрийн даалгавар, тэмдэг
     ===================================================================== */
  const LV_TITLES = [[1, "Шинэхэн"], [5, "Суралцагч"], [10, "Хичээнгүй"], [15, "Тэмүүлэгч"], [20, "Мэргэжилтэн"], [30, "Мастер"], [40, "Цэцэн"]];
  function levelOf(xp) {
    const lvl = Math.floor(Math.sqrt((xp || 0) / 25)) + 1;
    const cur = 25 * (lvl - 1) * (lvl - 1), next = 25 * lvl * lvl;
    const title = LV_TITLES.filter((t) => lvl >= t[0]).pop()[1];
    return { lvl, title, pct: Math.round(((xp - cur) / (next - cur)) * 100), next, toNext: next - xp };
  }
  A.levelOf = levelOf;
  const todayData = (p) => (p.daily && p.daily[A.today()]) || {};
  function quests(p) {
    const d = todayData(p);
    return [
      { id: "rev", icon: "🃏", t: `Флаш карт ${p.goal} давтах`, n: d.reviews || 0, goal: p.goal, xp: 20, href: "#/flashcards" },
      (() => { const g = (A.planDaily && A.planDaily(p)) || 5; return { id: "words", icon: "📚", t: `${g} шинэ үг цээжлэх${p.plan ? " (төлөвлөгөө)" : ""}`, n: d.words || 0, goal: g, xp: 15, href: "#/vocab" }; })(),
      { id: "listen", icon: "🎧", t: "1 сонсголын дасгал хийх", n: d.listening || 0, goal: 1, xp: 10, href: "#/listening" },
      { id: "game", icon: "🎮", t: "2 тоглоом тоглох", n: d.games || 0, goal: 2, xp: 10, href: "#/games" },
      { id: "test", icon: "📝", t: "1 тест өгөх", n: d.tests || 0, goal: 1, xp: 15, href: "#/tests" }
    ].map((q) => Object.assign(q, { done: q.n >= q.goal, claimed: !!(d.claimed && d.claimed[q.id]) }));
  }
  function claim(id) {
    let gained = 0;
    Progress.update((p) => {
      const q = quests(p).find((x) => x.id === id);
      if (!q || !q.done || q.claimed) return;
      const t = A.today();
      p.daily = p.daily || {};
      if (!p.daily[t]) p.daily = { [t]: {} };
      p.daily[t].claimed = p.daily[t].claimed || {};
      p.daily[t].claimed[id] = 1;
      gained = q.xp;
      if (quests(p).every((x) => x.claimed)) { gained += 30; p.daily[t].allDone = 1; }
      p.xp += gained;
    });
    if (gained) UI.toast(`+${gained} XP 🎉`, "ok");
  }
  const BADGES = [
    { id: "w1", icon: "🌱", t: "Анхны үг", d: "1 үг цээжилсэн", ok: (p, s) => s.words >= 1 },
    { id: "w50", icon: "📗", t: "50 үг", d: "50 үг цээжилсэн", ok: (p, s) => s.words >= 50 },
    { id: "w200", icon: "📘", t: "200 үг", d: "200 үг цээжилсэн", ok: (p, s) => s.words >= 200 },
    { id: "w1000", icon: "📕", t: "Мянган үг", d: "1000 үг цээжилсэн", ok: (p, s) => s.words >= 1000 },
    { id: "s3", icon: "🔥", t: "3 өдөр дараалан", d: "3 өдөр тасралтгүй", ok: (p) => p.streak >= 3 },
    { id: "s7", icon: "⚡", t: "7 хоног дараалан", d: "7 өдөр тасралтгүй", ok: (p) => p.streak >= 7 },
    { id: "s30", icon: "🏔️", t: "Сар дараалан", d: "30 өдөр тасралтгүй", ok: (p) => p.streak >= 30 },
    { id: "t1", icon: "📝", t: "Анхны тест", d: "1 тест өгсөн", ok: (p) => p.tests.length >= 1 },
    { id: "t10", icon: "🎓", t: "10 тест", d: "10 тест өгсөн", ok: (p) => p.tests.length >= 10 },
    { id: "t100", icon: "💯", t: "Төгс оноо", d: "Тестэд 100% авсан", ok: (p) => p.tests.some((t) => t.pct === 100) },
    { id: "r100", icon: "🃏", t: "Картын мастер", d: "100 карт давтсан", ok: (p) => Object.keys(p.srs || {}).length >= 100 },
    { id: "g10", icon: "🎮", t: "Тоглогч", d: "10 тоглоом тоглосон", ok: (p) => p.games >= 10 },
    { id: "l10", icon: "🎧", t: "Чих сайтай", d: "10 сонсголын дасгал", ok: (p) => p.listening >= 10 },
    { id: "wr3", icon: "✍️", t: "Зохиолч", d: "3 эссе бичсэн", ok: (p) => Object.keys(p.writing || {}).length >= 3 },
    { id: "m1", icon: "🏁", t: "Жишиг шалгалт", d: "Бүтэн шалгалт өгсөн", ok: (p) => (p.mocks || []).length >= 1 },
    { id: "lv10", icon: "🏅", t: "10-р түвшин", d: "10-р түвшинд хүрсэн", ok: (p) => levelOf(p.xp).lvl >= 10 },
    { id: "xp5k", icon: "👑", t: "5000 XP", d: "5000 XP цуглуулсан", ok: (p) => p.xp >= 5000 },
    { id: "q7", icon: "🎯", t: "Даалгаврын баатар", d: "Бүх өдрийн даалгавар биелүүлсэн", ok: (p) => !!todayData(p).allDone || (p.badges || []).includes("q7") }
  ];
  function badgeState(p) {
    const s = { words: Object.keys(p.learned || {}).length };
    return BADGES.map((b) => Object.assign({}, b, { got: (p.badges || []).includes(b.id) || b.ok(p, s) }));
  }
  // Шинээр нээгдсэн тэмдгийг мэдэгдэх (хуудас солигдох бүрт шалгана)
  function checkBadges() {
    if (!Auth.current()) return;
    const p = Progress.get();
    const fresh = badgeState(p).filter((b) => b.got && !(p.badges || []).includes(b.id));
    if (!fresh.length) return;
    Progress.update((pp) => { pp.badges = (pp.badges || []).concat(fresh.map((b) => b.id)); });
    fresh.slice(0, 2).forEach((b) => UI.toast(`${b.icon} Шинэ тэмдэг: ${b.t}!`, "ok"));
  }
  window.addEventListener("hashchange", () => setTimeout(checkBadges, 300));
  setTimeout(checkBadges, 2500);

  A.questWidget = function (el) {
    if (!el) return;
    const p = Progress.get(), L = levelOf(p.xp), qs = quests(p);
    const done = qs.filter((q) => q.claimed).length;
    el.innerHTML = `
      <div class="lvl-strip card">
        <div class="lvl-badge"><b>${L.lvl}</b><span>түвшин</span></div>
        <div class="lvl-info"><div class="row between"><b>${esc(L.title)}</b><span class="muted small">${p.xp} / ${L.next} XP</span></div>
          <div class="mini-bar"><i style="width:${L.pct}%"></i></div><span class="muted small">Дараагийн түвшин хүртэл ${L.toNext} XP</span></div>
        <a class="lvl-q" href="#/quests"><b>🎯 ${done}/${qs.length}</b><span>өдрийн даалгавар</span></a>
      </div>`;
  };

  // Утсан дээрх «Өнөөдөр» самбар: хийх ажлууд дарааллаар + «Үргэлжлүүлэх» товч
  A.todayPanel = function (el) {
    if (!el) return;
    const p = Progress.get(), L = levelOf(p.xp), due = A.SRS.allDue();
    const qs = quests(p);
    // Давтах карт байвал эхэнд нь тавина
    const tasks = (due ? [{ id: "due", icon: "🗂️", t: `${due} карт давтах`, sub: "Мартахаас өмнө давтаарай", href: "#/review", done: false }] : []).concat(qs.map((q) => ({
      id: q.id, icon: q.icon, t: q.t, sub: `${Math.min(q.n, q.goal)} / ${q.goal}`, pct: Math.min(100, (q.n / q.goal) * 100), href: q.href, done: q.done, claimed: q.claimed, xp: q.xp
    })));
    const next = tasks.find((t) => !t.done);
    el.innerHTML = `
      <div class="td-stats"><a href="#/quests"><b>🔥 ${p.streak}</b><small>өдөр</small></a><a href="#/quests"><b>⭐ ${p.xp}</b><small>XP</small></a><a href="#/quests"><b>Lv ${L.lvl}</b><small>${esc(L.title)}</small></a></div>
      <h2 class="td-h">Өнөөдөр</h2>
      <div class="td-list">${tasks.map((t) => `<div class="td-task ${t.done ? "done" : ""}">
        <span class="td-ic">${t.icon}</span>
        <div class="td-b"><b>${esc(t.t)}</b><small>${t.done ? (t.claimed ? "Дууссан ✔" : "Дууссан — XP-гээ аваарай") : esc(t.sub)}</small>${t.pct !== undefined && !t.done ? `<div class="mini-bar"><i style="width:${t.pct}%"></i></div>` : ""}</div>
        ${t.done ? (t.claimed ? `<span class="td-ok">✔</span>` : `<button class="td-go" data-claim="${t.id}">+${t.xp} XP</button>`) : `<a class="td-go" href="${t.href}">ЭХЛЭХ</a>`}
      </div>`).join("")}</div>
      <a class="td-fab" href="${next ? next.href : "#/games"}">${next ? "▶ ҮРГЭЛЖЛҮҮЛЭХ" : "🎉 Бүгд дууслаа — тоглоом тоглох"}</a>`;
    el.querySelectorAll("[data-claim]").forEach((b) => (b.onclick = () => { claim(b.dataset.claim); A.todayPanel(el); A.renderNav(); }));
  };

  P.quests = function () {
    const p = Progress.get(), L = levelOf(p.xp), qs = quests(p), bs = badgeState(p);
    view().innerHTML = `
      ${H("🎯 Даалгавар ба тэмдэг", "Өдөр бүрийн даалгавраа биелүүлж XP аваад, тэмдгүүдээ цуглуулаарай")}
      <div class="lvl-strip card big">
        <div class="lvl-badge"><b>${L.lvl}</b><span>түвшин</span></div>
        <div class="lvl-info"><div class="row between"><b>${esc(L.title)}</b><span class="muted small">${p.xp} / ${L.next} XP</span></div>
          <div class="mini-bar"><i style="width:${L.pct}%"></i></div><span class="muted small">Дараагийн түвшин хүртэл ${L.toNext} XP</span></div>
      </div>
      <h2 class="section-title">Өнөөдрийн даалгавар</h2>
      <div class="quest-list">${qs.map((q) => `
        <div class="quest card ${q.claimed ? "claimed" : q.done ? "done" : ""}">
          <span class="q-ic">${q.icon}</span>
          <div class="q-body"><b>${esc(q.t)}</b><div class="mini-bar"><i style="width:${Math.min(100, (q.n / q.goal) * 100)}%"></i></div><span class="muted small">${Math.min(q.n, q.goal)} / ${q.goal}</span></div>
          ${q.claimed ? `<span class="pill pass">✔ +${q.xp}</span>` : q.done ? `<button class="btn small" data-claim="${q.id}">+${q.xp} XP авах</button>` : `<a class="btn ghost small" href="${q.href}">Эхлэх</a>`}
        </div>`).join("")}</div>
      <p class="muted small">Бүх даалгавраа биелүүлбэл нэмэлт +30 XP!</p>
      <h2 class="section-title">Тэмдгүүд (${bs.filter((b) => b.got).length}/${bs.length})</h2>
      <div class="badge-grid">${bs.map((b) => `<div class="bdg ${b.got ? "got" : ""}" title="${esc(b.d)}"><span class="bdg-ic">${b.icon}</span><b>${esc(b.t)}</b><small>${esc(b.d)}</small></div>`).join("")}</div>`;
    view().querySelectorAll("[data-claim]").forEach((b) => (b.onclick = () => { claim(b.dataset.claim); P.quests(); A.renderNav(); }));
  };

  /* =====================================================================
     Бүтэн жишиг шалгалт (HSK / IELTS)
     ===================================================================== */
  function bandOf(pct) {
    const t = [[95, 9], [89, 8.5], [83, 8], [76, 7.5], [69, 7], [62, 6.5], [55, 6], [47, 5.5], [40, 5], [33, 4.5], [26, 4], [18, 3.5], [10, 3]];
    for (const [min, b] of t) if (pct >= min) return b;
    return 2.5;
  }
  P.mock = function () {
    const lang = A.track();
    const c = COURSES[A.pick.course], L = getLevel(A.pick.course, A.pick.level);
    const p = Progress.get();
    const hist = (p.mocks || []).slice(-8).reverse();
    const plan = lang === "zh"
      ? [{ k: "listen", t: "听力 · Сонсгол", n: 15, min: 12 }, { k: "read", t: "阅读 · Унших", n: 15, min: 15 }, { k: "write", t: "书写 · Бичих", n: 10, min: 10 }]
      : [{ k: "listen", t: "Listening", n: 15, min: 15 }, { k: "read", t: "Reading", n: 15, min: 20 }].concat(A.hasAccess("en") ? [{ k: "write", t: "Writing (Task 2)", n: 0, min: 40 }] : []);
    view().innerHTML = `
      ${H("🏁 Бүтэн жишиг шалгалт", lang === "zh" ? "HSK шалгалтын бүтэцтэй: сонсгол → унших → бичих, хэсэг бүр цагтай" : "IELTS шалгалтын бүтэцтэй: Listening → Reading → Writing, хэсэг бүр цагтай")}
      <div class="split"><aside class="lvl-side">${A.picker()}</aside><section class="split-main">
        <div class="card test-intro">
          <h3>${esc(c.short)} · ${esc(L.label)} жишиг шалгалт</h3>
          <ol class="mock-plan">${plan.map((s) => `<li><b>${esc(s.t)}</b> — ${s.n ? s.n + " асуулт, " : ""}${s.min} минут</li>`).join("")}</ol>
          <p class="muted small">${lang === "zh" ? "Оноог HSK-ийн хуваарьт (хэсэг бүр 100) шилжүүлж, тэнцсэн эсэхийг тооцно." : "Хэсэг бүрийн оноог IELTS band оноонд шилжүүлж тооцно." + " Writing хэсгийг өөрөө үнэлнэ."}</p>
          <button class="btn big" id="mstart">Шалгалт эхлэх</button>
        </div>
        <div id="mz"></div>
        <h2 class="section-title">Жишиг шалгалтын түүх</h2>
        ${hist.length ? `<div class="table-wrap"><table class="table"><thead><tr><th>Огноо</th><th>Шалгалт</th><th>Дүн</th></tr></thead><tbody>${hist.map((h) => `<tr><td>${new Date(h.date).toLocaleDateString("mn-MN")}</td><td>${esc(h.name)}</td><td><b>${esc(h.result)}</b></td></tr>`).join("")}</tbody></table></div>` : `<p class="muted">Одоогоор өгөөгүй байна.</p>`}
      </section></div>`;
    A.bindPicker(P.mock);
    document.getElementById("mstart").onclick = () => { document.querySelector(".test-intro").hidden = true; runMock(L, plan, lang); };
  };
  function runMock(L, plan, lang) {
    const box = document.getElementById("mz");
    const pool = Quiz.poolFor(L.course.id, L.level);
    const ws = shuffle(L.words);
    const scores = {};
    const build = {
      listen: () => sample(ws, 10).map((w) => Quiz.Gen.listenWord(w, pool)).concat(shuffle(L.sentences).slice(0, 5).map((s) => Quiz.Gen.listenSentence(s, L.sentences, lang))),
      read: () => {
        let qs = sample(ws, 8).map((w) => Quiz.Gen.meaning(w, pool));
        qs = qs.concat(shuffle(L.grammar.flatMap((g) => g.quiz)).slice(0, 4).map(Quiz.Gen.grammar));
        let rd = null;
        if (lang === "zh") { const t = window.ZH_EXTRA.tier[L.course.id][L.level]; rd = (window.ZH_READING[t] || [])[0]; }
        else rd = L.reading;
        if (rd) qs = qs.concat(rd.questions.map((q) => Object.assign(Quiz.Gen.grammar(q), { type: "Унших", reveal: esc(q.q), prompt: `<p class="r-text small ${lang}">${esc(rd.text)}</p><p><b class="${lang}">${esc(q.q)}</b></p>` })));
        return qs.slice(0, 15);
      },
      write: () => sample(ws, 5).map((w) => Quiz.Gen.term(w, pool)).concat(sample(ws, 5).map((w) => (lang === "zh" ? Quiz.Gen.reading(w, pool) : Quiz.Gen.term(w, pool))))
    };
    let si = 0;
    function intro() {
      if (si >= plan.length) return finish();
      const s = plan[si];
      box.innerHTML = `<div class="card center test-intro"><span class="badge">${si + 1}/${plan.length}-р хэсэг</span><h2>${esc(s.t)}</h2><p>${s.n ? s.n + " асуулт · " : ""}${s.min} минут</p><button class="btn big" id="sgo">Эхлэх</button></div>`;
      document.getElementById("sgo").onclick = () => section(s);
      box.scrollIntoView({ behavior: "smooth" });
    }
    function section(s) {
      if (s.k === "write" && lang === "en") return ieltsWriting(s);
      const qs = build[s.k]();
      Quiz.run(box, qs, {
        timeLimit: s.min * 60,
        onRetry: () => {},
        onFinish: (score, total) => {
          scores[s.k] = { score, total, pct: total ? Math.round((score / total) * 100) : 0 };
          box.querySelector(".result .row").innerHTML = `<button class="btn big" id="snext">${si + 1 < plan.length ? "Дараагийн хэсэг →" : "Дүн харах"}</button>`;
          document.getElementById("snext").onclick = () => { si++; intro(); };
        }
      });
    }
    function ieltsWriting(s) {
      const tasks = window.IELTS_PRACTICE.writing.filter((x) => x.task === 2);
      const t = tasks[Math.floor(Math.random() * tasks.length)];
      let left = s.min * 60;
      box.innerHTML = `<div class="card"><span class="badge">Writing Task 2 · ${s.min} мин · 250+ үг</span><h3>${esc(t.title)}</h3><p>${esc(t.prompt)}</p>
        <textarea class="input essay" id="messay" placeholder="Эссэгээ энд бичнэ үү..."></textarea>
        <div class="row between"><span id="mwc" class="wc">0 үг</span><span class="timer" id="mwt"></span><button class="btn" id="mdone">Дуусгах</button></div></div>`;
      const ta = document.getElementById("messay");
      ta.oninput = () => (document.getElementById("mwc").textContent = (ta.value.trim().match(/\S+/g) || []).length + " үг");
      const tm = setInterval(() => {
        const el = document.getElementById("mwt");
        if (!el) return clearInterval(tm);
        left--; el.textContent = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`;
        if (left <= 0) { clearInterval(tm); document.getElementById("mdone").click(); }
      }, 1000);
      document.getElementById("mdone").onclick = async () => {
        clearInterval(tm);
        const words = (ta.value.trim().match(/\S+/g) || []).length;
        Progress.update((p) => { p.writing = p.writing || {}; p.writing["mock-" + Date.now()] = ta.value; });
        {
          const self = parseFloat(prompt("Writing хэсгээ band шалгуураар өөрөө үнэлнэ үү (жишээ: 5.5):", words >= 250 ? "6" : "5")) || 5;
          scores.write = { band: Math.max(1, Math.min(9, Math.round(self * 2) / 2)) };
        }
        box.insertAdjacentHTML("beforeend", `<div class="row center"><button class="btn big" id="snext">Дүн харах</button></div>`);
        document.getElementById("snext").onclick = () => { si++; intro(); };
      };
    }
    function finish() {
      let name, result, html;
      if (lang === "zh") {
        const secs = plan.map((s) => ({ t: s.t, v: Math.round((scores[s.k] ? scores[s.k].pct : 0)) }));
        const total = secs.reduce((n, s) => n + s.v, 0), max = secs.length * 100, pass = total >= max * 0.6;
        name = `${L.course.short} ${L.label}`; result = `${total}/${max} ${pass ? "✔" : "✘"}`;
        html = `<div class="result-score ${pass ? "pass" : "fail"}">${total}<small>/${max}</small></div><p>${pass ? "🎉 Тэнцлээ! (60%+)" : "Тэнцэхэд " + Math.ceil(max * 0.6 - total) + " оноо дутлаа"}</p>
          <div class="mock-secs">${secs.map((s) => `<div class="card"><b>${esc(s.t)}</b><span>${s.v}/100</span></div>`).join("")}</div>`;
      } else {
        const lb = bandOf(scores.listen ? scores.listen.pct : 0), rb = bandOf(scores.read ? scores.read.pct : 0), wb = scores.write ? scores.write.band : null;
        const overall = Math.round(((lb + rb + (wb || 0)) / (wb ? 3 : 2)) * 2) / 2;
        name = `IELTS ${L.label}`; result = `Band ${overall}`;
        html = `<div class="result-score pass">${overall}</div><p>Ойролцоо IELTS band (Listening, Reading, Writing)</p>
          <div class="mock-secs"><div class="card"><b>Listening</b><span>${lb}</span></div><div class="card"><b>Reading</b><span>${rb}</span></div>${wb ? `<div class="card"><b>Writing</b><span>${wb}</span></div>` : ""}</div>`;
      }
      Progress.update((p) => { p.mocks = (p.mocks || []).concat([{ name, result, date: Date.now() }]); p.xp += 50; A.bump(p, "tests"); });
      box.innerHTML = `<div class="result card"><span class="tamga" aria-hidden="true">ДУУСЛАА</span><h2>🏁 Шалгалт дууслаа</h2>${html}<p class="muted">+50 XP</p><div class="row center"><button class="btn" onclick="location.reload()">Дахин өгөх</button><a class="btn ghost" href="#/dashboard">Самбар</a></div></div>`;
    }
    intro();
  }

  /* =====================================================================
     Харилцан ярианы сонсгол
     ===================================================================== */
  function voicesFor(lang) {
    if (!Speech.supported) return [];
    const pre = lang === "zh" ? "zh" : "en";
    return speechSynthesis.getVoices().filter((v) => (v.lang || "").toLowerCase().replace("_", "-").startsWith(pre));
  }
  P.dialogues = function (id) {
    const lang = A.track();
    const list = window.DIALOGUES.filter((d) => d.lang === lang);
    const dOpen = (x) => A.hasAccess(lang) || (lang === "zh" ? x.tier === 1 : x.level === "A1");
    const d = list.find((x) => x.id === id);
    if (d && !dOpen(d)) { view().innerHTML = `<a class="back" href="#/dialogues">← Бүх яриа</a>` + A.paywall("Энэ харилцан яриа багцад багтана."); return; }
    if (!d) {
      view().innerHTML = `${H("🗣️ Харилцан яриа", "Амьдралын бодит нөхцөлийн яриаг сонсоод асуултад хариулаарай")}
        <div class="grid cards3">${list.map((x) => `<a class="card level-card" href="#/dialogues/${x.id}"><span class="badge">${dOpen(x) ? "" : "🔒 "}${lang === "zh" ? "Түвшин " + x.tier : x.level}</span><h3 class="${lang}">${esc(x.title)}</h3><p>${esc(x.scene)}</p><span class="muted small">${x.nLines || x.lines.length} мөр · ${x.nQuestions || x.questions.length} асуулт</span></a>`).join("")}</div>`;
      return;
    }
    const show = { text: false, mn: false };
    view().innerHTML = `
      <a class="back" href="#/dialogues">← Бүх яриа</a>
      ${H("🗣️ " + esc(d.title), esc(d.scene))}
      <div class="card dlg-player">
        <div class="row">
          <button class="btn" id="dplay">▶ Сонсох</button><button class="btn ghost" id="dstop">■ Зогсоох</button>
          <label class="rate-ctl">Хурд <input type="range" id="drate" min="0.5" max="1.2" step="0.1" value="0.85"></label>
          <label class="check"><input type="checkbox" id="dtext"> Текст харуулах</label>
          <label class="check"><input type="checkbox" id="dmn"> Орчуулга</label>
        </div>
        <div class="dlg-lines" id="dl"></div>
      </div>
      <h2 class="section-title">Асуултууд</h2><div id="dq"></div>`;
    const dl = document.getElementById("dl");
    function draw(cur) {
      dl.innerHTML = d.lines.map((l, i) => `<div class="dlg-line ${l.s === "A" ? "sa" : "sb"} ${i === cur ? "on" : ""}" data-i="${i}">
        <span class="dlg-sp">${l.s}</span><div>${show.text ? `<div class="dlg-t ${lang}">${esc(l.t)}</div>${l.p ? `<div class="s-read">${esc(l.p)}</div>` : ""}` : `<div class="dlg-hidden">🎧 · · ·</div>`}${show.mn ? `<div class="muted small">${esc(l.m)}</div>` : ""}</div>
        <button class="icon-btn" data-say="${i}">🔊</button></div>`).join("");
      dl.querySelectorAll("[data-say]").forEach((b) => (b.onclick = () => sayLine(+b.dataset.say)));
    }
    let stopFlag = false;
    function sayLine(i, after) {
      if (!Speech.supported) return UI.toast("Хөтөч дуу унших боломжгүй.", "warn");
      const l = d.lines[i];
      const vs = voicesFor(lang);
      const u = new SpeechSynthesisUtterance(l.t);
      u.lang = lang === "zh" ? "zh-CN" : "en-GB";
      if (vs.length) u.voice = vs[l.s === "A" ? 0 : Math.min(1, vs.length - 1)];
      u.pitch = l.s === "A" ? 1.05 : 0.8;
      u.rate = +document.getElementById("drate").value;
      draw(i);
      u.onend = () => { if (after && !stopFlag) setTimeout(after, 350); };
      speechSynthesis.speak(u);
    }
    document.getElementById("dplay").onclick = () => {
      speechSynthesis.cancel(); stopFlag = false;
      const go = (i) => { if (i < d.lines.length && document.body.contains(dl)) sayLine(i, () => go(i + 1)); else draw(-1); };
      go(0);
    };
    document.getElementById("dstop").onclick = () => { stopFlag = true; speechSynthesis.cancel(); draw(-1); };
    document.getElementById("dtext").onchange = (e) => { show.text = e.target.checked; draw(-1); };
    document.getElementById("dmn").onchange = (e) => { show.mn = e.target.checked; draw(-1); };
    draw(-1);
    const qs = d.questions.map((q) => Object.assign(Quiz.Gen.grammar(q), { type: "Харилцан яриа" }));
    Quiz.run(document.getElementById("dq"), qs, { onFinish: (sc) => Progress.update((p) => { p.listening++; p.xp += sc * 3; A.bump(p, "listening"); }), onRetry: () => P.dialogues(id) });
  };

  /* =====================================================================
     Үгийн тулаан (duel)
     ===================================================================== */
  function duelQuestions(courseId, level) {
    const pool = Quiz.poolFor(courseId, level);
    const ws = sample(getLevel(courseId, level).words.filter((w) => !w.noMn), 10);
    return ws.map((w) => { const q = Quiz.Gen.meaning(w, pool); return { t: w.term, r: w.reading, lang: w.lang, o: q.options, a: q.answer }; });
  }
  function playDuel(box, qs, onDone) {
    let i = 0, score = 0, timer = null;
    function show() {
      clearInterval(timer);
      if (i >= qs.length) return onDone(score);
      const q = qs[i];
      let left = 10;
      box.innerHTML = `<div class="quiz card duel-q">
        <div class="quiz-top"><span class="badge">⚔️ ${i + 1}/${qs.length}</span><span class="timer" id="dt">10</span><span>Оноо: <b>${score}</b></span></div>
        <div class="progressbar"><div style="width:${(i / qs.length) * 100}%"></div></div>
        <div class="quiz-prompt"><div class="q-term ${q.lang}">${esc(q.t)}</div><div class="q-sub">${esc(q.r || "")}</div></div>
        <div class="options">${q.o.map((o, k) => `<button class="opt" data-k="${k}">${esc(o)}</button>`).join("")}</div></div>`;
      const next = (ok, btn) => {
        clearInterval(timer);
        box.querySelectorAll(".opt").forEach((x) => (x.disabled = true));
        box.querySelectorAll(".opt")[q.a].classList.add("correct");
        if (btn && !ok) btn.classList.add("wrong");
        if (ok) score++;
        setTimeout(() => { i++; show(); }, 600);
      };
      box.querySelectorAll(".opt").forEach((b) => (b.onclick = () => next(+b.dataset.k === q.a, b)));
      timer = setInterval(() => {
        const t = document.getElementById("dt");
        if (!t) return clearInterval(timer);
        left--; t.textContent = left; t.classList.toggle("low", left <= 3);
        if (left <= 0) next(false);
      }, 1000);
    }
    show();
  }
  P.duels = async function () {
    if (A.needServer()) return;
    const withId = A.query && A.query.with;
    view().innerHTML = `${H("⚔️ Үгийн тулаан", "Найзаа сорьж, хэн нь илүү олон үг мэддэгийг тодруулаарай! Асуулт бүрт 10 секунд.")}
      <div class="split"><aside class="lvl-side">${A.picker()}</aside><section class="split-main">
        <div class="card"><h3>Шинэ тулаан</h3><div class="row"><select class="input grow" id="dfr"><option value="">Найз сонгох...</option></select><button class="btn" id="dnew">⚔️ Тулаан эхлүүлэх</button></div>
        <p class="muted small">Эхлээд та 10 асуултад хариулна, дараа нь найз тань ижил асуултад хариулна.</p></div>
        <div id="dbox"></div>
        <h2 class="section-title">Миний тулаанууд</h2><div id="dlist"><p class="muted">Ачаалж байна...</p></div>
      </section></div>`;
    A.bindPicker(P.duels);
    const box = document.getElementById("dbox");
    try {
      const fr = await Remote.call("GET", "friends");
      const sel = document.getElementById("dfr");
      sel.innerHTML += fr.friends.map((f) => `<option value="${esc(f.id)}" ${f.id === withId ? "selected" : ""}>${esc(f.name)}</option>`).join("");
      if (!fr.friends.length) sel.innerHTML = `<option value="">Эхлээд найз нэмнэ үү</option>`;
    } catch (e) { /* ignore */ }
    document.getElementById("dnew").onclick = () => {
      const to = document.getElementById("dfr").value;
      if (!to) return UI.toast("Найзаа сонгоно уу.", "warn");
      const qs = duelQuestions(A.pick.course, A.pick.level);
      if (qs.length < 5) return UI.toast("Энэ түвшинд асуулт хүрэлцэхгүй байна.", "warn");
      playDuel(box, qs, async (score) => {
        try {
          await Remote.call("POST", "duels", { toId: to, course: A.pick.course, level: A.pick.level, questions: qs, score });
          Progress.update((p) => { p.xp += score; A.bump(p, "duel"); });
          box.innerHTML = `<div class="card center result"><h2>Таны оноо: ${score}/${qs.length}</h2><p>Найздаа сорилт илгээлээ! Хариу ирэхэд мэдэгдэл ирнэ.</p></div>`;
          loadList();
        } catch (e) { UI.toast(e.message, "warn"); }
      });
    };
    async function loadList() {
      const el = document.getElementById("dlist");
      if (!el) return;
      const { duels } = await Remote.call("GET", "duels");
      el.innerHTML = duels.length ? duels.map((d) => {
        const st = d.status === "pending" ? (d.canPlay ? `<button class="btn small" data-play="${d.id}">▶ Тоглох</button><button class="btn ghost small" data-decl="${d.id}">Татгалзах</button>` : `<span class="pill">⏳ Хүлээж байна</span>`)
          : d.status === "declined" ? `<span class="pill fail">Татгалзсан</span>`
          : `<span class="pill ${((d.mine ? d.fromScore : d.toScore) > (d.mine ? d.toScore : d.fromScore)) ? "pass" : (d.fromScore === d.toScore ? "" : "fail")}">${d.fromScore} : ${d.toScore}</span>`;
        return `<div class="duel-row card">${A.avatarHtml(d.from, 34)}<b>${esc(d.from.name)}</b><span class="vs">VS</span>${A.avatarHtml(d.to, 34)}<b>${esc(d.to.name)}</b><span class="muted small">${esc(COURSES[d.course] ? COURSES[d.course].short : d.course)} ${esc(d.level)}</span><span class="dr-st">${st}</span></div>`;
      }).join("") : `<p class="muted">Одоогоор тулаан алга.</p>`;
      el.querySelectorAll("[data-play]").forEach((b) => (b.onclick = () => {
        const d = duels.find((x) => x.id === b.dataset.play);
        playDuel(box, d.questions, async (score) => {
          const r = await Remote.call("POST", `duels/${d.id}/play`, { score });
          Progress.update((p) => { p.xp += score + (score > r.duel.fromScore ? 20 : 0); A.bump(p, "duel"); });
          box.innerHTML = `<div class="card center result"><h2>${score > r.duel.fromScore ? "🏆 Та яллаа!" : score < r.duel.fromScore ? "😅 Ялагдлаа" : "🤝 Тэнцлээ"}</h2><div class="result-score pass">${r.duel.fromScore} : ${score}</div></div>`;
          loadList();
        });
        box.scrollIntoView({ behavior: "smooth" });
      }));
      el.querySelectorAll("[data-decl]").forEach((b) => (b.onclick = async () => { await Remote.call("POST", `duels/${b.dataset.decl}/decline`, {}); loadList(); }));
    }
    loadList().catch((e) => UI.toast(e.message, "warn"));
  };

  /* =====================================================================
     Сторй
     ===================================================================== */
  const STORY_BG = ["#0a0a0a", "#c51811", "#1d7a46", "#2f4fb3", "#7a3db8", "#a86400"];
  A.storiesBar = async function (el) {
    if (!el) return;
    let groups = [];
    try { ({ groups } = await Remote.call("GET", "stories")); } catch (e) { return; }
    const me = Auth.current();
    const seen = JSON.parse(localStorage.getItem("hicheel_seen_st") || "{}");
    el.innerHTML = `<button class="story-add" id="stadd">${A.avatarHtml(me, 56)}<span class="plus">+</span><small>Сторй нэмэх</small></button>` +
      groups.map((g, gi) => {
        const unseen = g.items.some((s) => !seen[s.id]);
        return `<button class="story-av ${unseen ? "new" : ""}" data-g="${gi}">${A.avatarHtml(g.user, 56)}<small>${g.mine ? "Та" : esc(g.user.name)}</small></button>`;
      }).join("");
    el.querySelectorAll("[data-g]").forEach((b) => (b.onclick = () => openStories(groups, +b.dataset.g, () => A.storiesBar(el))));
    el.querySelector("#stadd").onclick = () => addStory(() => A.storiesBar(el));
  };
  function addStory(done) {
    let img = null, bg = STORY_BG[0];
    const m = document.createElement("div");
    m.className = "modal";
    m.innerHTML = `<div class="modal-bg"></div><div class="modal-box"><button class="modal-x">✕</button><h3>Сторй нэмэх (24 цаг)</h3>
      <div class="story-prev" id="sp" style="background:${bg}"><div id="spt">Юу хуваалцах вэ?</div></div>
      <div class="row">${STORY_BG.map((c) => `<button class="swatch" data-c="${c}" style="background:${c}"></button>`).join("")}<label class="btn ghost small">📷 Зураг<input type="file" accept="image/*" id="simg" hidden></label></div>
      <textarea class="input" id="stext" rows="2" maxlength="300" placeholder="Текст (жишээ: 今天学了30个汉字！)"></textarea>
      <div class="row center"><button class="btn" id="spost">Нийтлэх</button></div></div>`;
    document.body.appendChild(m);
    const close = () => m.remove();
    m.querySelector(".modal-bg").onclick = close; m.querySelector(".modal-x").onclick = close;
    const sp = m.querySelector("#sp"), spt = m.querySelector("#spt");
    m.querySelector("#stext").oninput = (e) => (spt.textContent = e.target.value || "Юу хуваалцах вэ?");
    m.querySelectorAll(".swatch").forEach((b) => (b.onclick = () => { bg = b.dataset.c; sp.style.background = img ? `url(${img}) center/cover` : bg; }));
    m.querySelector("#simg").onchange = async (e) => {
      try { img = await A.resizeImage(e.target.files[0], { size: 1080 }, 0.8); sp.style.background = `url(${img}) center/cover`; } catch (ex) { UI.toast(ex.message, "warn"); }
    };
    m.querySelector("#spost").onclick = async () => {
      const text = m.querySelector("#stext").value.trim();
      if (!text && !img) return UI.toast("Текст эсвэл зураг нэмнэ үү.", "warn");
      try { await Remote.call("POST", "stories", { text, image: img, bg }); close(); UI.toast("Сторй нийтлэгдлээ", "ok"); done(); } catch (ex) { UI.toast(ex.message, "warn"); }
    };
  }
  const viewedNow = new Set();
  function openStories(groups, gi, refresh) {
    let si = 0, timer = null;
    const seen = JSON.parse(localStorage.getItem("hicheel_seen_st") || "{}");
    const m = document.createElement("div");
    m.className = "modal story-modal";
    document.body.appendChild(m);
    const close = () => { clearTimeout(timer); m.remove(); try { localStorage.setItem("hicheel_seen_st", JSON.stringify(seen)); } catch (e) { /* ignore */ } refresh(); };
    function show() {
      clearTimeout(timer);
      const g = groups[gi];
      if (!g) return close();
      const s0 = g.items[si];
      if (!g.mine && !viewedNow.has(s0.id)) { viewedNow.add(s0.id); Remote.call("POST", `stories/${s0.id}/view`, {}).catch(() => {}); }
      seen[s0.id] = 1;
      m.innerHTML = `<div class="modal-bg"></div><div class="story-view" style="background:${s0.image ? `#000 url(${esc(s0.image)}) center/contain no-repeat` : esc(s0.bg)}">
        <div class="st-bars">${g.items.map((x, k) => `<i class="${k < si ? "full" : k === si ? "run" : ""}"></i>`).join("")}</div>
        <div class="st-head">${A.avatarHtml(g.user, 34)}<b>${esc(g.user.name)}</b><span>${A.timeAgo(s0.createdAt)}</span>
          ${g.mine ? `<button class="st-btn" data-a="del">🗑</button>` : `<button class="st-btn" data-a="rep">⚑</button>`}<button class="st-btn" data-a="x">✕</button></div>
        ${s0.text ? `<div class="st-text">${esc(s0.text)}</div>` : ""}
        <button class="st-nav prev" data-a="prev"></button><button class="st-nav next" data-a="next"></button>
        ${g.mine ? `<button class="st-seen" data-a="seen">👁 Уншсан (${(s0.viewers || []).length}): <span>${(s0.viewers || []).slice(0, 12).map((u) => A.avatarHtml(u, 26)).join("")}</span></button>` : ""}</div>`;
      m.querySelector(".modal-bg").onclick = close;
      m.querySelectorAll("[data-a]").forEach((b) => (b.onclick = async (e) => {
        e.stopPropagation();
        const a = b.dataset.a;
        if (a === "x") return close();
        if (a === "next") return step(1);
        if (a === "prev") return step(-1);
        if (a === "rep") { clearTimeout(timer); return A.reportItem("story", s0.id); }
        if (a === "seen") { clearTimeout(timer); return A.userListModal(`👁 Уншсан (${(s0.viewers || []).length})`, s0.viewers || []); }
        if (a === "del" && confirm("Сторйгоо устгах уу?")) { await Remote.call("DELETE", "stories/" + s0.id); g.items.splice(si, 1); if (!g.items.length) groups.splice(gi, 1); si = Math.min(si, (g.items.length || 1) - 1); show(); }
      }));
      timer = setTimeout(() => step(1), 5000);
    }
    function step(d) {
      const g = groups[gi];
      si += d;
      if (si >= g.items.length) { gi++; si = 0; }
      if (si < 0) { gi--; si = gi >= 0 ? groups[gi].items.length - 1 : 0; }
      if (gi < 0 || gi >= groups.length) return close();
      show();
    }
    show();
  }

  /* =====================================================================
     Админ
     ===================================================================== */
  P.admin = async function (tab) {
    const me = Auth.current();
    if (!Remote.on || !me || !me.isAdmin) { view().innerHTML = `<div class="card center empty"><h2>🛡️ Хандах эрхгүй</h2><p class="muted">Энэ хуудас зөвхөн админд зориулагдсан.</p></div>`; return; }
    tab = tab || "reports";
    view().innerHTML = `${H("🛡️ Админ", "Хэрэглэгч, контент, мэдээллийг удирдах")}
      <div class="stats" id="ast"><p class="muted">Ачаалж байна...</p></div>
      <div class="tabs">
        <a class="tab ${tab === "reports" ? "on" : ""}" href="#/admin/reports">⚑ Мэдээлэл</a>
        <a class="tab ${tab === "users" ? "on" : ""}" href="#/admin/users">👥 Хэрэглэгчид</a>
        <a class="tab ${tab === "posts" ? "on" : ""}" href="#/admin/posts">📰 Пост</a>
        <a class="tab ${tab === "chat" ? "on" : ""}" href="#/admin/chat">💬 Чат</a>
        <a class="tab ${tab === "announce" ? "on" : ""}" href="#/admin/announce">📢 Зарлал</a>
        <a class="tab ${tab === "orders" ? "on" : ""}" href="#/admin/orders">💳 Захиалга</a>
        <a class="tab ${tab === "plans" ? "on" : ""}" href="#/admin/plans">📦 Багц ба данс</a>
      </div>
      <div id="ab"></div>`;
    const ab = document.getElementById("ab");
    Remote.call("GET", "admin/stats").then((s0) => {
      const st = (i, v, l) => `<div class="stat card"><div class="s-icon">${i}</div><div class="s-val">${v}</div><div class="s-lbl">${l}</div></div>`;
      document.getElementById("ast").innerHTML = st("👥", s0.users, "Нийт хэрэглэгч") + st("🟢", s0.active24, "24 цагт идэвхтэй") + st("📅", s0.active7, "7 хоногт идэвхтэй") + st("🆕", s0.newUsers, "7 хоногт шинэ") + st("📰", s0.posts, "Пост") + st("💬", s0.messages, "Чат мессеж") + st("⚑", s0.reports, "Шийдээгүй мэдээлэл") + st("🚫", s0.banned, "Хаагдсан") + st("💳", s0.orders, "Батлах захиалга") + st("💎", s0.premium, "Багцтай хэрэглэгч");
    }).catch((e) => UI.toast(e.message, "warn"));
    const act = async (fn) => { try { await fn(); UI.toast("Амжилттай", "ok"); P.admin(tab); } catch (e) { UI.toast(e.message, "warn"); } };
    if (tab === "reports") {
      const { reports } = await Remote.call("GET", "admin/reports");
      ab.innerHTML = reports.length ? `<div class="table-wrap"><table class="table"><thead><tr><th>Огноо</th><th>Төрөл</th><th>Агуулга</th><th>Шалтгаан</th><th>Мэдээлсэн</th><th></th></tr></thead><tbody>${reports.map((r) => `<tr>
        <td class="nowrap">${A.timeAgo(r.createdAt)}</td><td>${esc(r.kind)}</td><td>${esc(r.preview)}</td><td>${esc(r.reason)}</td><td>${esc(r.reporter.name)}</td>
        <td class="nowrap"><button class="btn danger small" data-rm="${r.id}">${r.kind === "user" ? "Хаах" : "Устгах"}</button> <button class="btn ghost small" data-ok="${r.id}">Алгасах</button></td></tr>`).join("")}</tbody></table></div>` : `<p class="muted center">Шийдээгүй мэдээлэл алга ✔</p>`;
      ab.querySelectorAll("[data-rm]").forEach((b) => (b.onclick = () => act(() => Remote.call("POST", `admin/reports/${b.dataset.rm}/resolve`, { remove: true }))));
      ab.querySelectorAll("[data-ok]").forEach((b) => (b.onclick = () => act(() => Remote.call("POST", `admin/reports/${b.dataset.ok}/resolve`, { remove: false }))));
    }
    if (tab === "users") {
      ab.innerHTML = `<input class="input" id="aq" placeholder="Нэр эсвэл имэйлээр хайх..."><div id="aul"></div>`;
      const load = async () => {
        const { users } = await Remote.call("GET", "admin/users?q=" + encodeURIComponent(document.getElementById("aq").value));
        document.getElementById("aul").innerHTML = `<div class="table-wrap"><table class="table"><thead><tr><th></th><th>Нэр</th><th>Имэйл</th><th>XP</th><th>Сүүлд</th><th>Багц</th><th>Төлөв</th><th></th></tr></thead><tbody>${users.map((u) => `<tr>
          <td>${A.avatarHtml(u, 30)}</td><td><a href="#/u/${esc(u.id)}">${esc(u.name)}</a></td><td>${esc(u.email)}</td><td>${u.xp}</td><td class="nowrap">${A.timeAgo(u.lastSeen)}</td>
          <td class="nowrap small">${premTxt(u.premium) || "—"} <button class="icon-btn" data-prem="${u.id}" title="Багц олгох/хасах">💎</button></td>
          <td>${u.banned ? `<span class="pill fail">Хаагдсан</span>` : u.isAdmin ? `<span class="pill pass">Админ</span>` : "Идэвхтэй"}</td>
          <td class="nowrap"><button class="btn small ${u.banned ? "ghost" : "danger"}" data-ban="${u.id}" data-v="${u.banned ? 0 : 1}">${u.banned ? "Нээх" : "Хаах"}</button> <button class="btn ghost small" data-adm="${u.id}" data-v="${u.isAdmin ? 0 : 1}">${u.isAdmin ? "Админ хасах" : "Админ болгох"}</button> <button class="icon-btn" data-del="${u.id}" title="Устгах">🗑</button></td></tr>`).join("")}</tbody></table></div>`;
        const box2 = document.getElementById("aul");
        box2.querySelectorAll("[data-ban]").forEach((b) => (b.onclick = () => act(() => Remote.call("POST", `admin/users/${b.dataset.ban}/ban`, { banned: b.dataset.v === "1" }))));
        box2.querySelectorAll("[data-adm]").forEach((b) => (b.onclick = () => act(() => Remote.call("POST", `admin/users/${b.dataset.adm}/admin`, { isAdmin: b.dataset.v === "1" }))));
        box2.querySelectorAll("[data-prem]").forEach((b) => (b.onclick = () => {
          const langs = prompt("Аль хэл? zh = хятад, en = англи, all = хоёулаа", "all");
          if (!langs) return;
          const months = prompt("Хэдэн сараар олгох вэ? (хасах бол -1)", "1");
          if (months === null) return;
          act(() => Remote.call("POST", `admin/users/${b.dataset.prem}/premium`, { langs: langs.trim(), months: +months }));
        }));
        box2.querySelectorAll("[data-del]").forEach((b) => (b.onclick = () => { if (confirm("Хэрэглэгчийг бүрмөсөн устгах уу?")) act(() => Remote.call("DELETE", `admin/users/${b.dataset.del}`)); }));
      };
      let t;
      document.getElementById("aq").oninput = () => { clearTimeout(t); t = setTimeout(load, 300); };
      load();
    }
    if (tab === "posts" || tab === "chat") {
      const { items } = await Remote.call("GET", "admin/content?kind=" + (tab === "chat" ? "chat" : "posts"));
      ab.innerHTML = `<div class="table-wrap"><table class="table"><thead><tr><th>Огноо</th><th>Хэрэглэгч</th>${tab === "chat" ? "<th>Өрөө</th>" : ""}<th>Агуулга</th><th></th></tr></thead><tbody>${items.map((x) => `<tr>
        <td class="nowrap">${A.timeAgo(x.createdAt)}</td><td>${esc(x.user.name)}</td>${tab === "chat" ? `<td>${esc(x.room.startsWith("dm:") ? "хувийн" : x.room)}</td>` : ""}<td>${esc(x.text).slice(0, 200)}</td>
        <td><button class="icon-btn" data-del="${x.id}" title="Устгах">🗑</button></td></tr>`).join("")}</tbody></table></div>`;
      ab.querySelectorAll("[data-del]").forEach((b) => (b.onclick = () => { if (confirm("Устгах уу?")) act(() => Remote.call("DELETE", `admin/content/${tab === "chat" ? "chat" : "post"}/${b.dataset.del}`)); }));
    }
    if (tab === "orders") return adminOrders(ab);
    if (tab === "plans") return adminPlans(ab);
    if (tab === "announce") {
      ab.innerHTML = `<form class="card" id="anf"><label>Бүх хэрэглэгчид мэдэгдэл илгээх<textarea class="input" name="text" rows="3" maxlength="300" required placeholder="Жишээ: Шинэ HSK 4 үгс нэмэгдлээ!"></textarea></label>
        <label>Холбоос (заавал биш)<input class="input" name="link" placeholder="#/vocab"></label><button class="btn">📢 Илгээх</button></form>`;
      document.getElementById("anf").onsubmit = async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        try { const r = await Remote.call("POST", "admin/announce", { text: fd.get("text"), link: fd.get("link") }); UI.toast(`${r.sent} хэрэглэгчид илгээлээ`, "ok"); e.target.reset(); } catch (ex) { UI.toast(ex.message, "warn"); }
      };
    }
  };

  /* =====================================================================
     Багц ба төлбөр
     ===================================================================== */
  const LANG_TXT = { zh: "🇨🇳 Хятад хэл", en: "🇬🇧 Англи хэл", all: "🇨🇳🇬🇧 Хятад + Англи" };
  const money = (n) => Number(n || 0).toLocaleString("en-US") + "₮";
  const ymd = (d) => new Date(d).toISOString().slice(0, 10);
  const alive = (d) => d && new Date(d).getTime() > Date.now();
  function premTxt(p) {
    if (!p) return "";
    return [alive(p.zh) ? "中 " + ymd(p.zh) : "", alive(p.en) ? "EN " + ymd(p.en) : ""].filter(Boolean).join(" · ");
  }
  A.paywall = function (msg) {
    return `<div class="card paywall center"><div class="pw-ic">🔒</div><h2>Багцад багтсан хичээл</h2><p class="muted">${esc(msg || "Энэ хэсгийг үзэхийн тулд багц авна уу.")}</p>
      <p class="small muted">HSK 1 ба IELTS A1 үнэгүй. Бусад бүх түвшин багцтай хэрэглэгчид нээлттэй.</p><a class="btn big" href="#/pricing">💎 Багцууд харах</a></div>`;
  };
  const bankHtml = (b, code, amount) => `
    <div class="pay-box">
      <div class="pay-row"><span>Банк</span><b>${esc(b.bank || "—")}</b></div>
      <div class="pay-row"><span>Дансны дугаар</span><b class="copy" data-copy="${esc(b.account)}">${esc(b.account || "—")} ⧉</b></div>
      <div class="pay-row"><span>Хүлээн авагч</span><b>${esc(b.holder || "—")}</b></div>
      ${amount ? `<div class="pay-row"><span>Дүн</span><b class="copy" data-copy="${amount}">${money(amount)} ⧉</b></div>` : ""}
      ${code ? `<div class="pay-row hl"><span>Гүйлгээний утга</span><b class="copy" data-copy="${esc(code)}">${esc(code)} ⧉</b></div>` : ""}
      ${b.note ? `<p class="small muted">${esc(b.note)}</p>` : ""}
    </div>`;
  function bindCopy(el) {
    el.querySelectorAll("[data-copy]").forEach((x) => (x.onclick = () => {
      try { navigator.clipboard.writeText(x.dataset.copy); UI.toast("Хуулагдлаа", "ok"); } catch (e) { /* ignore */ }
    }));
  }
  const ST = { pending: ["⏳ Шалгаж байна", ""], paid: ["✔ Идэвхжсэн", "pass"], rejected: ["✘ Татгалзсан", "fail"], cancelled: ["Цуцалсан", ""] };

  // Чатын дээд хэсэгт багцын сурталчилгаа (багцгүй хэрэглэгчдэд)
  let plansCache = null;
  A.chatPromo = async function (el) {
    if (!el) return;
    const u = Auth.current() || {};
    if (!u.isAdmin && A.hasAccess("zh") && A.hasAccess("en")) return; // админ хэрхэн харагдахыг шалгаж болно
    try { plansCache = plansCache || (await Remote.call("GET", "plans")); } catch (e) { return; }
    const { plans, promo } = plansCache;
    if (!promo || promo.on === false || !plans.length) return;
    const best = plans.find((p) => p.langs === "all") || plans[0];
    const auto = `💎 «${best.name}» багц ердөө ${money(best.price)} — ${best.description || "бүх түвшний хичээл нээгдэнэ"}. Данс руу шилжүүлээд гүйлгээний утга дээр кодоо бичихэд л болно. Баярлалаа!`;
    el.innerHTML = `<div class="chat-promo"><span class="cp-ic">📌</span><div class="cp-body"><b>Хичээл</b> ${esc(promo.text || auto)}</div><a class="btn small" href="#/pricing">Багц авах →</a></div>`;
  };

  P.pricing = async function () {
    if (A.needServer()) return;
    view().innerHTML = `${H("💎 Багц", "Бүх түвшний үг, дүрэм, тест, тоглоом, сонсгол, жишиг шалгалтыг нээгээрэй")}<div id="prc"><p class="muted">Ачаалж байна...</p></div>`;
    const box = document.getElementById("prc");
    let data, orders;
    try {
      [data, { orders }] = await Promise.all([Remote.call("GET", "plans"), Remote.call("GET", "orders"), Auth.refresh()]);
    } catch (e) { box.innerHTML = `<div class="card warn">${esc(e.message)}</div>`; return; }
    const u = Auth.current() || {};
    const prem = u.premium || {};
    const pend = orders.filter((o) => o.status === "pending");
    box.innerHTML = `
      <div class="prem-status card">
        <div><b>Таны эрх</b></div>
        <div class="ps-row"><span>🇨🇳 Хятад хэл</span>${alive(prem.zh) || u.isAdmin ? `<span class="pill pass">✔ ${u.isAdmin ? "Админ" : ymd(prem.zh) + " хүртэл"}</span>` : `<span class="pill">Үнэгүй (зөвхөн HSK 1)</span>`}</div>
        <div class="ps-row"><span>🇬🇧 Англи хэл</span>${alive(prem.en) || u.isAdmin ? `<span class="pill pass">✔ ${u.isAdmin ? "Админ" : ymd(prem.en) + " хүртэл"}</span>` : `<span class="pill">Үнэгүй (зөвхөн A1)</span>`}</div>
      </div>
      ${pend.length ? `<h2 class="section-title">Төлбөр хүлээгдэж буй захиалга</h2>${pend.map((o) => `<div class="card order-card">
        <div class="row between"><b>${esc(o.plan ? o.plan.name : "")}</b><span class="pill">⏳ Шалгаж байна</span></div>
        <p class="small">Доорх данс руу <b>${money(o.amount)}</b> шилжүүлж, гүйлгээний утга дээр <b>${esc(o.code)}</b> кодыг заавал бичнэ үү. Админ шалгаад баталгаажуулмагц мэдэгдэл ирж, хичээл нээгдэнэ.</p>
        ${bankHtml(data.bank, o.code, o.amount)}
        <button class="btn ghost small" data-cancel="${o.id}">Захиалга цуцлах</button></div>`).join("")}` : ""}
      <h2 class="section-title">Багцууд</h2>
      <div class="plan-grid">${data.plans.map((p) => `<div class="card plan ${p.langs === "all" ? "best" : ""}">
        ${p.langs === "all" ? `<span class="plan-flag">Хамгийн ашигтай</span>` : ""}
        <span class="badge">${LANG_TXT[p.langs] || ""}</span>
        <h3>${esc(p.name)}</h3>
        <div class="plan-price">${money(p.price)}<small> / ${p.months} сар</small></div>
        <p class="muted">${esc(p.description)}</p>
        <ul class="plan-feat"><li>Бүх түвшний үгс ба дүрэм</li><li>Хязгааргүй тест, тоглоом, сонсгол</li><li>Бүтэн жишиг шалгалт</li><li>Харилцан яриа, унших сэдвүүд</li></ul>
        <button class="btn full" data-buy="${p.id}">Худалдаж авах</button></div>`).join("") || `<p class="muted">Одоогоор багц алга.</p>`}</div>
      <div class="card how-pay"><h3>Хэрхэн худалдаж авах вэ?</h3><ol><li>Багцаа сонгоод «Худалдаж авах» дарна.</li><li>Гарч ирсэн данс руу дүнгээ шилжүүлж, <b>гүйлгээний утга дээр кодоо</b> бичнэ.</li><li>Админ шалгаад баталгаажуулмагц (ихэвчлэн хэдэн цагийн дотор) мэдэгдэл ирж, хичээл нээгдэнэ.</li></ol></div>
      ${orders.some((o) => o.status !== "pending") ? `<h2 class="section-title">Захиалгын түүх</h2><div class="table-wrap"><table class="table"><thead><tr><th>Огноо</th><th>Багц</th><th>Дүн</th><th>Код</th><th>Төлөв</th></tr></thead><tbody>${orders.filter((o) => o.status !== "pending").map((o) => `<tr><td>${ymd(o.createdAt)}</td><td>${esc(o.plan ? o.plan.name : "")}</td><td>${money(o.amount)}</td><td>${esc(o.code)}</td><td><span class="pill ${ST[o.status][1]}">${ST[o.status][0]}</span>${o.note ? `<small class="muted"> ${esc(o.note)}</small>` : ""}</td></tr>`).join("")}</tbody></table></div>` : ""}`;
    bindCopy(box);
    box.querySelectorAll("[data-buy]").forEach((b) => (b.onclick = async () => {
      const p = data.plans.find((x) => x.id === b.dataset.buy);
      if (!data.bank.account) return UI.toast("Дансны мэдээлэл тохируулагдаагүй байна. Админтай холбогдоно уу.", "warn");
      if (!confirm(`«${p.name}» — ${money(p.price)}. Захиалга үүсгэх үү?`)) return;
      try { await Remote.call("POST", "orders", { planId: p.id }); UI.toast("Захиалга үүслээ. Төлбөрөө шилжүүлнэ үү.", "ok"); P.pricing(); window.scrollTo(0, 0); }
      catch (e) { UI.toast(e.message, "warn"); }
    }));
    box.querySelectorAll("[data-cancel]").forEach((b) => (b.onclick = async () => {
      if (!confirm("Захиалгыг цуцлах уу?")) return;
      try { await Remote.call("POST", `orders/${b.dataset.cancel}/cancel`, {}); P.pricing(); } catch (e) { UI.toast(e.message, "warn"); }
    }));
  };

  async function adminOrders(ab) {
    const st = (A.query && A.query.s) || "pending";
    const q = (A.query && A.query.q) || "";
    const r = await Remote.call("GET", `admin/orders?status=${st}&q=${encodeURIComponent(q)}`);
    ab.innerHTML = `
      <div class="row between wrap">
        <div class="seg">${[["pending", "⏳ Хүлээгдэж буй"], ["paid", "✔ Баталсан"], ["rejected", "✘ Татгалзсан"], ["cancelled", "Цуцалсан"]].map(([k, t]) => `<a href="#/admin/orders?s=${k}" class="${k === st ? "on" : ""}">${t}</a>`).join("")}</div>
        <span class="muted small">Сүүлийн 30 хоногт: <b>${r.paid30}</b> борлуулалт, <b>${money(r.revenue30)}</b></span>
      </div>
      <form id="oq" class="row"><input class="input grow" name="q" value="${esc(q)}" placeholder="Гүйлгээний кодоор хайх (жишээ: HAB12CD)"><button class="btn ghost">Хайх</button></form>
      <p class="muted small">Банкны хуулга дээрх гүйлгээний утга дахь кодыг доорх кодтой, дүнг нь тулгаж шалгаад «Батлах» дарна уу.</p>
      ${r.orders.length ? `<div class="table-wrap"><table class="table"><thead><tr><th>Огноо</th><th>Код</th><th>Хэрэглэгч</th><th>Багц</th><th>Дүн</th><th></th></tr></thead><tbody>${r.orders.map((o) => `<tr>
        <td class="nowrap">${A.timeAgo(o.createdAt)}</td><td><b class="mono">${esc(o.code)}</b></td><td>${esc(o.user.name)}<br><small class="muted">${esc(o.user.email)}</small></td>
        <td>${esc(o.plan ? o.plan.name : "")}<br><small class="muted">${LANG_TXT[o.langs] || ""} · ${o.months} сар</small></td><td class="nowrap"><b>${money(o.amount)}</b></td>
        <td class="nowrap">${o.status === "pending" ? `<button class="btn small" data-ok="${o.id}">✔ Батлах</button> <button class="btn ghost small" data-no="${o.id}">Татгалзах</button>` : `<span class="pill ${ST[o.status][1]}">${ST[o.status][0]}</span>${o.note ? `<small class="muted"> ${esc(o.note)}</small>` : ""}`}</td></tr>`).join("")}</tbody></table></div>` : `<p class="muted center">Захиалга алга.</p>`}`;
    ab.querySelector("#oq").onsubmit = (e) => { e.preventDefault(); location.hash = `#/admin/orders?s=${st}&q=${encodeURIComponent(new FormData(e.target).get("q"))}`; };
    const redo = () => adminOrders(ab);
    ab.querySelectorAll("[data-ok]").forEach((b) => (b.onclick = async () => {
      const o = r.orders.find((x) => x.id === b.dataset.ok);
      if (!confirm(`${o.code} — ${money(o.amount)} төлбөр орж ирснийг шалгасан уу? ${o.user.name}-д багцыг идэвхжүүлэх үү?`)) return;
      try { await Remote.call("POST", `admin/orders/${o.id}/approve`, {}); UI.toast("Багц идэвхжлээ", "ok"); redo(); } catch (e) { UI.toast(e.message, "warn"); }
    }));
    ab.querySelectorAll("[data-no]").forEach((b) => (b.onclick = async () => {
      const note = prompt("Татгалзсан шалтгаан (хэрэглэгчид харагдана):", "Төлбөр орж ирээгүй байна.");
      if (note === null) return;
      try { await Remote.call("POST", `admin/orders/${b.dataset.no}/reject`, { note }); redo(); } catch (e) { UI.toast(e.message, "warn"); }
    }));
  }

  async function adminPlans(ab) {
    const { plans, bank, promo } = await Remote.call("GET", "admin/plans");
    const form = (p) => `<form class="card plan-form" data-id="${p ? esc(p.id) : ""}">
      <div class="grid cards2">
        <label>Нэр<input class="input" name="name" value="${p ? esc(p.name) : ""}" required maxlength="80" placeholder="Хятад хэл · 1 сар"></label>
        <label>Хэл<select class="input" name="langs">${Object.keys(LANG_TXT).map((k) => `<option value="${k}" ${p && p.langs === k ? "selected" : ""}>${LANG_TXT[k]}</option>`).join("")}</select></label>
        <label>Үнэ (₮)<input class="input" name="price" type="number" min="0" step="100" value="${p ? p.price : ""}" required></label>
        <label>Хугацаа (сар)<input class="input" name="months" type="number" min="1" max="36" value="${p ? p.months : 1}" required></label>
      </div>
      <label>Тайлбар<input class="input" name="description" value="${p ? esc(p.description) : ""}" maxlength="300"></label>
      <div class="row between"><label class="check"><input type="checkbox" name="active" ${!p || p.active ? "checked" : ""}> Идэвхтэй (хэрэглэгчид харагдана)</label>
        <span><label class="small muted">Эрэмбэ <input class="input tiny" name="sort" type="number" value="${p ? p.sort : 0}"></label> <button class="btn small">${p ? "Хадгалах" : "➕ Багц нэмэх"}</button></span></div>
    </form>`;
    ab.innerHTML = `
      <h2 class="section-title">🏦 Төлбөр хүлээн авах данс</h2>
      <form class="card" id="bankf">
        <div class="grid cards2">
          <label>Банк<input class="input" name="bank" value="${esc(bank.bank)}" placeholder="Хаан банк"></label>
          <label>Дансны дугаар<input class="input" name="account" value="${esc(bank.account)}" placeholder="5000 1234 56"></label>
          <label>Данс эзэмшигч<input class="input" name="holder" value="${esc(bank.holder)}" placeholder="Овог Нэр"></label>
          <label>Нэмэлт тайлбар<input class="input" name="note" value="${esc(bank.note)}" placeholder="Жишээ: IBAN, утасны дугаар"></label>
        </div>
        <button class="btn">Хадгалах</button>
      </form>
      <h2 class="section-title">📢 Чатын сурталчилгаа</h2>
      <form class="card" id="promof">
        <label class="check"><input type="checkbox" name="on" ${promo.on !== false ? "checked" : ""}> Багцгүй хэрэглэгчдэд чатын дээд хэсэгт харуулах</label>
        <label>Зарын текст (хоосон бол багцын мэдээллээс автоматаар бичнэ)<textarea class="input" name="text" rows="3" maxlength="500" placeholder="Жишээ: Алтан гишүүний нэг жилийн эрх энэ 7 хоногийг дуустал 70% хямдарч 69,900₮ боллоо! Та яараарай.">${esc(promo.text || "")}</textarea></label>
        <button class="btn">Хадгалах</button>
      </form>
      <h2 class="section-title">📦 Багцууд</h2>
      ${plans.map(form).join("")}
      <h3>Шинэ багц</h3>${form(null)}`;
    ab.querySelector("#promof").onsubmit = async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      try { await Remote.call("POST", "admin/promo", { on: fd.get("on") === "on", text: fd.get("text") }); plansCache = null; UI.toast("Сурталчилгаа хадгалагдлаа", "ok"); } catch (ex) { UI.toast(ex.message, "warn"); }
    };
    ab.querySelector("#bankf").onsubmit = async (e) => {
      e.preventDefault();
      try { await Remote.call("POST", "admin/bank", Object.fromEntries(new FormData(e.target))); UI.toast("Данс хадгалагдлаа", "ok"); } catch (ex) { UI.toast(ex.message, "warn"); }
    };
    ab.querySelectorAll(".plan-form").forEach((f) => (f.onsubmit = async (e) => {
      e.preventDefault();
      const fd = new FormData(f);
      const body = Object.fromEntries(fd);
      body.active = fd.get("active") === "on";
      if (f.dataset.id) body.id = f.dataset.id;
      try { await Remote.call("POST", "admin/plans", body); UI.toast("Хадгалагдлаа", "ok"); adminPlans(ab); } catch (ex) { UI.toast(ex.message, "warn"); }
    }));
  }

  /* =====================================================================
     PWA (service worker) ба push мэдэгдэл
     ===================================================================== */
  let swReg = null;
  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("sw.js").then((r) => { swReg = r; }).catch(() => {});
    });
    navigator.serviceWorker && navigator.serviceWorker.addEventListener("message", (e) => {
      if (e.data && e.data.link) location.hash = String(e.data.link).replace(/^#/, "");
    });
  }
  const b64ToU8 = (b) => { const p = "=".repeat((4 - (b.length % 4)) % 4); const s0 = atob((b + p).replace(/-/g, "+").replace(/_/g, "/")); return Uint8Array.from(s0, (c) => c.charCodeAt(0)); };
  A.pushSubscribe = async function () {
    if (!("Notification" in window)) return UI.toast("Таны хөтөч мэдэгдэл дэмжихгүй байна.", "warn");
    const perm = await Notification.requestPermission();
    if (perm !== "granted") return UI.toast("Мэдэгдлийг хөтөч дээрээ зөвшөөрөөгүй байна.", "warn");
    if (!Remote.on || !swReg || !("PushManager" in window)) return UI.toast("Мэдэгдэл асаалаа 🔔 (сайт нээлттэй үед)", "ok");
    try {
      const { publicKey } = await Remote.call("GET", "push/key");
      const sub = await swReg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToU8(publicKey) });
      await Remote.call("POST", "push/subscribe", { subscription: sub.toJSON() });
      await Remote.call("POST", "push/test", {});
      UI.toast("Push мэдэгдэл асаалаа 🔔 Апп хаалттай үед ч ирнэ.", "ok");
    } catch (e) { UI.toast("Push асаахад алдаа: " + e.message, "warn"); }
  };
})();
