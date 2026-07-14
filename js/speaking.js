const SPEAKING_KEY = "tef.speaking.v1";

function loadChecklists() {
  try {
    return JSON.parse(localStorage.getItem(SPEAKING_KEY)) || {};
  } catch {
    return {};
  }
}

function saveChecklists(state) {
  localStorage.setItem(SPEAKING_KEY, JSON.stringify(state));
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function createSpeakingApp(el) {
  let data = { categories: [], checklist: [], prompts: [] };
  let checklistState = {};
  let currentPrompt = null;
  let timerId = null;
  let phase = "idle";
  let remaining = 0;
  let mediaRecorder = null;
  let mediaChunks = [];
  let mediaStream = null;
  const recordingSupported = "mediaDevices" in navigator && "MediaRecorder" in window;

  function getState(promptId) {
    return checklistState[promptId] || { checklist: [] };
  }

  function renderList() {
    el.promptList.innerHTML = "";
    el.promptList.hidden = false;
    el.promptView.hidden = true;

    for (const prompt of data.prompts) {
      const catLabel = data.categories.find((c) => c.id === prompt.category)?.fr || prompt.category;
      const state = getState(prompt.id);
      const checkedCount = state.checklist.filter(Boolean).length;
      const card = document.createElement("button");
      card.className = "reading-card";
      card.innerHTML = `
        <div class="reading-card-header">
          <span class="reading-type-badge">${catLabel}</span>
          <span class="reading-difficulty">${formatTime(prompt.speakSeconds)}</span>
        </div>
        <div class="reading-card-title">${prompt.title}</div>
        <div class="reading-card-progress">${checkedCount}/${data.checklist.length} vérifications</div>
      `;
      card.addEventListener("click", () => openPrompt(prompt));
      el.promptList.appendChild(card);
    }
  }

  function stopTimer() {
    if (timerId) {
      clearInterval(timerId);
      timerId = null;
    }
  }

  function stopRecording() {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
    }
    if (mediaStream) {
      mediaStream.getTracks().forEach((t) => t.stop());
      mediaStream = null;
    }
  }

  function resetSession() {
    stopTimer();
    stopRecording();
    phase = "idle";
    el.timerDisplay.textContent = "";
    el.phaseLabel.textContent = "";
    el.startBtn.hidden = false;
    el.playback.hidden = true;
    el.playback.src = "";
    el.recordingNotice.hidden = true;
  }

  function openPrompt(prompt) {
    currentPrompt = prompt;
    el.promptList.hidden = true;
    el.promptView.hidden = false;
    el.promptTitle.textContent = prompt.title;
    el.promptInstructions.textContent = prompt.instructions;
    el.vocab.innerHTML = prompt.vocab.map((v) => `<span class="connector-chip">${v}</span>`).join("");
    el.recordingNotice.hidden = recordingSupported;

    const state = getState(prompt.id);
    el.checklistArea.innerHTML = "";
    data.checklist.forEach((item, i) => {
      const label = document.createElement("label");
      label.className = "checklist-item";
      const checked = state.checklist[i] ? "checked" : "";
      label.innerHTML = `<input type="checkbox" data-index="${i}" ${checked}/> <span>${item}</span>`;
      el.checklistArea.appendChild(label);
    });

    resetSession();
  }

  function persistChecklist() {
    if (!currentPrompt) return;
    const checkboxes = [...el.checklistArea.querySelectorAll("input[type=checkbox]")];
    checklistState[currentPrompt.id] = { checklist: checkboxes.map((cb) => cb.checked) };
    saveChecklists(checklistState);
  }

  async function startRecording() {
    if (!recordingSupported) return;
    try {
      mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaChunks = [];
      mediaRecorder = new MediaRecorder(mediaStream);
      mediaRecorder.addEventListener("dataavailable", (e) => {
        if (e.data.size > 0) mediaChunks.push(e.data);
      });
      mediaRecorder.addEventListener("stop", () => {
        if (mediaChunks.length) {
          const blob = new Blob(mediaChunks, { type: "audio/webm" });
          el.playback.src = URL.createObjectURL(blob);
          el.playback.hidden = false;
        }
      });
      mediaRecorder.start();
    } catch {
      el.recordingNotice.hidden = false;
    }
  }

  function tick() {
    remaining -= 1;
    el.timerDisplay.textContent = formatTime(Math.max(remaining, 0));
    if (remaining <= 0) {
      stopTimer();
      if (phase === "prep") {
        beginSpeakPhase();
      } else if (phase === "speak") {
        stopRecording();
        phase = "done";
        el.phaseLabel.textContent = "Terminé";
      }
    }
  }

  function beginSpeakPhase() {
    phase = "speak";
    remaining = currentPrompt.speakSeconds;
    el.phaseLabel.textContent = "Parle maintenant";
    el.timerDisplay.textContent = formatTime(remaining);
    startRecording();
    timerId = setInterval(tick, 1000);
  }

  function startSession() {
    el.startBtn.hidden = true;
    el.playback.hidden = true;
    phase = "prep";
    remaining = currentPrompt.prepSeconds;
    el.phaseLabel.textContent = "Préparation";
    el.timerDisplay.textContent = formatTime(remaining);
    timerId = setInterval(tick, 1000);
  }

  function wireEvents() {
    el.startBtn.addEventListener("click", startSession);
    el.restartBtn.addEventListener("click", () => {
      resetSession();
    });
    el.checklistArea.addEventListener("change", persistChecklist);
    el.backBtn.addEventListener("click", () => {
      resetSession();
      renderList();
    });
  }

  async function init() {
    checklistState = loadChecklists();
    wireEvents();
    const res = await fetch("data/speaking.json");
    data = await res.json();
    renderList();
  }

  return { init };
}
