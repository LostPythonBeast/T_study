import { ALGORITHMS, parseNumbers, buildTrace } from './algorithms.js';

const $ = selector => document.querySelector(selector);
const STORAGE_KEY = 'loop-lab-progress-v1';
let selected = 'drop';
let numbers = [];
let trace = null;
let stepIndex = 0;
let revealed = false;
let solved = new Set();

function message(text) { $('#notice').textContent = text; }
try {
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  if (!Array.isArray(saved) || saved.some(value => !Object.hasOwn(ALGORITHMS, value))) throw new Error();
  solved = new Set(saved);
} catch { message('Сохранённый прогресс недоступен. Тренажёр продолжает работать.'); }

function element(tag, text, className = '') {
  const node = document.createElement(tag); node.textContent = text; node.className = className; return node;
}
function renderProgress() {
  $('#progress-count').textContent = `${solved.size} / 3`;
  $('#progress-bar').style.width = `${solved.size / 3 * 100}%`;
  for (const button of document.querySelectorAll('[data-algorithm]')) {
    const kind = button.dataset.algorithm;
    button.classList.toggle('selected', kind === selected);
    button.setAttribute('aria-pressed', String(kind === selected));
    button.querySelector('.completed').textContent = solved.has(kind) ? '✓' : '';
  }
}

function prepare() {
  try {
    numbers = parseNumbers($('#numbers').value);
    trace = buildTrace(selected, numbers);
    stepIndex = 0; revealed = false;
    $('#input-error').textContent = '';
    $('#prediction-result').textContent = '';
    $('#prediction').value = '';
    $('#trace-workspace').hidden = true;
    $('#before-trace').hidden = false;
    $('#answer-result').textContent = 'Скрыт до разбора';
    $('#check-answer').disabled = false;
    $('#reveal').disabled = false;
    $('#prediction').disabled = false;
    renderArray(-1);
  } catch (error) {
    trace = null;
    $('#input-error').textContent = error.message;
    $('#check-answer').disabled = true;
    $('#reveal').disabled = true;
    $('#trace-workspace').hidden = true;
    $('#before-trace').hidden = false;
    $('#answer-result').textContent = 'Исправьте ввод';
    $('#array').replaceChildren();
  }
}

function renderArray(activeIndex) {
  $('#array').replaceChildren();
  numbers.forEach((number, index) => {
    const cell = element('div', '', `array-cell ${index === activeIndex ? 'current' : ''}`);
    cell.append(element('span', `i = ${index}`, 'index'), element('strong', number), element('span', `поз. ${index + 1}`, 'position'));
    $('#array').append(cell);
  });
}

function renderStep() {
  const step = trace.steps[stepIndex];
  $('#step-count').textContent = `${stepIndex + 1} / ${trace.steps.length}`;
  $('#step-description').textContent = step.text;
  $('#prev').disabled = stepIndex === 0;
  $('#next').disabled = stepIndex === trace.steps.length - 1;
  $('#answer-result').textContent = step.done ? String(trace.answer) : 'Вычисляем…';
  renderArray(step.index);
  $('#variables').replaceChildren();
  for (const [name, value] of Object.entries(step.variables)) {
    const row = element('div', '', 'variable'); row.append(element('span', name), element('strong', value)); $('#variables').append(row);
  }
  $('#frequency-panel').hidden = selected !== 'unique';
  $('#frequencies').replaceChildren();
  for (const [number, count] of step.frequencies) $('#frequencies').append(element('span', `${number} → ${count}`, 'frequency'));
  if (!step.frequencies.length) $('#frequencies').append(element('span', 'Map пока пуст', 'muted'));
  $('#code').replaceChildren();
  ALGORITHMS[selected].code.forEach((line, index) => {
    const row = element('div', '', `code-line ${index === step.line ? 'highlight' : ''}`);
    row.append(element('span', String(index + 1), 'line-number'), element('code', line));
    $('#code').append(row);
  });
}

function selectAlgorithm(kind) {
  selected = kind;
  const data = ALGORITHMS[kind];
  $('#task-title').textContent = data.title;
  $('#task-tag').textContent = data.tag;
  $('#task-text').textContent = data.task;
  $('#complexity').textContent = data.complexity;
  $('#numbers').value = data.example;
  renderProgress(); prepare();
}

for (const button of document.querySelectorAll('[data-algorithm]')) button.addEventListener('click', () => selectAlgorithm(button.dataset.algorithm));
$('#input-form').addEventListener('submit', event => { event.preventDefault(); prepare(); });
$('#numbers').addEventListener('input', prepare);
$('#example').addEventListener('click', () => { $('#numbers').value = ALGORITHMS[selected].example; prepare(); });
$('#predict-form').addEventListener('submit', event => {
  event.preventDefault();
  if (!trace || revealed) return;
  const raw = $('#prediction').value.trim();
  const correct = typeof trace.answer === 'number'
    ? /^-?\d+$/.test(raw) && Number(raw) === trace.answer
    : raw.toUpperCase() === 'NONE';
  $('#prediction-result').textContent = correct ? 'Верно! Теперь проверьте свою логику по шагам.' : 'Пока не совпало. Можно попробовать ещё раз или открыть разбор.';
  if (correct) {
    solved.add(selected); renderProgress();
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify([...solved])); }
    catch { message('Прогресс учтён на этой странице, но браузер не разрешил сохранить его.'); }
  }
});
$('#reveal').addEventListener('click', () => {
  if (!trace) return;
  revealed = true;
  $('#trace-workspace').hidden = false;
  $('#before-trace').hidden = true;
  $('#check-answer').disabled = true;
  $('#prediction').disabled = true;
  $('#prediction-result').textContent = 'Прогноз закрыт для этого разбора. Измените массив, чтобы начать новую попытку.';
  renderStep();
});
$('#prev').addEventListener('click', () => { if (stepIndex > 0) { stepIndex--; renderStep(); } });
$('#next').addEventListener('click', () => { if (stepIndex < trace.steps.length - 1) { stepIndex++; renderStep(); } });
$('#restart').addEventListener('click', () => { stepIndex = 0; renderStep(); });
$('#reset-progress').addEventListener('click', () => {
  if (!confirm('Сбросить отметки верных прогнозов по трём алгоритмам?')) return;
  solved.clear(); renderProgress();
  try { localStorage.removeItem(STORAGE_KEY); message('Прогресс сброшен.'); }
  catch { message('Отметки сброшены на странице. Удалить сохранение браузер не разрешил.'); }
});
selectAlgorithm('drop');
