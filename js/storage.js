const PROGRESS_KEY = "tef.progress.v1";
const SETTINGS_KEY = "tef.settings.v1";

const BOX_INTERVAL_DAYS = { 1: 0, 2: 1, 3: 3, 4: 7, 5: 14 };
const MAX_BOX = 5;

function todayISO() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function addDays(isoDate, days) {
  const [y, m, d] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function loadProgress() {
  try {
    return JSON.parse(localStorage.getItem(PROGRESS_KEY)) || {};
  } catch {
    return {};
  }
}

export function saveProgress(progress) {
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
}

export function loadSettings() {
  try {
    return JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {};
  } catch {
    return {};
  }
}

export function saveSettings(settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function recordAnswer(progress, wordId, known) {
  const entry = progress[wordId] || { box: 1, due: todayISO(), correct: 0, incorrect: 0 };
  if (known) {
    entry.box = Math.min(entry.box + 1, MAX_BOX);
    entry.correct += 1;
  } else {
    entry.box = 1;
    entry.incorrect += 1;
  }
  entry.due = addDays(todayISO(), BOX_INTERVAL_DAYS[entry.box]);
  entry.lastSeen = todayISO();
  progress[wordId] = entry;
  saveProgress(progress);
  return entry;
}

export function getDueWords(words, progress, themeId) {
  const today = todayISO();
  const pool = themeId ? words.filter((w) => w.theme === themeId) : words;
  const due = [];
  const fresh = [];
  for (const w of pool) {
    const entry = progress[w.id];
    if (!entry) {
      fresh.push(w);
    } else if (entry.due <= today) {
      due.push({ word: w, box: entry.box });
    }
  }
  due.sort((a, b) => a.box - b.box);
  return [...due.map((d) => d.word), ...fresh];
}

export function getStats(words, progress) {
  const total = words.length;
  let learned = 0;
  let mastered = 0;
  for (const w of words) {
    const entry = progress[w.id];
    if (entry) {
      learned += 1;
      if (entry.box === MAX_BOX) mastered += 1;
    }
  }
  return { total, learned, mastered, newCount: total - learned };
}
