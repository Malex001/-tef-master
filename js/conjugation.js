import { recordAnswer, getDueWords, getStats } from "./storage.js";

const AUX_PRESENT = {
  avoir: ["ai", "as", "a", "avons", "avez", "ont"],
  etre: ["suis", "es", "est", "sommes", "êtes", "sont"],
};

function normalize(str) {
  return str.trim().toLowerCase().replace(/\s+/g, " ");
}

function buildItems(data) {
  const items = [];
  for (const verb of data.verbs) {
    for (const tense of data.tenses) {
      for (let i = 0; i < data.pronouns.length; i++) {
        const pronoun = data.pronouns[i];
        let answer;
        if (tense.id === "passe_compose") {
          const aux = AUX_PRESENT[verb.aux][i];
          answer = `${aux} ${verb.participe}`;
        } else {
          answer = verb.forms[tense.id][i];
        }
        items.push({
          id: `${verb.infinitive}-${tense.id}-${i}`,
          theme: tense.id,
          verb: verb.infinitive,
          en: verb.en,
          pronoun,
          tenseLabel: tense.fr,
          answer,
        });
      }
    }
  }
  return items;
}

export function createConjugationApp(el) {
  let data = null;
  let items = [];
  let progress = {};
  let queue = [];
  let currentIndex = 0;
  let answered = false;

  function populateTenseFilter() {
    for (const t of data.tenses) {
      const opt = document.createElement("option");
      opt.value = t.id;
      opt.textContent = t.fr;
      el.tenseFilter.appendChild(opt);
    }
  }

  function buildQueue() {
    queue = getDueWords(items, progress, el.tenseFilter.value || null);
    currentIndex = 0;
    renderItem();
    renderStats();
  }

  function updateCount() {
    el.count.textContent = queue.length
      ? `${Math.min(currentIndex + 1, queue.length)}/${queue.length}`
      : "0/0";
  }

  function renderItem() {
    answered = false;
    updateCount();
    el.input.value = "";
    el.feedback.textContent = "";
    el.feedback.className = "conj-feedback";
    el.input.disabled = false;
    el.checkBtn.hidden = false;
    el.nextBtn.hidden = true;

    if (currentIndex >= queue.length) {
      el.quizArea.hidden = true;
      el.emptyState.hidden = false;
      return;
    }
    el.quizArea.hidden = false;
    el.emptyState.hidden = true;

    const item = queue[currentIndex];
    el.prompt.innerHTML = `<span class="conj-pronoun">${item.pronoun}</span> <span class="conj-verb">${item.verb}</span> <span class="conj-en">(${item.en})</span>`;
    el.tenseLabel.textContent = item.tenseLabel;
    el.input.focus();
  }

  function checkAnswer() {
    if (answered || currentIndex >= queue.length) return;
    answered = true;
    const item = queue[currentIndex];
    const correct = normalize(el.input.value) === normalize(item.answer);
    recordAnswer(progress, item.id, correct);

    el.feedback.textContent = correct
      ? "Correct !"
      : `Réponse : ${item.answer}`;
    el.feedback.className = "conj-feedback " + (correct ? "correct" : "incorrect");
    el.input.disabled = true;
    el.checkBtn.hidden = true;
    el.nextBtn.hidden = false;
    el.nextBtn.focus();
    renderStats();
  }

  function next() {
    currentIndex += 1;
    renderItem();
  }

  function renderStats() {
    const overall = getStats(items, progress);
    el.statsSummary.innerHTML = `
      <div class="stat-tile">
        <span class="stat-value">${overall.total}</span>
        <span class="stat-label">formes au total</span>
      </div>
      <div class="stat-tile">
        <span class="stat-value">${overall.learned}</span>
        <span class="stat-label">déjà vues</span>
      </div>
      <div class="stat-tile">
        <span class="stat-value">${overall.mastered}</span>
        <span class="stat-label">maîtrisées</span>
      </div>
    `;
    el.statsThemes.innerHTML = "";
    for (const t of data.tenses) {
      const tenseItems = items.filter((i) => i.theme === t.id);
      const s = getStats(tenseItems, progress);
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

  async function init(loadedProgress) {
    progress = loadedProgress;
    const res = await fetch("data/conjugations.json");
    data = await res.json();
    items = buildItems(data);
    populateTenseFilter();

    el.tenseFilter.addEventListener("change", buildQueue);
    el.checkBtn.addEventListener("click", checkAnswer);
    el.nextBtn.addEventListener("click", next);
    el.input.addEventListener("keydown", (e) => {
      if (e.key !== "Enter") return;
      if (!answered) checkAnswer();
      else next();
    });

    buildQueue();
  }

  return { init, renderStats };
}
