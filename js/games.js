/* Тоглоомууд: картаар цээжлэх, хос тааруулах, хурдны сорил, өгүүлбэр байгуулах */
(function () {
  "use strict";
  const { esc, shuffle, sample, getLevel, Progress, Speech, UI, Quiz } = window.App;

  const Games = {
    list: [
      { id: "flash", icon: "🃏", title: "Картаар цээжлэх", desc: "Картыг эргүүлж үгийн утгыг шалга, мэдсэн үгээ тэмдэглэ." },
      { id: "match", icon: "🧩", title: "Хос тааруулах", desc: "Үгийг утгатай нь аль болох хурдан хослуул." },
      { id: "speed", icon: "⚡", title: "Хурдны сорил", desc: "60 секундэд аль болох олон асуултад зөв хариул." },
      { id: "build", icon: "🧱", title: "Өгүүлбэр байгуулах", desc: "Холилдсон үгсийг зөв дараалалд оруул." },
      { id: "tone", icon: "🎵", title: "Аялгуу таах", desc: "Хятад үгийн зөв аялгуутай пиньинийг сонго.", lang: "zh" },
      { id: "spell", icon: "🔤", title: "Үг угсрах", desc: "Үсгүүдийг зөв дараалалд оруулж англи үг бүтээ.", lang: "en" },
      { id: "numbers", icon: "🔢", title: "Тоо", desc: "Тоог үгээр, үгийг тоогоор таниж сур." },
      { id: "speak", icon: "🎤", title: "Дуудлага шалгах", desc: "Үгийг чангаар хэлж, хөтөч таны дуудлагыг шалгана." }
    ],
    run(id, el, courseId, level) {
      const L = getLevel(courseId, level);
      ({ flash, match, speed, build, tone, spell, numbers, speak })[id](el, L);
    }
  };

  // Нийтлэг: олон сонголттой тойргийн тоглоом
  function rounds(el, items, makeQ, opts) {
    let i = 0, score = 0;
    function render() {
      if (i >= items.length) {
        Progress.update((p) => { p.games++; window.App.bump(p, "games"); p.xp += score * 2; });
        el.innerHTML = `<div class="card center"><h3>Дууслаа!</h3><div class="result-score pass">${score}/${items.length}</div><p class="muted">+${score * 2} XP</p><button class="btn" id="again">Дахин тоглох</button></div>`;
        el.querySelector("#again").onclick = opts.restart;
        return;
      }
      const q = makeQ(items[i]);
      el.innerHTML = `
        <div class="quiz card">
          <div class="quiz-top"><span class="badge">${i + 1} / ${items.length}</span><span>Оноо: <b>${score}</b></span></div>
          <div class="quiz-prompt">${q.prompt}</div>
          ${q.say ? `<div class="row center"><button class="btn audio" id="say">🔊 Сонсох</button></div>` : ""}
          <div class="options">${q.options.map((o, k) => `<button class="opt ${q.optClass || ""}" data-k="${k}">${esc(o)}</button>`).join("")}</div>
          <div class="feedback" id="fb"></div>
        </div>`;
      if (q.say) el.querySelector("#say").onclick = () => Speech.speak(q.say.text, q.say.lang);
      el.querySelectorAll(".opt").forEach((b) => (b.onclick = () => {
        const ok = +b.dataset.k === q.answer;
        if (ok) score++;
        el.querySelectorAll(".opt").forEach((x) => (x.disabled = true));
        el.querySelectorAll(".opt")[q.answer].classList.add("correct");
        if (!ok) b.classList.add("wrong");
        if (q.say) Speech.speak(q.say.text, q.say.lang);
        const fb = el.querySelector("#fb");
        fb.className = "feedback " + (ok ? "ok" : "bad");
        fb.innerHTML = `${ok ? "✔ Зөв!" : "✘ Зөв хариулт: <b>" + esc(q.options[q.answer]) + "</b>"}${q.reveal ? `<div class="reveal">${q.reveal}</div>` : ""}<button class="btn" id="nx">Дараагийн →</button>`;
        fb.querySelector("#nx").onclick = () => { i++; render(); };
      }));
    }
    render();
  }
  const needLang = (el, lang) => {
    el.innerHTML = `<div class="card center"><p>Энэ тоглоом зөвхөн <b>${lang === "zh" ? "хятад хэл (HSK)" : "англи хэл (IELTS)"}</b> хичээлд зориулагдсан. Дээрээс хичээлээ сольж сонгоно уу.</p></div>`;
  };

  /* ---------- Аялгуу таах ---------- */
  const TONES = { a: "āáǎà", e: "ēéěè", i: "īíǐì", o: "ōóǒò", u: "ūúǔù", "ü": "ǖǘǚǜ" };
  const TONE_OF = {};
  Object.keys(TONES).forEach((v) => Array.from(TONES[v]).forEach((c, k) => (TONE_OF[c] = [v, k])));
  function toneVariants(py) {
    const chars = Array.from(py);
    const pos = chars.map((c, k) => (TONE_OF[c] ? k : -1)).filter((k) => k >= 0);
    const out = new Set([py]);
    let guard = 0;
    while (out.size < 4 && pos.length && guard++ < 60) {
      const v = chars.slice();
      const k = pos[Math.floor(Math.random() * pos.length)];
      const [base, t] = TONE_OF[v[k]];
      let nt = Math.floor(Math.random() * 4);
      if (nt === t) nt = (nt + 1) % 4;
      v[k] = TONES[base][nt];
      out.add(v.join(""));
    }
    return Array.from(out);
  }
  function tone(el, L) {
    if (L.course.lang !== "zh") return needLang(el, "zh");
    const items = sample(L.words.filter((w) => toneVariants(w.reading).length >= 3), 10);
    rounds(el, items, (w) => {
      const opts = shuffle(toneVariants(w.reading));
      return { prompt: `<div class="q-term zh">${esc(w.term)}</div><p>Зөв аялгуутай пиньинийг сонгоно уу.</p>`, options: opts, answer: opts.indexOf(w.reading), say: { text: w.term, lang: "zh" }, reveal: esc(w.meaning) };
    }, { restart: () => tone(el, L) });
  }

  /* ---------- Үг угсрах (англи) ---------- */
  function spell(el, L) {
    if (L.course.lang !== "en") return needLang(el, "en");
    const list = sample(L.words.filter((w) => /^[a-z]+$/i.test(w.term)), 8);
    let i = 0, score = 0;
    function render() {
      if (i >= list.length) {
        Progress.update((p) => { p.games++; window.App.bump(p, "games"); p.xp += score * 2; });
        el.innerHTML = `<div class="card center"><h3>Дууслаа!</h3><div class="result-score pass">${score}/${list.length}</div><button class="btn" id="again">Дахин тоглох</button></div>`;
        el.querySelector("#again").onclick = () => spell(el, L);
        return;
      }
      const w = list[i];
      const letters = Array.from(w.term.toLowerCase());
      let pieces = shuffle(letters.map((t, k) => ({ t, k })));
      if (pieces.every((p, k) => p.k === k)) pieces.reverse();
      const chosen = [];
      let hinted = false;
      el.innerHTML = `
        <div class="quiz card">
          <div class="quiz-top"><span class="badge">${i + 1} / ${list.length}</span><span>Оноо: <b>${score}</b></span></div>
          <p class="center big-mean">${esc(w.meaning)} <span class="muted">(${esc(w.reading)})</span></p>
          <div class="build-answer letters" id="ans"></div>
          <div class="build-pieces letters" id="pcs"></div>
          <div class="row center">
            <button class="btn ghost" id="clr">Арилгах</button>
            <button class="btn audio" id="say">🔊 Сонсох</button>
            <button class="btn ghost" id="hint">💡 Эхний үсэг</button>
            <button class="btn" id="chk">Шалгах</button>
          </div>
          <div class="feedback" id="fb"></div>
        </div>`;
      const ans = el.querySelector("#ans"), pcs = el.querySelector("#pcs");
      function draw() {
        ans.innerHTML = chosen.map((p, k) => `<button class="chip on" data-k="${k}">${esc(p.t)}</button>`).join("") || `<span class="muted">Үсгүүдийг дарж сонгоно уу</span>`;
        pcs.innerHTML = pieces.map((p, k) => `<button class="chip" data-k="${k}">${esc(p.t)}</button>`).join("");
        ans.querySelectorAll(".chip").forEach((b) => (b.onclick = () => { pieces.push(chosen.splice(+b.dataset.k, 1)[0]); draw(); }));
        pcs.querySelectorAll(".chip").forEach((b) => (b.onclick = () => { chosen.push(pieces.splice(+b.dataset.k, 1)[0]); draw(); }));
      }
      draw();
      el.querySelector("#clr").onclick = () => { pieces = pieces.concat(chosen.splice(0)); draw(); };
      el.querySelector("#say").onclick = () => Speech.speak(w.term, "en");
      el.querySelector("#hint").onclick = () => {
        if (hinted) return;
        hinted = true;
        pieces = pieces.concat(chosen.splice(0));
        const k = pieces.findIndex((p) => p.t === letters[0]);
        chosen.push(pieces.splice(k, 1)[0]);
        draw();
      };
      el.querySelector("#chk").onclick = () => {
        if (pieces.length) return UI.toast("Бүх үсгийг ашиглана уу.", "warn");
        const ok = chosen.map((p) => p.t).join("") === letters.join("");
        if (ok) score++;
        const fb = el.querySelector("#fb");
        fb.className = "feedback " + (ok ? "ok" : "bad");
        fb.innerHTML = `${ok ? "✔ Зөв!" : "✘ Зөв хариулт:"} <div class="reveal">${esc(w.term)}</div><div class="muted">${esc(w.example)}</div><button class="btn" id="nx">Дараагийн →</button>`;
        el.querySelector("#chk").disabled = true;
        fb.querySelector("#nx").onclick = () => { i++; render(); };
        Speech.speak(w.term, "en");
      };
    }
    render();
  }

  /* ---------- Тоо ---------- */
  const ZH_D = "零一二三四五六七八九";
  function zhNum(n) {
    if (n === 0) return "零";
    const units = ["", "十", "百", "千"];
    const ds = String(n).split("").map(Number);
    let out = "", zero = false;
    ds.forEach((d, k) => {
      const u = units[ds.length - 1 - k];
      if (d === 0) { zero = true; return; }
      if (zero && out) out += "零";
      zero = false;
      out += ZH_D[d] + u;
    });
    if (out.startsWith("一十")) out = out.slice(1); // 十二, 十五
    return out;
  }
  const EN_1 = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
  const EN_10 = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
  function enNum(n) {
    if (n < 20) return EN_1[n];
    if (n < 100) return EN_10[Math.floor(n / 10)] + (n % 10 ? "-" + EN_1[n % 10] : "");
    if (n < 1000) return EN_1[Math.floor(n / 100)] + " hundred" + (n % 100 ? " and " + enNum(n % 100) : "");
    return enNum(Math.floor(n / 1000)) + " thousand" + (n % 1000 ? (n % 1000 < 100 ? " and " : " ") + enNum(n % 1000) : "");
  }
  function numbers(el, L) {
    const lang = L.course.lang;
    const tier = Math.min(4, (L.course.data().levels.indexOf(L.level) + 1));
    const max = [0, 20, 100, 1000, 9999][tier];
    const toWord = lang === "zh" ? zhNum : enNum;
    const nums = Array.from({ length: 10 }, () => Math.floor(Math.random() * max) + 1);
    rounds(el, nums, (n) => {
      const set = new Set([n]);
      while (set.size < 4) {
        const d = n + (Math.floor(Math.random() * 21) - 10) * (max > 100 ? Math.ceil(Math.random() * 10) : 1);
        if (d > 0 && d !== n) set.add(d);
      }
      const opts = shuffle(Array.from(set));
      const reverse = Math.random() < 0.5;
      return reverse
        ? { prompt: `<div class="q-term ${lang}">${esc(toWord(n))}</div><p>Энэ ямар тоо вэ?</p>`, options: opts.map(String), answer: opts.indexOf(n), say: { text: toWord(n), lang } }
        : { prompt: `<div class="q-term">${n}</div><p>${lang === "zh" ? "Хятадаар" : "Англиар"} зөв бичсэнийг сонго.</p>`, options: opts.map(toWord), answer: opts.indexOf(n), optClass: lang, say: { text: toWord(n), lang } };
    }, { restart: () => numbers(el, L) });
  }

  /* ---------- Дуудлага шалгах (SpeechRecognition) ---------- */
  function speak(el, L) {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      el.innerHTML = `<div class="card center warn">⚠️ Таны хөтөч яриа таних боломжгүй. Chrome эсвэл Edge хөтөч ашиглана уу.</div>`;
      return;
    }
    const lang = L.course.lang;
    const list = sample(L.words, 8);
    let i = 0, score = 0;
    const norm = (t) => lang === "zh" ? String(t).replace(/[^一-鿿]/g, "") : String(t).toLowerCase().replace(/[^a-z' ]/g, "").trim();
    function render() {
      if (i >= list.length) {
        Progress.update((p) => { p.games++; window.App.bump(p, "games"); p.xp += score * 3; });
        el.innerHTML = `<div class="card center"><h3>Дууслаа!</h3><div class="result-score pass">${score}/${list.length}</div><button class="btn" id="again">Дахин тоглох</button></div>`;
        el.querySelector("#again").onclick = () => speak(el, L);
        return;
      }
      const w = list[i];
      el.innerHTML = `
        <div class="quiz card center">
          <div class="quiz-top"><span class="badge">${i + 1} / ${list.length}</span><span>Оноо: <b>${score}</b></span></div>
          <div class="q-term ${lang}">${esc(w.term)}</div>
          <div class="q-sub">${esc(w.reading)} · ${esc(w.meaning)}</div>
          <div class="row center">
            <button class="btn audio" id="say">🔊 Жишээ сонсох</button>
            <button class="btn mic" id="rec">🎤 Хэлэх</button>
            <button class="btn ghost" id="skip">Алгасах →</button>
          </div>
          <div class="feedback" id="fb"></div>
        </div>`;
      el.querySelector("#say").onclick = () => Speech.speak(w.term, lang);
      el.querySelector("#skip").onclick = () => { i++; render(); };
      el.querySelector("#rec").onclick = () => {
        const r = new SR();
        r.lang = lang === "zh" ? "zh-CN" : "en-GB";
        r.maxAlternatives = 5;
        const btn = el.querySelector("#rec"), fb = el.querySelector("#fb");
        btn.disabled = true; btn.textContent = "👂 Сонсож байна...";
        r.onresult = (e) => {
          const alts = Array.from(e.results[0]).map((a) => a.transcript);
          const ok = alts.some((a) => norm(a) === norm(w.term) || norm(a).includes(norm(w.term)));
          if (ok) score++;
          fb.className = "feedback " + (ok ? "ok" : "bad");
          fb.innerHTML = `${ok ? "✔ Маш сайн дуудлага!" : "✘ Дахин оролдоорой."}<div class="muted">Таны хэлсэн: «${esc(alts[0] || "")}»</div><button class="btn" id="nx">Дараагийн →</button>`;
          fb.querySelector("#nx").onclick = () => { i++; render(); };
        };
        r.onerror = (e) => { fb.className = "feedback bad"; fb.textContent = e.error === "not-allowed" ? "Микрофоны зөвшөөрөл өгнө үү." : "Сонсож чадсангүй. Дахин оролдоно уу."; };
        r.onend = () => { btn.disabled = false; btn.textContent = "🎤 Дахин хэлэх"; };
        r.start();
      };
    }
    render();
  }

  /* ---------- Картаар цээжлэх ---------- */
  function flash(el, L) {
    let cards = shuffle(L.words), i = 0, flipped = false;
    function render() {
      const w = cards[i];
      const learned = !!Progress.get().learned[w.id];
      el.innerHTML = `
        <div class="flash-wrap">
          <div class="muted center">${i + 1} / ${cards.length}</div>
          <div class="flashcard ${flipped ? "flipped" : ""}" id="fc" tabindex="0">
            <div class="face front"><div class="fc-term ${w.lang}">${esc(w.term)}</div><div class="muted">Дарж эргүүлнэ үү</div></div>
            <div class="face back">
              <div class="fc-reading">${esc(w.reading)}</div>
              <div class="fc-meaning">${esc(w.meaning)}</div>
              ${w.gloss ? `<div class="muted">${esc(w.gloss)}</div>` : ""}
              ${w.example ? `<div class="fc-ex">${esc(w.example)}</div>` : ""}
            </div>
          </div>
          <div class="row center">
            <button class="btn ghost" data-a="prev">← Өмнөх</button>
            <button class="btn audio" data-a="say">🔊</button>
            <button class="btn ${learned ? "success" : "ghost"}" data-a="learn">${learned ? "✔ Цээжилсэн" : "Цээжилсэн гэж тэмдэглэх"}</button>
            <button class="btn ghost" data-a="next">Дараах →</button>
          </div>
          <div class="row center"><button class="btn ghost small" data-a="shuffle">🔀 Холих</button></div>
        </div>`;
      const fc = el.querySelector("#fc");
      fc.onclick = () => { flipped = !flipped; fc.classList.toggle("flipped", flipped); };
      fc.onkeydown = (e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); fc.click(); } };
      el.querySelector('[data-a="prev"]').onclick = () => { i = (i - 1 + cards.length) % cards.length; flipped = false; render(); };
      el.querySelector('[data-a="next"]').onclick = () => { i = (i + 1) % cards.length; flipped = false; render(); };
      el.querySelector('[data-a="say"]').onclick = () => Speech.speak(w.term, w.lang);
      el.querySelector('[data-a="learn"]').onclick = () => { Progress.toggleLearned(w.id); render(); };
      el.querySelector('[data-a="shuffle"]').onclick = () => { cards = shuffle(cards); i = 0; flipped = false; render(); };
    }
    render();
  }

  /* ---------- Хос тааруулах ---------- */
  function match(el, L) {
    const words = sample(L.words, Math.min(6, L.words.length));
    const tiles = shuffle(words.flatMap((w) => [
      { id: w.id, text: w.term, cls: w.lang, kind: "t" },
      { id: w.id, text: w.meaning, cls: "", kind: "m" }
    ]));
    let sel = null, found = 0, moves = 0;
    const start = Date.now();
    el.innerHTML = `
      <div class="muted center">Үгийг утгатай нь хослуулна уу. <span id="mstat"></span></div>
      <div class="match-grid">${tiles.map((t, k) => `<button class="tile ${t.cls}" data-k="${k}">${esc(t.text)}</button>`).join("")}</div>`;
    const stat = el.querySelector("#mstat");
    el.querySelectorAll(".tile").forEach((b) => {
      b.onclick = () => {
        const t = tiles[+b.dataset.k];
        if (b.classList.contains("done") || b === sel) return;
        if (t.kind === "t") Speech.speak(t.text, t.cls);
        if (!sel) { sel = b; b.classList.add("sel"); return; }
        moves++;
        const s = tiles[+sel.dataset.k];
        if (s.id === t.id && s.kind !== t.kind) {
          b.classList.add("done"); sel.classList.add("done"); sel.classList.remove("sel");
          found++;
          if (found === words.length) {
            const sec = Math.round((Date.now() - start) / 1000);
            Progress.update((p) => { p.games++; window.App.bump(p, "games"); p.xp += 10; });
            el.insertAdjacentHTML("beforeend", `<div class="card center result-mini"><h3>🎉 Баяр хүргэе!</h3><p>${sec} секунд, ${moves} алхам. +10 XP</p><button class="btn" id="again">Дахин тоглох</button></div>`);
            el.querySelector("#again").onclick = () => match(el, L);
          }
        } else {
          const a = sel;
          a.classList.add("wrong"); b.classList.add("wrong");
          setTimeout(() => { a.classList.remove("wrong", "sel"); b.classList.remove("wrong"); }, 500);
        }
        sel = null;
        stat.textContent = `Олсон: ${found}/${words.length} · Алхам: ${moves}`;
      };
    });
  }

  /* ---------- Хурдны сорил ---------- */
  function speed(el, L) {
    const pool = Quiz.poolFor(L.course.id, L.level);
    let score = 0, left = 60, cur, timer;
    el.innerHTML = `<div class="card center"><h3>⚡ 60 секунд</h3><p>Аль болох олон үгийн утгыг зөв сонго. Буруу хариулт 3 секунд хасна.</p><button class="btn" id="go">Эхлэх</button></div>`;
    el.querySelector("#go").onclick = begin;
    function begin() {
      el.innerHTML = `<div class="quiz card"><div class="quiz-top"><span class="timer" id="st">60</span><span>Оноо: <b id="ss">0</b></span></div><div id="sq"></div></div>`;
      next();
      timer = setInterval(() => {
        if (!document.body.contains(el)) return clearInterval(timer);
        left--;
        el.querySelector("#st").textContent = Math.max(0, left);
        if (left <= 0) end();
      }, 1000);
    }
    function next() {
      const w = L.words[Math.floor(Math.random() * L.words.length)];
      cur = Math.random() < 0.5 ? Quiz.Gen.meaning(w, pool) : Quiz.Gen.term(w, pool);
      const box = el.querySelector("#sq");
      box.innerHTML = `<div class="quiz-prompt">${cur.prompt}</div><div class="options">${cur.options.map((o, k) => `<button class="opt ${cur.optClass || ""}" data-k="${k}">${esc(o)}</button>`).join("")}</div>`;
      box.querySelectorAll(".opt").forEach((b) => {
        b.onclick = () => {
          if (+b.dataset.k === cur.answer) { score++; b.classList.add("correct"); }
          else { left = Math.max(0, left - 3); b.classList.add("wrong"); }
          el.querySelector("#ss").textContent = score;
          box.querySelectorAll(".opt").forEach((x) => (x.disabled = true));
          setTimeout(() => left > 0 && next(), 250);
        };
      });
    }
    function end() {
      clearInterval(timer);
      const key = "best_" + L.course.id + "_" + L.level;
      let best = 0;
      try { best = +localStorage.getItem(key) || 0; if (score > best) localStorage.setItem(key, score); } catch (e) { /* ignore */ }
      Progress.update((p) => { p.games++; window.App.bump(p, "games"); p.xp += score; });
      el.innerHTML = `<div class="card center"><h3>Хугацаа дууслаа!</h3><div class="result-score pass">${score}</div><p>Шилдэг амжилт: ${Math.max(best, score)} ${score > best ? "🏆 Шинэ дээд амжилт!" : ""}</p><p class="muted">+${score} XP</p><button class="btn" id="go">Дахин тоглох</button></div>`;
      el.querySelector("#go").onclick = () => speed(el, L);
    }
  }

  /* ---------- Өгүүлбэр байгуулах ---------- */
  function build(el, L) {
    const lang = L.course.lang;
    const list = shuffle(L.sentences);
    let i = 0, score = 0;
    function tokens(s) {
      if (lang === "zh") return Array.from(s.replace(/[，。！？、,.!?]/g, ""));
      return s.replace(/[.,!?]/g, "").split(/\s+/).filter(Boolean);
    }
    function render() {
      if (i >= list.length) {
        Progress.update((p) => { p.games++; window.App.bump(p, "games"); p.xp += score * 3; });
        el.innerHTML = `<div class="card center"><h3>Дууслаа!</h3><div class="result-score pass">${score}/${list.length}</div><p class="muted">+${score * 3} XP</p><button class="btn" id="again">Дахин тоглох</button></div>`;
        el.querySelector("#again").onclick = () => build(el, L);
        return;
      }
      const s = list[i];
      const target = tokens(s.text);
      let pieces = shuffle(target.map((t, k) => ({ t, k })));
      if (pieces.every((p, k) => p.k === k) && pieces.length > 1) pieces.reverse();
      const chosen = [];
      el.innerHTML = `
        <div class="quiz card">
          <div class="quiz-top"><span class="badge">${i + 1} / ${list.length}</span><span>Оноо: <b>${score}</b></span></div>
          <p class="center"><b>${esc(s.meaning)}</b></p>
          <div class="build-answer ${lang}" id="ans"></div>
          <div class="build-pieces ${lang}" id="pcs"></div>
          <div class="row center">
            <button class="btn ghost" id="clr">Арилгах</button>
            <button class="btn audio" id="say">🔊 Сонсох</button>
            <button class="btn" id="chk">Шалгах</button>
          </div>
          <div class="feedback" id="fb"></div>
        </div>`;
      const ans = el.querySelector("#ans"), pcs = el.querySelector("#pcs");
      function draw() {
        ans.innerHTML = chosen.map((p, k) => `<button class="chip on" data-k="${k}">${esc(p.t)}</button>`).join("") || `<span class="muted">Доорх үгсээс дарж сонгоно уу</span>`;
        pcs.innerHTML = pieces.map((p, k) => `<button class="chip" data-k="${k}">${esc(p.t)}</button>`).join("");
        ans.querySelectorAll(".chip").forEach((b) => (b.onclick = () => { pieces.push(chosen.splice(+b.dataset.k, 1)[0]); draw(); }));
        pcs.querySelectorAll(".chip").forEach((b) => (b.onclick = () => { chosen.push(pieces.splice(+b.dataset.k, 1)[0]); draw(); }));
      }
      draw();
      el.querySelector("#clr").onclick = () => { pieces = pieces.concat(chosen.splice(0)); draw(); };
      el.querySelector("#say").onclick = () => Speech.speak(s.text, lang);
      el.querySelector("#chk").onclick = () => {
        if (pieces.length) return UI.toast("Бүх үгийг ашиглана уу.", "warn");
        const ok = chosen.map((p) => p.t).join(" ") === target.join(" ");
        if (ok) score++;
        const fb = el.querySelector("#fb");
        fb.className = "feedback " + (ok ? "ok" : "bad");
        fb.innerHTML = `${ok ? "✔ Зөв!" : "✘ Зөв хариулт:"} <div class="reveal ${lang}">${esc(s.text)}</div>${s.reading ? `<div class="muted">${esc(s.reading)}</div>` : ""}<button class="btn" id="nx">Дараагийн →</button>`;
        el.querySelector("#chk").disabled = true;
        fb.querySelector("#nx").onclick = () => { i++; render(); };
        Speech.speak(s.text, lang);
      };
    }
    render();
  }

  window.App.Games = Games;
})();
