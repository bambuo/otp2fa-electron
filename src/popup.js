const container = document.getElementById('items');
const openButton = document.getElementById('open-main');
const TIME_STEP_MS = 30000;

let timerRows = [];
let animationFrame = 0;

function barClassForPct(pct) {
  if (pct < 20) return 'danger';
  if (pct < 40) return 'warning';
  return '';
}

function getTimerState() {
  const elapsed = Date.now() % TIME_STEP_MS;
  const remainingMs = elapsed === 0 ? TIME_STEP_MS : TIME_STEP_MS - elapsed;
  return {
    pct: (remainingMs / TIME_STEP_MS) * 100,
    seconds: Math.ceil(remainingMs / 1000),
  };
}

function clearItems() {
  timerRows = [];
  while (container.firstChild) container.removeChild(container.firstChild);
}

function renderEmpty(text) {
  clearItems();
  const empty = document.createElement('div');
  empty.className = 'empty-state';
  empty.textContent = text;
  container.appendChild(empty);
}

function renderCodes(codes) {
  clearItems();
  for (const code of codes) {
    const item = document.createElement('div');
    item.className = 'item';

    const itemRow = document.createElement('div');
    itemRow.className = 'item-row';

    const info = document.createElement('div');
    info.className = 'info';
    const name = document.createElement('span');
    name.className = 'name';
    name.textContent = code.name;
    info.appendChild(name);

    const current = document.createElement('span');
    current.className = 'code';
    current.textContent = code.current;

    itemRow.appendChild(info);
    itemRow.appendChild(current);

    const timerRow = document.createElement('div');
    timerRow.className = 'timer-row';

    const timerTrack = document.createElement('div');
    timerTrack.className = 'timer-track';
    const timerBar = document.createElement('div');
    timerBar.className = 'timer-bar';
    timerTrack.appendChild(timerBar);

    const timerText = document.createElement('span');
    timerText.className = 'timer-text';
    timerText.textContent = `${code.remaining}s`;

    timerRow.appendChild(timerTrack);
    timerRow.appendChild(timerText);
    item.appendChild(itemRow);
    item.appendChild(timerRow);
    container.appendChild(item);
    timerRows.push({ bar: timerBar, text: timerText });
  }
  syncTimerProgress();
}

async function update() {
  try {
    const codes = await window.api.getTopCodes();
    if (!codes || codes.length === 0) {
      renderEmpty('暂无密钥');
      return;
    }
    renderCodes(codes);
  } catch (_) {
    renderEmpty('加载失败');
  }
}

function syncTimerProgress() {
  const { pct, seconds } = getTimerState();
  const tone = barClassForPct(pct);
  const scale = Math.max(0, Math.min(1, pct / 100));

  for (const row of timerRows) {
    row.bar.style.transform = `scaleX(${scale})`;
    row.bar.className = `timer-bar ${tone}`.trim();
    row.text.textContent = `${seconds}s`;
  }
}

function animateTimers() {
  syncTimerProgress();
  animationFrame = requestAnimationFrame(animateTimers);
}

openButton.addEventListener('click', async () => {
  try { await window.api.openMain(); } catch (_) {}
});

update();
setInterval(update, 1000);
animationFrame = requestAnimationFrame(animateTimers);
window.addEventListener('beforeunload', () => cancelAnimationFrame(animationFrame));
