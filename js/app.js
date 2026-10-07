/* Хуудсууд ба чиглүүлэгч (hash router) */
(function () {
  "use strict";
  const A = window.App;
  const { esc, shuffle, sample, Auth, Progress, COURSES, getLevel, allWords, Speech, UI, Quiz, Games } = A;
  const view = () => document.getElementById("view");

  // Сонгосон курс/түвшинг санах
  const pick = { course: "hsk2", level: "1" };
  try { Object.assign(pick, JSON.parse(localStorage.getItem("hicheel_pick") || "{}")); } catch (e) { /* ignore */ }
  function savePick() { try { localStorage.setItem("hicheel_pick", JSON.stringify(pick)); } catch (e) { /* ignore */ } }

  // Хэл (track): "zh" — Хятад, "en" — Англи. Сонгосон хэлнээс хамаарч бүх хуудас тохирох хичээлийг харуулна.
  pick.levels = pick.levels || {};
  const track = () => COURSES[pick.course].lang;
  function setCourse(cid, level) {
    pick.levels[pick.course] = pick.level;
    pick.course = cid;
    if (cid !== "ielts") pick.lastZh = cid;
    const lv = COURSES[cid].data().levels;
    pick.level = level && lv.includes(level) ? level : (pick.levels[cid] && lv.includes(pick.levels[cid]) ? pick.levels[cid] : lv[0]);
    savePick();
  }
  function setTrack(lang) {
    if (track() === lang) return;
    setCourse(lang === "zh" ? (pick.lastZh || "hsk2") : "ielts");
  }
  const FLAG = { zh: `<span class="flag zh">中</span>`, en: `<span class="flag en">EN</span>` };

  // Сонгосон түвшин түгжээтэй бол үнэгүй түвшин рүү шилжүүлнэ
  function ensurePick() {
    const c = COURSES[pick.course];
    if (!c.data().levels.includes(pick.level)) pick.level = c.data().levels[0];
    if (A.isLocked(pick.course, pick.level)) { pick.level = A.FREE_LEVELS[pick.course][0]; savePick(); }
  }
  function picker() {
    const c = COURSES[pick.course];
    ensurePick();
    const prog = Progress.get();
    return `
      <div class="picker">
        ${c.lang === "zh" ? `<div class="pk-tabs" id="pk-ver">
          <button data-c="hsk2" class="${pick.course === "hsk2" ? "on" : ""}">Хуучин HSK</button>
          <button data-c="hsk3" class="${pick.course === "hsk3" ? "on" : ""}">Шинэ HSK</button>
        </div>` : `<div class="pk-tabs"><button class="on">IELTS · CEFR</button></div>`}
        <div class="lv-pick" id="pk-lv">
          ${c.data().levels.map((l) => {
            const LL = getLevel(c.id, l), ws = LL.words;
            const n = ws.filter((w) => prog.learned[w.id]).length;
            return `<button data-l="${esc(l)}" class="${l === pick.level ? "on" : ""} ${LL.locked ? "locked" : ""}"><b>${esc(c.levelLabel(l).replace("HSK ", "HSK"))}</b><small>${LL.total || ws.length} үг${LL.locked ? " 🔒" : ""}</small>${n ? `<i class="pk-done">${n}✔</i>` : ""}</button>`;
          }).join("")}
        </div>
        ${A.hasAccess(c.lang) ? "" : `<div class="lock-note"><b>🔒 Бусад түвшин багцтай</b><span>${esc(c.levelLabel(A.FREE_LEVELS[c.id][0]))} үнэгүй. Бусад түвшнийг үзэхийн тулд багц авна уу.</span><a class="btn small full" href="#/pricing">💎 Багц авах</a></div>`}
      </div>`;
  }
  function bindPicker(onChange) {
    document.querySelectorAll("#pk-ver button").forEach((b) => (b.onclick = () => { setCourse(b.dataset.c); onChange(); }));
    document.querySelectorAll("#pk-lv button").forEach((b) => (b.onclick = () => {
      if (A.isLocked(pick.course, b.dataset.l)) { UI.toast("🔒 Энэ түвшин багцад багтана.", "warn"); go("#/pricing"); return; }
      pick.level = b.dataset.l; savePick(); onChange();
    }));
  }

  const pageHead = (title, sub) => `<header class="page-head"><h1>${title}</h1>${sub ? `<p>${sub}</p>` : ""}<i class="hamar" aria-hidden="true"></i></header>`;
  const strokeBtn = (w) => `<button class="icon-btn" data-stroke="${esc(w.term)}" data-read="${esc(w.reading)}" title="Зурааны дараалал" aria-label="Зурааны дараалал">✍️</button>`;
  const speakBtn = (text, lang) => `<button class="icon-btn" data-say="${esc(text)}" data-lang="${lang}" title="Сонсох" aria-label="Сонсох">🔊</button>`;

  /* ======================= ХУУДСУУД ======================= */
  const Pages = {};

  /* ---------- Нүүр ---------- */
  Pages.home = function () {
    const u = Auth.current();
    view().innerHTML = `
      <section class="hero">
        <div>
          <h1>Хятад, англи хэлийг <span class="grad">нэг дороос</span> сур</h1>
          <p>HSK 2.0 (хуучин) ба HSK 3.0 (шинэ) 1–6+ түвшин, IELTS A1–C1. Үг, дүрэм, сонсгол, тоглоом, тест шалгалт, толь бичиг — бүгд монгол тайлбартай.</p>
          <div class="row">
            ${u ? `<a class="btn big" href="#/dashboard">Хичээлээ үргэлжлүүлэх →</a>`
                : `<a class="btn big" href="#/register">Үнэгүй бүртгүүлэх</a><a class="btn big ghost" href="#/login">Нэвтрэх</a>`}
          </div>
        </div>
        <div class="hero-art" aria-hidden="true">
          <div class="hero-ulzii"></div>
          <div class="bubble zh">你好</div><div class="bubble en">Hello</div><div class="bubble mn">Сайн уу</div>
        </div>
      </section>
      <section class="grid cards3">
        ${feature("中", "Хятад хэл (HSK)", "HSK 2.0 — 6 түвшин, HSK 3.0 — 9 түвшин. Пиньинь, утга, дуудлага, дүрэм.", "#/chinese")}
        ${feature("EN", "Англи хэл (IELTS)", "CEFR A1–C1 түвшин, IELTS band оноотой харьцуулалт, унших дасгал.", "#/english")}
        ${feature("🎧", "Сонсгол", "Үг, өгүүлбэр сонсож таних, сонсоод бичих дасгал.", "#/listening")}
        ${feature("🎮", "8 төрлийн тоглоом", "Флаш карт, хос тааруулах, хурдны сорил, өгүүлбэр, аялгуу, үг угсрах, тоо, дуудлага.", "#/games")}
        ${feature("📝", "Тест шалгалт", "Түвшин тогтоох хугацаатай шалгалт, дүнгийн түүх.", "#/tests")}
        ${feature("📖", "Толь бичиг", "Хятад–монгол–англи толь. Хайх, сонсох, зурааны дараалал.", "#/dictionary")}
        ${feature("🗂️", "Anki давталт", "Зайтай давталтын систем: мартах үед тань яг цагт нь сануулна. Өөрийн карт нэмнэ.", "#/review")}
        ${feature("🎯", "IELTS Writing & Speaking", "Цагтай эссе бичих, үг тоолох, cue card, яриагаа бичиж сонсох.", "#/ielts")}
        ${feature("✍️", "Ханз бичих", "Зурааны дараалал хөдөлгөөнтэй, өөрөө зурж дадлагажих.", "#/dictionary")}
      </section>`;
    function feature(icon, t, d, href) {
      return `<a class="card feature" href="${href}"><div class="f-icon">${icon}</div><h3>${t}</h3><p>${d}</p></a>`;
    }
  };

  /* ---------- Нэвтрэх / Бүртгүүлэх ---------- */
  Pages.login = function () {
    view().innerHTML = `
      <div class="auth card orn-c">
        <i class="hamar big" aria-hidden="true"></i>
        <h2>Нэвтрэх</h2>
        <form id="f">
          <label>Имэйл<input class="input" name="email" type="email" required autocomplete="email" /></label>
          <label>Нууц үг<input class="input" name="password" type="password" required autocomplete="current-password" /></label>
          <div class="error" id="err"></div>
          <button class="btn full">Нэвтрэх</button>
        </form>
        <p class="center small"><a href="#/forgot">Нууц үгээ мартсан уу?</a></p>
        <p class="muted center">Бүртгэлгүй юу? <a href="#/register">Бүртгүүлэх</a></p>
      </div>`;
    if (A.query.err) document.getElementById("err").textContent = A.query.err === "banned" ? "Таны бүртгэл хаагдсан байна." : "Нэвтэрч чадсангүй. Дахин оролдоно уу.";
    document.getElementById("f").onsubmit = async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      try {
        const u = await Auth.login({ email: fd.get("email"), password: fd.get("password") });
        UI.toast("Тавтай морил, " + u.name + "!", "ok");
        const dest = Router.after || "#/dashboard";
        Router.after = null;
        go(dest);
      } catch (err) { document.getElementById("err").textContent = err.message; }
    };
  };


  Pages.register = function () {
    view().innerHTML = `
      <div class="auth card orn-c">
        <i class="hamar big" aria-hidden="true"></i>
        <h2>Бүртгүүлэх</h2>
        <form id="f">
          <label>Нэр<input class="input" name="name" required autocomplete="name" /></label>
          <label>Имэйл<input class="input" name="email" type="email" required autocomplete="email" /></label>
          <label>Нууц үг (6+ тэмдэгт)<input class="input" name="password" type="password" required minlength="6" autocomplete="new-password" /></label>
          <label>Нууц үг давтах<input class="input" name="password2" type="password" required autocomplete="new-password" /></label>
          <div class="error" id="err"></div>
          <button class="btn full">Бүртгүүлэх</button>
        </form>
        <p class="muted center">Бүртгэлтэй юу? <a href="#/login">Нэвтрэх</a></p>
        <p class="note">${A.Remote.on ? "🔒 Бүртгэл, ахиц тань серверт найдвартай хадгалагдах тул аль ч төхөөрөмжөөс нэвтэрч болно." : "ℹ️ Сервер холбогдоогүй тул бүртгэл, ахиц энэ хөтөч дээр хадгалагдана."}</p>
      </div>`;
    document.getElementById("f").onsubmit = async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const err = document.getElementById("err");
      if (fd.get("password") !== fd.get("password2")) { err.textContent = "Нууц үг таарахгүй байна."; return; }
      try {
        await Auth.register({ name: fd.get("name"), email: fd.get("email"), password: fd.get("password") });
        Router.after = null;
        UI.toast("Бүртгэл амжилттай үүслээ!", "ok");
        go("#/dashboard");
      } catch (ex) { err.textContent = ex.message; }
    };
  };

  /* ---------- Хянах самбар ---------- */
  Pages.dashboard = function () {
    const u = Auth.current(), p = Progress.get();
    const learned = Object.keys(p.learned).length;
    const avg = p.tests.length ? Math.round(p.tests.reduce((s, t) => s + t.pct, 0) / p.tests.length) : 0;
    const courseStats = Object.values(COURSES).filter((c) => c.lang === track()).map((c) => {
      const lv = c.data().levels.map((l) => {
        const ws = getLevel(c.id, l).words;
        const n = ws.filter((w) => p.learned[w.id]).length;
        return `<a class="lv-chip" href="#/${c.lang === "zh" ? "chinese/" + c.id : "english"}/${encodeURIComponent(l)}" title="${n}/${ws.length} үг">
          <span>${esc(c.levelLabel(l))}</span><span class="mini-bar"><i style="width:${ws.length ? (n / ws.length) * 100 : 0}%"></i></span></a>`;
      }).join("");
      return `<div class="card"><h3>${esc(c.title)}</h3><div class="lv-chips">${lv}</div></div>`;
    }).join("");
    // Өдрийн үг (огноогоор тогтмол)
    const uniq = Array.from(new Map(allWords().map((w) => [w.id, w])).values());
    const pool = uniq.filter((w) => w.lang === track() && !w.noMn);
    const wotd = pool[A.today().split("-").join("") % pool.length];
    const due = A.SRS.allDue();
    const done = p.activity[A.today()] || 0;
    const goalPct = Math.min(100, Math.round((done / p.goal) * 100));
    const days = Array.from({ length: 7 }, (_, k) => {
      const d = new Date(Date.now() - (6 - k) * 864e5);
      return { key: A.dayKey(d), lbl: ["Ня", "Да", "Мя", "Лх", "Пү", "Ба", "Бя"][d.getDay()] };
    });
    const mx = Math.max(p.goal, ...days.map((d) => p.activity[d.key] || 0));
    view().innerHTML = `
      ${pageHead("Сайн уу, " + esc(u.name) + "! 👋", "Өнөөдөр юу сурах вэ?")}
      <div id="quest-mount"></div>
      <div id="plan-mount"></div>
      <div class="dash-top">
        <div class="card hero-card">
          <div>
            <span class="eyebrow">Өнөөдрийн давталт</span>
            <h2>${due ? due + " карт таныг хүлээж байна" : "Давтах карт алга 🎉"}</h2>
            <p>${due ? "Мартахаас нь өмнө давтаж, ой санамжаа бэхжүүлээрэй." : "Шинэ түвшин сонгоод шинэ үг сурч эхлээрэй."}</p>
            <a class="btn light" href="#/review">${due ? "▶ Давтах" : "＋ Шинэ үг сурах"}</a>
          </div>
          <div class="goal-ring light" style="--p:${goalPct}"><span>${done}<small>/${p.goal}</small></span></div>
        </div>
        ${wotd ? `<div class="card wotd">
          <span class="eyebrow">Өдрийн үг · ${esc(wotd.course === "ielts" ? "IELTS " + wotd.level : COURSES[wotd.course].short + " " + wotd.level)}</span>
          <div class="wotd-term ${wotd.lang}">${esc(wotd.term)}</div>
          <div class="w-read">${esc(wotd.reading)}</div>
          <div class="wotd-mean">${esc(wotd.meaning)}</div>
          ${wotd.example ? `<div class="muted small">${esc(wotd.example)}</div>` : ""}
          <div class="row">${speakBtn(wotd.term, wotd.lang)}${wotd.lang === "zh" ? strokeBtn(wotd) : ""}<button class="icon-btn ${p.favorites.includes(wotd.id) ? "on" : ""}" data-fav="${esc(wotd.id)}" title="Хадгалах">★</button></div>
        </div>` : ""}
      </div>
      <div class="stats">
        ${stat("⭐", p.xp, "XP оноо")}
        ${stat("🔥", p.streak, "Дараалсан өдөр")}
        ${stat("📚", learned + "<small> / " + uniq.filter((w) => w.lang === track()).length + "</small>", "Цээжилсэн үг")}
        ${stat("📝", p.tests.length, "Өгсөн тест")}
        ${stat("🎯", avg + "%", "Тестийн дундаж")}
      </div>
      <div class="grid cards2">
        <div class="card">
          <h3>📈 Сүүлийн 7 хоног</h3>
          <div class="bars">${days.map((d) => { const v = p.activity[d.key] || 0; return `<div class="bar" title="${v} карт"><i style="height:${(v / mx) * 100}%" class="${v >= p.goal ? "met" : ""}"></i><span>${d.lbl}</span></div>`; }).join("")}</div>
          <p class="muted small">Өдөр бүр давтсан картын тоо · зорилго ${p.goal}</p>
        </div>
        <div class="card">
          <h3>⚡ Шуурхай эхлэх</h3>
          <div class="quick-grid">
            ${track() === "zh"
              ? `<a href="#/chinese">${FLAG.zh} HSK хичээл</a><a href="#/grammar">✏️ Дүрэм</a><a href="#/games/flash">🃏 Флаш карт</a><a href="#/listening">🎧 Сонсгол</a><a href="#/games/tone">🎵 Аялгуу таах</a><a href="#/tests">📝 Тест өгөх</a>`
              : `<a href="#/english">${FLAG.en} IELTS хичээл</a><a href="#/grammar">✏️ Дүрэм</a><a href="#/games/flash">🃏 Флаш карт</a><a href="#/listening">🎧 Сонсгол</a><a href="#/ielts/writing">✍️ Writing</a><a href="#/tests">📝 Тест өгөх</a>`}
          </div>
        </div>
      </div>
      <h2 class="section-title">Түвшний ахиц</h2>
      <div class="grid cards3">${courseStats}</div>
      <h2 class="section-title">Сүүлийн тестүүд</h2>
      ${testTable(p.tests.slice(-5).reverse())}`;
    bindCommon(view());
    if (A.questWidget) A.questWidget(document.getElementById("quest-mount"));
    if (A.planWidget) A.planWidget(document.getElementById("plan-mount"));
    function stat(i, v, l) { return `<div class="stat card"><div class="s-icon">${i}</div><div class="s-val">${v}</div><div class="s-lbl">${l}</div></div>`; }
  };

  function testTable(tests) {
    if (!tests.length) return `<p class="muted">Одоогоор тест өгөөгүй байна. <a href="#/tests">Тест өгөх →</a></p>`;
    return `<div class="table-wrap"><table class="table"><thead><tr><th>Огноо</th><th>Хичээл</th><th>Түвшин</th><th>Оноо</th><th>Дүн</th></tr></thead><tbody>
      ${tests.map((t) => `<tr><td>${new Date(t.date).toLocaleString("mn-MN")}</td><td>${esc(COURSES[t.course] ? COURSES[t.course].short : t.course)}</td><td>${esc(t.level)}</td><td>${t.score}/${t.total}</td><td><span class="pill ${t.pct >= 60 ? "pass" : "fail"}">${t.pct}%</span></td></tr>`).join("")}
    </tbody></table></div>`;
  }

  /* ---------- Хятад хэл ---------- */
  Pages.chinese = function (ver, level) {
    if (ver && level) return levelPage(ver, decodeURIComponent(level));
    ver = ver === "hsk3" || ver === "hsk2" ? ver : (pick.lastZh || "hsk2");
    if (pick.course !== ver) setCourse(ver);
    const d = COURSES[ver].data();
    const p = Progress.get();
    view().innerHTML = `
      ${pageHead(FLAG.zh + " Хятад хэл — HSK", "Хятад хэлний түвшин тогтоох олон улсын шалгалт")}
      <div class="tabs" role="tablist">
        <a class="tab ${ver === "hsk2" ? "on" : ""}" href="#/chinese/hsk2">HSK 2.0 (хуучин)</a>
        <a class="tab ${ver === "hsk3" ? "on" : ""}" href="#/chinese/hsk3">HSK 3.0 (шинэ)</a>
      </div>
      <div class="card info-box">
        ${ver === "hsk2"
          ? `<p><b>HSK 2.0</b> нь 2009 оноос хэрэглэгдэж буй <b>6 түвшинтэй</b> стандарт. Нийт <b>5000 үг</b>. Шалгалт нь сонсгол, унших, бичих хэсгээс бүрдэнэ (1–2-р түвшинд бичих хэсэггүй).</p>`
          : `<p><b>HSK 3.0</b> (2021 оны «Олон улсын хятад хэлний түвшний стандарт») нь <b>3 шат, 9 түвшинтэй</b>: анхан (1–3), дунд (4–6), ахисан (7–9). Нийт <b>11092 үг, 3000 ханз</b>. Сонсох, ярих, унших, бичих, <b>орчуулах</b> гэсэн 5 чадварыг үнэлнэ.</p>`}
        <details><summary>HSK 2.0 ба 3.0-ийн ялгаа</summary>
          <div class="table-wrap"><table class="table">
            <thead><tr><th></th><th>HSK 2.0</th><th>HSK 3.0</th></tr></thead>
            <tbody>
              <tr><td>Түвшин</td><td>6</td><td>9 (3 шат)</td></tr>
              <tr><td>Нийт үг</td><td>5000</td><td>11092</td></tr>
              <tr><td>Ханз</td><td>2663</td><td>3000</td></tr>
              <tr><td>1-р түвшний үг</td><td>150</td><td>500</td></tr>
              <tr><td>Чадвар</td><td>Сонсох, унших, бичих</td><td>+ ярих, орчуулах</td></tr>
              <tr><td>Гараар бичих</td><td>—</td><td>Ханз гараар бичих шаардлагатай</td></tr>
            </tbody>
          </table></div>
        </details>
      </div>
      <div class="grid cards3">
        ${d.levels.map((l) => {
          const info = d.info[l];
          const ws = getLevel(ver, l).words;
          const n = ws.filter((w) => p.learned[w.id]).length;
          return `<a class="card level-card" href="#/chinese/${ver}/${encodeURIComponent(l)}">
            <div class="lv-badge zh">HSK ${esc(l)}${A.isLocked(ver, l) ? " 🔒" : ""}</div>
            <p>${esc(info.desc)}</p>
            <ul class="facts">
              <li>Шинэ үг: <b>${info.words}</b> (нийт ${info.total})</li>
              ${info.chars ? `<li>Ханз: <b>${info.chars}</b> · Дүрэм: <b>${info.grammar}</b></li>` : `<li>CEFR ойролцоо: <b>${info.cefr}</b></li>`}
              ${info.stage ? `<li>${esc(info.stage)}</li>` : ""}
            </ul>
            <div class="mini-bar"><i style="width:${ws.length ? (n / ws.length) * 100 : 0}%"></i></div>
            <div class="muted small">${ws.length ? `${n}/${ws.length} үг цээжилсэн` : "🔒 Багцад багтана"}</div>
          </a>`;
        }).join("")}
      </div>`;
  };

  /* ---------- Англи хэл ---------- */
  Pages.english = function (level) {
    if (level) return levelPage("ielts", decodeURIComponent(level));
    setTrack("en");
    const d = A.COURSES.ielts.data();
    const p = Progress.get();
    view().innerHTML = `
      ${pageHead(FLAG.en + " Англи хэл — IELTS", "CEFR A1–C1 түвшин ба IELTS бэлтгэл")}
      <div class="card info-box">
        <p><b>IELTS</b> (International English Language Testing System) нь 0–9 band оноогоор үнэлэгддэг. Доорх хүснэгтэд CEFR түвшин ба IELTS оноог ойролцоогоор харьцуулав.</p>
        <div class="table-wrap"><table class="table"><thead><tr><th>CEFR</th><th>IELTS band</th><th>Тайлбар</th></tr></thead><tbody>
          ${d.levels.map((l) => `<tr><td><b>${l}</b></td><td>${d.info[l].band}</td><td>${esc(d.info[l].desc)}</td></tr>`).join("")}
        </tbody></table></div>
        <details><summary>IELTS шалгалтын бүтэц ба зөвлөгөө</summary>
          <div class="grid cards2">${d.tips.map((t) => `<div class="card tip"><h4>${esc(t.title)}</h4><p>${esc(t.text)}</p></div>`).join("")}</div>
        </details>
      </div>
      <div class="grid cards3">
        ${d.levels.map((l) => {
          const LL = getLevel("ielts", l), ws = LL.words, tot = LL.total || ws.length;
          const n = ws.filter((w) => p.learned[w.id]).length;
          return `<a class="card level-card" href="#/english/${l}">
            <div class="lv-badge en">${l}${LL.locked ? " 🔒" : ""}</div>
            <p>${esc(d.info[l].desc)}</p>
            <ul class="facts"><li>IELTS: <b>${d.info[l].band}</b></li><li>Үг: <b>${tot}</b> · Дүрэм: <b>${d.grammar[l].length}</b> · Унших: 1</li></ul>
            <div class="mini-bar"><i style="width:${ws.length ? (n / ws.length) * 100 : 0}%"></i></div>
            <div class="muted small">${ws.length ? `${n}/${ws.length} үг цээжилсэн` : "🔒 Багцад багтана"}</div>
          </a>`;
        }).join("")}
      </div>`;
  };

  /* ---------- Түвшний хуудас (үг, дүрэм, өгүүлбэр, унших) ---------- */
  function levelPage(courseId, level) {
    if (!COURSES[courseId] || !COURSES[courseId].data().levels.includes(level)) return Pages.notfound();
    if (A.isLocked(courseId, level)) {
      view().innerHTML = `<a class="back" href="${COURSES[courseId].lang === "zh" ? "#/chinese/" + courseId : "#/english"}">← ${esc(COURSES[courseId].title)}</a>` + A.paywall(`${COURSES[courseId].short} · ${COURSES[courseId].levelLabel(level)} түвшин багцад багтана.`);
      return;
    }
    if (pick.course !== courseId || pick.level !== level) setCourse(courseId, level);
    const L = getLevel(courseId, level);
    const lang = L.course.lang;
    const back = lang === "zh" ? "#/chinese/" + courseId : "#/english";
    let tab = "words";
    view().innerHTML = `
      <a class="back" href="${back}">← ${esc(L.course.title)}</a>
      ${pageHead(esc(L.course.short) + " · " + esc(L.label), esc(L.info.desc))}
      <div class="tabs">
        <button class="tab on" data-tab="words">📚 Үгс (${L.words.length})</button>
        <button class="tab" data-tab="grammar">✏️ Дүрэм (${L.grammar.length})</button>
        <button class="tab" data-tab="sent">💬 Өгүүлбэр</button>
        ${L.reading ? `<button class="tab" data-tab="read">📄 Унших</button>` : ""}
      </div>
      <div class="row quick">
        <span class="muted">Дадлага:</span>
        <a class="btn small ghost" href="#/games" data-pick>🎮 Тоглоом</a>
        <a class="btn small ghost" href="#/listening" data-pick>🎧 Сонсгол</a>
        <a class="btn small" href="#/tests" data-pick>📝 Тест өгөх</a>
      </div>
      <div id="tabc"></div>`;
    view().querySelectorAll("[data-pick]").forEach((a) => (a.onclick = () => { pick.course = courseId; pick.level = level; savePick(); }));
    view().querySelectorAll(".tab").forEach((b) => (b.onclick = () => {
      view().querySelectorAll(".tab").forEach((x) => x.classList.toggle("on", x === b));
      tab = b.dataset.tab; draw();
    }));
    function draw() {
      const c = document.getElementById("tabc");
      if (tab === "words") return wordsTab(c, L.words);
      if (tab === "grammar") c.innerHTML = `<p class="muted small">${L.grammar.length} дүрэм · <a href="#/grammar">Бүх дүрэм харах →</a></p>` + L.grammar.map((g, gi) => grammarCard(g, gi, lang, gi === 0)).join("");
      if (tab === "sent") c.innerHTML = `<div class="list">${L.sentences.map((s) => `
        <div class="card sent">
          ${speakBtn(s.text, lang)}
          <div><div class="s-text ${lang}">${esc(s.text)}</div>${s.reading ? `<div class="s-read">${esc(s.reading)}</div>` : ""}
          <details><summary>Орчуулга</summary>${esc(s.meaning)}</details></div>
        </div>`).join("")}</div>`;
      if (tab === "read") c.innerHTML = readingCard(L.reading);
      bindCommon(c);
      bindGrammar(c, L);
      if (tab === "read") bindReading(c, L.reading);
    }
    draw();
  }

  // Түвшний үгс: хайлт + хуудаслалт (том жагсаалтад)
  function wordsTab(c, words) {
    const PAGE = 200;
    let limit = PAGE, q = "";
    const noMn = words.filter((w) => w.noMn).length;
    c.innerHTML = `
      <div class="row between">
        <input class="input grow" id="wq" placeholder="Энэ түвшнээс хайх: ханз, пиньинь, утга..." autocomplete="off">
        <span class="muted small">${words.length} үг${noMn ? ` · ${noMn} үгийн монгол орчуулга байхгүй тул англиар харуулав` : ""}</span>
      </div>
      <div id="wt"></div>`;
    const inp = c.querySelector("#wq");
    function draw() {
      const nq = q.trim().toLowerCase(), sq = A.stripTones(q);
      const list = nq ? words.filter((w) => [w.term, w.meaning, w.gloss, w.example].join(" ").toLowerCase().includes(nq) || (sq && A.stripTones(w.reading).includes(sq))) : words;
      const box = c.querySelector("#wt");
      box.innerHTML = wordTable(list.slice(0, limit)) + (list.length > limit ? `<div class="row center"><button class="btn ghost" id="more">Цааш үзэх (${list.length - limit} үлдсэн)</button></div>` : "");
      bindCommon(box);
      const m = box.querySelector("#more");
      if (m) m.onclick = () => { limit += PAGE; draw(); };
    }
    let t = null;
    inp.oninput = () => { clearTimeout(t); t = setTimeout(() => { q = inp.value; limit = PAGE; draw(); }, 150); };
    draw();
  }

  function wordTable(words) {
    const p = Progress.get();
    if (!words.length) return `<p class="muted">Үг олдсонгүй.</p>`;
    return `<div class="table-wrap"><table class="table words">
      <thead><tr><th></th><th>Үг</th><th>${words[0].lang === "zh" ? "Пиньинь" : "Аймаг"}</th><th>Утга</th><th class="hide-sm">${words[0].lang === "zh" ? "English" : "Жишээ"}</th><th></th></tr></thead>
      <tbody>${words.map((w) => `<tr>
        <td class="nowrap">${speakBtn(w.term, w.lang)}${w.lang === "zh" ? strokeBtn(w) : ""}${A.relBtn ? A.relBtn(w) : ""}</td>
        <td class="w-term ${w.lang}">${esc(w.term)}</td>
        <td class="w-read">${esc(w.reading)}</td>
        <td>${w.noMn ? `<span class="tag">EN</span> ` : ""}${esc(w.meaning)}</td>
        <td class="hide-sm muted">${esc(w.gloss || w.example)}</td>
        <td class="nowrap">
          <button class="icon-btn ${p.learned[w.id] ? "on" : ""}" data-learn="${esc(w.id)}" title="Цээжилсэн">✔</button>
          <button class="icon-btn ${p.favorites.includes(w.id) ? "on" : ""}" data-fav="${esc(w.id)}" title="Хадгалах">★</button>
        </td></tr>`).join("")}</tbody></table></div>`;
  }

  function grammarCard(g, gi, lang, open) {
    return `<details class="card grammar" ${open ? "open" : ""}>
      <summary><span class="g-n">${gi + 1}</span><h3>${esc(g.title)}</h3></summary>
      <p>${esc(g.explain)}</p>
      <ul class="examples">${g.examples.map((e) => `<li>${speakBtn(e[0], lang)}<div><span class="${lang} ex-t">${esc(e[0])}</span>${e[2] ? `<span class="ex-py">${esc(e[2])}</span>` : ""}<span class="muted">${esc(e[1])}</span></div></li>`).join("")}</ul>
      <div class="mini-quiz">
        <h4>Шалгах</h4>
        ${g.quiz.map((q, qi) => `<div class="mq" data-g="${gi}" data-q="${qi}"><p>${esc(q.q)}</p><div class="options small">${q.o.map((o, k) => `<button class="opt ${lang}" data-k="${k}">${esc(o)}</button>`).join("")}</div></div>`).join("")}
      </div>
    </details>`;
  }
  function bindGrammar(c, L) {
    c.querySelectorAll(".mq[data-g]").forEach((m) => {
      const q = L.grammar[+m.dataset.g].quiz[+m.dataset.q];
      m.querySelectorAll(".opt").forEach((b) => (b.onclick = () => {
        m.querySelectorAll(".opt").forEach((x) => (x.disabled = true));
        m.querySelectorAll(".opt")[q.a].classList.add("correct");
        if (+b.dataset.k !== q.a) b.classList.add("wrong");
        else Progress.addXP(2);
      }));
    });
  }

  function readingCard(r) {
    return `<div class="card reading">
      <h3>${esc(r.title)} ${speakBtn(r.text, "en")}</h3>
      <p class="r-text">${esc(r.text)}</p>
      <h4>Асуултууд</h4>
      ${r.questions.map((q, qi) => `<div class="mq" data-rq="${qi}"><p>${qi + 1}. ${esc(q.q)}</p><div class="options small">${q.o.map((o, k) => `<button class="opt" data-k="${k}">${esc(o)}</button>`).join("")}</div></div>`).join("")}
    </div>`;
  }
  function bindReading(c, r) {
    c.querySelectorAll("[data-rq]").forEach((m) => {
      const q = r.questions[+m.dataset.rq];
      m.querySelectorAll(".opt").forEach((b) => (b.onclick = () => {
        m.querySelectorAll(".opt").forEach((x) => (x.disabled = true));
        m.querySelectorAll(".opt")[q.a].classList.add("correct");
        if (+b.dataset.k !== q.a) b.classList.add("wrong");
        else Progress.addXP(2);
      }));
    });
  }

  // Сонсох, цээжлэх, хадгалах товчнууд
  function bindCommon(root) {
    root.querySelectorAll("[data-stroke]").forEach((b) => (b.onclick = () => A.Stroke.open(b.dataset.stroke, b.dataset.read)));
    root.querySelectorAll("[data-say]").forEach((b) => (b.onclick = (e) => { e.preventDefault(); Speech.speak(b.dataset.say, b.dataset.lang); }));
    root.querySelectorAll("[data-learn]").forEach((b) => (b.onclick = () => { b.classList.toggle("on", Progress.toggleLearned(b.dataset.learn)); }));
    root.querySelectorAll("[data-fav]").forEach((b) => (b.onclick = () => {
      const on = Progress.toggleFav(b.dataset.fav);
      b.classList.toggle("on", on);
      UI.toast(on ? "Миний үгс-д нэмэгдлээ" : "Миний үгс-ээс хасагдлаа");
    }));
  }

  /* ---------- Сонсгол ---------- */
  Pages.listening = function () {
    const modes = [
      { id: "word", t: "🔤 Үг сонсох", d: "Үгийг сонсоод утгыг нь сонго" },
      { id: "sent", t: "💬 Өгүүлбэр сонсох", d: "Сонссон өгүүлбэрээ таниж сонго" },
      { id: "mean", t: "🧠 Өгүүлбэрийн утга", d: "Өгүүлбэр сонсоод утгыг нь сонго" },
      { id: "dict", t: "✍️ Сонсоод бичих", d: "Сонссон үгээ бичиж шалгуул" },
      { id: "dlg", t: "🗣️ Харилцан яриа", d: "Амьдралын нөхцөлийн яриа сонсож асуултад хариул" }
    ];
    view().innerHTML = `
      ${pageHead("🎧 Сонсгол", "Чихээ дадлагажуулж, дуудлагаа сайжруул")}
      ${!Speech.supported ? `<div class="card warn">⚠️ Таны хөтөч дуу унших (Speech Synthesis) боломжгүй байна. Chrome, Edge, Safari ашиглана уу.</div>` : ""}
      <div class="split"><aside class="lvl-side">${picker()}</aside><section class="split-main">
      <div class="row center">
        <label class="rate-ctl">Хурд <input type="range" id="rate" min="0.5" max="1.3" step="0.1" value="${Speech.rate}"><span id="rv">${Speech.rate}</span></label>
      </div>
      <div class="grid cards4">${modes.map((m) => `<button class="card mode" data-m="${m.id}"><h3>${m.t}</h3><p>${m.d}</p></button>`).join("")}</div>
      <div id="lz"></div></section></div>`;
    bindPicker(Pages.listening);
    const r = document.getElementById("rate");
    r.oninput = () => { Speech.rate = +r.value; document.getElementById("rv").textContent = r.value; };
    view().querySelectorAll(".mode").forEach((b) => (b.onclick = () => (b.dataset.m === "dlg" ? go("#/dialogues") : start(b.dataset.m))));
    function start(m) {
      const L = getLevel(pick.course, pick.level);
      const pool = Quiz.poolFor(pick.course, pick.level);
      const lang = L.course.lang;
      let qs;
      if (m === "word") qs = sample(L.words, 10).map((w) => Quiz.Gen.listenWord(w, pool));
      if (m === "dict") qs = sample(L.words, 10).map((w) => Quiz.Gen.dictation(w));
      if (m === "sent") qs = shuffle(L.sentences).map((s) => Quiz.Gen.listenSentence(s, L.sentences, lang));
      if (m === "mean") qs = shuffle(L.sentences).map((s) => Quiz.Gen.sentenceMeaning(s, L.sentences, lang));
      const box = document.getElementById("lz");
      Quiz.run(box, qs, {
        onFinish: (score) => Progress.update((p) => { p.listening++; p.xp += score * 2; A.bump(p, "listening"); }),
        onRetry: () => start(m)
      });
      box.scrollIntoView({ behavior: "smooth" });
    }
  };

  /* ---------- Тоглоом ---------- */
  Pages.games = function (id) {
    const g = Games.list.find((x) => x.id === id);
    view().innerHTML = `
      ${pageHead("🎮 Тоглоом", "Тоглонгоо сур!")}
      <div class="split"><aside class="lvl-side">${picker()}</aside><section class="split-main">
      <div class="grid cards4">${Games.list.filter((x) => !x.lang || x.lang === track()).map((x) => { const off = false; return `<a class="card mode ${x.id === id ? "on" : ""} ${off ? "off" : ""}" href="#/games/${x.id}"><div class="f-icon">${x.icon}</div><h3>${x.title}</h3><p>${x.desc}</p></a>`; }).join("")}</div>
      <div id="gz"></div></section></div>`;
    bindPicker(() => Pages.games(id));
    if (g) {
      const box = document.getElementById("gz");
      box.innerHTML = `<h2 class="section-title">${g.icon} ${g.title} · ${esc(COURSES[pick.course].short)} ${esc(COURSES[pick.course].levelLabel(pick.level))}</h2><div id="gplay"></div>`;
      Games.run(id, document.getElementById("gplay"), pick.course, pick.level);
    }
  };

  /* ---------- Тест шалгалт ---------- */
  Pages.tests = function () {
    const p = Progress.get();
    const c = COURSES[pick.course];
    view().innerHTML = `
      ${pageHead("📝 Тест шалгалт", "Түвшин бүрийн мэдлэгээ шалгаж, дүнгээ хадгал")}
      <div class="split"><aside class="lvl-side">${picker()}</aside><section class="split-main">
      <div class="card center test-intro">
        <h3>${esc(c.short)} · ${esc(c.levelLabel(pick.level))} шалгалт</h3>
        <ul class="facts inline">
          <li>⏱ 10 минут</li><li>❓ 15 асуулт</li><li>✅ Тэнцэх: 60%</li>
        </ul>
        <p class="muted">Үгийн утга, орчуулга, ${c.lang === "zh" ? "пиньинь, " : ""}дүрэм, сонсгол хосолсон</p>
        <div class="row center"><button class="btn big" id="start">Шалгалт эхлэх</button><a class="btn big ghost" href="#/mock">🏁 Бүтэн жишиг шалгалт</a></div>
      </div>
      <div id="tz"></div>
      <h2 class="section-title">Миний дүнгийн түүх</h2>
      <div id="th">${testTable(p.tests.slice().reverse())}</div></section></div>`;
    bindPicker(Pages.tests);
    document.getElementById("start").onclick = begin;
    function begin() {
      const L = getLevel(pick.course, pick.level);
      const pool = Quiz.poolFor(pick.course, pick.level);
      const lang = L.course.lang;
      const ws = shuffle(L.words);
      const qs = [];
      ws.slice(0, 4).forEach((w) => qs.push(Quiz.Gen.meaning(w, pool)));
      ws.slice(4, 7).forEach((w) => qs.push(Quiz.Gen.term(w, pool)));
      if (lang === "zh") ws.slice(7, 9).forEach((w) => qs.push(Quiz.Gen.reading(w, pool)));
      const gq = shuffle(L.grammar.flatMap((g) => g.quiz)).slice(0, 3).map(Quiz.Gen.grammar);
      qs.push(...gq);
      ws.slice(9, 11).forEach((w) => qs.push(Quiz.Gen.listenWord(w, pool)));
      qs.push(Quiz.Gen.listenSentence(sample(L.sentences, 1)[0], L.sentences, lang));
      if (L.reading) qs.push(...L.reading.questions.slice(0, 2).map((q) => ({ ...Quiz.Gen.grammar(q), type: "Унших", reveal: esc(q.q), prompt: `<p class="r-text small">${esc(L.reading.text)}</p><p><b>${esc(q.q)}</b></p>` })));
      while (qs.length < 15 && ws.length) qs.push(Quiz.Gen.meaning(ws[qs.length % ws.length], pool));
      const box = document.getElementById("tz");
      document.querySelector(".test-intro").hidden = true;
      Quiz.run(box, qs.slice(0, 15), {
        timeLimit: 600,
        onRetry: () => Pages.tests(),
        onFinish: (score, total) => {
          const pct = Math.round((score / total) * 100);
          Progress.update((pr) => {
            pr.tests.push({ course: pick.course, level: pick.level, score, total, pct, date: Date.now() });
            A.bump(pr, "tests");
            pr.xp += score * 3 + (pct >= 60 ? 20 : 0);
          });
          document.getElementById("th").innerHTML = testTable(Progress.get().tests.slice().reverse());
        }
      });
      box.scrollIntoView({ behavior: "smooth" });
    }
  };

  /* ---------- Толь бичиг ---------- */
  Pages.dictionary = function () {
    const words = allWords();
    let filter = track(), q = "", onlyFav = false;
    view().innerHTML = `
      ${pageHead("📖 Толь бичиг", `Хятад–Монгол–Англи · ${words.length} үг`)}
      <div class="dict-bar card">
        <input class="input big" id="dq" placeholder="Хайх: 茶, cha, tea, цай, hello..." autocomplete="off" />
        <div class="row">
          <div class="seg">
            <button data-f="all" class="${filter === "all" ? "on" : ""}">Бүгд</button><button data-f="zh" class="${filter === "zh" ? "on" : ""}">Хятад</button><button data-f="en" class="${filter === "en" ? "on" : ""}">Англи</button>
          </div>
          <label class="check"><input type="checkbox" id="fav" /> ★ Миний үгс</label>
        </div>
      </div>
      <div id="dr"></div>`;
    const inp = document.getElementById("dq");
    inp.oninput = () => { q = inp.value; draw(); };
    view().querySelectorAll(".seg button").forEach((b) => (b.onclick = () => {
      view().querySelectorAll(".seg button").forEach((x) => x.classList.toggle("on", x === b));
      filter = b.dataset.f; draw();
    }));
    document.getElementById("fav").onchange = (e) => { onlyFav = e.target.checked; draw(); };
    function draw() {
      const p = Progress.get();
      const nq = q.trim().toLowerCase();
      const sq = A.stripTones(q);
      // Ижил үгийг (HSK 2.0 ба 3.0-д давхардсан) нэгтгэх
      const merged = new Map();
      words.forEach((w) => {
        if (filter !== "all" && w.lang !== filter) return;
        if (onlyFav && !p.favorites.includes(w.id)) return;
        if (nq) {
          const hay = [w.term, w.meaning, w.gloss, w.example].join(" ").toLowerCase();
          const hit = hay.includes(nq) || (w.lang === "zh" && sq && A.stripTones(w.reading).includes(sq));
          if (!hit) return;
        }
        const m = merged.get(w.id);
        if (m) m.tags.push(COURSES[w.course].short + " " + w.level);
        else merged.set(w.id, { w, tags: [COURSES[w.course].short + " " + w.level] });
      });
      const list = Array.from(merged.values());
      const shown = list.slice(0, 120);
      document.getElementById("dr").innerHTML = list.length
        ? `<p class="muted">${list.length} үг олдлоо${list.length > shown.length ? " (эхний 120)" : ""}</p><div class="dict-list">${shown.map(({ w, tags }) => `
          <div class="card entry">
            <div class="e-head">
              ${speakBtn(w.term, w.lang)}${w.lang === "zh" ? strokeBtn(w) : ""}${A.relBtn ? A.relBtn(w) : ""}
              <span class="e-term ${w.lang}">${esc(w.term)}</span>
              <span class="e-read">${esc(w.reading)}</span>
              <button class="icon-btn fav ${p.favorites.includes(w.id) ? "on" : ""}" data-fav="${esc(w.id)}" title="Хадгалах">★</button>
            </div>
            <div class="e-mean">${esc(w.meaning)}</div>
            ${w.gloss ? `<div class="muted">EN: ${esc(w.gloss)}</div>` : ""}
            ${w.example ? `<div class="e-ex">${speakBtn(w.example, "en")} ${esc(w.example)}</div>` : ""}
            <div class="tags">${tags.map((t) => `<span class="tag">${esc(t)}</span>`).join("")}</div>
          </div>`).join("")}</div>`
        : `<p class="muted center">Үг олдсонгүй.</p>`;
      bindCommon(document.getElementById("dr"));
    }
    draw();
    inp.focus();
  };

  /* ---------- Профайл ---------- */
  /* ---------- Аватар ---------- */
  function avatarHtml(u, size) {
    size = size || 40;
    const url = u && (u.avatarUrl || u.avatar);
    const letter = esc(((u && u.name) || "?").slice(0, 1).toUpperCase());
    return url
      ? `<img class="av" src="${esc(url)}" alt="" style="width:${size}px;height:${size}px" loading="lazy">`
      : `<span class="av av-letter" style="width:${size}px;height:${size}px;font-size:${Math.round(size * 0.42)}px">${letter}</span>`;
  }
  // Зургийг canvas-аар жижигрүүлж JPEG data URL болгох
  function resizeImage(file, max, quality) {
    return new Promise((resolve, reject) => {
      if (!file || !/^image\//.test(file.type)) return reject(new Error("Зөвхөн зураг сонгоно уу."));
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        let w = img.width, h = img.height;
        const crop = max.square;
        const c = document.createElement("canvas");
        if (crop) {
          const side = Math.min(w, h);
          c.width = c.height = max.size;
          c.getContext("2d").drawImage(img, (w - side) / 2, (h - side) / 2, side, side, 0, 0, max.size, max.size);
        } else {
          const k = Math.min(1, max.size / Math.max(w, h));
          c.width = Math.round(w * k); c.height = Math.round(h * k);
          c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        }
        URL.revokeObjectURL(url);
        resolve(c.toDataURL("image/jpeg", quality || 0.85));
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Зургийг уншиж чадсангүй.")); };
      img.src = url;
    });
  }

  /* ---------- Профайл ---------- */
  Pages.profile = function () {
    const u = Auth.current(), p = Progress.get();
    view().innerHTML = `
      <div class="profile-hero card">
        <div class="ph-avatar">
          ${avatarHtml(u, 112)}
          <label class="ph-upload" title="Зураг солих">📷<input type="file" id="avf" accept="image/*" hidden></label>
        </div>
        <div class="ph-info">
          <h1>${esc(u.name)}</h1>
          <p class="muted">${esc(u.email)} · ${new Date(u.created).toLocaleDateString("mn-MN")}-нд нэгдсэн</p>
          ${u.bio ? `<p>${esc(u.bio)}</p>` : ""}
          <div class="ph-stats">
            <span><b>${p.xp}</b> XP</span><span><b>${p.streak}</b> өдөр 🔥</span><span><b>${Object.keys(p.learned).length}</b> үг</span><span><b>${p.tests.length}</b> тест</span>
          </div>
          <div class="row">
            ${Auth.avatar(u) ? `<button class="btn ghost small" id="avdel">Зураг устгах</button>` : ""}
            <a class="btn ghost small" href="#/leaderboard">🏆 Тэргүүлэгчид</a>
            ${A.Remote.on ? `<a class="btn ghost small" href="#/friends">👥 Найзууд</a>` : ""}
          </div>
        </div>
      </div>
      ${A.Remote.on ? "" : `<div class="card note-card">ℹ️ Сервер холбогдоогүй тул бүртгэл энэ хөтөч дээр хадгалагдаж байна. Vercel + Postgres дээр байршуулбал бүх төхөөрөмжөөс нэвтэрч, найз, чат ашиглах боломжтой болно.</div>`}
      <div class="grid cards2">
        <div class="card">
          <h3>Хувийн мэдээлэл</h3>
          <form id="fn">
            <label>Нэр<input class="input" name="name" value="${esc(u.name)}" required maxlength="40" /></label>
            <label>Миний тухай<textarea class="input" name="bio" maxlength="300" rows="3" placeholder="Жишээ: HSK 4-т бэлдэж байна 📚">${esc(u.bio || "")}</textarea></label>
            <button class="btn">Хадгалах</button>
          </form>
        </div>
        <div class="card">
          <h3>Нууц үг солих</h3>
          <form id="fp">
            <label>Одоогийн нууц үг<input class="input" type="password" name="old" required autocomplete="current-password" /></label>
            <label>Шинэ нууц үг<input class="input" type="password" name="nw" required minlength="6" autocomplete="new-password" /></label>
            <div class="error" id="perr"></div>
            <button class="btn">Солих</button>
          </form>
        </div>
        <div class="card">
          <h3>Статистик</h3>
          <ul class="facts">
            <li>📚 Цээжилсэн үг: <b>${Object.keys(p.learned).length}</b></li>
            <li>🃏 Флаш картын түүх: <b>${Object.keys(p.srs).length}</b> карт</li>
            <li>★ Хадгалсан үг: <b>${p.favorites.length}</b></li>
            <li>📝 Тест: <b>${p.tests.length}</b> · 🎮 Тоглоом: <b>${p.games}</b> · 🎧 Сонсгол: <b>${p.listening}</b></li>
          </ul>
        </div>
        <div class="card danger-zone">
          <h3>Аюултай бүс</h3>
          <div class="row">
            <button class="btn ghost" id="reset">Ахицаа тэглэх</button>
            <button class="btn danger" id="del">Бүртгэл устгах</button>
          </div>
        </div>
      </div>`;
    document.getElementById("avf").onchange = async (e) => {
      try {
        const data = await resizeImage(e.target.files[0], { size: 256, square: true }, 0.85);
        await Auth.updateProfile({ avatar: data });
        UI.toast("Профайлын зураг шинэчлэгдлээ", "ok");
        Pages.profile(); renderNav();
      } catch (ex) { UI.toast(ex.message, "warn"); }
    };
    const avdel = document.getElementById("avdel");
    if (avdel) avdel.onclick = async () => { try { await Auth.updateProfile({ avatar: null }); Pages.profile(); renderNav(); } catch (ex) { UI.toast(ex.message, "warn"); } };
    document.getElementById("fn").onsubmit = async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      try { await Auth.updateProfile({ name: fd.get("name"), bio: fd.get("bio") }); UI.toast("Хадгалагдлаа", "ok"); Pages.profile(); renderNav(); } catch (ex) { UI.toast(ex.message, "warn"); }
    };
    document.getElementById("fp").onsubmit = async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      try { await Auth.changePassword(fd.get("old"), fd.get("nw")); e.target.reset(); document.getElementById("perr").textContent = ""; UI.toast("Нууц үг солигдлоо", "ok"); }
      catch (ex) { document.getElementById("perr").textContent = ex.message; }
    };
    document.getElementById("reset").onclick = () => { if (confirm("Бүх ахиц, тестийн дүн устах болно. Итгэлтэй байна уу?")) { Progress.reset(); UI.toast("Ахиц тэглэгдлээ"); Pages.profile(); } };
    document.getElementById("del").onclick = async () => {
      if (!confirm("Бүртгэлээ бүрмөсөн устгах уу?")) return;
      try { await Auth.deleteAccount(); go("#/"); } catch (ex) { UI.toast(ex.message, "warn"); }
    };
  };

  /* ---------- Тэргүүлэгчид ---------- */
  Pages.leaderboard = async function (scope) {
    scope = scope === "zh" || scope === "en" ? scope : "all";
    view().innerHTML = `
      ${pageHead("🏆 Тэргүүлэгчид", "XP оноогоор эрэмбэлсэн шилдэг суралцагчид")}
      <div class="seg wide">
        <a href="#/leaderboard" class="${scope === "all" ? "on" : ""}">Бүгд</a>
        <a href="#/leaderboard/zh" class="${scope === "zh" ? "on" : ""}">${FLAG.zh} HSK</a>
        <a href="#/leaderboard/en" class="${scope === "en" ? "on" : ""}">${FLAG.en} IELTS</a>
      </div>
      <div id="lb"><p class="muted">Ачаалж байна...</p></div>`;
    let list, mine = null;
    if (A.Remote.on) {
      try { ({ list, mine } = await A.Remote.call("GET", "leaderboard" + (scope === "all" ? "" : "?track=" + scope))); }
      catch (e) { document.getElementById("lb").innerHTML = `<p class="error">${esc(e.message)}</p>`; return; }
    } else list = Auth.localBoard();
    const box = document.getElementById("lb");
    if (!box) return;
    if (!list.length) { box.innerHTML = `<p class="muted center">Одоогоор хэн ч алга. Хичээл хийж XP цуглуулаарай!</p>`; return; }
    const top = list.slice(0, 3), rest = list.slice(3);
    const medal = ["🥇", "🥈", "🥉"];
    box.innerHTML = `
      <div class="podium">${[1, 0, 2].filter((i) => top[i]).map((i) => `
        <a class="pod p${i + 1} card ${top[i].me ? "me" : ""}" href="${A.Remote.on ? "#/u/" + top[i].id : "#/profile"}">
          <div class="pod-medal">${medal[i]}</div>${avatarHtml(top[i], i === 0 ? 76 : 60)}
          <b>${esc(top[i].name)}${top[i].me ? " (Та)" : ""}</b><span class="pod-xp">${top[i].xp} XP</span><span class="muted small">🔥 ${top[i].streak} · 📚 ${top[i].learned}</span>
        </a>`).join("")}</div>
      ${rest.length || mine ? `<div class="lb-list card">${rest.concat(mine ? [mine] : []).map((r) => `
        <a class="lb-row ${r.me ? "me" : ""}" href="${A.Remote.on ? "#/u/" + r.id : "#/profile"}">
          <span class="lb-rank">${r.rank}</span>${avatarHtml(r, 36)}<span class="lb-name">${esc(r.name)}${r.me ? " (Та)" : ""}</span>
          <span class="muted small">🔥 ${r.streak}</span><span class="muted small hide-sm">📚 ${r.learned}</span><b>${r.xp} XP</b>
        </a>`).join("")}</div>` : ""}
      ${A.Remote.on ? "" : `<p class="muted small center">Локал горим: зөвхөн энэ төхөөрөмж дээрх бүртгэлүүд харагдана.</p>`}`;
  };

  /* ---------- Сервер шаардлагатай хуудсууд ---------- */
  function needServer() {
    if (A.Remote.on) return false;
    view().innerHTML = `<div class="card center empty"><div class="f-icon">🌐</div><h2>Сервер шаардлагатай</h2><p class="muted">Найз, чат, сошиал хэсэг нь Vercel + Postgres дээр байршуулсан үед ажиллана.<br>Одоо сайт локал (хөтөч дээрх) горимоор ажиллаж байна.</p><a class="btn" href="#/dashboard">Самбар руу буцах</a></div>`;
    return true;
  }
  const timeAgo = (d) => {
    const s = Math.max(1, (Date.now() - new Date(d).getTime()) / 1000);
    if (s < 60) return "дөнгөж сая";
    if (s < 3600) return Math.floor(s / 60) + " мин өмнө";
    if (s < 86400) return Math.floor(s / 3600) + " цагийн өмнө";
    if (s < 604800) return Math.floor(s / 86400) + " өдрийн өмнө";
    return new Date(d).toLocaleDateString("mn-MN");
  };
  const linkify = (t) => esc(t).replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>').replace(/\n/g, "<br>");

  /* ---------- Хэрэглэгчийн профайл ---------- */
  Pages.u = async function (id) {
    if (needServer()) return;
    view().innerHTML = `<p class="muted">Ачаалж байна...</p>`;
    let d;
    try { d = await A.Remote.call("GET", "users/" + encodeURIComponent(id)); } catch (e) { view().innerHTML = `<p class="error">${esc(e.message)}</p>`; return; }
    const u = d.user;
    const btn = d.self ? `<a class="btn ghost" href="#/profile">✏️ Профайл засах</a>`
      : d.friend === "friends" ? `<a class="btn" href="#/chat/dm/${esc(u.id)}">💬 Зурвас бичих</a><button class="btn ghost" data-fr="remove">Найзаас хасах</button>`
      : d.friend === "sent" ? `<button class="btn ghost" data-fr="remove">Хүсэлт цуцлах</button>`
      : d.friend === "received" ? `<button class="btn" data-fr="accept">✔ Найзын хүсэлт зөвшөөрөх</button>`
      : `<button class="btn" data-fr="request">＋ Найз болох</button>`;
    const btn2 = d.self ? "" : `<a class="btn ghost" href="#/duels?with=${esc(u.id)}">⚔️ Тулаан</a><button class="btn ghost small" id="ublock">${d.blocked ? "Блок цуцлах" : "🚫 Блоклох"}</button><button class="btn ghost small" id="urep">⚑ Мэдээлэх</button>`;
    view().innerHTML = `
      <div class="profile-hero card">
        <div class="ph-avatar">${avatarHtml(u, 112)}</div>
        <div class="ph-info">
          <h1>${esc(u.name)}</h1>
          <p class="muted">${new Date(u.created).toLocaleDateString("mn-MN")}-нд нэгдсэн</p>
          ${u.bio ? `<p>${esc(u.bio)}</p>` : ""}
          <div class="ph-stats"><span><b>${u.xp}</b> XP</span><span><b>${u.streak}</b> өдөр 🔥</span><span><b>${u.learned}</b> үг</span><span><b>${u.posts}</b> пост</span></div>
          <div class="row">${btn}${btn2}</div>
        </div>
      </div>
      <h2 class="section-title">Постууд</h2><div id="uposts"></div>`;
    view().querySelectorAll("[data-fr]").forEach((b) => (b.onclick = async () => {
      try { await A.Remote.call("POST", "friends/" + b.dataset.fr, { id: u.id }); Pages.u(id); refreshBadges(); } catch (e) { UI.toast(e.message, "warn"); }
    }));
    const ub = document.getElementById("ublock");
    if (ub) ub.onclick = async () => {
      if (!d.blocked && !confirm("Энэ хэрэглэгчийг блоклох уу? Та хоёрын мессеж, пост бие биедээ харагдахгүй болно.")) return;
      try { await A.Remote.call("POST", "block", { id: u.id, on: !d.blocked }); UI.toast(d.blocked ? "Блок цуцлагдлаа" : "Блоклогдлоо", "ok"); Pages.u(id); } catch (e) { UI.toast(e.message, "warn"); }
    };
    const ur = document.getElementById("urep");
    if (ur) ur.onclick = () => A.reportItem && A.reportItem("user", u.id);
    feed(document.getElementById("uposts"), u.id);
  };

  /* ---------- Найзууд ---------- */
  Pages.friends = async function () {
    if (needServer()) return;
    view().innerHTML = `
      ${pageHead("👥 Найзууд", "Хамт суралцах найзаа олоорой")}
      <div class="grid cards2 friends-grid">
        <div class="card">
          <h3>🔎 Найз хайх</h3>
          <input class="input" id="fq" placeholder="Нэрээр нь хайх..." autocomplete="off">
          <div id="fres" class="ulist"></div>
        </div>
        <div class="card"><h3>📨 Ирсэн хүсэлт</h3><div id="finc" class="ulist"></div><h3 class="mt">⏳ Илгээсэн хүсэлт</h3><div id="fout" class="ulist"></div></div>
      </div>
      <h2 class="section-title">Миний найзууд</h2>
      <div id="fall" class="friend-cards"></div>`;
    const row = (u, actions) => `<div class="urow">${avatarHtml(u, 40)}<a href="#/u/${esc(u.id)}" class="uname">${esc(u.name)}</a><span class="uact">${actions}</span></div>`;
    async function load() {
      const d = await A.Remote.call("GET", "friends");
      const fb = document.getElementById("fbadge");
      if (fb) { fb.textContent = d.incoming.length; fb.hidden = !d.incoming.length; }
      document.getElementById("finc").innerHTML = d.incoming.map((u) => row(u, `<button class="btn small" data-a="accept" data-id="${esc(u.id)}">Зөвшөөрөх</button><button class="icon-btn" data-a="remove" data-id="${esc(u.id)}" title="Татгалзах">✕</button>`)).join("") || `<p class="muted small">Хүсэлт алга.</p>`;
      document.getElementById("fout").innerHTML = d.outgoing.map((u) => row(u, `<button class="btn ghost small" data-a="remove" data-id="${esc(u.id)}">Цуцлах</button>`)).join("") || `<p class="muted small">Алга.</p>`;
      document.getElementById("fall").innerHTML = d.friends.map((u) => `<div class="card fcard">${avatarHtml(u, 64)}<a href="#/u/${esc(u.id)}"><b>${esc(u.name)}</b></a><a class="btn small" href="#/chat/dm/${esc(u.id)}">💬 Чат</a></div>`).join("") || `<p class="muted">Одоогоор найз алга. Дээрээс хайж нэмээрэй.</p>`;
      bindActs(view());
    }
    function bindActs(root) {
      root.querySelectorAll("[data-a]").forEach((b) => (b.onclick = async () => {
        try { await A.Remote.call("POST", "friends/" + b.dataset.a, { id: b.dataset.id }); UI.toast("Амжилттай", "ok"); await load(); refreshBadges(); doSearch(); } catch (e) { UI.toast(e.message, "warn"); }
      }));
    }
    const q = document.getElementById("fq");
    let t;
    async function doSearch() {
      const v = q.value.trim();
      const box = document.getElementById("fres");
      if (!v) { box.innerHTML = `<p class="muted small">Нэр бичиж хайна уу.</p>`; return; }
      const d = await A.Remote.call("GET", "users?q=" + encodeURIComponent(v));
      box.innerHTML = d.users.map((u) => row(u, `<button class="btn small" data-a="request" data-id="${esc(u.id)}">＋ Нэмэх</button>`)).join("") || `<p class="muted small">Олдсонгүй.</p>`;
      bindActs(box);
    }
    q.oninput = () => { clearTimeout(t); t = setTimeout(doSearch, 300); };
    doSearch();
    try { await load(); } catch (e) { UI.toast(e.message, "warn"); }
  };

  /* ---------- Чат ---------- */
  Pages.chat = async function (kind, otherId) {
    if (needServer()) return;
    const me = Auth.current();
    let room = kind === "dm" && otherId ? "dm:" + otherId : kind === "zh" || kind === "en" ? kind : "public";
    view().innerHTML = `
      <div class="chat-shell">
        <aside class="chat-side card">
          <h3>💬 Чат</h3>
          <a class="croom ${room === "public" ? "on" : ""}" href="#/chat"><span class="ci">🌐</span>Нийтийн чат</a>
          <a class="croom ${room === "zh" ? "on" : ""}" href="#/chat/zh"><span class="ci">${FLAG.zh}</span>Хятадаар чатлъя</a>
          <a class="croom ${room === "en" ? "on" : ""}" href="#/chat/en"><span class="ci">${FLAG.en}</span>English chat</a>
          <div class="nav-label">Хувийн</div>
          <div id="dms"><p class="muted small">Ачаалж байна...</p></div>
        </aside>
        <section class="chat-main card">
          <div class="chat-head" id="chead">${room === "public" ? "🌐 Нийтийн чат" : room === "zh" ? "中 Хятадаар чатлъя — 用中文聊天吧！" : room === "en" ? "EN English chat — let's practise!" : "💬 Хувийн чат"}</div>
          <div class="chat-msgs" id="msgs"><p class="muted center">Ачаалж байна...</p></div>
          <div id="cimg-prev"></div>
          <form class="chat-form" id="cf"><label class="ibtn" title="Зураг илгээх">📷<input type="file" id="cimg" accept="image/*" hidden></label><input class="input" id="ct" maxlength="1000" placeholder="Зурвас бичих..." autocomplete="off"><button class="btn">Илгээх</button></form>
        </section>
      </div>`;
    A.Remote.call("GET", "chat/rooms").then((d) => {
      const box = document.getElementById("dms");
      if (!box) return;
      box.innerHTML = d.friends.map((f) => `<a class="croom ${room === "dm:" + f.id ? "on" : ""}" href="#/chat/dm/${esc(f.id)}">${avatarHtml(f, 26)}${esc(f.name)}</a>`).join("") || `<p class="muted small">Найз нэмээд хувийн чат бичээрэй. <a href="#/friends">Найз хайх →</a></p>`;
      const cur = d.friends.find((f) => "dm:" + f.id === room);
      if (cur) document.getElementById("chead").innerHTML = `${avatarHtml(cur, 28)} ${esc(cur.name)}`;
    }).catch(() => {});
    const msgs = document.getElementById("msgs");
    let last = null, seen = new Set(), first = true;
    async function poll() {
      if (!document.body.contains(msgs)) return clearInterval(iv);
      try {
        const d = await A.Remote.call("GET", "chat?room=" + encodeURIComponent(room) + (last ? "&after=" + encodeURIComponent(last) : ""));
        if (!last) msgs.innerHTML = "";
        const atBottom = msgs.scrollHeight - msgs.scrollTop - msgs.clientHeight < 80;
        d.messages.forEach((m) => {
          if (seen.has(m.id)) return;
          seen.add(m.id);
          last = m.createdAt;
          msgs.insertAdjacentHTML("beforeend", `<div class="msg ${m.mine ? "mine" : ""}">${m.mine ? "" : `<a href="#/u/${esc(m.user.id)}">${avatarHtml(m.user, 32)}</a>`}<div class="bubble-msg" data-mid="${esc(m.id)}" data-uid="${esc(m.user.id)}" data-mine="${m.mine ? 1 : ""}"><div class="mh">${m.mine ? "" : `<b>${esc(m.user.name)}</b>`}<span>${timeAgo(m.createdAt)}</span><button class="msg-more" title="Цэс">⋯</button></div>${m.image ? `<img class="chat-img" src="${esc(m.image)}" alt="" loading="lazy">` : ""}${m.text ? `<div>${linkify(m.text)}</div>` : ""}</div></div>`);
          if (!first && !m.mine) Notify.ding();
        });
        first = false;
        if (!seen.size) msgs.innerHTML = `<p class="muted center empty-chat">Одоогоор зурвас алга. Анхны зурвасаа бичээрэй! 👋</p>`;
        if (atBottom || d.messages.length) msgs.scrollTop = msgs.scrollHeight;
      } catch (e) {
        msgs.innerHTML = `<p class="error center">${esc(e.message)}</p>`;
        clearInterval(iv);
      }
    }
    const iv = setInterval(poll, 4000);
    await poll();
    let cimg = null;
    const prev = document.getElementById("cimg-prev");
    document.getElementById("cimg").onchange = async (e) => {
      try {
        cimg = await resizeImage(e.target.files[0], { size: 1080 }, 0.8);
        prev.innerHTML = `<div class="img-prev chat-prev"><img src="${cimg}" alt=""><button type="button" class="icon-btn" id="cimg-x">✕</button></div>`;
        document.getElementById("cimg-x").onclick = () => { cimg = null; prev.innerHTML = ""; };
      } catch (ex) { UI.toast(ex.message, "warn"); }
      e.target.value = "";
    };
    msgs.addEventListener("click", (e) => {
      const im = e.target.closest(".chat-img");
      if (im) return window.open(im.src, "_blank");
      const mb = e.target.closest(".msg-more");
      if (mb && A.msgMenu) A.msgMenu(mb, mb.closest(".bubble-msg"));
    });
    document.getElementById("cf").onsubmit = async (e) => {
      e.preventDefault();
      const inp = document.getElementById("ct");
      const text = inp.value.trim();
      if (!text && !cimg) return;
      const img = cimg;
      inp.value = ""; cimg = null; prev.innerHTML = "";
      try { await A.Remote.call("POST", "chat", { room, text, image: img }); const pe = msgs.querySelector(".empty-chat"); if (pe) pe.remove(); await poll(); }
      catch (ex) { UI.toast(ex.message, "warn"); inp.value = text; }
    };
    void me;
  };

  /* ---------- Сошиал (пост) ---------- */
  Pages.social = function () {
    if (needServer()) return;
    const me = Auth.current();
    view().innerHTML = `
      <div class="social-wrap">
        ${pageHead("📰 Сошиал", "Сурсан зүйлээ хуваалцаж, бусдаас санаа аваарай. Хятад, англиар бичвэл хэлний чадвар тань сайжирна!")}
        <div id="stories" class="stories-bar"></div>
        <form class="card composer" id="pf">
          <div class="row top">${avatarHtml(me, 44)}<textarea class="input" id="ptext" rows="3" maxlength="2000" placeholder="Юу сурч байна? 今天学了什么？ What did you learn today?"></textarea></div>
          <div id="pimg-prev"></div>
          <div class="row between">
            <label class="btn ghost small">📷 Зураг<input type="file" id="pimg" accept="image/*" hidden></label>
            <button class="btn">Постлох</button>
          </div>
        </form>
        <div id="feed"></div>
      </div>`;
    let img = null;
    document.getElementById("pimg").onchange = async (e) => {
      try {
        img = await resizeImage(e.target.files[0], { size: 1080 }, 0.8);
        document.getElementById("pimg-prev").innerHTML = `<div class="img-prev"><img src="${img}" alt=""><button type="button" class="icon-btn" id="pimg-x">✕</button></div>`;
        document.getElementById("pimg-x").onclick = () => { img = null; document.getElementById("pimg-prev").innerHTML = ""; };
      } catch (ex) { UI.toast(ex.message, "warn"); }
    };
    document.getElementById("pf").onsubmit = async (e) => {
      e.preventDefault();
      const text = document.getElementById("ptext").value.trim();
      if (!text && !img) return UI.toast("Пост хоосон байна.", "warn");
      try {
        await A.Remote.call("POST", "posts", { text, image: img });
        document.getElementById("ptext").value = ""; img = null; document.getElementById("pimg-prev").innerHTML = "";
        UI.toast("Постлогдлоо", "ok");
        feed(document.getElementById("feed"));
      } catch (ex) { UI.toast(ex.message, "warn"); }
    };
    feed(document.getElementById("feed"));
    if (A.storiesBar) A.storiesBar(document.getElementById("stories"));
  };

  const RE = { like: "👍", love: "❤️", wow: "😮" };
  async function feed(box, userId) {
    box.innerHTML = `<p class="muted">Ачаалж байна...</p>`;
    let before = null;
    async function more(append) {
      const d = await A.Remote.call("GET", "posts?" + (userId ? "user=" + encodeURIComponent(userId) + "&" : "") + (before ? "before=" + encodeURIComponent(before) : ""));
      if (!append) box.innerHTML = "";
      const mb = box.querySelector(".more-posts");
      if (mb) mb.remove();
      if (!d.posts.length && !append) { box.innerHTML = `<p class="muted center">Пост алга.</p>`; return; }
      d.posts.forEach((p) => { box.insertAdjacentHTML("beforeend", postHtml(p)); bindPost(box.lastElementChild, p); before = p.createdAt; });
      if (d.posts.length === 15) {
        box.insertAdjacentHTML("beforeend", `<div class="row center more-posts"><button class="btn ghost">Цааш үзэх</button></div>`);
        box.querySelector(".more-posts button").onclick = () => more(true);
      }
    }
    try { await more(false); } catch (e) { box.innerHTML = `<p class="error">${esc(e.message)}</p>`; }
  }
  function postHtml(p) {
    return `<article class="card post">
      <header class="post-head">
        <a href="#/u/${esc(p.user.id)}">${avatarHtml(p.user, 44)}</a>
        <div><a href="#/u/${esc(p.user.id)}"><b>${esc(p.user.name)}</b></a><div class="muted small">${timeAgo(p.createdAt)}</div></div>
        ${p.mine ? `<button class="icon-btn post-del" title="Устгах">🗑</button>` : `<button class="icon-btn post-rep" title="Мэдээлэх">⚑</button>`}
      </header>
      ${p.text ? `<div class="post-text">${linkify(p.text)}</div>` : ""}
      ${p.image ? `<img class="post-img" src="${esc(p.image)}" alt="" loading="lazy">` : ""}
      <footer class="post-foot">
        ${Object.keys(RE).map((k) => `<button class="react ${p.myReactions.includes(k) ? "on" : ""}" data-k="${k}">${RE[k]} <span>${p.reactions[k] || ""}</span></button>`).join("")}
        <button class="react cm-toggle">💬 <span>${p.comments || ""}</span></button>
      </footer>
      <div class="comments" hidden></div>
    </article>`;
  }
  function bindPost(el, p) {
    el.querySelectorAll(".react[data-k]").forEach((b) => (b.onclick = async () => {
      try {
        const r = await A.Remote.call("POST", "posts/" + p.id + "/react", { kind: b.dataset.k });
        const sp = b.querySelector("span");
        const n = (parseInt(sp.textContent, 10) || 0) + (r.on ? 1 : -1);
        sp.textContent = n > 0 ? n : "";
        b.classList.toggle("on", r.on);
      } catch (e) { UI.toast(e.message, "warn"); }
    }));
    const rep = el.querySelector(".post-rep");
    if (rep) rep.onclick = () => A.reportItem && A.reportItem("post", p.id);
    const del = el.querySelector(".post-del");
    if (del) del.onclick = async () => {
      if (!confirm("Постоо устгах уу?")) return;
      try { await A.Remote.call("DELETE", "posts/" + p.id); el.remove(); } catch (e) { UI.toast(e.message, "warn"); }
    };
    const cbox = el.querySelector(".comments");
    el.querySelector(".cm-toggle").onclick = async () => {
      cbox.hidden = !cbox.hidden;
      if (!cbox.hidden) loadComments();
    };
    async function loadComments() {
      cbox.innerHTML = `<p class="muted small">Ачаалж байна...</p>`;
      const d = await A.Remote.call("GET", "posts/" + p.id + "/comments");
      cbox.innerHTML = d.comments.map((c) => `<div class="cmt">${avatarHtml(c.user, 30)}<div class="cmt-b"><a href="#/u/${esc(c.user.id)}"><b>${esc(c.user.name)}</b></a> <span class="muted small">${timeAgo(c.createdAt)}</span><div>${linkify(c.text)}</div></div></div>`).join("") +
        `<form class="cmt-form"><input class="input" maxlength="1000" placeholder="Сэтгэгдэл бичих..."><button class="btn small">Илгээх</button></form>`;
      cbox.querySelector("form").onsubmit = async (e) => {
        e.preventDefault();
        const inp = e.target.querySelector("input");
        const text = inp.value.trim();
        if (!text) return;
        try {
          await A.Remote.call("POST", "posts/" + p.id + "/comments", { text });
          const sp = el.querySelector(".cm-toggle span");
          sp.textContent = (parseInt(sp.textContent, 10) || 0) + 1;
          loadComments();
        } catch (ex) { UI.toast(ex.message, "warn"); }
      };
    }
  }

  /* ---------- Мэдэгдэл: дуу, хөтчийн мэдэгдэл ---------- */
  const Notify = {
    get sound() { try { return localStorage.getItem("hicheel_sound") !== "off"; } catch (e) { return true; } },
    set sound(v) { try { localStorage.setItem("hicheel_sound", v ? "on" : "off"); } catch (e) { /* ignore */ } },
    ctx: null,
    ding() {
      if (!this.sound) return;
      try {
        this.ctx = this.ctx || new (window.AudioContext || window.webkitAudioContext)();
        const c = this.ctx, t = c.currentTime;
        [880, 1320].forEach((f, i) => {
          const o = c.createOscillator(), g = c.createGain();
          o.type = "sine"; o.frequency.value = f;
          g.gain.setValueAtTime(0.0001, t + i * 0.12);
          g.gain.exponentialRampToValueAtTime(0.18, t + i * 0.12 + 0.02);
          g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.12 + 0.25);
          o.connect(g).connect(c.destination);
          o.start(t + i * 0.12); o.stop(t + i * 0.12 + 0.3);
        });
      } catch (e) { /* ignore */ }
    },
    canPush() { return "Notification" in window; },
    async ask() {
      if (!this.canPush()) return UI.toast("Таны хөтөч мэдэгдэл дэмжихгүй байна.", "warn");
      const r = await Notification.requestPermission();
      UI.toast(r === "granted" ? "Мэдэгдэл асаалаа 🔔" : "Мэдэгдлийг хөтөч дээрээ зөвшөөрөөгүй байна.", r === "granted" ? "ok" : "warn");
    },
    show(n) {
      if (!this.canPush() || Notification.permission !== "granted" || document.visibilityState === "visible") return;
      try {
        const x = new Notification("Хичээл", { body: n.text, tag: n.id, icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' rx='24' fill='%23111'/%3E%3Ctext x='50' y='70' font-size='60' text-anchor='middle' fill='white'%3E学%3C/text%3E%3C/svg%3E" });
        x.onclick = () => { window.focus(); if (n.link) location.hash = n.link.replace(/^#/, ""); x.close(); };
      } catch (e) { /* ignore */ }
    }
  };
  const baseTitle = document.title;

  /* ---------- Мэдэгдэл ---------- */
  const badges = { unread: 0, incoming: 0 };
  let seenNotif = null;
  let lastBadge = 0;
  async function refreshBadges(force) {
    if (!A.Remote.on || !Auth.current()) return;
    if (force === "nav" && Date.now() - lastBadge < 8000) return;
    lastBadge = Date.now();
    try {
      const d = await A.Remote.call("GET", "notifications");
      badges.unread = d.unread; badges.incoming = d.incoming; badges.list = d.list;
      // Шинэ (өмнө нь хараагүй) мэдэгдэл ирвэл дуугаргаж, хөтчийн мэдэгдэл үзүүлнэ
      const fresh = d.list.filter((n) => !n.read && seenNotif && !seenNotif.has(n.id));
      if (fresh.length) { Notify.ding(); fresh.slice(0, 3).forEach((n) => Notify.show(n)); }
      seenNotif = new Set(d.list.map((n) => n.id));
      document.title = d.unread ? `(${d.unread}) ${baseTitle}` : baseTitle;
      const nb = document.getElementById("nbadge"), fb = document.getElementById("fbadge");
      if (nb) { nb.textContent = d.unread; nb.hidden = !d.unread; }
      if (fb) { fb.textContent = d.incoming; fb.hidden = !d.incoming; }
    } catch (e) { /* ignore */ }
  }
  setInterval(refreshBadges, 20000);
  function notifMenu() {
    const box = document.getElementById("nmenu");
    const list = badges.list || [];
    const perm = Notify.canPush() ? Notification.permission : "denied";
    box.innerHTML = `<div class="nm-head"><b>Мэдэгдэл</b><span><button class="icon-btn" id="nsound" title="Дуу">${Notify.sound ? "🔊" : "🔇"}</button>${list.length ? `<button class="icon-btn" id="nclear" title="Цэвэрлэх">🧹</button>` : ""}</span></div>` +
      (perm === "default" ? `<button class="btn small full nm-ask" id="nask">🔔 Мэдэгдэл асаах (утас, компьютер)</button>` : "") +
      (list.length ? list.map((n) => `<a class="nm-item ${n.read ? "" : "unread"}" href="${esc(n.link || "#/dashboard")}"><span>${esc(n.text)}</span><small class="muted">${timeAgo(n.createdAt)}</small></a>`).join("") : `<p class="muted small center">Мэдэгдэл алга.</p>`);
    document.getElementById("nsound").onclick = (e) => { e.stopPropagation(); Notify.sound = !Notify.sound; if (Notify.sound) Notify.ding(); notifMenu(); };
    const ask = document.getElementById("nask");
    if (ask) ask.onclick = async (e) => { e.stopPropagation(); if (A.pushSubscribe) await A.pushSubscribe(); else await Notify.ask(); notifMenu(); };
    const c = document.getElementById("nclear");
    if (c) c.onclick = async (e) => { e.preventDefault(); e.stopPropagation(); await A.Remote.call("DELETE", "notifications"); badges.list = []; badges.unread = 0; notifMenu(); refreshBadges(); };
    if (badges.unread) A.Remote.call("POST", "notifications/read", {}).then(() => { badges.unread = 0; const nb = document.getElementById("nbadge"); if (nb) nb.hidden = true; }).catch(() => {});
  }



  /* ---------- Үгсийн сан ---------- */
  Pages.vocab = function () {
    const L = getLevel(pick.course, pick.level);
    view().innerHTML = `
      ${pageHead("📚 Үгсийн сан", `${esc(L.course.title)} · ${esc(L.label)} — ${esc(L.info.desc)}`)}
      <div class="split"><aside class="lvl-side">${picker()}
        <a class="btn ghost full" href="#/flashcards">🃏 Энэ түвшнийг давтах</a>
        <a class="btn ghost full" href="#/tests">📝 Түвшний тест</a>
      </aside><section class="split-main"><div id="vc"></div></section></div>`;
    bindPicker(Pages.vocab);
    document.querySelectorAll('.lvl-side a[href="#/flashcards"]').forEach((a) => (a.onclick = () => (reviewSrc.mode = "level")));
    wordsTab(document.getElementById("vc"), L.words);
  };
  Pages.flashcards = function (sub) { return Pages.review(sub); };

  /* ---------- Унших ---------- */
  Pages.reading = function () {
    const L = getLevel(pick.course, pick.level);
    const lang = L.course.lang;
    const show = { py: true, mn: false };
    let passages;
    if (lang === "zh") {
      const tier = window.ZH_EXTRA.tier[L.course.id][L.level];
      passages = (window.ZH_READING[tier] || []).map((r) => ({ title: r.title, text: r.text, py: r.py, mn: r.mn, questions: r.questions }));
    } else passages = L.reading ? [{ title: L.reading.title, text: L.reading.text, py: "", mn: "", questions: L.reading.questions }] : [];
    view().innerHTML = `
      ${pageHead("📖 Унших", "Эх уншиж, асуултад хариулж, өгүүлбэрийг сонсоорой")}
      <div class="split"><aside class="lvl-side">${picker()}
        <div class="card toggles">
          ${lang === "zh" ? `<label class="check"><input type="checkbox" id="tpy" checked> Пиньинь харуулах</label>` : ""}
          <label class="check"><input type="checkbox" id="tmn"> Орчуулга харуулах</label>
        </div>
      </aside><section class="split-main"><div id="rd"></div></section></div>`;
    bindPicker(Pages.reading);
    function draw() {
      const box = document.getElementById("rd");
      box.innerHTML = passages.map((r, ri) => `
        <article class="card passage">
          <div class="row between"><h2>${esc(r.title)}</h2>${speakBtn(r.text, lang)}</div>
          <p class="r-text ${lang}">${esc(r.text)}</p>
          ${r.py && show.py ? `<p class="r-py">${esc(r.py)}</p>` : ""}
          ${r.mn && show.mn ? `<p class="r-mn">${esc(r.mn)}</p>` : ""}
          <h4>Асуултууд</h4>
          ${r.questions.map((q, qi) => `<div class="mq" data-p="${ri}" data-rq="${qi}"><p>${qi + 1}. <span class="${lang}">${esc(q.q)}</span></p><div class="options small">${q.o.map((o, k) => `<button class="opt ${lang}" data-k="${k}">${esc(o)}</button>`).join("")}</div></div>`).join("")}
        </article>`).join("") + `
        <h2 class="section-title">💬 Өгүүлбэр унших</h2>
        <div class="list">${L.sentences.map((s) => `
          <div class="card sent">${speakBtn(s.text, lang)}
            <div><div class="s-text ${lang}">${esc(s.text)}</div>${s.reading && show.py ? `<div class="s-read">${esc(s.reading)}</div>` : ""}${show.mn ? `<div class="muted">${esc(s.meaning)}</div>` : `<details><summary>Орчуулга</summary>${esc(s.meaning)}</details>`}</div>
          </div>`).join("")}</div>`;
      bindCommon(box);
      box.querySelectorAll(".mq").forEach((m) => {
        const q = passages[+m.dataset.p].questions[+m.dataset.rq];
        m.querySelectorAll(".opt").forEach((b) => (b.onclick = () => {
          m.querySelectorAll(".opt").forEach((x) => (x.disabled = true));
          m.querySelectorAll(".opt")[q.a].classList.add("correct");
          if (+b.dataset.k !== q.a) b.classList.add("wrong"); else Progress.addXP(3);
        }));
      });
    }
    const tpy = document.getElementById("tpy"), tmn = document.getElementById("tmn");
    if (tpy) tpy.onchange = () => { show.py = tpy.checked; draw(); };
    tmn.onchange = () => { show.mn = tmn.checked; draw(); };
    draw();
  };

  /* ---------- Бичих (хятад: ханз зурах, пиньинээр бичих) ---------- */
  Pages.writing = function (mode) {
    if (track() === "en") return Pages.ielts("writing");
    mode = mode === "pinyin" ? "pinyin" : "hanzi";
    const L = getLevel(pick.course, pick.level);
    view().innerHTML = `
      ${pageHead("✍️ Бичих", "Ханзыг зурааны дарааллаар нь зурж, пиньинээр бичиж дадлагажаарай")}
      <div class="split"><aside class="lvl-side">${picker()}</aside><section class="split-main">
        <div class="tabs">
          <a class="tab ${mode === "hanzi" ? "on" : ""}" href="#/writing/hanzi">✍️ Ханз зурах</a>
          <a class="tab ${mode === "pinyin" ? "on" : ""}" href="#/writing/pinyin">⌨️ Пиньинээр бичих</a>
        </div>
        <div id="wr"></div>
      </section></div>`;
    bindPicker(() => Pages.writing(mode));
    const box = document.getElementById("wr");
    if (mode === "pinyin") {
      const qs = sample(L.words, 10).map((w) => ({
        type: "Пиньинээр бичих", input: true, wordId: w.id,
        prompt: `<div class="q-term zh">${esc(w.term)}</div><div class="q-sub">${esc(w.meaning)}</div><p>Пиньинийг бичнэ үү (аялгуугүй ч болно, жишээ: nihao).</p>`,
        accept: [w.reading], reveal: `${esc(w.term)} — ${esc(w.reading)}`
      }));
      Quiz.run(box, qs, { onFinish: (sc) => Progress.update((p) => { p.xp += sc * 2; }), onRetry: () => Pages.writing("pinyin") });
      return;
    }
    let limit = 60;
    function draw() {
      box.innerHTML = `<p class="muted small">Ханз дээр дарж зурааны дарааллыг үзээд «✍️ Өөрөө зурах» товчоор дадлагажаарай.</p>
        <div class="hz-grid">${L.words.slice(0, limit).map((w) => `<button class="hz-tile" data-stroke="${esc(w.term)}" data-read="${esc(w.reading)}"><span class="zh">${esc(w.term)}</span><small>${esc(w.reading)}</small></button>`).join("")}</div>
        ${L.words.length > limit ? `<div class="row center"><button class="btn ghost" id="more">Цааш үзэх (${L.words.length - limit})</button></div>` : ""}`;
      bindCommon(box);
      const m = box.querySelector("#more");
      if (m) m.onclick = () => { limit += 60; draw(); };
    }
    draw();
  };

  /* ---------- Дүрэм (бүх түвшин) ---------- */
  Pages.grammar = function () {
    const c = COURSES[pick.course];
    const L = getLevel(pick.course, pick.level);
    const lang = c.lang;
    const total = c.data().levels.reduce((n, l) => n + getLevel(c.id, l).grammar.length, 0);
    view().innerHTML = `
      ${pageHead("✏️ Дүрэм", `${esc(c.title)} · нийт ${total} дүрэм — тайлбар, жишээ, шалгах асуулттай`)}
      <div class="split"><aside class="lvl-side">${picker()}</aside><section class="split-main">
        <div class="row between">
          <input class="input grow" id="gq" placeholder="${lang === "zh" ? "Дүрэм хайх: 了, 把, 比, 虽然..." : "Дүрэм хайх: present perfect, passive, conditional..."}" autocomplete="off">
          <button class="btn ghost small" id="gall">Бүгдийг дэлгэх</button>
        </div>
        <div id="gl"></div>
      </section></div>`;
    bindPicker(Pages.grammar);
    const box = document.getElementById("gl"), inp = document.getElementById("gq");
    function draw() {
      const q = inp.value.trim().toLowerCase();
      if (!q) {
        box.innerHTML = `<h2 class="section-title first">${esc(L.label)} · ${L.grammar.length} дүрэм</h2>` + L.grammar.map((g, gi) => grammarCard(g, gi, lang, gi === 0)).join("");
        bindCommon(box); bindGrammar(box, L);
        return;
      }
      box.innerHTML = "";
      let found = 0;
      c.data().levels.forEach((lv) => {
        const LL = getLevel(c.id, lv);
        const hits = LL.grammar.map((g, gi) => [g, gi]).filter(([g]) => [g.title, g.explain, ...g.examples.map((e) => e.join(" "))].join(" ").toLowerCase().includes(q));
        if (!hits.length) return;
        found += hits.length;
        const sec = document.createElement("div");
        sec.innerHTML = `<h2 class="section-title">${esc(LL.label)}</h2>` + hits.map(([g, gi]) => grammarCard(g, gi, lang, true)).join("");
        box.appendChild(sec);
        bindCommon(sec); bindGrammar(sec, LL);
      });
      if (!found) box.innerHTML = `<p class="muted center">Дүрэм олдсонгүй.</p>`;
    }
    let t;
    inp.oninput = () => { clearTimeout(t); t = setTimeout(draw, 150); };
    document.getElementById("gall").onclick = () => box.querySelectorAll("details.grammar").forEach((d) => (d.open = true));
    draw();
  };

  /* ---------- Давталт (Anki маягийн SRS) ---------- */
  function customWords() {
    return (Progress.get().custom || []).map((c) => ({ id: c.id, lang: c.lang, course: "custom", level: "", term: c.term, reading: c.reading || "", gloss: "", meaning: c.meaning, example: c.example || "" }));
  }
  let WORD_MAP = null;
  function wordById(id) {
    if (!WORD_MAP) { WORD_MAP = {}; allWords().forEach((w) => { if (!WORD_MAP[w.id]) WORD_MAP[w.id] = w; }); }
    return WORD_MAP[id] || customWords().find((w) => w.id === id) || null;
  }
  const reviewSrc = { mode: "level", newLimit: 10 };

  Pages.review = function (sub) {
    if (sub === "cards") return customCardsPage();
    const p = Progress.get();
    const t = A.today();
    const doneToday = p.activity[t] || 0;
    const goalPct = Math.min(100, Math.round((doneToday / p.goal) * 100));
    let ids;
    if (reviewSrc.mode === "all") ids = Object.keys(p.srs);
    else if (reviewSrc.mode === "custom") ids = customWords().map((w) => w.id);
    else ids = getLevel(pick.course, pick.level).words.map((w) => w.id);
    const st = A.SRS.stats(ids);
    view().innerHTML = `
      ${pageHead("🃏 Флаш карт", "Anki маягийн зайтай давталт — мартах гэж байхад тань яг цагт нь сануулна")}
      <div class="split"><aside class="lvl-side">
      <div class="side-src" id="src">
        <button data-m="level" class="${reviewSrc.mode === "level" ? "on" : ""}">📚 Түвшнээр</button>
        <button data-m="all" class="${reviewSrc.mode === "all" ? "on" : ""}">♻️ Бүх давтах карт</button>
        <button data-m="custom" class="${reviewSrc.mode === "custom" ? "on" : ""}">✏️ Миний картууд</button>
      </div>
      ${reviewSrc.mode === "level" ? picker() : ""}
      </aside><section class="split-main">
      <div class="goal card">
        <div class="goal-ring" style="--p:${goalPct}"><span>${doneToday}<small>/${p.goal}</small></span></div>
        <div class="goal-txt">
          <h3>Өдрийн зорилго</h3>
          <p class="muted">Өнөөдөр ${doneToday} карт давтлаа. ${goalPct >= 100 ? "🎉 Зорилгоо биелүүллээ!" : "Зорилгодоо хүрэхэд " + (p.goal - doneToday) + " карт үлдлээ."}</p>
          <label class="inline">Өдөрт <input class="input tiny" type="number" id="goal" min="5" max="300" value="${p.goal}"> карт</label>
        </div>
      </div>
      ${reviewSrc.mode === "custom" ? `<p><a class="btn small ghost" href="#/review/cards">＋ Карт нэмэх / засах (${customWords().length})</a></p>` : ""}
      <div class="srs-stats">
        <div class="ss new"><b>${reviewSrc.mode === "all" ? "—" : st.fresh}</b><span>Шинэ</span></div>
        <div class="ss due"><b>${st.due}</b><span>Давтах</span></div>
        <div class="ss learning"><b>${st.learning}</b><span>Сурч буй</span></div>
        <div class="ss mature"><b>${st.mature}</b><span>Цээжилсэн</span></div>
      </div>
      <div class="row center">
        ${reviewSrc.mode !== "all" ? `<label class="inline">Шинэ карт: <select class="input tiny" id="nl">${[5, 10, 20, 30, 50].map((n) => `<option ${n === reviewSrc.newLimit ? "selected" : ""}>${n}</option>`).join("")}</select></label>` : ""}
        <button class="btn big" id="go">▶ Давталт эхлэх</button>
      </div>
      <div id="rv"></div>
      <details class="card help"><summary>Давталт хэрхэн ажилладаг вэ?</summary>
        <p>Карт бүрийг харсны дараа хэр сайн санаж байснаа үнэлнэ: <b>Дахин</b> (мартсан — 10 минутын дараа дахин), <b>Хэцүү</b>, <b>Сайн</b>, <b>Амархан</b>. Сайн санасан карт улам урт хугацааны дараа (1 → 3 → 8 → 20 өдөр...) дахин гарч ирнэ. 21+ өдрийн интервалтай карт «цээжилсэн» гэж тооцогдоно.</p>
        <p>Товчлуур: <kbd>Space</kbd> — хариу харах, <kbd>1</kbd>–<kbd>4</kbd> — үнэлэх.</p>
      </details></section></div>`;
    if (reviewSrc.mode === "level") bindPicker(() => Pages.review());
    view().querySelectorAll("#src button").forEach((b) => (b.onclick = () => { reviewSrc.mode = b.dataset.m; Pages.review(); }));
    document.getElementById("goal").onchange = (e) => { Progress.setGoal(e.target.value); Pages.review(); };
    const nl = document.getElementById("nl");
    if (nl) nl.onchange = () => (reviewSrc.newLimit = +nl.value);
    document.getElementById("go").onclick = () => {
      const s = Progress.get().srs, now = Date.now();
      const due = ids.filter((id) => s[id] && s[id].due <= now);
      const fresh = reviewSrc.mode === "all" ? [] : shuffle(ids.filter((id) => !s[id])).slice(0, reviewSrc.newLimit);
      const queue = shuffle(due).concat(fresh);
      if (!queue.length) { UI.toast("Одоогоор давтах карт алга. Шинэ түвшин сонгох эсвэл дараа ирээрэй!", "ok"); return; }
      document.querySelectorAll(".srs-stats, .lvl-side, .split-main > .row.center, .goal, .help").forEach((x) => (x.hidden = true));
      document.querySelector(".split").classList.add("solo");
      runReview(document.getElementById("rv"), queue);
    };
  };

  function runReview(el, queue) {
    let shown = false, done = 0, again = 0;
    const total = queue.length;
    function onKey(e) {
      if (!document.body.contains(el)) return document.removeEventListener("keydown", onKey);
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
      if (e.code === "Space") { e.preventDefault(); if (!shown) reveal(); }
      else if (shown && ["1", "2", "3", "4"].includes(e.key)) rate(["again", "hard", "good", "easy"][+e.key - 1]);
    }
    document.addEventListener("keydown", onKey);
    function card() {
      if (!queue.length) {
        document.removeEventListener("keydown", onKey);
        el.innerHTML = `<div class="card center"><h2>🎉 Давталт дууслаа!</h2><p>${done} үнэлгээ · ${again} удаа «Дахин»</p><div class="row center"><a class="btn" href="#/dashboard">Самбар</a><button class="btn ghost" id="more">Дахин давтах</button></div></div>`;
        el.querySelector("#more").onclick = () => Pages.review();
        return;
      }
      const id = queue[0], w = wordById(id);
      if (!w) { queue.shift(); return card(); }
      const c = A.SRS.card(id);
      shown = false;
      el.innerHTML = `
        <div class="review-stage">
          <div class="progressbar"><div style="width:${((total - queue.length) / total) * 100}%"></div></div>
          <div class="muted center small">Үлдсэн: ${queue.length} ${c ? "" : "· <span class='pill new'>ШИНЭ</span>"}</div>
          <div class="srs-card card">
            <div class="srs-front ${w.lang}">${esc(w.term)}</div>
            <div class="srs-back" hidden>
              <div class="srs-read">${esc(w.reading)}</div>
              <div class="srs-mean">${esc(w.meaning)}</div>
              ${w.gloss ? `<div class="muted">${esc(w.gloss)}</div>` : ""}
              ${w.example ? `<div class="srs-ex">${esc(w.example)}</div>` : ""}
            </div>
            <div class="srs-tools">
              <button class="icon-btn" id="say" title="Сонсох">🔊</button>
              ${w.lang === "zh" ? `<button class="icon-btn" id="stroke" title="Зурааны дараалал">✍️</button>` : ""}
            </div>
          </div>
          <div class="srs-actions" id="act">
            <button class="btn big full" id="show">Хариу харах <kbd>Space</kbd></button>
          </div>
        </div>`;
      el.querySelector("#say").onclick = () => Speech.speak(w.term, w.lang);
      const sb = el.querySelector("#stroke");
      if (sb) sb.onclick = () => A.Stroke.open(w.term, w.reading);
      el.querySelector("#show").onclick = reveal;
      Speech.speak(w.term, w.lang);
    }
    function reveal() {
      if (shown) return;
      shown = true;
      const id = queue[0], c = A.SRS.card(id);
      el.querySelector(".srs-back").hidden = false;
      const R = [["again", "Дахин", 1], ["hard", "Хэцүү", 2], ["good", "Сайн", 3], ["easy", "Амархан", 4]];
      el.querySelector("#act").innerHTML = `<div class="rate-row">${R.map(([r, t, k]) => `<button class="rate ${r}" data-r="${r}">${t}<small>${A.SRS.label(c, r)}</small><kbd>${k}</kbd></button>`).join("")}</div>`;
      el.querySelectorAll(".rate").forEach((b) => (b.onclick = () => rate(b.dataset.r)));
    }
    function rate(r) {
      const id = queue.shift();
      A.SRS.rate(id, r);
      done++;
      if (r === "again") { again++; queue.push(id); }
      renderNav();
      card();
    }
    card();
  }

  function customCardsPage() {
    const list = customWords();
    view().innerHTML = `
      <a class="back" href="#/review">← Давталт</a>
      ${pageHead("✏️ Миний картууд", "Өөрийн үг, хэллэгээ нэмж Anki шиг давтаарай")}
      <form class="card" id="cf">
        <div class="grid cards3 tight">
          <label>Нүүр тал (үг)<input class="input" name="term" required maxlength="80" placeholder="жишээ: 学习 / opportunity"></label>
          <label>Ар тал (утга)<input class="input" name="meaning" required maxlength="160" placeholder="сурах / боломж"></label>
          <label>Дуудлага / пиньинь<input class="input" name="reading" maxlength="80" placeholder="xuéxí"></label>
        </div>
        <div class="row">
          <label class="inline">Хэл <select class="input tiny" name="lang"><option value="zh">Хятад</option><option value="en">Англи</option></select></label>
          <input class="input grow" name="example" maxlength="200" placeholder="Жишээ өгүүлбэр (заавал биш)">
          <button class="btn">＋ Нэмэх</button>
        </div>
      </form>
      ${list.length ? `<div class="table-wrap"><table class="table"><thead><tr><th></th><th>Үг</th><th>Утга</th><th>Төлөв</th><th></th></tr></thead><tbody>
        ${list.map((w) => { const c = A.SRS.card(w.id); return `<tr><td>${speakBtn(w.term, w.lang)}</td><td class="w-term ${w.lang}">${esc(w.term)} <span class="w-read">${esc(w.reading)}</span></td><td>${esc(w.meaning)}</td><td>${c ? (c.ivl >= 21 ? "✅ Цээжилсэн" : "📖 " + (c.ivl || "<1") + " өдөр") : "🆕 Шинэ"}</td><td><button class="icon-btn" data-del="${esc(w.id)}" title="Устгах">🗑</button></td></tr>`; }).join("")}
      </tbody></table></div>` : `<p class="muted center">Одоогоор карт алга. Дээрх маягтаар нэмнэ үү.</p>`}`;
    document.getElementById("cf").onsubmit = (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      Progress.update((p) => {
        p.custom = p.custom || [];
        p.custom.push({ id: "c:" + Date.now().toString(36), lang: fd.get("lang"), term: String(fd.get("term")).trim(), meaning: String(fd.get("meaning")).trim(), reading: String(fd.get("reading")).trim(), example: String(fd.get("example")).trim() });
      });
      UI.toast("Карт нэмэгдлээ", "ok");
      customCardsPage();
    };
    bindCommon(view());
    view().querySelectorAll("[data-del]").forEach((b) => (b.onclick = () => {
      if (!confirm("Энэ картыг устгах уу?")) return;
      Progress.update((p) => { p.custom = (p.custom || []).filter((c) => c.id !== b.dataset.del); delete p.srs[b.dataset.del]; });
      customCardsPage();
    }));
  }

  /* ---------- IELTS Writing / Speaking дадлага ---------- */
  Pages.ielts = function (tab, id) {
    const P = window.IELTS_PRACTICE;
    tab = tab || "writing";
    view().innerHTML = `
      ${pageHead("🎯 IELTS дадлага", "Writing болон Speaking хэсгийг жинхэнэ шалгалтын нөхцөлөөр дадлагажуул")}
      <div class="tabs">
        <a class="tab ${tab === "writing" ? "on" : ""}" href="#/ielts/writing">✍️ Writing</a>
        <a class="tab ${tab === "speaking" ? "on" : ""}" href="#/ielts/speaking">🗣️ Speaking</a>
        <a class="tab ${tab === "linking" ? "on" : ""}" href="#/ielts/linking">🔗 Холбоос үгс</a>
      </div>
      <div id="ip"></div>`;
    const box = document.getElementById("ip");
    if (tab === "linking") {
      box.innerHTML = `<div class="grid cards2">${P.linking.map(([k, v]) => `<div class="card"><h4>${esc(k)}</h4><p>${v.split(", ").map((x) => `<span class="tag big">${esc(x)}</span>`).join(" ")}</p></div>`).join("")}</div>`;
      return;
    }
    if (tab === "writing") {
      const t = P.writing.find((x) => x.id === id);
      const wOpen = () => A.hasAccess("en");
      if (t && !wOpen(t)) { box.innerHTML = A.paywall("Энэ Writing даалгавар англи хэлний багцад багтана."); return; }
      if (!t) {
        box.innerHTML = `<div class="grid cards2">${P.writing.map((x) => `<a class="card level-card" href="#/ielts/writing/${x.id}"><span class="badge">${wOpen(x) ? "" : "🔒 "}Task ${x.task} · ${x.minutes} мин · ${x.min}+ үг</span><h3>${esc(x.title)}</h3><p>${esc(x.prompt.slice(0, 120))}...</p>${Progress.get().writing[x.id] ? `<span class="pill pass">Ноорог хадгалсан</span>` : ""}</a>`).join("")}</div>`;
        return;
      }
      return writingEditor(box, t, P.criteria);
    }
    const sets = P.speaking;
    const si = Math.max(0, Math.min(sets.length - 1, +id || 0));
    const s = sets[si];
    const sOpen = () => A.hasAccess("en");
    const segs = `<div class="seg wide">${sets.map((x, k) => `<a href="#/ielts/speaking/${k}" class="${k === si ? "on" : ""}">${sOpen(k) ? "" : "🔒 "}${esc(x.topic)}</a>`).join("")}</div>`;
    if (!sOpen(si)) { box.innerHTML = segs + A.paywall("Энэ Speaking сэдэв англи хэлний багцад багтана."); return; }
    box.innerHTML = `
      ${segs.trim()}
      <div class="grid cards3 speak-grid">
        <div class="card"><h3>Part 1 <small class="muted">4–5 мин</small></h3><ol class="qlist">${s.part1.map((q) => `<li>${speakBtn(q, "en")} ${esc(q)}</li>`).join("")}</ol></div>
        <div class="card cue">
          <h3>Part 2 <small class="muted">Cue card</small></h3>
          <p class="cue-main">${speakBtn(s.part2.cue, "en")} <b>${esc(s.part2.cue)}</b></p>
          <p class="muted">You should say:</p>
          <ul>${s.part2.points.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>
          <div class="timer-big" id="tb">1:00</div>
          <div class="row center">
            <button class="btn" id="prep">⏱ 1 мин бэлтгэл</button>
            <button class="btn ghost" id="talk">🗣️ 2 мин ярих</button>
          </div>
        </div>
        <div class="card"><h3>Part 3 <small class="muted">4–5 мин</small></h3><ol class="qlist">${s.part3.map((q) => `<li>${speakBtn(q, "en")} ${esc(q)}</li>`).join("")}</ol></div>
      </div>
      <div class="card recorder">
        <h3>🎙️ Өөрийгөө бичиж сонсох</h3>
        <p class="muted">Хариултаа бичлэг хийгээд дахин сонсож, алдаагаа засаарай. Бичлэг зөвхөн таны төхөөрөмж дээр үлдэнэ.</p>
        <div class="row"><button class="btn mic" id="rec">● Бичлэг эхлэх</button><span id="rst" class="muted"></span></div>
        <div id="clips"></div>
      </div>`;
    bindCommon(box);
    let tm = null;
    const tb = document.getElementById("tb");
    const countdown = (sec, label, after) => {
      clearInterval(tm);
      let left = sec;
      const draw = () => (tb.textContent = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`);
      draw(); tb.dataset.label = label; tb.classList.add("run");
      tm = setInterval(() => {
        if (!document.body.contains(tb)) return clearInterval(tm);
        left--; draw();
        if (left <= 0) { clearInterval(tm); tb.classList.remove("run"); UI.toast(label + " дууслаа!", "ok"); if (after) after(); }
      }, 1000);
    };
    document.getElementById("prep").onclick = () => countdown(60, "Бэлтгэл", () => countdown(120, "Ярих хугацаа"));
    document.getElementById("talk").onclick = () => countdown(120, "Ярих хугацаа");
    recorder(document.getElementById("rec"), document.getElementById("rst"), document.getElementById("clips"));
  };

  function writingEditor(box, t, criteria) {
    const saved = Progress.get().writing[t.id] || "";
    box.innerHTML = `
      <a class="back" href="#/ielts/writing">← Бүх даалгавар</a>
      <div class="writing-grid">
        <div>
          <div class="card prompt-card">
            <span class="badge">Writing Task ${t.task} · ${t.minutes} минут · хамгийн багадаа ${t.min} үг</span>
            <h3>${esc(t.title)}</h3>
            <p>${esc(t.prompt)}</p>
          </div>
          <textarea class="input essay" id="essay" placeholder="Энд бичнэ үү...">${esc(saved)}</textarea>
          <div class="row between">
            <span id="wc" class="wc"></span>
            <span class="timer" id="wt">${t.minutes}:00</span>
            <button class="btn ghost small" id="wstart">⏱ Цаг эхлүүлэх</button>
            <button class="btn small" id="wsave">💾 Хадгалах</button>
          </div>
        </div>
        <aside>
          <div class="card"><h4>💡 Зөвлөгөө</h4><ul>${t.tips.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>
          <div class="card"><h4>✅ Өөрийгөө шалгах (band шалгуур)</h4>${criteria.map((c, k) => `<label class="check"><input type="checkbox" id="cr${k}"> ${esc(c)}</label>`).join("")}</div>
        </aside>
      </div>`;
    const ta = document.getElementById("essay"), wc = document.getElementById("wc");
    const count = () => {
      const n = (ta.value.trim().match(/\S+/g) || []).length;
      wc.innerHTML = `<b>${n}</b> / ${t.min} үг`;
      wc.classList.toggle("ok", n >= t.min);
    };
    ta.oninput = count; count();
    const save = (quiet) => { Progress.update((p) => { p.writing[t.id] = ta.value; }); if (!quiet) UI.toast("Хадгалагдлаа", "ok"); };
    document.getElementById("wsave").onclick = () => save();
    let auto = setInterval(() => { if (!document.body.contains(ta)) return clearInterval(auto); save(true); }, 15000);
    let tm = null;
    document.getElementById("wstart").onclick = () => {
      clearInterval(tm);
      let left = t.minutes * 60;
      const wt = document.getElementById("wt");
      tm = setInterval(() => {
        if (!document.body.contains(wt)) return clearInterval(tm);
        left--;
        wt.textContent = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`;
        wt.classList.toggle("low", left <= 300);
        if (left <= 0) { clearInterval(tm); save(true); UI.toast("Хугацаа дууслаа! Бичсэн зүйл тань хадгалагдлаа.", "warn"); }
      }, 1000);
    };
  }

  function recorder(btn, status, clips) {
    if (!navigator.mediaDevices || !window.MediaRecorder) { btn.disabled = true; status.textContent = "Таны хөтөч бичлэг хийх боломжгүй."; return; }
    let mr = null, chunks = [], start = 0, tick = null;
    btn.onclick = async () => {
      if (mr && mr.state === "recording") { mr.stop(); return; }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mr = new MediaRecorder(stream);
        chunks = [];
        mr.ondataavailable = (e) => chunks.push(e.data);
        mr.onstop = () => {
          clearInterval(tick);
          stream.getTracks().forEach((t) => t.stop());
          const url = URL.createObjectURL(new Blob(chunks, { type: mr.mimeType }));
          const sec = Math.round((Date.now() - start) / 1000);
          clips.insertAdjacentHTML("afterbegin", `<div class="clip"><audio controls src="${url}"></audio><span class="muted">${sec} сек · ${new Date().toLocaleTimeString("mn-MN")}</span></div>`);
          btn.textContent = "● Бичлэг эхлэх"; btn.classList.remove("on"); status.textContent = "";
        };
        mr.start(); start = Date.now();
        btn.textContent = "■ Зогсоох"; btn.classList.add("on");
        tick = setInterval(() => (status.textContent = "Бичиж байна... " + Math.round((Date.now() - start) / 1000) + " сек"), 500);
      } catch (e) { status.textContent = "Микрофоны зөвшөөрөл өгнө үү."; }
    };
  }

  Pages.notfound = function () {
    view().innerHTML = `<div class="card center"><h2>404</h2><p>Хуудас олдсонгүй.</p><a class="btn" href="#/">Нүүр хуудас</a></div>`;
  };

  // Бусад модуль (js/features.js) ашиглах туслахууд
  Object.assign(A, {
    Pages, pageHead, avatarHtml, picker, bindPicker, speakBtn, strokeBtn, timeAgo, linkify, resizeImage, needServer, bindCommon, wordById,
    track: () => track(), setCourse: (c, l) => setCourse(c, l), pick, FLAG, Notify, refreshBadges: (f) => refreshBadges(f),
    go: (h) => go(h), renderNav: () => renderNav(), view
  });

  /* ======================= ЧИГЛҮҮЛЭГЧ ======================= */
  const PUBLIC = ["", "home", "login", "register", "forgot", "reset"];
  const Router = { after: null };
  function go(hash) { if (location.hash === hash) route(); else location.hash = hash; }

  function route() {
    const raw = location.hash.replace(/^#\/?/, "");
    const qi = raw.indexOf("?");
    A.query = qi >= 0 ? Object.fromEntries(new URLSearchParams(raw.slice(qi + 1))) : {};
    const parts = (qi >= 0 ? raw.slice(0, qi) : raw).split("/").filter(Boolean);
    const name = parts[0] || "home";
    const u = Auth.current();
    if (!PUBLIC.includes(name) && !u) {
      Router.after = location.hash;
      UI.toast("Хичээл үзэхийн тулд нэвтэрнэ үү.", "warn");
      location.replace("#/login");
      return;
    }
    if ((name === "login" || name === "register" || name === "home") && u) { location.replace("#/dashboard"); return; }
    if (window.speechSynthesis) speechSynthesis.cancel();
    if (u) ensurePick();
    const fn = Pages[name] || Pages.notfound;
    fn.apply(null, parts.slice(1));
    renderNav();
    window.scrollTo(0, 0);
    document.body.classList.remove("menu-open");
    const m = document.getElementById("pmenu");
    if (m) m.hidden = true;
    const nm = document.getElementById("nmenu");
    if (nm) nm.hidden = true;
    refreshBadges("nav");
  }

  // Дээд цэс: [зам, идэвхжих хэсэг, дүрс, нэр]
  // Бүлэглэсэн цэс: [нэр, дүрс, [[зам, идэвхжих хэсэг, дүрс, нэр, тайлбар], ...]]
  function navGroups(lang) {
    const remote = A.Remote.on;
    return [
      ["Сурах", "📚", [
        ["flashcards", ["flashcards", "review"], "🃏", "Флаш карт", "Anki давталт — мартахаас өмнө сануулна"],
        ["vocab", ["vocab", "chinese", "english"], "📚", "Үгсийн сан", lang === "zh" ? "HSK түвшин бүрийн үгс" : "IELTS түвшин бүрийн үгс"],
        ["topics", ["topics"], "🧳", "Мэргэжлийн үгс", "Аялал, бизнес, эмнэлэг, худалдаа, IT"],
        ["grammar", ["grammar"], "✏️", "Дүрэм", "Тайлбар, жишээ, шалгах асуулт"],
        ["dictionary", ["dictionary"], "🔎", "Толь бичиг", "Бүх үгээс хайх"],
        ["print", ["print"], "🖨️", "Хэвлэх", "Үгсээ хүснэгт, карт, PDF болгох"]
      ]],
      ["Дадлага", "🎯", [
        ["listening", ["listening"], "🎧", "Сонсох", "Үг, өгүүлбэр сонсож таних"],
        ["dialogues", ["dialogues"], "🗣️", "Харилцан яриа", "Бодит нөхцөлийн яриа сонсох"],
        ["reading", ["reading"], "📖", "Унших", "Эх уншиж асуултад хариулах"],
        [lang === "zh" ? "writing" : "ielts/writing", ["writing", "ielts"], "✍️", lang === "zh" ? "Бичих" : "Бичих · Ярих", lang === "zh" ? "Ханз зурах, пиньинь бичих" : "IELTS Writing, Speaking"],
        ["games", ["games"], "🎮", "Тоглоом", "Үг цээжлэх хөгжилтэй тоглоомууд"]
      ]],
      ["Шалгалт", "📝", [
        ["plan", ["plan"], "📅", "Сурах төлөвлөгөө", "Шалгалт хүртэл өдөрт хэдэн үг"],
        ["tests", ["tests"], "📝", "Тест", "Түвшний тест, дүнгийн түүх"],
        ["mock", ["mock"], "🏁", "Жишиг шалгалт", lang === "zh" ? "Бүтэн HSK, цагтай" : "Бүтэн IELTS, цагтай"],
        ["quests", ["quests"], "🎯", "Даалгавар", "Өдрийн даалгавар, тэмдэг"],
        ...(remote ? [["duels", ["duels"], "⚔️", "Үгийн тулаан", "Найзтайгаа өрсөлдөх"]] : [])
      ]],
      ...(remote ? [["Нийгэм", "👥", [
        ["social", ["social"], "📰", "Сошиал", "Пост, сторй"],
        ["chat", ["chat"], "💬", "Чат", "Нийтийн болон хувийн чат"],
        ["friends", ["friends", "u"], "👥", "Найзууд", "Найзын хүсэлт, хайлт"],
        ["leaderboard", ["leaderboard"], "🏆", "Тэргүүлэгчид", "XP-ээр эрэмбэлсэн жагсаалт"]
      ]]] : [["Бусад", "🏆", [["leaderboard", ["leaderboard"], "🏆", "Тэргүүлэгчид", "XP-ээр эрэмбэлсэн жагсаалт"]]]])
    ];
  }
  // Профайлын цэс: толгой, түвшин, статистик, багц, гол холбоосууд
  function profileMenu(u, pr, due, lang) {
    const L = A.levelOf ? A.levelOf(pr.xp) : null;
    const prem = u.premium || {};
    const until = (d) => d && new Date(d).getTime() > Date.now() ? new Date(d).toISOString().slice(0, 10) : "";
    const pz = until(prem.zh), pe = until(prem.en);
    const premTxt = u.isAdmin ? "Админ — бүх хичээл нээлттэй" : pz || pe ? [pz && "中 " + pz, pe && "EN " + pe].filter(Boolean).join(" · ") + " хүртэл" : "Үнэгүй — HSK 1, IELTS A1";
    const tile = (h, i, t) => `<a href="${h}" class="pm-tile"><span>${i}</span>${t}</a>`;
    return `
      <div class="pm-head">${avatarHtml(u, 46)}<div><b>${esc(u.name)}</b><span class="muted small">${esc(u.email)}</span></div></div>
      ${L ? `<a href="#/quests" class="pm-level"><span class="pm-lv">${L.lvl}</span><span class="pm-lvtx"><b>${esc(L.title)}</b><span class="mini-bar"><i style="width:${L.pct}%"></i></span><small>${pr.xp} / ${L.next} XP</small></span></a>` : ""}
      <div class="pm-stats"><span><b>⭐ ${pr.xp}</b>XP</span><span><b>🔥 ${pr.streak}</b>өдөр</span><span><b>🃏 ${due}</b>давтах</span></div>
      ${A.Remote.on ? `<a href="#/pricing" class="pm-plan ${pz || pe || u.isAdmin ? "on" : ""}"><span>💎</span><span><b>${pz || pe ? "Миний багц" : u.isAdmin ? "Багц" : "Багц авах"}</b><small>${premTxt}</small></span><i>›</i></a>` : ""}
      <div class="pm-grid">
        ${tile("#/profile", "👤", "Профайл")}${tile("#/quests", "🎯", "Даалгавар")}
        ${tile("#/review/cards", "✏️", "Миний карт")}${tile(`#/${lang === "zh" ? "chinese" : "english"}`, "🎓", "Түвшнүүд")}
      </div>
      <div class="pm-foot">
        ${u.isAdmin ? `<a href="#/admin" class="pm-admin">🛡️ Админ</a>` : ""}
        <button id="logout">⏻ Гарах</button>
      </div>`;
  }
  const THEME_ICON = { system: "🖥️", light: "☀️", dark: "🌙" };

  function renderNav() {
    const u = Auth.current();
    const cur = (location.hash.replace(/^#\/?/, "").split("/")[0]) || "home";
    document.body.classList.toggle("authed", !!u);
    const due = u ? A.SRS.allDue() : 0;
    const lang = track();
    document.documentElement.dataset.track = lang;
    document.querySelectorAll(".logo-pic").forEach((m) => {
      m.querySelector(".lg-l").src = `img/logo-${lang}.png`;
      m.querySelector(".lg-d").src = `img/logo-${lang}-dark.png`;
    });
    const groups = u ? navGroups(lang) : [];
    const cnt = (h) => (h === "flashcards" ? due : h === "friends" ? badges.incoming : 0);
    const item = ([h, keys, i, t, d]) => `<a href="#/${h}" class="nd-item ${keys.includes(cur) ? "on" : ""}"><span class="nd-ic">${i}</span><span class="nd-tx"><b>${t}</b><small>${d}</small></span>${cnt(h) ? `<span class="nbadge">${cnt(h)}</span>` : ""}</a>`;
    const topNav = document.getElementById("top-nav");
    topNav.classList.toggle("grouped", !!u);
    topNav.innerHTML = u ? `<a href="#/dashboard" class="ng-home ${cur === "dashboard" ? "on" : ""}">🏠 Нүүр</a>` + groups.map(([t, ic, items], gi) => {
      const on = items.some((x) => x[1].includes(cur));
      const n = items.reduce((k, x) => k + cnt(x[0]), 0);
      return `<div class="ng ${on ? "on" : ""}"><button class="ng-btn" data-g="${gi}" aria-haspopup="true"><span>${ic}</span> ${t}${n ? `<span class="nbadge">${n}</span>` : ""} <i class="caret">▾</i></button>
        <div class="ndrop">${items.map(item).join("")}</div></div>`;
    }).join("") : "";
    topNav.querySelectorAll(".ng-btn").forEach((b) => (b.onclick = (e) => {
      e.stopPropagation();
      const g = b.parentNode, open = !g.classList.contains("open");
      topNav.querySelectorAll(".ng.open").forEach((x) => x.classList.remove("open"));
      g.classList.toggle("open", open);
    }));
    // Утасны доод таб цэс
    let tb = document.getElementById("tabbar");
    if (!tb) { tb = document.createElement("nav"); tb.id = "tabbar"; tb.className = "tabbar"; document.body.appendChild(tb); }
    tb.hidden = !u;
    if (u) {
      const learnHref = due ? "#/review" : "#/vocab";
      tb.innerHTML = `
        <div class="tb-sheet" id="tbsheet" hidden>${groups.map(([t, ic, items]) => `<h6>${ic} ${t}</h6><div class="tb-grid">${items.map(([h, keys, i, tt]) => `<a href="#/${h}" class="${keys.includes(cur) ? "on" : ""}"><span>${i}</span>${tt}${cnt(h) ? `<i class="nbadge">${cnt(h)}</i>` : ""}</a>`).join("")}</div>`).join("")}
          <h6>👤 Би</h6><div class="tb-grid"><a href="#/profile"><span>👤</span>Профайл</a>${A.Remote.on ? `<a href="#/pricing"><span>💎</span>Багц</a>` : ""}<a href="#/${lang === "zh" ? "chinese" : "english"}"><span>🎓</span>Түвшнүүд</a></div></div>
        <div class="tb-row">
          <a href="#/dashboard" class="${cur === "dashboard" ? "on" : ""}"><span>🏠</span>Нүүр</a>
          <a href="#/flashcards" class="${["flashcards", "review"].includes(cur) ? "on" : ""}"><span>🃏</span>Карт${due ? `<i class="nbadge">${due}</i>` : ""}</a>
          <a href="${learnHref}" class="tb-mid"><span>▶</span>Сурах</a>
          <a href="#/games" class="${cur === "games" ? "on" : ""}"><span>🎮</span>Тоглоом</a>
          <button id="tball"><span>☰</span>Бүгд</button>
        </div>`;
      const sh = document.getElementById("tbsheet"), all = document.getElementById("tball");
      all.onclick = (e) => { e.stopPropagation(); sh.hidden = !sh.hidden; all.classList.toggle("on", !sh.hidden); all.innerHTML = sh.hidden ? "<span>☰</span>Бүгд" : "<span>✕</span>Хаах"; };
    }
    const pr = u ? Progress.get() : null;
    document.getElementById("top-actions").innerHTML = (u
      ? `<div class="track-sw" role="group" aria-label="Хэл сонгох">
          <button data-t="zh" class="${lang === "zh" ? "on" : ""}" title="Хятад хэл">${FLAG.zh}<span class="tw">Хятад</span></button>
          <button data-t="en" class="${lang === "en" ? "on" : ""}" title="Англи хэл">${FLAG.en}<span class="tw">Англи</span></button>
        </div>
        <div class="icon-bar">
          ${A.Remote.on ? `<span id="fbadge" hidden></span><div class="nwrap"><button class="ibtn" id="nbell" title="Мэдэгдэл">🔔<span class="ibadge" id="nbadge" ${badges.unread ? "" : "hidden"}>${badges.unread}</span></button><div class="nmenu card" id="nmenu" hidden></div></div>` : ""}
          <button class="ibtn" id="theme" title="Өнгөний горим">${THEME_ICON[A.Theme.get()]}</button>
        </div>
        <div class="pwrap">
          <button class="avatar-btn" id="avatar" aria-haspopup="true" aria-expanded="false" title="${esc(u.name)}">${avatarHtml(u, 40)}</button>
          <div class="pmenu card" id="pmenu" hidden>${profileMenu(u, pr, due, lang)}</div>
        </div>`
      : `<button class="icon-btn theme" id="theme" title="Өнгөний горим">${THEME_ICON[A.Theme.get()]}</button><a href="#/login" class="btn small ghost">Нэвтрэх</a><a href="#/register" class="btn small">Бүртгүүлэх</a>`);
    document.getElementById("theme").onclick = () => {
      const order = ["system", "light", "dark"];
      const nx = order[(order.indexOf(A.Theme.get()) + 1) % 3];
      A.Theme.set(nx);
      UI.toast({ system: "Системийн горим", light: "Цайвар горим", dark: "Бараан горим" }[nx]);
      renderNav();
    };
    document.querySelectorAll(".track-sw button").forEach((b) => (b.onclick = () => {
      const t = b.dataset.t;
      if (t === track()) return;
      setTrack(t);
      UI.toast(t === "zh" ? "中 Хятад хэл сонгогдлоо" : "EN Англи хэл сонгогдлоо");
      if (cur === "chinese" || cur === "english") go(t === "zh" ? "#/chinese" : "#/english");
      else if (cur === "ielts" && t === "zh") go("#/writing");
      else if (cur === "writing" && t === "en") go("#/ielts/writing");
      else route();
    }));
    const bell = document.getElementById("nbell");
    if (bell) bell.onclick = (e) => {
      e.stopPropagation();
      const m = document.getElementById("nmenu");
      m.hidden = !m.hidden;
      if (!m.hidden) { notifMenu(); refreshBadges().then(() => { if (!m.hidden) notifMenu(); }); }
    };
    const av = document.getElementById("avatar");
    if (av) av.onclick = (e) => {
      e.stopPropagation();
      const m = document.getElementById("pmenu");
      m.hidden = !m.hidden;
      av.setAttribute("aria-expanded", String(!m.hidden));
    };
    const lo = document.getElementById("logout");
    if (lo) lo.onclick = async () => { await Auth.logout(); UI.toast("Системээс гарлаа"); go("#/"); };
  }

  window.addEventListener("hashchange", route);
  document.addEventListener("click", (e) => {
    document.querySelectorAll(".ng.open").forEach((g) => { if (!g.contains(e.target)) g.classList.remove("open"); });
    const sh = document.getElementById("tbsheet");
    if (sh && !sh.hidden && !e.target.closest("#tabbar")) { const b = document.getElementById("tball"); if (b) b.click(); }
    const m = document.getElementById("pmenu");
    if (m && !m.hidden && !e.target.closest(".pwrap")) m.hidden = true;
    const n = document.getElementById("nmenu");
    if (n && !n.hidden && !e.target.closest(".nwrap")) n.hidden = true;
  });
  document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("burger").onclick = () => document.body.classList.toggle("menu-open");
    view().innerHTML = `<div class="boot"><img class="boot-logo" src="img/logo-zh.png" alt=""><p class="muted">Ачаалж байна...</p></div>`;
    A.track = track;
    A.Remote.init().finally(() => { route(); refreshBadges(); });
  });
})();
