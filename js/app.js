import {
  loadProgress,
  saveProgress,
  loadSettings,
  saveSettings,
  recordAnswer,
  getDueWords,
  getStats,
} from "./storage.js";

let vocab = { themes: [], words: [] };
let progress = {};
let settings = {};
let queue = [];
let currentIndex = 0;
let flipped = false;

const el = {
  themeToggle: document.getElementById("theme-toggle"),
  themeFilter: document.getElementById("theme-filter"),
  sessionCount: document.getElementById("session-count"),
  flashcard: document.getElementById("flashcard"),
  cardPos: document.getElementById("card-pos"),
  cardFr: document.getElementById("card-fr"),
  cardEn: document.getElementById("card-en"),
  cardExampleFr: document.getElementById("card-example-fr"),
  cardExampleEn: document.getElementById("card-example-en"),
  answerButtons: document.getElementById("answer-buttons"),
  btnKnown: document.getElementById("btn-known"),
  btnUnknown: document.getElementById("btn-unknown"),
  emptyState: document.getElementById("empty-state"),
  cardArea: document.getElementById("card-area"),
  statsSummary: document.getElementById("stats-summary"),
  statsThemes: document.getElementById("stats-themes"),
  tabButtons: document.querySelectorAll(".tab-btn"),
  views: document.querySelectorAll(".view"),
};

function applyDarkMode() {
  if (settings.dark) {
    document.documentElement.setAttribute("data-theme", "dark");
    el.themeToggle.textContent = "☀️";
  } else {
    document.documentElement.setAttribute("data-theme", "light");
    el.themeToggle.textContent = "🌙";
  }
}

function populateThemeFilter() {
  for (const t of vocab.themes) {
    const opt = document.createElement("option");
    opt.value = t.id;
    opt.textContent = t.fr;
    el.themeFilter.appendChild(opt);
  }
  el.themeFilter.value = settings.themeFilter || "";
}

function buildQueue() {
  queue = getDueWords(vocab.words, progress, el.themeFilter.value || null);
  currentIndex = 0;
  renderCard();
}

function updateSessionCount() {
  el.sessionCount.textContent = queue.length
    ? `${Math.min(currentIndex + 1, queue.length)}/${queue.length}`
    : "0/0";
}

function renderCard() {
  flipped = false;
  el.flashcard.classList.remove("flipped");
  updateSessionCount();

  if (currentIndex >= queue.length) {
    el.cardArea.hidden = true;
    el.answerButtons.hidden = true;
    el.emptyState.hidden = false;
    return;
  }

  el.cardArea.hidden = false;
  el.emptyState.hidden = true;
  el.answerButtons.hidden = true;

  const word = queue[currentIndex];
  el.cardPos.textContent = word.pos || "";
  el.cardFr.textContent = word.fr;
  el.cardEn.textContent = word.en;
  el.cardExampleFr.textContent = word.example_fr || "";
  el.cardExampleEn.textContent = word.example_en || "";
}

function flipCard() {
  if (currentIndex >= queue.length) return;
  flipped = !flipped;
  el.flashcard.classList.toggle("flipped", flipped);
  el.answerButtons.hidden = !flipped;
}

function answer(known) {
  const word = queue[currentIndex];
  recordAnswer(progress, word.id, known);
  currentIndex += 1;
  renderCard();
}

function renderStats() {
  const overall = getStats(vocab.words, progress);
  el.statsSummary.innerHTML = `
    <div class="stat-tile">
      <span class="stat-value">${overall.total}</span>
      <span class="stat-label">mots au total</span>
    </div>
    <div class="stat-tile">
      <span class="stat-value">${overall.learned}</span>
      <span class="stat-label">déjà vus</span>
    </div>
    <div class="stat-tile">
      <span class="stat-value">${overall.mastered}</span>
      <span class="stat-label">maîtrisés</span>
    </div>
  `;

  el.statsThemes.innerHTML = "";
  for (const t of vocab.themes) {
    const words = vocab.words.filter((w) => w.theme === t.id);
    const s = getStats(words, progress);
    const pct = s.total ? Math.round((s.mastered / s.total) * 100) : 0;
    const row = document.createElement("div");
    row.className = "theme-row";
    row.innerHTML = `
      <div class="theme-row-header">
        <span>${t.fr}</span>
        <span class="theme-row-count">${s.mastered}/${s.total}</span>
      </div>
      <div class="progress-track">
        <div class="progress-fill" style="width: ${pct}%"></div>
      </div>
    `;
    el.statsThemes.appendChild(row);
  }
}

function switchView(viewId) {
  for (const view of el.views) {
    view.classList.toggle("active", view.id === viewId);
  }
  for (const btn of el.tabButtons) {
    btn.classList.toggle("active", btn.dataset.view === viewId);
  }
  if (viewId === "view-stats") renderStats();
}

function wireEvents() {
  el.themeToggle.addEventListener("click", () => {
    settings.dark = !settings.dark;
    saveSettings(settings);
    applyDarkMode();
  });

  el.themeFilter.addEventListener("change", () => {
    settings.themeFilter = el.themeFilter.value;
    saveSettings(settings);
    buildQueue();
  });

  el.flashcard.addEventListener("click", flipCard);
  el.btnKnown.addEventListener("click", () => answer(true));
  el.btnUnknown.addEventListener("click", () => answer(false));

  for (const btn of el.tabButtons) {
    btn.addEventListener("click", () => switchView(btn.dataset.view));
  }
}

async function init() {
  progress = loadProgress();
  settings = loadSettings();
  applyDarkMode();

  const res = await fetch("data/vocab.json");
  vocab = await res.json();

  populateThemeFilter();
  wireEvents();
  buildQueue();

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
}

init();
