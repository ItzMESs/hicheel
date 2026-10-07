/* Хичээлийн өгөгдлийг нийтийн ба хамгаалагдсан хэсэгт хуваана.
   Эх: data-src/*.js (вэбд нийтлэгдэхгүй)
   Гаралт: js/data/public.js — үнэгүй түвшин (HSK 1, IELTS A1) + тоо
           api/_content/zh.json, en.json — багцтай хэрэглэгчид серверээс илгээнэ
   Ажиллуулах: npm run build:content */
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.join(__dirname, "..");
const SRC = ["hsk2", "hsk3", "chinese-extra", "ielts", "vocab-extra", "hsk-official", "ielts-more", "grammar-en", "grammar-zh", "reading-zh", "dialogues", "topics", "word-rel", "stories", "culture"];
const FREE = { hsk2: ["1"], hsk3: ["1"], ielts: ["A1"] };

const ctx = {};
ctx.window = ctx;
vm.createContext(ctx);
for (const f of SRC) { const fp = path.join(ROOT, "data-src", f + ".js"); if (fs.existsSync(fp)) vm.runInContext(fs.readFileSync(fp, "utf8"), ctx, { filename: f + ".js" }); }
const W = JSON.parse(JSON.stringify({ STORIES: ctx.STORIES || { zh: [], en: [] }, CULTURE: ctx.CULTURE || [], HSK2: ctx.HSK2, HSK3: ctx.HSK3, ZH_EXTRA: ctx.ZH_EXTRA, ZH_READING: ctx.ZH_READING, IELTS: ctx.IELTS, IELTS_PRACTICE: ctx.IELTS_PRACTICE, DIALOGUES: ctx.DIALOGUES, TOPICS: ctx.TOPICS, WORD_REL: ctx.WORD_REL }));

const counts = { hsk2: {}, hsk3: {}, ielts: {}, topics: { zh: {}, en: {} }, unique: {} };
// Давхардалгүй нийт үгийн тоо (самбарт харуулна)
counts.unique.zh = new Set([].concat(...["HSK2", "HSK3"].map((k) => W[k].levels.map((l) => (W[k].words[l] || []).map((w) => w[0]))).flat())).size;
counts.unique.en = new Set(W.IELTS.levels.map((l) => (W.IELTS.words[l] || []).map((w) => w[0])).flat()).size;
const priv = { zh: { words: { hsk2: {}, hsk3: {} }, sentences: {}, grammar: {}, reading: {}, dialogues: [], topics: {} }, en: { words: {}, sentences: {}, grammar: {}, reading: {}, dialogues: [], topics: {} } };

// Хятад: HSK үгс
const freeTiers = new Set(FREE.hsk2.concat(FREE.hsk3).map((l) => String(W.ZH_EXTRA.tier.hsk3[l] || W.ZH_EXTRA.tier.hsk2[l])));
for (const cid of ["hsk2", "hsk3"]) {
  const C = W[cid.toUpperCase()];
  for (const l of C.levels) {
    const tier = W.ZH_EXTRA.tier[cid][l];
    counts[cid][l] = { words: (C.words[l] || []).length, grammar: (W.ZH_EXTRA.grammar[tier] || []).length };
    if (!FREE[cid].includes(l)) { priv.zh.words[cid][l] = C.words[l] || []; C.words[l] = []; }
  }
}
for (const t of Object.keys(W.ZH_EXTRA.sentences)) if (!freeTiers.has(t)) { priv.zh.sentences[t] = W.ZH_EXTRA.sentences[t]; W.ZH_EXTRA.sentences[t] = []; }
for (const t of Object.keys(W.ZH_EXTRA.grammar)) if (!freeTiers.has(t)) { priv.zh.grammar[t] = W.ZH_EXTRA.grammar[t]; W.ZH_EXTRA.grammar[t] = []; }
for (const t of Object.keys(W.ZH_READING)) if (!freeTiers.has(t)) { priv.zh.reading[t] = W.ZH_READING[t]; W.ZH_READING[t] = []; }

// Англи: IELTS
for (const l of W.IELTS.levels) {
  counts.ielts[l] = { words: (W.IELTS.words[l] || []).length, grammar: (W.IELTS.grammar[l] || []).length };
  if (FREE.ielts.includes(l)) continue;
  priv.en.words[l] = W.IELTS.words[l]; W.IELTS.words[l] = [];
  priv.en.sentences[l] = W.IELTS.sentences[l]; W.IELTS.sentences[l] = [];
  priv.en.grammar[l] = W.IELTS.grammar[l]; W.IELTS.grammar[l] = [];
  priv.en.reading[l] = W.IELTS.reading[l]; W.IELTS.reading[l] = null;
}
// IELTS Writing/Speaking дадлага — англи багцтай
priv.en.practice = { writing: W.IELTS_PRACTICE.writing, speaking: W.IELTS_PRACTICE.speaking };
W.IELTS_PRACTICE.writing = W.IELTS_PRACTICE.writing.map((x) => ({ id: x.id, task: x.task, minutes: x.minutes, min: x.min, title: x.title, prompt: "", locked: true }));
W.IELTS_PRACTICE.speaking = W.IELTS_PRACTICE.speaking.map((x) => ({ topic: x.topic, part1: [], part2: { cue: "", points: [] }, part3: [], locked: true }));

// Харилцан яриа: эхний түвшин үнэгүй, бусдын агуулгыг нууна
W.DIALOGUES = W.DIALOGUES.map((d) => {
  const free = d.lang === "zh" ? d.tier === 1 : d.level === "A1";
  if (free) return d;
  priv[d.lang].dialogues.push(d);
  return { id: d.id, lang: d.lang, tier: d.tier, level: d.level, title: d.title, scene: d.scene, lines: [], questions: [], locked: true, nLines: d.lines.length, nQuestions: d.questions.length };
});
// Мэргэжлийн үгс — бүгд багцтай
for (const lang of ["zh", "en"]) {
  for (const t of Object.keys(W.TOPICS[lang] || {})) { counts.topics[lang][t] = W.TOPICS[lang][t].length; priv[lang].topics[t] = W.TOPICS[lang][t]; }
  W.TOPICS[lang] = {};
}

// Ижил/эсрэг үгийн холбоос: үнэгүй түвшний үгсийнх нь л нийтэд
const freeWords = { zh: new Set([].concat(W.HSK2.words["1"] || [], W.HSK3.words["1"] || []).map((w) => w[0])), en: new Set((W.IELTS.words.A1 || []).map((w) => w[0])) };
for (const lang of ["zh", "en"]) {
  const all = W.WORD_REL[lang] || {}, pubRel = {};
  priv[lang].rel = {};
  for (const k of Object.keys(all)) (freeWords[lang].has(k) ? pubRel : priv[lang].rel)[k] = all[k];
  W.WORD_REL[lang] = pubRel;
}

// Өгүүллэг: эхний түвшин (HSK 1 / A1) үнэгүй, бусад нь багцтай (гарчиг л нийтэд)
for (const lang of ["zh", "en"]) {
  priv[lang].stories = [];
  W.STORIES[lang] = (W.STORIES[lang] || []).map((s) => {
    if (lang === "zh" ? s.tier === 1 : s.level === "A1") return s;
    priv[lang].stories.push(s);
    return { id: s.id, tier: s.tier, level: s.level, title: s.title, title_mn: s.title_mn, locked: true };
  });
}
// Монгол соёл: бүгд багцтай, хэл тус бүрийн агуулга тусдаа
priv.zh.culture = {}; priv.en.culture = {};
W.CULTURE = W.CULTURE.map((c) => {
  priv.zh.culture[c.id] = c.zh; priv.en.culture[c.id] = c.en;
  return { id: c.id, icon: c.icon, title_mn: c.title_mn, desc_mn: c.desc_mn, zh: { title: c.zh && c.zh.title }, en: { title: c.en && c.en.title } };
});

const js = (k, v) => `window.${k} = ${JSON.stringify(v)};\n`;
const pub = "/* АВТОМАТААР ҮҮСГЭСЭН (scripts/build-content.js) — гараар бүү засаарай. Эх: data-src/ */\n" +
  ["HSK2", "HSK3", "ZH_EXTRA", "ZH_READING", "IELTS", "IELTS_PRACTICE", "DIALOGUES", "TOPICS", "WORD_REL", "STORIES", "CULTURE"].map((k) => js(k, W[k])).join("") + js("CONTENT_COUNTS", counts);
fs.writeFileSync(path.join(ROOT, "js/data/public.js"), pub);
fs.mkdirSync(path.join(ROOT, "api/_content"), { recursive: true });
for (const lang of ["zh", "en"]) fs.writeFileSync(path.join(ROOT, `api/_content/${lang}.json`), JSON.stringify(priv[lang]));
const kb = (f) => Math.round(fs.statSync(path.join(ROOT, f)).size / 1024) + "KB";
console.log("public.js", kb("js/data/public.js"), "| zh.json", kb("api/_content/zh.json"), "| en.json", kb("api/_content/en.json"));
