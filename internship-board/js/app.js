import { STATUSES, STORAGE_KEY, validateEntry, parseBackup, selectEntries, isOverdue, isActive, todayISO, demoEntries } from './model.js';

const $ = selector => document.querySelector(selector);
const form = $('#entry-form');
const dialog = $('#editor');
let entries = [];
let editingId = null;
let undo = null;
let unreadableStorage = false;

function notify(message) { $('#message').textContent = message; }

try {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved !== null) entries = parseBackup(saved);
} catch {
  unreadableStorage = true;
  notify('Не удалось прочитать сохранённые данные. Экспортируйте исходную копию перед новыми изменениями.');
  $('#recover').hidden = false;
}

function persist(next) {
  if (unreadableStorage && !confirm('Заменить нечитаемые локальные данные? Сначала можно скачать исходную копию.')) return false;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, entries: next }));
    unreadableStorage = false;
    $('#recover').hidden = true;
    entries = next;
    render();
    return true;
  } catch {
    notify('Сохранение недоступно. Изменение не применено. Проверьте настройки браузера и свободное место.');
    return false;
  }
}

function node(tag, text, className = '') {
  const element = document.createElement(tag);
  element.textContent = text;
  if (className) element.className = className;
  return element;
}

function formatDate(value) {
  if (!value) return 'Без срока';
  const [y, m, d] = value.split('-');
  return `${d}.${m}.${y}`;
}

function render() {
  const filtered = selectEntries(entries, $('#search').value, $('#filter-status').value, $('#sort').value);
  $('#total').textContent = entries.length;
  $('#active').textContent = entries.filter(isActive).length;
  $('#late').textContent = entries.filter(e => isOverdue(e)).length;
  $('#offers').textContent = entries.filter(e => e.status === 'offer').length;
  $('#visible-count').textContent = `${filtered.length} из ${entries.length}`;
  $('#cards').replaceChildren();
  $('#empty').hidden = filtered.length > 0;
  $('#empty-title').textContent = entries.length ? 'Ничего не найдено' : 'Начните с одного отклика';
  $('#empty-text').textContent = entries.length ? 'Измените поиск или статус.' : 'Добавьте вакансию или откройте вымышленные примеры.';
  $('#demo').hidden = entries.length > 0;
  for (const entry of filtered) {
    const card = node('article', '', `job-card status-${entry.status}`);
    const top = node('div', '', 'card-top');
    const label = node('span', entry.company.slice(0, 1).toUpperCase(), 'company-mark');
    const heading = node('div', '', 'job-heading');
    heading.append(node('p', entry.company, 'company'), node('h3', entry.role));
    top.append(label, heading, node('span', STATUSES[entry.status], `badge ${entry.status}`));
    const footer = node('div', '', 'card-footer');
    footer.append(node('span', `${isOverdue(entry) ? 'Срок прошёл · ' : ''}${formatDate(entry.deadline)}`, isOverdue(entry) ? 'overdue' : 'due'));
    const actions = node('div', '', 'card-actions');
    if (entry.url) {
      const link = node('a', 'Вакансия ↗');
      link.href = entry.url; link.target = '_blank'; link.rel = 'noopener noreferrer';
      actions.append(link);
    }
    const edit = node('button', 'Изменить', 'text-button');
    edit.setAttribute('aria-label', `Изменить отклик ${entry.company}`);
    edit.addEventListener('click', () => openEditor(entry));
    const remove = node('button', 'Удалить', 'text-button muted');
    remove.setAttribute('aria-label', `Удалить отклик ${entry.company}`);
    remove.addEventListener('click', () => {
      const previous = entries;
      if (persist(entries.filter(item => item.id !== entry.id))) {
        undo = previous; $('#undo').hidden = false; notify(`Отклик «${entry.company}» удалён. Можно отменить.`);
      }
    });
    actions.append(edit, remove); footer.append(actions);
    card.append(top, node('p', entry.next || 'Следующий шаг пока не указан', 'next-step'), footer);
    $('#cards').append(card);
  }
  const nearest = selectEntries(entries.filter(e => isActive(e) && e.deadline >= todayISO()));
  $('#nearest').textContent = nearest.length ? `${nearest[0].company} · ${formatDate(nearest[0].deadline)}` : 'Пока нет ближайших сроков';
}

function openEditor(entry = null) {
  form.reset(); editingId = entry?.id ?? null;
  $('#editor-title').textContent = entry ? 'Изменить отклик' : 'Новый отклик';
  $('#form-error').textContent = '';
  if (entry) for (const field of ['company', 'role', 'status', 'deadline', 'next', 'url']) form.elements[field].value = entry[field];
  dialog.showModal();
}

for (const [value, text] of Object.entries(STATUSES)) {
  for (const select of [form.elements.status, $('#filter-status')]) {
    const option = node('option', text); option.value = value; select.append(option);
  }
}
$('#new-entry').addEventListener('click', () => openEditor());
$('#cancel').addEventListener('click', () => dialog.close());
form.addEventListener('submit', event => {
  event.preventDefault();
  try {
    const clean = validateEntry(Object.fromEntries(new FormData(form)));
    if (!editingId && entries.length >= 1000) throw new Error('Достигнут предел: 1000 откликов.');
    const entry = { id: editingId ?? crypto.randomUUID(), ...clean };
    const next = editingId ? entries.map(item => item.id === editingId ? entry : item) : [...entries, entry];
    if (persist(next)) { dialog.close(); undo = null; $('#undo').hidden = true; notify('Отклик сохранён.'); }
  } catch (error) { $('#form-error').textContent = error.message; }
});
for (const id of ['search', 'filter-status', 'sort']) $(`#${id}`).addEventListener('input', render);
$('#reset-filters').addEventListener('click', () => { $('#search').value = ''; $('#filter-status').value = ''; render(); });
$('#demo').addEventListener('click', () => { if (persist(demoEntries())) notify('Открыты вымышленные примеры. Их можно изменять и удалять.'); });
$('#undo').addEventListener('click', () => { if (undo && persist(undo)) { undo = null; $('#undo').hidden = true; notify('Удаление отменено.'); } });

function download(text, filename) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const link = document.createElement('a'); link.href = url; link.download = filename; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
$('#export').addEventListener('click', () => download(JSON.stringify({ version: 1, entries }, null, 2), 'internship-board.json'));
$('#recover').addEventListener('click', () => {
  try { download(localStorage.getItem(STORAGE_KEY) ?? '', 'internship-board-recovery.txt'); }
  catch { notify('Браузер блокирует чтение хранилища.'); }
});
$('#import').addEventListener('change', async event => {
  const file = event.target.files[0];
  if (!file) return;
  try {
    if (file.size > 3000000) throw new Error('Файл слишком большой. Максимум 3 МБ.');
    const next = parseBackup(await file.text());
    if (!confirm(`Заменить текущие ${entries.length} записей на ${next.length} из файла?`)) return;
    if (persist(next)) { undo = null; $('#undo').hidden = true; notify('Резервная копия восстановлена.'); }
  } catch (error) { notify(`Импорт отменён: ${error.message}`); }
  finally { event.target.value = ''; }
});
// Повторный расчёт сроков после возвращения на вкладку и в полночь.
document.addEventListener('visibilitychange', () => { if (!document.hidden) render(); });
setInterval(render, 60000);
render();
