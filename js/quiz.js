/* Асуулт үүсгэгч болон нийтлэг асуулт-хариултын хөдөлгүүр */
(function () {
  "use strict";
  const { esc, shuffle, sample, COURSES, getLevel } = window.App;

  // Төөрөгдүүлэх хариулт олох: эхлээд тухайн түвшин, дутвал бүх курсээс
  function poolFor(courseId, level) {
    const own = getLevel(courseId, level).words;
    const d = COURSES[courseId].data();
    const rest = [];
    d.levels.forEach((lv) => { if (lv !== level) rest.push(...getLevel(courseId, lv).words); });
    return { own, rest };
  }
  function options(correct, pool, key) {
    const seen = new Set([correct[key]]);
    const out = [correct[key]];
    // Монгол/англи утгыг холихгүй (хариултыг илчлэхгүйн тулд)
    const same = (w) => key !== "meaning" || !!w.noMn === !!correct.noMn;
    for (const w of shuffle(pool.own.filter(same)).concat(shuffle(pool.rest.filter(same)), shuffle(pool.own))) {
      if (out.length >= 4) break;
      if (!seen.has(w[key])) { seen.add(w[key]); out.push(w[key]); }
    }
    const opts = shuffle(out);
    return { options: opts, answer: opts.indexOf(correct[key]) };
  }
  function sentenceOptions(correct, all) {
    const others = sample(all.filter((s) => s.text !== correct.text), 3);
    const opts = shuffle([correct].concat(others));
    return { opts, answer: opts.indexOf(correct) };
  }

  const Gen = {
    meaning(w, pool) {
      const o = options(w, pool, "meaning");
      return { type: "Үгийн утга", prompt: `<div class="q-term ${w.lang}">${esc(w.term)}</div><div class="q-sub">${w.lang === "zh" ? esc(w.reading) : "<i>" + esc(w.reading) + "</i>"}</div><p>Энэ үгийн утга аль нь вэ?</p>`, audio: { text: w.term, lang: w.lang }, ...o, wordId: w.id };
    },
    term(w, pool) {
      const o = options(w, pool, "term");
      return { type: "Орчуулга", prompt: `<p>«<b>${esc(w.meaning)}</b>» гэдгийг ${w.lang === "zh" ? "хятадаар" : "англиар"} юу гэх вэ?</p>`, ...o, optClass: w.lang, wordId: w.id };
    },
    reading(w, pool) {
      const o = options(w, pool, "reading");
      return { type: "Пиньинь", prompt: `<div class="q-term zh">${esc(w.term)}</div><p>Зөв пиньинийг сонгоно уу.</p>`, ...o, wordId: w.id };
    },
    listenWord(w, pool) {
      const o = options(w, pool, "meaning");
      return { type: "Сонсгол", prompt: `<p>Сонсоод утгыг нь сонгоно уу.</p>`, audio: { text: w.term, lang: w.lang, auto: true, hidden: true }, reveal: `${esc(w.term)} ${w.lang === "zh" ? "— " + esc(w.reading) : ""}`, ...o, wordId: w.id };
    },
    listenSentence(s, all, lang) {
      const { opts, answer } = sentenceOptions(s, all);
      return { type: "Өгүүлбэр сонсох", prompt: `<p>Сонссон өгүүлбэрээ сонгоно уу.</p>`, audio: { text: s.text, lang, auto: true, hidden: true }, options: opts.map((x) => x.text), answer, optClass: lang, reveal: esc(s.meaning) };
    },
    sentenceMeaning(s, all, lang) {
      const { opts, answer } = sentenceOptions(s, all);
      return { type: "Өгүүлбэр сонсох", prompt: `<p>Сонсоод утгыг нь сонгоно уу.</p>`, audio: { text: s.text, lang, auto: true, hidden: true }, options: opts.map((x) => x.meaning), answer, reveal: `<span class="${lang}">${esc(s.text)}</span>` };
    },
    grammar(g) {
      const opts = g.o.map((t, i) => ({ t, i }));
      const sh = shuffle(opts);
      return { type: "Дүрэм", prompt: `<p>${esc(g.q)}</p>`, options: sh.map((x) => x.t), answer: sh.findIndex((x) => x.i === g.a) };
    },
    dictation(w) {
      return { type: "Сонсоод бичих", input: true, prompt: `<p>Сонссон үгээ бичнэ үү ${w.lang === "zh" ? "(ханз эсвэл аялгуугүй пиньинь)" : ""}.</p>`, audio: { text: w.term, lang: w.lang, auto: true, hidden: true }, accept: w.lang === "zh" ? [w.term, w.reading] : [w.term], reveal: `${esc(w.term)} ${w.lang === "zh" ? "— " + esc(w.reading) : ""} — ${esc(w.meaning)}`, wordId: w.id };
    }
  };

  /* Асуулт-хариултын хөдөлгүүр.
     opts: { title, onFinish(score,total,answers), timeLimit (сек) } */
  function run(el, questions, opts) {
    opts = opts || {};
    let i = 0, score = 0, timer = null, left = opts.timeLimit || 0, done = false;
    const answers = [];

    function finish() {
      if (done) return;
      done = true;
      clearInterval(timer);
      if (window.speechSynthesis) speechSynthesis.cancel();
      const total = questions.length;
      const pct = total ? Math.round((score / total) * 100) : 0;
      const review = answers.map((a, k) => `
        <li class="${a.ok ? "ok" : "bad"}">
          <span class="rv-n">${k + 1}.</span>
          <span class="rv-q">${a.q.type}: ${a.q.reveal || stripHtml(a.q.prompt)}</span>
          <span class="rv-a">${a.ok ? "✔" : "✘ Зөв: " + esc(a.correct)}</span>
        </li>`).join("");
      el.innerHTML = `
        <div class="result card">
          <div class="result-score ${pct >= 60 ? "pass" : "fail"}">${pct}%</div>
          <h3>${score} / ${total} зөв</h3>
          <p>${pct >= 90 ? "Гайхалтай! 🎉" : pct >= 60 ? "Сайн байна! Тэнцлээ 👍" : "Дахин давтаад үзээрэй 💪"}</p>
          <div class="row center">
            <button class="btn" data-act="retry">Дахин эхлэх</button>
          </div>
          ${answers.length ? `<details class="review"><summary>Хариултаа харах</summary><ul>${review}</ul></details>` : ""}
        </div>`;
      el.querySelector('[data-act="retry"]').onclick = () => (opts.onRetry ? opts.onRetry() : run(el, shuffle(questions), opts));
      if (opts.onFinish) opts.onFinish(score, total, answers);
    }

    function stripHtml(h) {
      const d = document.createElement("div");
      d.innerHTML = h;
      return esc(d.textContent);
    }

    function show() {
      if (i >= questions.length) return finish();
      const q = questions[i];
      el.innerHTML = `
        <div class="quiz card">
          <div class="quiz-top">
            <span class="badge">${esc(q.type)}</span>
            <span>${i + 1} / ${questions.length}</span>
            ${opts.timeLimit ? `<span class="timer" id="qtimer">${fmt(left)}</span>` : ""}
            <span>Оноо: <b>${score}</b></span>
          </div>
          <div class="progressbar"><div style="width:${(i / questions.length) * 100}%"></div></div>
          <div class="quiz-prompt">${q.prompt}</div>
          ${q.audio ? `<div class="row center"><button class="btn audio" data-act="play">🔊 Сонсох</button><button class="btn ghost small" data-act="slow">🐢 Удаан</button></div>` : ""}
          ${q.input
            ? `<form class="dict-form"><input class="input" autocomplete="off" placeholder="Хариултаа бичнэ үү..." /><button class="btn">Шалгах</button></form>`
            : `<div class="options">${q.options.map((o, k) => `<button class="opt ${q.optClass || ""}" data-k="${k}">${esc(o)}</button>`).join("")}</div>`}
          <div class="feedback" id="fb"></div>
        </div>`;
      const play = (r) => window.App.Speech.speak(q.audio.text, q.audio.lang, r);
      if (q.audio) {
        el.querySelector('[data-act="play"]').onclick = () => play();
        el.querySelector('[data-act="slow"]').onclick = () => play(0.55);
        if (q.audio.auto) setTimeout(() => play(), 250);
      }
      if (q.input) {
        const f = el.querySelector("form");
        const inp = f.querySelector("input");
        inp.focus();
        f.onsubmit = (e) => {
          e.preventDefault();
          const v = window.App.stripTones(inp.value);
          if (!v) return;
          const ok = q.accept.some((a) => window.App.stripTones(a) === v);
          answer(ok, q.accept[0]);
          inp.disabled = true;
          f.querySelector("button").disabled = true;
        };
      } else {
        el.querySelectorAll(".opt").forEach((b) => {
          b.onclick = () => {
            const k = +b.dataset.k;
            el.querySelectorAll(".opt").forEach((x) => (x.disabled = true));
            el.querySelectorAll(".opt")[q.answer].classList.add("correct");
            if (k !== q.answer) b.classList.add("wrong");
            answer(k === q.answer, q.options[q.answer]);
          };
        });
      }
    }

    function answer(ok, correct) {
      const q = questions[i];
      if (ok) score++;
      answers.push({ q, ok, correct });
      const fb = el.querySelector("#fb");
      fb.className = "feedback " + (ok ? "ok" : "bad");
      fb.innerHTML = `${ok ? "✔ Зөв!" : "✘ Буруу. Зөв хариулт: <b>" + esc(correct) + "</b>"}${q.reveal ? `<div class="reveal">${q.reveal}</div>` : ""}
        <button class="btn" id="next">${i + 1 < questions.length ? "Дараагийн →" : "Дуусгах"}</button>`;
      const nx = fb.querySelector("#next");
      nx.focus();
      nx.onclick = () => { i++; show(); };
    }

    const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
    if (opts.timeLimit) {
      timer = setInterval(() => {
        if (!document.body.contains(el)) return clearInterval(timer);
        left--;
        const t = el.querySelector("#qtimer");
        if (t) { t.textContent = fmt(left); t.classList.toggle("low", left <= 30); }
        if (left <= 0) finish();
      }, 1000);
    }
    show();
  }

  window.App.Quiz = { Gen, run, poolFor };
})();
