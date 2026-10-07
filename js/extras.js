/* Нэмэлт: мэргэжлийн үгс, сурах төлөвлөгөө, ижил/эсрэг/андуурагддаг үг, хэвлэх хуудас */
(function () {
  "use strict";
  const A = window.App;
  const { esc, UI, Progress, Quiz, getLevel, COURSES, shuffle } = A;
  const P = A.Pages;
  const view = () => document.getElementById("view");
  const H = (t, s) => A.pageHead(t, s);

  /* =====================================================================
     Ижил, эсрэг, андуурагддаг үг
     ===================================================================== */
  let MEAN = null;
  function meaningOf(lang, term) {
    if (!MEAN) {
      MEAN = { zh: {}, en: {} };
      A.allWords().forEach((w) => { if (!MEAN[w.lang][w.term] || (MEAN[w.lang][w.term].noMn && !w.noMn)) MEAN[w.lang][w.term] = w; });
      const T = window.TOPICS;
      if (T) {
        Object.values(T.zh || {}).flat().forEach((r) => { if (!MEAN.zh[r[0]]) MEAN.zh[r[0]] = { term: r[0], reading: r[1], meaning: r[2] }; });
        Object.values(T.en || {}).flat().forEach((r) => { if (!MEAN.en[r[0]]) MEAN.en[r[0]] = { term: r[0], reading: r[1], meaning: r[2] }; });
      }
    }
    return MEAN[lang][term] || null;
  }
  window.addEventListener("content-loaded", () => { MEAN = null; });
  const relOf = (lang, term) => (window.WORD_REL && window.WORD_REL[lang] && window.WORD_REL[lang][term]) || null;
  A.relBtn = (w) => (relOf(w.lang, w.term) ? `<button class="icon-btn rel-btn" data-rel="${esc(w.term)}" data-lang="${w.lang}" title="Ижил, эсрэг, андуурагддаг үг">🔗</button>` : "");
  A.openRel = function (term, lang) {
    const r = relOf(lang, term);
    if (!r) return;
    const self = meaningOf(lang, term) || { term, reading: "", meaning: "" };
    const chip = (t) => {
      const m = meaningOf(lang, t);
      return `<button class="rel-chip" data-rel="${esc(t)}" data-lang="${lang}"><b class="${lang}">${esc(t)}</b>${m ? `<small>${esc(m.reading || "")}</small><span>${esc(m.meaning)}</span>` : ""}</button>`;
    };
    const sec = (title, cls, html) => (html ? `<h4 class="rel-h ${cls}">${title}</h4><div class="rel-row">${html}</div>` : "");
    const m = document.createElement("div");
    m.className = "modal";
    m.innerHTML = `<div class="modal-bg"></div><div class="modal-box rel-box"><button class="modal-x">✕</button>
      <div class="rel-head"><span class="${lang} rel-term">${esc(term)}</span>${A.speakBtn(term, lang)}<div><div class="s-read">${esc(self.reading || "")}</div><div>${esc(self.meaning || "")}</div></div></div>
      ${sec("🟰 Ижил утгатай", "syn", (r.syn || []).map(chip).join(""))}
      ${sec("↔️ Эсрэг утгатай", "ant", (r.ant || []).map(chip).join(""))}
      ${r.conf && r.conf.length ? `<h4 class="rel-h conf">⚠️ Андуурагддаг</h4><div class="rel-conf">${r.conf.map((c) => `<div class="rc">${chip(c.w)}<p>${esc(c.n)}</p></div>`).join("")}</div>` : ""}
    </div>`;
    document.body.appendChild(m);
    const close = () => m.remove();
    m.querySelector(".modal-bg").onclick = close;
    m.querySelector(".modal-x").onclick = close;
    A.bindCommon(m);
    m.querySelectorAll(".rel-chip").forEach((b) => (b.onclick = () => {
      if (relOf(lang, b.dataset.rel)) { close(); A.openRel(b.dataset.rel, lang); }
      else A.Speech.speak(b.dataset.rel, lang);
    }));
  };
  document.addEventListener("click", (e) => {
    const b = e.target.closest(".rel-btn");
    if (b) { e.preventDefault(); A.openRel(b.dataset.rel, b.dataset.lang); }
  });

  /* =====================================================================
     Мэргэжлийн үгс (аялал, бизнес, эмнэлэг, худалдаа, IT)
     ===================================================================== */
  const TOPIC_META = [
    { id: "travel", icon: "✈️", t: "Аялал", d: "Нисэх буудал, зочид буудал, тасалбар, зам асуух" },
    { id: "business", icon: "💼", t: "Бизнес", d: "Уулзалт, гэрээ, оффис, хурал" },
    { id: "medical", icon: "🏥", t: "Эмнэлэг", d: "Шинж тэмдэг, эмч, эм, биеийн хэсэг" },
    { id: "trade", icon: "🛒", t: "Худалдаа", d: "Үнэ, наймаа, импорт, экспорт, тээвэр" },
    { id: "it", icon: "💻", t: "IT", d: "Компьютер, программ, интернэт, програмчлал" }
  ];
  function topicWords(lang, id) {
    const rows = (window.TOPICS && window.TOPICS[lang] && window.TOPICS[lang][id]) || [];
    return rows.map((r) => lang === "zh"
      ? { id: "tp:zh:" + r[0], lang, term: r[0], reading: r[1], meaning: r[2], gloss: "", example: r[3] ? r[3] + " — " + r[4] : "" }
      : { id: "tp:en:" + r[0], lang, term: r[0], reading: r[1], meaning: r[2], gloss: "", example: r[3] || "" });
  }
  P.topics = function (id, mode) {
    const lang = A.track();
    const open = A.hasAccess(lang);
    const t = TOPIC_META.find((x) => x.id === id);
    if (!t) {
      view().innerHTML = `${H("🧳 Мэргэжлийн үгс", lang === "zh" ? "Ажил, амьдралд хэрэгтэй хятад үг, хэллэгийн сэдэвчилсэн багц" : "Ажил, амьдралд хэрэгтэй англи үг, хэллэгийн сэдэвчилсэн багц")}
        <div class="grid cards3 topic-grid">${TOPIC_META.map((x) => `<a class="card topic-card" href="#/topics/${x.id}">
          <span class="tp-ic">${x.icon}</span><h3>${esc(x.t)}${open ? "" : " 🔒"}</h3><p class="muted">${esc(x.d)}</p>
          <span class="badge">${topicWords(lang, x.id).length || ((window.CONTENT_COUNTS || {}).topics || {})[lang]?.[x.id] || 60} үг</span></a>`).join("")}</div>`;
      return;
    }
    if (!open) { view().innerHTML = `<a class="back" href="#/topics">← Бүх сэдэв</a>` + A.paywall(`«${t.t}» сэдвийн үгс багцад багтана.`); return; }
    const ws = topicWords(lang, t.id);
    if (!ws.length) { view().innerHTML = `<a class="back" href="#/topics">← Бүх сэдэв</a><p class="muted center">Энэ сэдвийн үгс удахгүй нэмэгдэнэ.</p>`; return; }
    mode = mode || "list";
    view().innerHTML = `<a class="back" href="#/topics">← Бүх сэдэв</a>
      ${H(t.icon + " " + esc(t.t), esc(t.d) + ` · ${ws.length} үг`)}
      <div class="tabs">
        <a class="tab ${mode === "list" ? "on" : ""}" href="#/topics/${t.id}">📚 Жагсаалт</a>
        <a class="tab ${mode === "cards" ? "on" : ""}" href="#/topics/${t.id}/cards">🃏 Карт</a>
        <a class="tab ${mode === "quiz" ? "on" : ""}" href="#/topics/${t.id}/quiz">📝 Тест</a>
        <a class="tab" href="#/print?topic=${t.id}">🖨️ Хэвлэх</a>
      </div><div id="tpz"></div>`;
    const box = document.getElementById("tpz");
    if (mode === "list") {
      box.innerHTML = `<div class="table-wrap"><table class="table words"><thead><tr><th></th><th>Үг</th><th>${lang === "zh" ? "Пиньинь" : "Аймаг"}</th><th>Утга</th><th class="hide-sm">Жишээ</th></tr></thead><tbody>${ws.map((w) => `<tr>
        <td class="nowrap">${A.speakBtn(w.term, lang)}</td><td class="w-term ${lang}">${esc(w.term)}</td><td class="w-read">${esc(w.reading)}</td><td>${esc(w.meaning)}</td>
        <td class="hide-sm muted small">${w.example ? `${A.speakBtn(w.example.split(" — ")[0], lang)} ${esc(w.example)}` : ""}</td></tr>`).join("")}</tbody></table></div>`;
      A.bindCommon(box);
    } else if (mode === "cards") {
      let i = 0, flip = false;
      const order = shuffle(ws);
      const draw = () => {
        const w = order[i];
        box.innerHTML = `<div class="tp-card card ${flip ? "flip" : ""}" id="tpc">
            <div class="badge">${i + 1}/${order.length}</div>
            <div class="tp-term ${lang}">${esc(w.term)}</div>
            ${flip ? `<div class="s-read">${esc(w.reading)}</div><div class="tp-mean">${esc(w.meaning)}</div>${w.example ? `<p class="muted small">${esc(w.example)}</p>` : ""}` : `<p class="muted">Дарж эргүүлнэ</p>`}
          </div>
          <div class="row center"><button class="btn ghost" id="tpp">← Өмнөх</button>${A.speakBtn(w.term, lang)}<button class="btn" id="tpn">Дараах →</button></div>`;
        A.bindCommon(box);
        document.getElementById("tpc").onclick = () => { flip = !flip; draw(); };
        document.getElementById("tpp").onclick = () => { i = (i - 1 + order.length) % order.length; flip = false; draw(); };
        document.getElementById("tpn").onclick = () => { i = (i + 1) % order.length; flip = false; draw(); };
      };
      draw();
    } else {
      const pool = { own: ws, rest: [] };
      const qs = shuffle(ws).slice(0, 15).map((w, k) => (k % 2 ? Quiz.Gen.term(w, pool) : Quiz.Gen.meaning(w, pool)));
      Quiz.run(box, qs, {
        onRetry: () => P.topics(t.id, "quiz"),
        onFinish: (score) => Progress.update((p) => { p.xp += score * 2; A.bump(p, "tests"); })
      });
    }
  };

  /* =====================================================================
     Сурах төлөвлөгөө
     ===================================================================== */
  const DAY = 864e5;
  const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
  function planCalc(plan, p) {
    const c = COURSES[plan.course];
    const levels = c.data().levels;
    const upto = levels.slice(0, levels.indexOf(plan.level) + 1);
    const perLevel = upto.map((l) => {
      const ws = getLevel(plan.course, l).words;
      const total = getLevel(plan.course, l).total || ws.length;
      const done = ws.filter((w) => p.learned[w.id]).length;
      return { l, label: c.levelLabel(l), total, left: Math.max(0, total - done) };
    });
    const left = perLevel.reduce((n, x) => n + x.left, 0);
    const today = startOfDay(Date.now());
    const exam = startOfDay(plan.date);
    const daysAll = Math.max(0, Math.round((exam - today) / DAY));
    const review = Math.min(14, Math.floor(daysAll * 0.15)); // сүүлийн өдрүүдэд зөвхөн давтана
    const studyDays = Math.max(1, Math.floor((daysAll - review) * (plan.dpw / 7)));
    const daily = left ? Math.ceil(left / studyDays) : 0;
    // Түвшин бүр хэзээ дуусахыг тооцох
    let acc = 0;
    const milestones = perLevel.map((x) => {
      acc += x.left;
      const studyNeeded = daily ? Math.ceil(acc / daily) : 0;
      const calDays = Math.ceil(studyNeeded * (7 / plan.dpw));
      return Object.assign({}, x, { date: new Date(today.getTime() + calDays * DAY) });
    });
    return { daysAll, review, studyDays, daily, left, milestones, past: daysAll <= 0 };
  }
  A.planDaily = function (p) {
    if (!p.plan) return 0;
    const r = planCalc(p.plan, p);
    return r.past ? 0 : Math.min(200, r.daily);
  };
  A.planWidget = function (el) {
    if (!el) return;
    const p = Progress.get();
    if (!p.plan) { el.innerHTML = `<a class="card plan-cta" href="#/plan"><span>📅</span><div><b>Сурах төлөвлөгөө гаргах</b><small>Шалгалтын огноогоо оруулбал өдөр бүр хэдэн үг сурахыг тооцоолж өгнө</small></div><i>›</i></a>`; return; }
    const r = planCalc(p.plan, p);
    const d = (p.daily && p.daily[A.today()]) || {};
    const done = d.words || 0;
    const c = COURSES[p.plan.course];
    el.innerHTML = `<a class="card plan-mini" href="#/plan">
      <span class="pm-cal">📅<b>${r.daysAll}</b><small>өдөр</small></span>
      <div class="grow"><b>${esc(c.short)} ${esc(c.levelLabel(p.plan.level))} шалгалт хүртэл</b>
        <div class="mini-bar"><i style="width:${r.daily ? Math.min(100, (done / r.daily) * 100) : 100}%"></i></div>
        <small class="muted">Өнөөдөр: ${done}/${r.daily} шинэ үг · үлдсэн ${r.left} үг</small></div><i>›</i></a>`;
  };

  P.plan = function () {
    const p = Progress.get();
    const lang = A.track();
    const courses = Object.values(COURSES).filter((c) => c.lang === lang);
    const cur = p.plan && COURSES[p.plan.course] && COURSES[p.plan.course].lang === lang ? p.plan : null;
    const def = cur || { course: courses[0].id, level: courses[0].data().levels[Math.min(3, courses[0].data().levels.length - 1)], date: new Date(Date.now() + 90 * DAY).toISOString().slice(0, 10), dpw: 6 };
    view().innerHTML = `${H("📅 Сурах төлөвлөгөө", "Шалгалтын огноо, зорилтот түвшнээ сонговол өдөр бүр хэдэн үг сурахыг тооцоолно")}
      <div class="grid plan-layout">
        <form class="card" id="plf">
          <label>Шалгалт<select class="input" name="course">${courses.map((c) => `<option value="${c.id}" ${c.id === def.course ? "selected" : ""}>${esc(c.title)}</option>`).join("")}</select></label>
          <label>Зорилтот түвшин<select class="input" name="level" id="pll"></select></label>
          <label>Шалгалтын огноо<input class="input" type="date" name="date" value="${esc(def.date)}" min="${new Date(Date.now() + DAY).toISOString().slice(0, 10)}" required></label>
          <label>7 хоногт хэдэн өдөр сурах вэ?<select class="input" name="dpw">${[3, 4, 5, 6, 7].map((n) => `<option value="${n}" ${n === +def.dpw ? "selected" : ""}>${n} өдөр</option>`).join("")}</select></label>
          <div class="row"><button class="btn">💾 Төлөвлөгөө хадгалах</button>${cur ? `<button type="button" class="btn ghost" id="pldel">Устгах</button>` : ""}</div>
        </form>
        <div id="plr"></div>
      </div>`;
    const f = document.getElementById("plf");
    const fillLevels = () => {
      const c = COURSES[f.course.value];
      f.level.innerHTML = c.data().levels.map((l) => `<option value="${esc(l)}" ${l === def.level ? "selected" : ""}>${esc(c.levelLabel(l))}</option>`).join("");
    };
    const read = () => ({ course: f.course.value, level: f.level.value, date: f.date.value, dpw: +f.dpw.value });
    const draw = () => {
      const plan = read();
      const box = document.getElementById("plr");
      if (!plan.date) { box.innerHTML = ""; return; }
      const r = planCalc(plan, Progress.get());
      const c = COURSES[plan.course];
      if (r.past) { box.innerHTML = `<div class="card warn">Шалгалтын огноо өнгөрсөн эсвэл өнөөдөр байна. Ирээдүйн огноо сонгоно уу.</div>`; return; }
      const locked = r.milestones.some((m) => A.isLocked(plan.course, m.l));
      const late = r.milestones.length && r.milestones[r.milestones.length - 1].date > startOfDay(plan.date);
      const level = r.daily <= 15 ? ["😌 Хялбар", "pass"] : r.daily <= 35 ? ["💪 Дунд зэрэг", ""] : r.daily <= 60 ? ["🔥 Хүнд", "warn"] : ["⚠️ Маш хүнд", "fail"];
      box.innerHTML = `
        <div class="card plan-res">
          <div class="plan-big"><span>Өдөрт</span><b>${r.daily}</b><span>шинэ үг</span></div>
          <p class="center"><span class="pill ${level[1]}">${level[0]}</span></p>
          <div class="plan-facts">
            <div><b>${r.daysAll}</b><small>өдөр үлдсэн</small></div>
            <div><b>${r.studyDays}</b><small>сурах өдөр</small></div>
            <div><b>${r.left}</b><small>сурах үг</small></div>
            <div><b>${r.review}</b><small>давтлагын өдөр</small></div>
          </div>
          <p class="muted small">Өдөр бүр ${r.daily} шинэ үг цээжилж, флаш картаараа давтаарай. Шалгалтын өмнөх ${r.review} өдөр зөвхөн давтлага, жишиг шалгалт хийнэ.${r.daily > 60 ? " Хугацаа бага байна — огноогоо хойшлуулах эсвэл өдөрт олон удаа сурахыг зөвлөе." : ""}</p>
          ${locked ? `<p class="lock-note"><b>🔒 Анхаар</b><span>Зарим түвшин багцад багтана. Төлөвлөгөөгөө биелүүлэхийн тулд <a href="#/pricing">багц</a> хэрэгтэй.</span></p>` : ""}
        </div>
        <div class="card"><h3>🗓️ Түвшин бүрийн хуваарь</h3>
          <ol class="plan-tl">${r.milestones.map((m) => `<li class="${m.left ? "" : "done"}"><b>${esc(m.label)}</b><span>${m.left ? `${m.left}/${m.total} үг · ${m.date.toLocaleDateString("mn-MN")} гэхэд` : "✔ Дууссан"}</span></li>`).join("")}</ol>
          ${late ? `<p class="small fail-t">Энэ хурдаар шалгалтаас өмнө амжихгүй байна.</p>` : ""}
          <p class="muted small">Сонгосон зорилт: ${esc(c.short)} ${esc(c.levelLabel(plan.level))} · ${new Date(plan.date).toLocaleDateString("mn-MN")}</p>
        </div>`;
    };
    fillLevels();
    f.course.onchange = () => { fillLevels(); draw(); };
    f.oninput = draw;
    f.onsubmit = (e) => {
      e.preventDefault();
      const plan = Object.assign(read(), { created: Date.now() });
      Progress.update((pp) => { pp.plan = plan; });
      UI.toast("📅 Төлөвлөгөө хадгалагдлаа. Өдрийн даалгавар үүнд тохирно.", "ok");
      P.plan();
    };
    const del = document.getElementById("pldel");
    if (del) del.onclick = () => { Progress.update((pp) => { delete pp.plan; }); UI.toast("Төлөвлөгөө устлаа"); P.plan(); };
    draw();
  };

  /* =====================================================================
     Хэвлэх хуудас (хүснэгт, карт, шалгах хуудас → PDF)
     ===================================================================== */
  P.print = function () {
    const lang = A.track();
    const q = A.query || {};
    const opt = { src: q.topic ? "topic:" + q.topic : "level", fmt: "table", py: true, mn: true, ex: false, size: "m" };
    const sources = () => {
      const tp = A.hasAccess(lang) ? TOPIC_META.map((t) => `<option value="topic:${t.id}" ${opt.src === "topic:" + t.id ? "selected" : ""}>${t.icon} ${t.t}</option>`).join("") : "";
      return `<option value="level" ${opt.src === "level" ? "selected" : ""}>📚 Сонгосон түвшин</option><option value="fav" ${opt.src === "fav" ? "selected" : ""}>★ Миний хадгалсан үгс</option>${tp ? `<optgroup label="Мэргэжлийн үгс">${tp}</optgroup>` : ""}`;
    };
    view().innerHTML = `${H("🖨️ Хэвлэх", "Үгсээ хүснэгт, карт эсвэл шалгах хуудас болгон хэвлэх буюу PDF-ээр хадгалах")}
      <div class="split no-print"><aside class="lvl-side">${A.picker()}</aside><section class="split-main">
        <div class="card print-opts">
          <label>Эх сурвалж<select class="input" id="psrc">${sources()}</select></label>
          <div class="seg" id="pfmt"><button data-f="table" class="on">📋 Хүснэгт</button><button data-f="cards">🃏 Карт (хайчлах)</button><button data-f="test">📝 Шалгах хуудас</button></div>
          <div class="row wrap">
            ${lang === "zh" ? `<label class="check"><input type="checkbox" id="ppy" checked> Пиньинь</label>` : ""}
            <label class="check"><input type="checkbox" id="pmn" checked> Утга</label>
            <label class="check"><input type="checkbox" id="pex"> Жишээ</label>
            <label class="check">Хэмжээ <select class="input tiny" id="psz"><option value="s">Жижиг</option><option value="m" selected>Дунд</option><option value="l">Том</option></select></label>
          </div>
          <div class="row"><button class="btn big" id="pgo">🖨️ Хэвлэх / PDF хадгалах</button><span class="muted small" id="pcnt"></span></div>
          <p class="muted small">PDF болгохын тулд хэвлэх цонхонд «Save as PDF / PDF хэлбэрээр хадгалах»-ыг сонгоно уу. Карт хэвлэхэд хуудас бүрийн ард утгыг нь хэвлэхийн тулд «2 талд хэвлэх (flip on long edge)» тохиргоог ашиглана.</p>
        </div>
      </section></div>
      <div id="print-area" class="print-area"></div>`;
    A.bindPicker(P.print);
    const words = () => {
      if (opt.src === "fav") { const p = Progress.get(); return p.favorites.map((id) => A.wordById(id)).filter((w) => w && w.lang === lang); }
      if (opt.src.startsWith("topic:")) return topicWords(lang, opt.src.slice(6));
      return getLevel(A.pick.course, A.pick.level).words;
    };
    const title = () => {
      if (opt.src === "fav") return "★ Миний үгс";
      if (opt.src.startsWith("topic:")) { const t = TOPIC_META.find((x) => "topic:" + x.id === opt.src); return t ? t.t : ""; }
      const L = getLevel(A.pick.course, A.pick.level);
      return `${L.course.short} · ${L.label}`;
    };
    function draw() {
      const ws = words();
      const area = document.getElementById("print-area");
      document.getElementById("pcnt").textContent = ws.length + " үг";
      const date = new Date().toISOString().slice(0, 10).replace(/-/g, ".");
      const head = `<div class="pr-brand">
          <img src="img/logo.png" alt="">
          <div class="pr-bn"><b>ХИЧЭЭЛ</b><span>Хятад · Англи хэл сурах платформ</span></div>
          <div class="pr-meta"><b>${esc(title())}</b><span>${ws.length} үг · ${date}</span></div>
        </div><div class="pr-rule"></div>`;
      const wm = `<img class="pr-wm" src="img/logo.png" alt="" aria-hidden="true">`;
      const foot = wm + `<div class="pr-foot"><span><img src="img/logo.png" alt=""> Хичээл · ${esc(location.host)}</span><span>${date}</span></div>`;
      area.className = `print-area sz-${opt.size}`;
      if (!ws.length) { area.innerHTML = `<p class="muted center">Үг алга.</p>`; return; }
      if (opt.fmt === "table" || opt.fmt === "test") {
        const test = opt.fmt === "test";
        area.innerHTML = foot + head + `<table class="pr-table"><thead><tr><th>#</th><th>Үг</th>${lang === "zh" && opt.py ? "<th>Пиньинь</th>" : ""}<th>${test ? "Утгыг бичнэ үү" : "Утга"}</th>${opt.ex && !test ? "<th>Жишээ</th>" : ""}</tr></thead><tbody>${ws.map((w, i) => `<tr>
          <td>${i + 1}</td><td class="pr-term ${lang}">${esc(w.term)}</td>${lang === "zh" && opt.py ? `<td>${test ? "" : esc(w.reading)}</td>` : ""}
          <td>${test ? "" : opt.mn ? esc(w.meaning) : ""}</td>${opt.ex && !test ? `<td class="pr-ex">${esc(w.example || w.gloss || "")}</td>` : ""}</tr>`).join("")}</tbody></table>
          ${test ? `<div class="pr-break"></div><div class="pr-brand small"><img src="img/logo.png" alt=""><div class="pr-bn"><b>ХИЧЭЭЛ</b><span>Хариу</span></div><div class="pr-meta"><b>${esc(title())}</b></div></div><div class="pr-rule"></div><ol class="pr-key">${ws.map((w) => `<li><b class="${lang}">${esc(w.term)}</b> ${lang === "zh" ? esc(w.reading) + " · " : ""}${esc(w.meaning)}</li>`).join("")}</ol>` : ""}`;
      } else {
        // Хуудас бүр 12 карт: нүүр тал (үг), ар тал (утга) толин тусгал байрлалаар
        const per = 12, pages = [];
        for (let i = 0; i < ws.length; i += per) pages.push(ws.slice(i, i + per));
        area.innerHTML = foot + pages.map((pg) => {
          const front = pg.map((w) => `<div class="pc"><span class="pc-t ${lang}">${esc(w.term)}</span></div>`).join("") + "<div class='pc empty'></div>".repeat(per - pg.length);
          const rows = [];
          for (let r = 0; r < per / 3; r++) rows.push(pg.slice(r * 3, r * 3 + 3).concat(new Array(3).fill(null)).slice(0, 3).reverse());
          const back = rows.flat().map((w) => (w ? `<div class="pc back">${lang === "zh" && opt.py ? `<span class="pc-r">${esc(w.reading)}</span>` : lang === "en" ? `<span class="pc-r">${esc(w.reading)}</span>` : ""}${opt.mn ? `<span class="pc-m">${esc(w.meaning)}</span>` : ""}${opt.ex && w.example ? `<span class="pc-e">${esc(w.example)}</span>` : ""}</div>` : "<div class='pc empty'></div>")).join("");
          return `<div class="pc-page">${front}</div><div class="pc-page">${back}</div>`;
        }).join("");
      }
    }
    document.getElementById("psrc").onchange = (e) => { opt.src = e.target.value; draw(); };
    document.querySelectorAll("#pfmt button").forEach((b) => (b.onclick = () => { document.querySelectorAll("#pfmt button").forEach((x) => x.classList.toggle("on", x === b)); opt.fmt = b.dataset.f; draw(); }));
    const ck = (id, k) => { const el = document.getElementById(id); if (el) el.onchange = () => { opt[k] = el.checked; draw(); }; };
    ck("ppy", "py"); ck("pmn", "mn"); ck("pex", "ex");
    document.getElementById("psz").onchange = (e) => { opt.size = e.target.value; draw(); };
    document.getElementById("pgo").onclick = () => window.print();
    draw();
  };
})();

/* Богино өгүүллэг ба монгол соёлын хичээл: үг дээр дарахад утга гарна */
(function () {
  "use strict";
  const A = window.App;
  const { esc, UI, Progress, Quiz, Speech } = A;
  const P = A.Pages;
  const view = () => document.getElementById("view");
  const H = (t, s) => A.pageHead(t, s);
  const ZH_TIER_LBL = { 1: "HSK 1", 2: "HSK 2", 3: "HSK 3", 4: "HSK 4", 5: "HSK 5", 6: "HSK 6" };

  // Токенуудаас текст ба уншигчийн HTML
  const plain = (tokens) => tokens.map((t) => (Array.isArray(t) ? t[0] : t)).join("");
  function readerHtml(tokens, lang, showPy) {
    return tokens.map((t, k) => {
      if (!Array.isArray(t)) return t === "\n" ? "<br>" : esc(t);
      const [w, a, b] = t;
      const read = lang === "zh" ? a : "";
      const mean = lang === "zh" ? b : a;
      return lang === "zh" && showPy
        ? `<ruby class="tk" data-k="${k}">${esc(w)}<rt>${esc(read)}</rt></ruby>`
        : `<span class="tk" data-k="${k}">${esc(w)}</span>`;
    }).join("");
  }
  function bindReader(box, tokens, lang) {
    let pop = null;
    box.addEventListener("click", (e) => {
      const el = e.target.closest(".tk");
      if (pop) { pop.remove(); pop = null; }
      box.querySelectorAll(".tk.on").forEach((x) => x.classList.remove("on"));
      if (!el) return;
      const t = tokens[+el.dataset.k];
      const w = t[0], read = lang === "zh" ? t[1] : "", mean = lang === "zh" ? t[2] : t[1];
      el.classList.add("on");
      pop = document.createElement("div");
      pop.className = "tk-pop card";
      pop.innerHTML = `<div class="tk-w ${lang}">${esc(w)}</div>${read ? `<div class="s-read">${esc(read)}</div>` : ""}<div class="tk-m">${esc(mean)}</div><button class="icon-btn" data-say>🔊</button>`;
      box.appendChild(pop);
      const r = el.getBoundingClientRect(), br = box.getBoundingClientRect();
      pop.style.left = Math.max(0, Math.min(br.width - 200, r.left - br.left + r.width / 2 - 100)) + "px";
      pop.style.top = (r.bottom - br.top + 6) + "px";
      pop.querySelector("[data-say]").onclick = (ev) => { ev.stopPropagation(); Speech.speak(w, lang); };
      Speech.speak(w, lang);
    });
  }
  function readerBlock(tokens, lang, mn, id) {
    const box = document.getElementById(id);
    let showPy = false, showMn = false;
    const draw = () => {
      box.innerHTML = `<div class="rd-tools">
          <button class="btn small" data-a="read">🔊 Бүгдийг сонсох</button><button class="btn ghost small" data-a="stop">■</button>
          ${lang === "zh" ? `<label class="check"><input type="checkbox" data-a="py" ${showPy ? "checked" : ""}> Пиньинь</label>` : ""}
          <label class="check"><input type="checkbox" data-a="mn" ${showMn ? "checked" : ""}> Орчуулга</label>
          <span class="muted small">💡 Үг дээр дарвал утга нь гарна</span></div>
        <div class="rd-text ${lang}">${readerHtml(tokens, lang, showPy)}</div>
        ${showMn ? `<div class="rd-mn">${esc(mn)}</div>` : ""}`;
      box.querySelector('[data-a="read"]').onclick = () => Speech.speak(plain(tokens), lang, 0.85);
      box.querySelector('[data-a="stop"]').onclick = () => window.speechSynthesis && speechSynthesis.cancel();
      const py = box.querySelector('[data-a="py"]'); if (py) py.onchange = () => { showPy = py.checked; draw(); };
      box.querySelector('[data-a="mn"]').onchange = (e) => { showMn = e.target.checked; draw(); };
    };
    draw();
    bindReader(box, tokens, lang);
  }
  function quizBlock(id, questions, xp, retry) {
    const qs = questions.map((q) => Object.assign(Quiz.Gen.grammar(q), { type: "Ойлголт" }));
    Quiz.run(document.getElementById(id), qs, { onRetry: retry, onFinish: (sc) => Progress.update((p) => { p.xp += sc * xp; p.reading = (p.reading || 0) + 1; A.bump(p, "reading"); }) });
  }

  /* ---------- Өгүүллэг ---------- */
  const storyOpen = (s) => A.hasAccess(s.tier ? "zh" : "en") || s.tier === 1 || s.level === "A1";
  P.stories = function (id) {
    const lang = A.track();
    const list = (window.STORIES && window.STORIES[lang]) || [];
    const s = list.find((x) => x.id === id);
    if (!s) {
      const groups = {};
      list.forEach((x) => { const g = lang === "zh" ? ZH_TIER_LBL[x.tier] : x.level; (groups[g] = groups[g] || []).push(x); });
      view().innerHTML = `${H("📖 Богино өгүүллэг", "Түвшиндээ тохирсон өгүүллэг уншаад үг дээр дарж утгыг нь хараарай")}
        ${Object.keys(groups).length ? Object.entries(groups).map(([g, arr]) => `<h2 class="section-title">${esc(g)}</h2><div class="grid cards3">${arr.map((x) => `
          <a class="card level-card story-card" href="#/stories/${esc(x.id)}"><span class="badge">${storyOpen(x) ? "" : "🔒 "}${esc(g)}</span><h3 class="${lang}">${esc(x.title)}</h3><p class="muted">${esc(x.title_mn)}</p></a>`).join("")}</div>`).join("") : `<p class="muted">Өгүүллэг удахгүй нэмэгдэнэ.</p>`}`;
      return;
    }
    if (!storyOpen(s) || !s.tokens) { view().innerHTML = `<a class="back" href="#/stories">← Бүх өгүүллэг</a>` + A.paywall("Энэ өгүүллэг багцад багтана."); return; }
    view().innerHTML = `<a class="back" href="#/stories">← Бүх өгүүллэг</a>
      ${H(`<span class="${lang}">${esc(s.title)}</span>`, `${esc(s.title_mn)} · ${lang === "zh" ? ZH_TIER_LBL[s.tier] : s.level}`)}
      <article class="card passage story-read" id="rd"></article>
      <h2 class="section-title">Ойлголтын асуулт</h2><div id="sq"></div>`;
    readerBlock(s.tokens, lang, s.mn, "rd");
    quizBlock("sq", s.questions, 4, () => P.stories(id));
  };

  /* ---------- Монгол соёл ---------- */
  P.culture = function (id) {
    const lang = A.track();
    const list = window.CULTURE || [];
    const c = list.find((x) => x.id === id);
    const open = A.hasAccess(lang);
    if (!c) {
      view().innerHTML = `${H("🇲🇳 Монгол соёл", lang === "zh" ? "Монголынхоо тухай хятадаар ярьж сураарай" : "Монголынхоо тухай англиар ярьж сураарай")}
        <div class="grid cards3">${list.map((x) => `<a class="card level-card culture-card" href="#/culture/${esc(x.id)}"><span class="cu-ic">${x.icon}</span>
          <h3>${esc(x.title_mn)}${open ? "" : " 🔒"}</h3><p class="${lang}">${esc((x[lang] && x[lang].title) || "")}</p><p class="muted small">${esc(x.desc_mn || "")}</p></a>`).join("")}</div>`;
      return;
    }
    const L = c[lang];
    if (!open || !L || !L.tokens) { view().innerHTML = `<a class="back" href="#/culture">← Монгол соёл</a>` + A.paywall(`«${c.title_mn}» хичээл багцад багтана.`); return; }
    view().innerHTML = `<a class="back" href="#/culture">← Монгол соёл</a>
      ${H(`${c.icon} ${esc(c.title_mn)} · <span class="${lang}">${esc(L.title)}</span>`, esc(c.desc_mn || ""))}
      <article class="card passage" id="rd"></article>
      <div class="grid cards2">
        <div class="card"><h3>📚 Гол үгс</h3><div class="cu-vocab">${L.vocab.map((v) => `<div class="cu-v">${A.speakBtn(v[0], lang)}<b class="${lang}">${esc(v[0])}</b><span class="s-read">${esc(lang === "zh" ? v[1] : v[1])}</span><span>${esc(v[2])}</span></div>`).join("")}</div></div>
        <div class="card"><h3>💬 Хэрэгтэй хэллэг</h3>${L.phrases.map((ph) => `<div class="cu-ph">${A.speakBtn(ph[0], lang)}<div><div class="${lang}">${esc(ph[0])}</div>${lang === "zh" ? `<div class="s-read">${esc(ph[1])}</div>` : ""}<div class="muted small">${esc(lang === "zh" ? ph[2] : ph[1])}</div></div></div>`).join("")}</div>
      </div>
      <h2 class="section-title">Ойлголтын асуулт</h2><div id="cq"></div>`;
    A.bindCommon(view());
    readerBlock(L.tokens, lang, L.mn, "rd");
    quizBlock("cq", L.questions, 5, () => P.culture(id));
  };
})();
