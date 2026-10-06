/* Тоглоомууд: картаар цээжлэх, хос тааруулах, хурдны сорил, өгүүлбэр байгуулах */
(function () {
  "use strict";
  const { esc, shuffle, sample, getLevel, Progress, Speech, UI, Quiz } = window.App;

  const Games = {
    list: [
      { id: "flash", icon: "🃏", title: "Картаар цээжлэх", desc: "Картыг эргүүлж үгийн утгыг шалга, мэдсэн үгээ тэмдэглэ." },
      { id: "match", icon: "🧩", title: "Хос тааруулах", desc: "Үгийг утгатай нь аль болох хурдан хослуул." },
      { id: "speed", icon: "⚡", title: "Хурдны сорил", desc: "60 секундэд аль болох олон асуултад зөв хариул." },
      { id: "build", icon: "🧱", title: "Өгүүлбэр байгуулах", desc: "Холилдсон үгсийг зөв дараалалд оруул." }
    ],
    run(id, el, courseId, level) {
      const L = getLevel(courseId, level);
      ({ flash, match, speed, build })[id](el, L);
    }
  };

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
            Progress.update((p) => { p.games++; p.xp += 10; });
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
      Progress.update((p) => { p.games++; p.xp += score; });
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
        Progress.update((p) => { p.games++; p.xp += score * 3; });
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
