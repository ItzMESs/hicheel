/* Ханзны зурааны дараалал (Hanzi Writer сан, CDN-ээс) */
(function () {
  "use strict";
  const { esc, UI, Speech } = window.App;
  const SRC = "https://cdn.jsdelivr.net/npm/hanzi-writer@3.7.2/dist/hanzi-writer.min.js";
  let loading = null;

  function load() {
    if (window.HanziWriter) return Promise.resolve();
    if (loading) return loading;
    loading = new Promise((res, rej) => {
      const s = document.createElement("script");
      s.src = SRC;
      s.onload = res;
      s.onerror = () => { loading = null; rej(new Error("load")); };
      document.head.appendChild(s);
    });
    return loading;
  }

  function close() {
    const m = document.getElementById("stroke-modal");
    if (m) m.remove();
    document.removeEventListener("keydown", onKey);
  }
  function onKey(e) { if (e.key === "Escape") close(); }

  function open(word, reading) {
    close();
    const chars = Array.from(word).filter((c) => /[一-鿿]/.test(c));
    if (!chars.length) return;
    const m = document.createElement("div");
    m.id = "stroke-modal";
    m.className = "modal";
    m.innerHTML = `
      <div class="modal-bg"></div>
      <div class="modal-box" role="dialog" aria-modal="true" aria-label="Зурааны дараалал">
        <button class="modal-x" aria-label="Хаах">✕</button>
        <div class="center">
          <div class="q-term zh">${esc(word)}</div>
          <div class="q-sub">${esc(reading || "")}</div>
        </div>
        <div class="stroke-chars" id="sc">${chars.map((c, k) => `<div class="stroke-cell" id="sc${k}"></div>`).join("")}</div>
        <div class="row center">
          <button class="btn ghost small" data-a="play">▶ Дахин үзүүлэх</button>
          <button class="btn ghost small" data-a="quiz">✍️ Өөрөө зурах</button>
          <button class="btn audio small" data-a="say">🔊</button>
        </div>
        <p class="muted small center" id="sm">Ачаалж байна...</p>
      </div>`;
    document.body.appendChild(m);
    m.querySelector(".modal-bg").onclick = close;
    m.querySelector(".modal-x").onclick = close;
    document.addEventListener("keydown", onKey);
    m.querySelector('[data-a="say"]').onclick = () => Speech.speak(word, "zh");

    load().then(() => {
      const dark = getComputedStyle(document.documentElement).getPropertyValue("--ink").trim() || "#222";
      const accent = getComputedStyle(document.documentElement).getPropertyValue("--zh").trim() || "#d33";
      const writers = chars.map((c, k) => window.HanziWriter.create("sc" + k, c, {
        width: 140, height: 140, padding: 6, showOutline: true,
        strokeColor: dark, radicalColor: accent, outlineColor: "rgba(128,128,128,.25)",
        delayBetweenStrokes: 220, strokeAnimationSpeed: 1.2,
        onLoadCharDataError: () => { document.getElementById("sm").textContent = "Зурааны мэдээлэл ачаалж чадсангүй (интернэт шалгана уу)."; }
      }));
      const play = () => writers.reduce((p, w) => p.then(() => w.animateCharacter()), Promise.resolve());
      document.getElementById("sm").textContent = "Улаан өнгөөр түлхүүр (радикал) хэсгийг харуулна.";
      play();
      m.querySelector('[data-a="play"]').onclick = () => { writers.forEach((w) => w.showCharacter()); play(); };
      m.querySelector('[data-a="quiz"]').onclick = () => {
        document.getElementById("sm").textContent = "Хулгана эсвэл хуруугаараа зурааг дарааллаар нь зурна уу.";
        writers.forEach((w) => w.quiz({ onComplete: (s) => UI.toast(`Алдаа: ${s.totalMistakes}`, s.totalMistakes ? "warn" : "ok") }));
      };
    }).catch(() => { document.getElementById("sm").textContent = "Зурааны санг ачаалж чадсангүй (интернэт шалгана уу)."; });
  }

  window.App.Stroke = { open };
})();
