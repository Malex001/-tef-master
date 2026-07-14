import {
  loadProgress,
  loadSettings,
  saveSettings,
  recordAnswer,
  getDueWords,
  getStats,
} from "./storage.js";
import { createConjugationApp } from "./conjugation.js";
import { createReadingApp } from "./reading.js";
import { createWritingApp } from "./writing.js";
import { createListeningApp } from "./listening.js";
import { createSpeakingApp } from "./speaking.js";

let vocab = { themes: [], words: [] };
let progress = {};
let settings = {};
let queue = [];
let currentIndex = 0;
let flipped = false;
let conjugationApp = null;
let readingApp = null;
let writingApp = null;
let listeningApp = null;
let speakingApp = null;

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
  if (viewId === "view-conjugation" && conjugationApp) conjugationApp.renderStats();
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

  conjugationApp = createConjugationApp({
    tenseFilter: document.getElementById("tense-filter"),
    count: document.getElementById("conj-count"),
    quizArea: document.getElementById("conj-quiz-area"),
    prompt: document.getElementById("conj-prompt"),
    tenseLabel: document.getElementById("conj-tense-label"),
    input: document.getElementById("conj-input"),
    feedback: document.getElementById("conj-feedback"),
    checkBtn: document.getElementById("conj-check"),
    nextBtn: document.getElementById("conj-next"),
    emptyState: document.getElementById("conj-empty-state"),
    statsSummary: document.getElementById("conj-stats-summary"),
    statsThemes: document.getElementById("conj-stats-themes"),
  });
  await conjugationApp.init(progress);

  readingApp = createReadingApp({
    passageList: document.getElementById("reading-passage-list"),
    passageView: document.getElementById("reading-passage-view"),
    passageTitle: document.getElementById("reading-passage-title"),
    passageText: document.getElementById("reading-passage-text"),
    questionArea: document.getElementById("reading-question-area"),
    questionCount: document.getElementById("reading-question-count"),
    questionText: document.getElementById("reading-question-text"),
    options: document.getElementById("reading-options"),
    nextBtn: document.getElementById("reading-next-btn"),
    resultArea: document.getElementById("reading-result-area"),
    backBtn: document.getElementById("reading-back-btn"),
  });
  await readingApp.init(progress);

  writingApp = createWritingApp({
    promptList: document.getElementById("writing-prompt-list"),
    promptView: document.getElementById("writing-prompt-view"),
    promptTitle: document.getElementById("writing-prompt-title"),
    promptInstructions: document.getElementById("writing-prompt-instructions"),
    promptTarget: document.getElementById("writing-prompt-target"),
    connectors: document.getElementById("writing-connectors"),
    textarea: document.getElementById("writing-textarea"),
    wordCount: document.getElementById("writing-word-count"),
    checklistArea: document.getElementById("writing-checklist"),
    backBtn: document.getElementById("writing-back-btn"),
  });
  await writingApp.init();

  listeningApp = createListeningApp({
    itemList: document.getElementById("listening-item-list"),
    itemView: document.getElementById("listening-item-view"),
    itemTitle: document.getElementById("listening-item-title"),
    unsupportedNotice: document.getElementById("listening-unsupported"),
    playBtn: document.getElementById("listening-play-btn"),
    slowBtn: document.getElementById("listening-slow-btn"),
    toggleTranscriptBtn: document.getElementById("listening-toggle-transcript-btn"),
    transcript: document.getElementById("listening-transcript"),
    questionArea: document.getElementById("listening-question-area"),
    questionCount: document.getElementById("listening-question-count"),
    questionText: document.getElementById("listening-question-text"),
    options: document.getElementById("listening-options"),
    nextBtn: document.getElementById("listening-next-btn"),
    resultArea: document.getElementById("listening-result-area"),
    backBtn: document.getElementById("listening-back-btn"),
  });
  await listeningApp.init(progress);

  speakingApp = createSpeakingApp({
    promptList: document.getElementById("speaking-prompt-list"),
    promptView: document.getElementById("speaking-prompt-view"),
    promptTitle: document.getElementById("speaking-prompt-title"),
    promptInstructions: document.getElementById("speaking-prompt-instructions"),
    vocab: document.getElementById("speaking-vocab"),
    recordingNotice: document.getElementById("speaking-recording-notice"),
    phaseLabel: document.getElementById("speaking-phase-label"),
    timerDisplay: document.getElementById("speaking-timer"),
    startBtn: document.getElementById("speaking-start-btn"),
    restartBtn: document.getElementById("speaking-restart-btn"),
    playback: document.getElementById("speaking-playback"),
    checklistArea: document.getElementById("speaking-checklist"),
    backBtn: document.getElementById("speaking-back-btn"),
  });
  await speakingApp.init();

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
}

init();
