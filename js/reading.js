import { recordAnswer } from "./storage.js";

function passageCompletion(passage, progress) {
  let answered = 0;
  let correct = 0;
  passage.questions.forEach((_, i) => {
    const id = `${passage.id}-q${i}`;
    const entry = progress[id];
    if (entry) {
      answered += 1;
      if (entry.box > 1) correct += 1;
    }
  });
  return { answered, correct, total: passage.questions.length };
}

export function createReadingApp(el) {
  let data = { types: [], passages: [] };
  let progress = {};
  let currentPassage = null;
  let currentQuestionIndex = 0;
  let selectedOption = null;
  let answered = false;

  function renderList() {
    el.passageList.innerHTML = "";
    el.passageList.hidden = false;
    el.passageView.hidden = true;

    for (const passage of data.passages) {
      const typeLabel = data.types.find((t) => t.id === passage.type)?.fr || passage.type;
      const stat = passageCompletion(passage, progress);
      const card = document.createElement("button");
      card.className = "reading-card";
      card.innerHTML = `
        <div class="reading-card-header">
          <span class="reading-type-badge">${typeLabel}</span>
          <span class="reading-difficulty">${passage.difficulty}</span>
        </div>
        <div class="reading-card-title">${passage.title}</div>
        <div class="reading-card-progress">${stat.correct}/${stat.total} bonnes réponses</div>
      `;
      card.addEventListener("click", () => openPassage(passage));
      el.passageList.appendChild(card);
    }
  }

  function openPassage(passage) {
    currentPassage = passage;
    currentQuestionIndex = 0;
    el.passageList.hidden = true;
    el.passageView.hidden = false;
    el.passageTitle.textContent = passage.title;
    el.passageText.textContent = passage.text;
    renderQuestion();
  }

  function renderQuestion() {
    answered = false;
    selectedOption = null;
    const question = currentPassage.questions[currentQuestionIndex];

    if (!question) {
      const stat = passageCompletion(currentPassage, progress);
      el.questionArea.hidden = true;
      el.resultArea.hidden = false;
      el.resultArea.innerHTML = `
        <p class="reading-result">Terminé ! Score : ${stat.correct}/${stat.total}</p>
        <button id="reading-back-btn" class="btn btn-primary">Retour aux textes</button>
      `;
      document.getElementById("reading-back-btn").addEventListener("click", renderList);
      return;
    }

    el.questionArea.hidden = false;
    el.resultArea.hidden = true;
    el.questionCount.textContent = `Question ${currentQuestionIndex + 1}/${currentPassage.questions.length}`;
    el.questionText.textContent = question.q;
    el.options.innerHTML = "";

    question.options.forEach((opt, i) => {
      const btn = document.createElement("button");
      btn.className = "reading-option";
      btn.textContent = opt;
      btn.addEventListener("click", () => selectOption(i, btn));
      el.options.appendChild(btn);
    });

    el.nextBtn.hidden = true;
  }

  function selectOption(index, btnEl) {
    if (answered) return;
    answered = true;
    selectedOption = index;
    const question = currentPassage.questions[currentQuestionIndex];
    const correct = index === question.correct;
    const id = `${currentPassage.id}-q${currentQuestionIndex}`;
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

  function init(loadedProgress) {
    progress = loadedProgress;
    el.nextBtn.addEventListener("click", nextQuestion);
    el.backBtn.addEventListener("click", renderList);
    return fetch("data/reading.json")
      .then((res) => res.json())
      .then((json) => {
        data = json;
        renderList();
      });
  }

  function getSummary() {
    let correct = 0;
    let total = 0;
    let passagesStarted = 0;
    for (const passage of data.passages) {
      const stat = passageCompletion(passage, progress);
      correct += stat.correct;
      total += stat.total;
      if (stat.answered > 0) passagesStarted += 1;
    }
    return { correct, total, passagesStarted, passagesTotal: data.passages.length };
  }

  return { init, getSummary };
}
