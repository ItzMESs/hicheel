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

  function picker() {
    const c = COURSES[pick.course];
    if (!c.data().levels.includes(pick.level)) pick.level = c.data().levels[0];
    return `
      <div class="picker">
        <label>Хичээл
          <select id="pk-course" class="input">
            ${Object.values(COURSES).map((x) => `<option value="${x.id}" ${x.id === pick.course ? "selected" : ""}>${esc(x.title)}</option>`).join("")}
          </select>
        </label>
        <label>Түвшин
          <select id="pk-level" class="input">
            ${c.data().levels.map((l) => `<option value="${l}" ${l === pick.level ? "selected" : ""}>${esc(c.levelLabel(l))}</option>`).join("")}
          </select>
        </label>
      </div>`;
  }
  function bindPicker(onChange) {
    const c = document.getElementById("pk-course"), l = document.getElementById("pk-level");
    c.onchange = () => { pick.course = c.value; pick.level = COURSES[c.value].data().levels[0]; savePick(); onChange(); };
    l.onchange = () => { pick.level = l.value; savePick(); onChange(); };
  }

  const pageHead = (title, sub) => `<header class="page-head"><h1>${title}</h1>${sub ? `<p>${sub}</p>` : ""}</header>`;
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
          <div class="bubble zh">你好</div><div class="bubble en">Hello</div><div class="bubble mn">Сайн уу</div>
        </div>
      </section>
      <section class="grid cards3">
        ${feature("🇨🇳", "Хятад хэл (HSK)", "HSK 2.0 — 6 түвшин, HSK 3.0 — 9 түвшин. Пиньинь, утга, дуудлага, дүрэм.", "#/chinese")}
        ${feature("🇬🇧", "Англи хэл (IELTS)", "CEFR A1–C1 түвшин, IELTS band оноотой харьцуулалт, унших дасгал.", "#/english")}
        ${feature("🎧", "Сонсгол", "Үг, өгүүлбэр сонсож таних, сонсоод бичих дасгал.", "#/listening")}
        ${feature("🎮", "Тоглоом", "Картаар цээжлэх, хос тааруулах, хурдны сорил, өгүүлбэр байгуулах.", "#/games")}
        ${feature("📝", "Тест шалгалт", "Түвшин тогтоох хугацаатай шалгалт, дүнгийн түүх.", "#/tests")}
        ${feature("📖", "Толь бичиг", "Хятад–монгол–англи толь. Хайх, сонсох, хадгалах.", "#/dictionary")}
      </section>`;
    function feature(icon, t, d, href) {
      return `<a class="card feature" href="${href}"><div class="f-icon">${icon}</div><h3>${t}</h3><p>${d}</p></a>`;
    }
  };

  /* ---------- Нэвтрэх / Бүртгүүлэх ---------- */
  Pages.login = function () {
    view().innerHTML = `
      <div class="auth card">
        <h2>Нэвтрэх</h2>
        <form id="f">
          <label>Имэйл<input class="input" name="email" type="email" required autocomplete="email" /></label>
          <label>Нууц үг<input class="input" name="password" type="password" required autocomplete="current-password" /></label>
          <div class="error" id="err"></div>
          <button class="btn full">Нэвтрэх</button>
        </form>
        <p class="muted center">Бүртгэлгүй юу? <a href="#/register">Бүртгүүлэх</a></p>
      </div>`;
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
      <div class="auth card">
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
        <p class="note">ℹ️ Таны бүртгэл болон ахиц энэ төхөөрөмжийн хөтөч дээр хадгалагдана.</p>
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
    const total = allWords().length;
    const avg = p.tests.length ? Math.round(p.tests.reduce((s, t) => s + t.pct, 0) / p.tests.length) : 0;
    const courseStats = Object.values(COURSES).map((c) => {
      const lv = c.data().levels.map((l) => {
        const ws = getLevel(c.id, l).words;
        const n = ws.filter((w) => p.learned[w.id]).length;
        return `<a class="lv-chip" href="#/${c.lang === "zh" ? "chinese/" + c.id : "english"}/${encodeURIComponent(l)}" title="${n}/${ws.length} үг">
          <span>${esc(c.levelLabel(l))}</span><span class="mini-bar"><i style="width:${ws.length ? (n / ws.length) * 100 : 0}%"></i></span></a>`;
      }).join("");
      return `<div class="card"><h3>${esc(c.title)}</h3><div class="lv-chips">${lv}</div></div>`;
    }).join("");
    view().innerHTML = `
      ${pageHead("Сайн уу, " + esc(u.name) + "! 👋", "Өнөөдөр юу сурах вэ?")}
      <div class="stats">
        ${stat("⭐", p.xp, "XP оноо")}
        ${stat("🔥", p.streak, "Дараалсан өдөр")}
        ${stat("📚", learned + " / " + total, "Цээжилсэн үг")}
        ${stat("📝", p.tests.length, "Өгсөн тест")}
        ${stat("🎯", avg + "%", "Тестийн дундаж")}
      </div>
      <h2 class="section-title">Түвшний ахиц</h2>
      <div class="grid cards3">${courseStats}</div>
      <h2 class="section-title">Сүүлийн тестүүд</h2>
      ${testTable(p.tests.slice(-5).reverse())}`;
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
    ver = ver === "hsk3" ? "hsk3" : "hsk2";
    const d = COURSES[ver].data();
    const p = Progress.get();
    view().innerHTML = `
      ${pageHead("🇨🇳 Хятад хэл — HSK", "Хятад хэлний түвшин тогтоох олон улсын шалгалт")}
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
            <div class="lv-badge zh">HSK ${esc(l)}</div>
            <p>${esc(info.desc)}</p>
            <ul class="facts">
              <li>Шинэ үг: <b>${info.words}</b> (нийт ${info.total})</li>
              ${info.chars ? `<li>Ханз: <b>${info.chars}</b> · Дүрэм: <b>${info.grammar}</b></li>` : `<li>CEFR ойролцоо: <b>${info.cefr}</b></li>`}
              ${info.stage ? `<li>${esc(info.stage)}</li>` : ""}
            </ul>
            <div class="mini-bar"><i style="width:${(n / ws.length) * 100}%"></i></div>
            <div class="muted small">${n}/${ws.length} үг цээжилсэн</div>
          </a>`;
        }).join("")}
      </div>`;
  };

  /* ---------- Англи хэл ---------- */
  Pages.english = function (level) {
    if (level) return levelPage("ielts", decodeURIComponent(level));
    const d = A.COURSES.ielts.data();
    const p = Progress.get();
    view().innerHTML = `
      ${pageHead("🇬🇧 Англи хэл — IELTS", "CEFR A1–C1 түвшин ба IELTS бэлтгэл")}
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
          const ws = getLevel("ielts", l).words;
          const n = ws.filter((w) => p.learned[w.id]).length;
          return `<a class="card level-card" href="#/english/${l}">
            <div class="lv-badge en">${l}</div>
            <p>${esc(d.info[l].desc)}</p>
            <ul class="facts"><li>IELTS: <b>${d.info[l].band}</b></li><li>Үг: <b>${ws.length}</b> · Дүрэм: <b>${d.grammar[l].length}</b> · Унших: 1</li></ul>
            <div class="mini-bar"><i style="width:${(n / ws.length) * 100}%"></i></div>
            <div class="muted small">${n}/${ws.length} үг цээжилсэн</div>
          </a>`;
        }).join("")}
      </div>`;
  };

  /* ---------- Түвшний хуудас (үг, дүрэм, өгүүлбэр, унших) ---------- */
  function levelPage(courseId, level) {
    if (!COURSES[courseId] || !COURSES[courseId].data().levels.includes(level)) return Pages.notfound();
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
      if (tab === "words") c.innerHTML = wordTable(L.words);
      if (tab === "grammar") c.innerHTML = L.grammar.map((g, gi) => grammarCard(g, gi, lang)).join("");
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

  function wordTable(words) {
    const p = Progress.get();
    if (!words.length) return `<p class="muted">Үг олдсонгүй.</p>`;
    return `<div class="table-wrap"><table class="table words">
      <thead><tr><th></th><th>Үг</th><th>${words[0].lang === "zh" ? "Пиньинь" : "Аймаг"}</th><th>Утга</th><th class="hide-sm">${words[0].lang === "zh" ? "English" : "Жишээ"}</th><th></th></tr></thead>
      <tbody>${words.map((w) => `<tr>
        <td>${speakBtn(w.term, w.lang)}</td>
        <td class="w-term ${w.lang}">${esc(w.term)}</td>
        <td class="w-read">${esc(w.reading)}</td>
        <td>${esc(w.meaning)}</td>
        <td class="hide-sm muted">${esc(w.gloss || w.example)}</td>
        <td class="nowrap">
          <button class="icon-btn ${p.learned[w.id] ? "on" : ""}" data-learn="${esc(w.id)}" title="Цээжилсэн">✔</button>
          <button class="icon-btn ${p.favorites.includes(w.id) ? "on" : ""}" data-fav="${esc(w.id)}" title="Хадгалах">★</button>
        </td></tr>`).join("")}</tbody></table></div>`;
  }

  function grammarCard(g, gi, lang) {
    return `<div class="card grammar">
      <h3>${esc(g.title)}</h3>
      <p>${esc(g.explain)}</p>
      <ul class="examples">${g.examples.map((e) => `<li>${speakBtn(e[0], lang)}<span class="${lang}">${esc(e[0])}</span> — <span class="muted">${esc(e[1])}</span></li>`).join("")}</ul>
      <div class="mini-quiz">
        <h4>Шалгах</h4>
        ${g.quiz.map((q, qi) => `<div class="mq" data-g="${gi}" data-q="${qi}"><p>${esc(q.q)}</p><div class="options small">${q.o.map((o, k) => `<button class="opt ${lang}" data-k="${k}">${esc(o)}</button>`).join("")}</div></div>`).join("")}
      </div>
    </div>`;
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
      { id: "dict", t: "✍️ Сонсоод бичих", d: "Сонссон үгээ бичиж шалгуул" }
    ];
    view().innerHTML = `
      ${pageHead("🎧 Сонсгол", "Чихээ дадлагажуулж, дуудлагаа сайжруул")}
      ${!Speech.supported ? `<div class="card warn">⚠️ Таны хөтөч дуу унших (Speech Synthesis) боломжгүй байна. Chrome, Edge, Safari ашиглана уу.</div>` : ""}
      ${picker()}
      <div class="row center">
        <label class="rate">Хурд <input type="range" id="rate" min="0.5" max="1.3" step="0.1" value="${Speech.rate}"><span id="rv">${Speech.rate}</span></label>
      </div>
      <div class="grid cards4">${modes.map((m) => `<button class="card mode" data-m="${m.id}"><h3>${m.t}</h3><p>${m.d}</p></button>`).join("")}</div>
      <div id="lz"></div>`;
    bindPicker(Pages.listening);
    const r = document.getElementById("rate");
    r.oninput = () => { Speech.rate = +r.value; document.getElementById("rv").textContent = r.value; };
    view().querySelectorAll(".mode").forEach((b) => (b.onclick = () => start(b.dataset.m)));
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
        onFinish: (score) => Progress.update((p) => { p.listening++; p.xp += score * 2; }),
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
      ${picker()}
      <div class="grid cards4">${Games.list.map((x) => `<a class="card mode ${x.id === id ? "on" : ""}" href="#/games/${x.id}"><div class="f-icon">${x.icon}</div><h3>${x.title}</h3><p>${x.desc}</p></a>`).join("")}</div>
      <div id="gz"></div>`;
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
      ${picker()}
      <div class="card center test-intro">
        <h3>${esc(c.short)} · ${esc(c.levelLabel(pick.level))} шалгалт</h3>
        <ul class="facts inline">
          <li>⏱ 10 минут</li><li>❓ 15 асуулт</li><li>✅ Тэнцэх: 60%</li>
        </ul>
        <p class="muted">Үгийн утга, орчуулга, ${c.lang === "zh" ? "пиньинь, " : ""}дүрэм, сонсгол хосолсон</p>
        <button class="btn big" id="start">Шалгалт эхлэх</button>
      </div>
      <div id="tz"></div>
      <h2 class="section-title">Миний дүнгийн түүх</h2>
      <div id="th">${testTable(p.tests.slice().reverse())}</div>`;
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
    let filter = "all", q = "", onlyFav = false;
    view().innerHTML = `
      ${pageHead("📖 Толь бичиг", `Хятад–Монгол–Англи · ${words.length} үг`)}
      <div class="dict-bar card">
        <input class="input big" id="dq" placeholder="Хайх: 茶, cha, tea, цай, hello..." autocomplete="off" />
        <div class="row">
          <div class="seg">
            <button class="on" data-f="all">Бүгд</button><button data-f="zh">Хятад</button><button data-f="en">Англи</button>
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
              ${speakBtn(w.term, w.lang)}
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
  Pages.profile = function () {
    const u = Auth.current(), p = Progress.get();
    view().innerHTML = `
      ${pageHead("👤 Миний профайл")}
      <div class="grid cards2">
        <div class="card">
          <h3>Хувийн мэдээлэл</h3>
          <p><b>Имэйл:</b> ${esc(u.email)}</p>
          <p><b>Бүртгүүлсэн:</b> ${new Date(u.created).toLocaleDateString("mn-MN")}</p>
          <form id="fn"><label>Нэр<input class="input" name="name" value="${esc(u.name)}" required /></label><button class="btn">Хадгалах</button></form>
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
            <li>⭐ XP: <b>${p.xp}</b></li>
            <li>📚 Цээжилсэн үг: <b>${Object.keys(p.learned).length}</b></li>
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
    document.getElementById("fn").onsubmit = (e) => {
      e.preventDefault();
      try { Auth.updateName(new FormData(e.target).get("name")); UI.toast("Хадгалагдлаа", "ok"); renderNav(); } catch (ex) { UI.toast(ex.message, "warn"); }
    };
    document.getElementById("fp").onsubmit = async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      try { await Auth.changePassword(fd.get("old"), fd.get("nw")); e.target.reset(); document.getElementById("perr").textContent = ""; UI.toast("Нууц үг солигдлоо", "ok"); }
      catch (ex) { document.getElementById("perr").textContent = ex.message; }
    };
    document.getElementById("reset").onclick = () => { if (confirm("Бүх ахиц, тестийн дүн устах болно. Итгэлтэй байна уу?")) { Progress.reset(); UI.toast("Ахиц тэглэгдлээ"); Pages.profile(); } };
    document.getElementById("del").onclick = () => { if (confirm("Бүртгэлээ бүрмөсөн устгах уу?")) { Auth.deleteAccount(); go("#/"); } };
  };

  Pages.notfound = function () {
    view().innerHTML = `<div class="card center"><h2>404</h2><p>Хуудас олдсонгүй.</p><a class="btn" href="#/">Нүүр хуудас</a></div>`;
  };

  /* ======================= ЧИГЛҮҮЛЭГЧ ======================= */
  const PUBLIC = ["", "home", "login", "register"];
  const Router = { after: null };
  function go(hash) { if (location.hash === hash) route(); else location.hash = hash; }

  function route() {
    const parts = location.hash.replace(/^#\/?/, "").split("/").filter(Boolean);
    const name = parts[0] || "home";
    const u = Auth.current();
    if (!PUBLIC.includes(name) && !u) {
      Router.after = location.hash;
      UI.toast("Хичээл үзэхийн тулд нэвтэрнэ үү.", "warn");
      location.replace("#/login");
      return;
    }
    if ((name === "login" || name === "register") && u) { location.replace("#/dashboard"); return; }
    if (window.speechSynthesis) speechSynthesis.cancel();
    const fn = Pages[name] || Pages.notfound;
    fn.apply(null, parts.slice(1));
    renderNav();
    window.scrollTo(0, 0);
    document.getElementById("nav-links").classList.remove("open");
  }

  function renderNav() {
    const u = Auth.current();
    const cur = (location.hash.replace(/^#\/?/, "").split("/")[0]) || "home";
    const links = [
      ["dashboard", "Самбар"], ["chinese", "Хятад хэл"], ["english", "Англи хэл"], ["listening", "Сонсгол"],
      ["games", "Тоглоом"], ["tests", "Тест"], ["dictionary", "Толь бичиг"]
    ];
    document.getElementById("nav-links").innerHTML = (u
      ? links.map(([h, t]) => `<a href="#/${h}" class="${cur === h ? "on" : ""}">${t}</a>`).join("") +
        `<a href="#/profile" class="user ${cur === "profile" ? "on" : ""}">👤 ${esc(u.name)}</a><button class="btn small ghost" id="logout">Гарах</button>`
      : `<a href="#/login" class="${cur === "login" ? "on" : ""}">Нэвтрэх</a><a href="#/register" class="btn small">Бүртгүүлэх</a>`);
    const lo = document.getElementById("logout");
    if (lo) lo.onclick = () => { Auth.logout(); UI.toast("Системээс гарлаа"); go("#/"); };
  }

  window.addEventListener("hashchange", route);
  document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("burger").onclick = () => document.getElementById("nav-links").classList.toggle("open");
    route();
  });
})();
