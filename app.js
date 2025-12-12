/* Kuis + Dynamic loader + Ringkasan (Modul 1–6) — v2 */
function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") node.className = v;
    else if (k === "html") node.innerHTML = v;
    else if (k.startsWith("on") && typeof v === "function") node.addEventListener(k.slice(2).toLowerCase(), v);
    else node.setAttribute(k, v);
  }
  for (const ch of children) {
    if (ch === null || ch === undefined) continue;
    node.appendChild(typeof ch === "string" ? document.createTextNode(ch) : ch);
  }
  return node;
}

function shuffle(array) {
  const a = [...array];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function groupBy(arr, key) {
  return arr.reduce((acc, x) => {
    (acc[x[key]] ||= []).push(x);
    return acc;
  }, {});
}

let QUESTIONS = [];
let ORDER = [];
let MODE = "ordered";
let SHOW_EXPLANATION = true;

/* ---------- Ringkasan data (loaded from summary_M1.js ... summary_M6.js) ---------- */
const SUMMARY = (window.MODULE_SUMMARIES || {});

function renderSummaryTabs(active = "M1") {
  const tabs = document.getElementById("summaryTabs");
  tabs.innerHTML = "";
  ["M1","M2","M3","M4","M5","M6"].forEach((m) => {
    const b = el("button", {
      class: "sumTab" + (m === active ? " active" : ""),
      type: "button",
      onclick: () => { renderSummaryTabs(m); renderSummaryContent(m); }
    }, m.replace("M","Modul "));
    tabs.appendChild(b);
  });
}

function renderSummaryContent(mod) {
  const box = document.getElementById("summaryContent")
  const data = MODULE_SUMMARIES[mod]

  if (!data) {
    box.textContent = `Ringkasan belum dimuat. Pastikan file summary_${mod}.js sudah ter-load.`
    return
  }

  box.innerHTML = ""

  // Data berupa STRING
  const lines = data.split('\n').map(line => line.trim()).filter(l => l.length > 0)

  lines.forEach((line, idx) => {

    // DETEKSI JUDUL MODUL
    if (/^MODUL\s+\d+/i.test(line)) {
      box.appendChild(
        el("h2", { style: "margin:14px 0; font-size:22px; font-weight:700;" }, line)
      )
      return
    }

    // DETEKSI JUDUL BESAR (uppercase dan panjang cukup)
    if (line === line.toUpperCase() && line.length > 5) {
      box.appendChild(
        el("h3", { style: "margin:12px 0; font-size:18px; font-weight:700;" }, line)
      )
      return
    }

    // DETEKSI SUB-JUDUL (e.g. Pendahuluan, Penutup, dst)
    // Pola: baris tanpa titik di akhir, huruf awal kapital
    if (
      /^[A-Z][A-Za-z\s]+$/.test(line) &&
      (idx < lines.length - 1) &&
      !lines[idx + 1].match(/^\w+:/) &&
      lines[idx + 1].length > 50 // memastikan berikutnya adalah paragraf panjang
    ) {
      box.appendChild(
        el("h3", { style: "margin:12px 0; font-size:18px; font-weight:700;" }, line)
      )
      return
    }

    // DEFAULT → paragraf
    box.appendChild(
      el("p", { style: "margin:6px 0 10px; line-height:1.55;" }, line)
    )
  })
}


/* ---------- Kuis ---------- */
function setMode(mode) {
  MODE = mode;
  ORDER = mode === "random" ? shuffle(QUESTIONS) : [...QUESTIONS];
  renderQuiz();
}
function setExplain(enabled) { SHOW_EXPLANATION = enabled; }

function setQuestions(newQuestions) {
  QUESTIONS = Array.isArray(newQuestions) ? newQuestions : [];
  ORDER = MODE === "random" ? shuffle(QUESTIONS) : [...QUESTIONS];
  renderQuiz();
}

function renderQuiz() {
  const root = document.getElementById("quiz");
  root.innerHTML = "";

  if (!QUESTIONS.length) {
    root.appendChild(el("div", { class: "card" }, "Belum ada bank soal yang dimuat."));
    return;
  }

  const grouped = groupBy(ORDER, "module");
  const modules = Object.keys(grouped);

  modules.forEach((m) => {
    const section = el("section", { class: "module" }, el("h2", {}, `Modul ${String(m).replace("M","")}`));

    grouped[m].forEach((item) => {
      const qIndex = ORDER.findIndex(q => q.id === item.id) + 1;
      const name = `q_${item.id}`;
      const card = el("div", { class: "card", "data-qid": String(item.id) }, el("div", { class: "q" }, `${qIndex}. ${item.q}`));

      const optsWrap = el("div", { class: "opts" });
      item.opts.forEach((opt, oi) => {
        const id = `${name}_${oi}`;
        const radio = el("input", { type: "radio", name, id, value: String(oi) });
        const label = el("label", { for: id }, opt);
        optsWrap.appendChild(el("div", { class: "opt" }, radio, label));
      });

      const meta = el("div", { class: "meta" }, el("span", { class: "tag" }, m), el("span", { class: "qid" }, `ID: ${item.id}`));
      const explain = el("div", { class: "explain hidden" }, item.exp || "");
      card.append(optsWrap, meta, explain);
      section.appendChild(card);
    });

    root.appendChild(section);
  });

  const res = document.getElementById("result");
  res.textContent = "";
  res.className = "result";
}

function grade() {
  let correct = 0;
  const total = ORDER.length;

  ORDER.forEach((item) => {
    const name = `q_${item.id}`;
    const chosen = document.querySelector(`input[name="${name}"]:checked`);
    const card = document.querySelector(`.card[data-qid="${item.id}"]`);
    const explain = card.querySelector(".explain");

    card.classList.remove("correct", "wrong", "unanswered");
    explain.classList.add("hidden");

    if (!chosen) { card.classList.add("unanswered"); return; }

    const val = Number(chosen.value);
    if (val === item.a) { correct++; card.classList.add("correct"); }
    else { card.classList.add("wrong"); }

    if (SHOW_EXPLANATION && item.exp) explain.classList.remove("hidden");
  });

  const pct = Math.round((correct / total) * 100);
  const res = document.getElementById("result");
  res.textContent = `Skor: ${correct}/${total} (${pct}%)`;
  res.className = "result " + (pct >= 80 ? "good" : pct >= 60 ? "ok" : "bad");
  res.scrollIntoView({ behavior: "smooth", block: "start" });
}

function resetQuiz() {
  document.querySelectorAll("#quiz input[type=radio]").forEach(r => r.checked = false);
  document.querySelectorAll(".card").forEach(c => {
    c.classList.remove("correct","wrong","unanswered");
    const ex = c.querySelector(".explain");
    if (ex) ex.classList.add("hidden");
  });
  const res = document.getElementById("result");
  res.textContent = "";
  res.className = "result";
}

function loadBank(file) {
  return new Promise((resolve, reject) => {
    const prev = document.getElementById("bankScript");
    if (prev) prev.remove();
    window.__BANK_PAYLOAD__ = null;

    const s = document.createElement("script");
    s.id = "bankScript";
    s.src = file;
    s.onload = () => {
      if (!window.__BANK_PAYLOAD__ || !Array.isArray(window.__BANK_PAYLOAD__.questions)) {
        reject(new Error("Format bank soal tidak valid. Pastikan file bank mengisi window.__BANK_PAYLOAD__.questions"));
        return;
      }
      setQuestions(window.__BANK_PAYLOAD__.questions);
      resolve();
    };
    s.onerror = () => reject(new Error("Gagal memuat file bank soal: " + file));
    document.body.appendChild(s);
  });
}

/* ---------- Navigasi ---------- */
function setView(which) {
  const vQuiz = document.getElementById("viewQuiz");
  const vSum = document.getElementById("viewSummary");
  const bQuiz = document.getElementById("navQuiz");
  const bSum = document.getElementById("navSummary");

  if (which === "summary") {
    vQuiz.classList.remove("active");
    vSum.classList.add("active");
    bQuiz.classList.remove("active");
    bSum.classList.add("active");
  } else {
    vSum.classList.remove("active");
    vQuiz.classList.add("active");
    bSum.classList.remove("active");
    bQuiz.classList.add("active");
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  // nav
  document.getElementById("navQuiz").addEventListener("click", () => setView("quiz"));
  document.getElementById("navSummary").addEventListener("click", () => setView("summary"));

  // summary init
  renderSummaryTabs("M1");
  renderSummaryContent("M1");

  // desktop controls
  document.getElementById("btnGrade").addEventListener("click", grade);
  document.getElementById("btnReset").addEventListener("click", resetQuiz);
  document.getElementById("modeOrdered").addEventListener("click", () => setMode("ordered"));
  document.getElementById("modeRandom").addEventListener("click", () => setMode("random"));
  document.getElementById("toggleExplain").addEventListener("change", (e) => setExplain(e.target.checked));
  const sel = document.getElementById("questionSet");
  sel.addEventListener("change", async () => { resetQuiz(); await loadBank(sel.value); });

  // mobile controls mirror
  document.getElementById("btnGrade_m").addEventListener("click", grade);
  document.getElementById("btnReset_m").addEventListener("click", resetQuiz);
  document.getElementById("modeOrdered_m").addEventListener("click", () => setMode("ordered"));
  document.getElementById("modeRandom_m").addEventListener("click", () => setMode("random"));
  document.getElementById("toggleExplain_m").addEventListener("change", (e) => {
    setExplain(e.target.checked);
    document.getElementById("toggleExplain").checked = e.target.checked;
  });
  const selm = document.getElementById("questionSet_m");
  selm.addEventListener("change", async () => {
    document.getElementById("questionSet").value = selm.value;
    resetQuiz();
    await loadBank(selm.value);
  });
  sel.addEventListener("change", () => { selm.value = sel.value; });

  await loadBank(sel.value);
});
