const WRITING_KEY = "tef.writing.v1";

function loadDrafts() {
  try {
    return JSON.parse(localStorage.getItem(WRITING_KEY)) || {};
  } catch {
    return {};
  }
}

function saveDrafts(drafts) {
  localStorage.setItem(WRITING_KEY, JSON.stringify(drafts));
}

function countWords(text) {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

export function createWritingApp(el) {
  let data = { prompts: [], checklist: [] };
  let drafts = {};
  let currentPrompt = null;

  function getDraft(promptId) {
    return drafts[promptId] || { text: "", checklist: [] };
  }

  function renderList() {
    el.promptList.innerHTML = "";
    el.promptList.hidden = false;
    el.promptView.hidden = true;

    for (const prompt of data.prompts) {
      const draft = getDraft(prompt.id);
      const wordCount = countWords(draft.text);
      const checkedCount = draft.checklist.filter(Boolean).length;
      const card = document.createElement("button");
      card.className = "reading-card";
      card.innerHTML = `
        <div class="reading-card-header">
          <span class="reading-type-badge">Section ${prompt.section}</span>
          <span class="reading-difficulty">${prompt.minWords}-${prompt.maxWords} mots</span>
        </div>
        <div class="reading-card-title">${prompt.title}</div>
        <div class="reading-card-progress">${wordCount} mots écrits · ${checkedCount}/${data.checklist.length} vérifications</div>
      `;
      card.addEventListener("click", () => openPrompt(prompt));
      el.promptList.appendChild(card);
    }
  }

  function openPrompt(prompt) {
    currentPrompt = prompt;
    el.promptList.hidden = true;
    el.promptView.hidden = false;

    el.promptTitle.textContent = prompt.title;
    el.promptInstructions.textContent = prompt.instructions;
    el.promptTarget.textContent = `Cible : ${prompt.minWords}-${prompt.maxWords} mots`;
    el.connectors.innerHTML = prompt.connectors
      .map((c) => `<span class="connector-chip">${c}</span>`)
      .join("");

    const draft = getDraft(prompt.id);
    el.textarea.value = draft.text;
    updateWordCount();

    el.checklistArea.innerHTML = "";
    data.checklist.forEach((item, i) => {
      const label = document.createElement("label");
      label.className = "checklist-item";
      const checked = draft.checklist[i] ? "checked" : "";
      label.innerHTML = `<input type="checkbox" data-index="${i}" ${checked}/> <span>${item}</span>`;
      el.checklistArea.appendChild(label);
    });
  }

  function updateWordCount() {
    const count = countWords(el.textarea.value);
    const prompt = currentPrompt;
    el.wordCount.textContent = `${count} mots`;
    el.wordCount.classList.remove("word-count-ok", "word-count-off");
    if (prompt && count >= prompt.minWords && count <= prompt.maxWords) {
      el.wordCount.classList.add("word-count-ok");
    } else if (count > 0) {
      el.wordCount.classList.add("word-count-off");
    }
  }

  function persistDraft() {
    if (!currentPrompt) return;
    const checkboxes = [...el.checklistArea.querySelectorAll("input[type=checkbox]")];
    const checklist = checkboxes.map((cb) => cb.checked);
    drafts[currentPrompt.id] = { text: el.textarea.value, checklist };
    saveDrafts(drafts);
  }

  function wireEvents() {
    el.textarea.addEventListener("input", () => {
      updateWordCount();
      persistDraft();
    });
    el.checklistArea.addEventListener("change", persistDraft);
    el.backBtn.addEventListener("click", () => {
      renderList();
    });
  }

  async function init() {
    drafts = loadDrafts();
    wireEvents();
    const res = await fetch("data/writing.json");
    data = await res.json();
    renderList();
  }

  return { init };
}
