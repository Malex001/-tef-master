import { recordAnswer } from "./storage.js";

function itemCompletion(item, progress) {
  let correct = 0;
  item.questions.forEach((_, i) => {
    const entry = progress[`${item.id}-q${i}`];
    if (entry && entry.box > 1) correct += 1;
  });
  return { correct, total: item.questions.length };
}

function pickFrenchVoice() {
  if (!("speechSynthesis" in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  return (
    voices.find((v) => v.lang === "fr-CA") ||
    voices.find((v) => v.lang && v.lang.toLowerCase().startsWith("fr")) ||
    null
  );
}

export function createListeningApp(el) {
  let data = { types: [], items: [] };
  let progress = {};
  let currentItem = null;
  let currentQuestionIndex = 0;
  let rate = 1;
  const supported = "speechSynthesis" in window;

  function speak(text) {
    if (!supported) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "fr-FR";
    utter.rate = rate;
    const voice = pickFrenchVoice();
    if (voice) utter.voice = voice;
    window.speechSynthesis.speak(utter);
  }

  function renderList() {
    el.itemList.innerHTML = "";
    el.itemList.hidden = false;
    el.itemView.hidden = true;

    for (const item of data.items) {
      const typeLabel = data.types.find((t) => t.id === item.type)?.fr || item.type;
      const stat = itemCompletion(item, progress);
      const card = document.createElement("button");
      card.className = "reading-card";
      card.innerHTML = `
        <div class="reading-card-header">
          <span class="reading-type-badge">${typeLabel}</span>
          <span class="reading-difficulty">${item.difficulty}</span>
        </div>
        <div class="reading-card-title">${item.title}</div>
        <div class="reading-card-progress">${stat.correct}/${stat.total} bonnes réponses</div>
      `;
      card.addEventListener("click", () => openItem(item));
      el.itemList.appendChild(card);
    }
  }

  function openItem(item) {
    currentItem = item;
    currentQuestionIndex = 0;
    rate = 1;
    el.itemList.hidden = true;
    el.itemView.hidden = false;
    el.itemTitle.textContent = item.title;
    el.transcript.textContent = item.transcript;
    el.transcript.hidden = true;
    el.toggleTranscriptBtn.textContent = "Afficher la transcription";
    el.unsupportedNotice.hidden = supported;
    if (!supported) el.transcript.hidden = false;
    renderQuestion();
  }

  function renderQuestion() {
    const question = currentItem.questions[currentQuestionIndex];

    if (!question) {
      const stat = itemCompletion(currentItem, progress);
      el.questionArea.hidden = true;
      el.resultArea.hidden = false;
      el.resultArea.innerHTML = `
        <p class="reading-result">Terminé ! Score : ${stat.correct}/${stat.total}</p>
        <button id="listening-back-result-btn" class="btn btn-primary">Retour aux écoutes</button>
      `;
      document.getElementById("listening-back-result-btn").addEventListener("click", renderList);
      return;
    }

    el.questionArea.hidden = false;
    el.resultArea.hidden = true;
    el.questionCount.textContent = `Question ${currentQuestionIndex + 1}/${currentItem.questions.length}`;
    el.questionText.textContent = question.q;
    el.options.innerHTML = "";

    question.options.forEach((opt, i) => {
      const btn = document.createElement("button");
      btn.className = "reading-option";
      btn.textContent = opt;
      btn.addEventListener("click", () => selectOption(i));
      el.options.appendChild(btn);
    });

    el.nextBtn.hidden = true;
  }

  function selectOption(index) {
    const question = currentItem.questions[currentQuestionIndex];
    const correct = index === question.correct;
    const id = `${currentItem.id}-q${currentQuestionIndex}`;
    recordAnswer(progress, id, correct);

    [...el.options.children].forEach((child, i) => {
      child.classList.add("disabled");
      if (i === question.correct) child.classList.add("correct");
      if (i === index && !correct) child.classList.add("incorrect");
    });

    el.nextBtn.hidden = false;
    el.nextBtn.focus();
  }

  function nextQuestion() {
    currentQuestionIndex += 1;
    renderQuestion();
  }

  function wireEvents() {
    el.playBtn.addEventListener("click", () => speak(currentItem.transcript));
    el.slowBtn.addEventListener("click", () => {
      rate = 0.7;
      speak(currentItem.transcript);
    });
    el.toggleTranscriptBtn.addEventListener("click", () => {
      el.transcript.hidden = !el.transcript.hidden;
      el.toggleTranscriptBtn.textContent = el.transcript.hidden
        ? "Afficher la transcription"
        : "Masquer la transcription";
    });
    el.nextBtn.addEventListener("click", nextQuestion);
    el.backBtn.addEventListener("click", renderList);
  }

  async function init(loadedProgress) {
    progress = loadedProgress;
    wireEvents();
    const res = await fetch("data/listening.json");
    data = await res.json();
    renderList();
  }

  function getSummary() {
    let correct = 0;
    let total = 0;
    let itemsStarted = 0;
    for (const item of data.items) {
      const stat = itemCompletion(item, progress);
      correct += stat.correct;
      total += stat.total;
      const anyAnswered = item.questions.some((_, i) => progress[`${item.id}-q${i}`]);
      if (anyAnswered) itemsStarted += 1;
    }
    return { correct, total, itemsStarted, itemsTotal: data.items.length };
  }

  return { init, getSummary };
}
