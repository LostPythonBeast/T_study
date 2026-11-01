import { CATEGORIES, STORAGE_KEY, todayISO, parseMoney, validateExpense, monthSummary, parseSaved } from './model.js';
const $ = selector => document.querySelector(selector);
const form = $('#expense-form');
const money = cents => new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 2 }).format(cents / 100);
let data = { version: 1, expenses: [], budgets: {} };
let editingId = null;
let unreadable = false;
function say(text) { $('#message').textContent = text; }
function node(tag, text, cls = '') { const item = document.createElement(tag); item.textContent = text; item.className = cls; return item; }
try { const saved = localStorage.getItem(STORAGE_KEY); if (saved !== null) data = parseSaved(saved); }
catch { unreadable = true; say('Сохранение недоступно или повреждено. Перед заменой можно скачать исходную копию.'); $('#recovery').hidden = false; }

function save(next) {
  if (unreadable && !confirm('Заменить нечитаемые локальные данные? Сначала можно скачать исходную копию.')) return false;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); data = next; unreadable = false;
    $('#recovery').hidden = true; render(); return true;
  } catch { say('Не удалось сохранить изменение. Проверьте настройки браузера.'); return false; }
}
function clearForm() {
  editingId = null; form.reset(); form.elements.date.value = todayISO();
  $('#form-heading').textContent = 'Новый расход'; $('#save-expense').textContent = 'Добавить расход';
  $('#cancel-edit').hidden = true; $('#form-error').textContent = '';
}
function render() {
  const month = $('#month').value;
  const { rows, total, categories } = monthSummary(data.expenses, month);
  const budget = data.budgets[month];
  $('#spent').textContent = money(total);
  $('#count').textContent = `${rows.length} записей за месяц`;
  $('#limit').textContent = budget ? money(budget) : 'Не задан';
  $('#remaining').textContent = budget ? money(budget - total) : '—';
  $('#remaining').classList.toggle('negative', Boolean(budget && total > budget));
  $('#budget-amount').value = budget ? (budget / 100).toFixed(2) : '';
  $('#budget-note').textContent = budget ? (total > budget ? 'Лимит превышен' : 'Остаток до месячного лимита') : 'Задайте лимит для выбранного месяца';
  $('#budget-meter').style.width = budget ? `${Math.min(100, total / budget * 100)}%` : '0%';
  $('#bars').replaceChildren();
  for (const [key, title] of Object.entries(CATEGORIES)) {
    if (!categories[key]) continue;
    const group = node('div', '', 'category-row');
    const heading = node('div', '', 'bar-label'); heading.append(node('span', title), node('strong', money(categories[key])));
    const bar = node('div', '', 'bar-track'); const fill = node('span', '', `bar-fill ${key}`);
    fill.style.width = `${categories[key] / total * 100}%`; bar.append(fill); group.append(heading, bar); $('#bars').append(group);
  }
  $('#no-chart').hidden = total > 0;
  $('#expenses').replaceChildren();
  const visible = rows.filter(item => !$('#category-filter').value || item.category === $('#category-filter').value);
  $('#empty').hidden = visible.length > 0;
  for (const item of visible) {
    const row = node('article', '', 'expense-row');
    const details = node('div', '', 'expense-details');
    details.append(node('h3', item.title), node('p', `${item.date.split('-').reverse().join('.')} · ${CATEGORIES[item.category]}`));
    const actions = node('div', '', 'row-actions');
    const edit = node('button', 'Изменить', 'text-button'); edit.setAttribute('aria-label', `Изменить ${item.title}`);
    edit.addEventListener('click', () => {
      editingId = item.id; form.elements.title.value = item.title; form.elements.category.value = item.category;
      form.elements.date.value = item.date; form.elements.amount.value = (item.cents / 100).toFixed(2);
      $('#form-heading').textContent = 'Изменить расход'; $('#save-expense').textContent = 'Сохранить'; $('#cancel-edit').hidden = false; $('#form-error').textContent = '';
      form.scrollIntoView({ behavior: 'auto', block: 'center' }); form.elements.title.focus();
    });
    const remove = node('button', 'Удалить', 'text-button'); remove.setAttribute('aria-label', `Удалить ${item.title}`);
    remove.addEventListener('click', () => {
      if (!confirm(`Удалить «${item.title}»?`)) return;
      if (save({ ...data, expenses: data.expenses.filter(row => row.id !== item.id) })) { if (editingId === item.id) clearForm(); say('Расход удалён.'); }
    });
    actions.append(edit, remove); row.append(details, node('strong', money(item.cents), 'expense-amount'), actions); $('#expenses').append(row);
  }
}
for (const [key, text] of Object.entries(CATEGORIES)) {
  for (const select of [form.elements.category, $('#category-filter')]) { const option = node('option', text); option.value = key; select.append(option); }
}
$('#month').value = todayISO().slice(0, 7);
form.addEventListener('submit', event => {
  event.preventDefault();
  try {
    if (!editingId && data.expenses.length >= 2000) throw new Error('Предел — 2000 расходов.');
    const clean = validateExpense(Object.fromEntries(new FormData(form)));
    const item = { id: editingId || crypto.randomUUID(), ...clean };
    const expenses = editingId ? data.expenses.map(row => row.id === editingId ? item : row) : [...data.expenses, item];
    const previousMonth = $('#month').value; $('#month').value = item.date.slice(0, 7);
    if (save({ ...data, expenses })) { clearForm(); say('Расход сохранён.'); }
    else $('#month').value = previousMonth;
  } catch (error) { $('#form-error').textContent = error.message; }
});
$('#budget-form').addEventListener('submit', event => {
  event.preventDefault();
  try { const cents = parseMoney($('#budget-amount').value); if (save({ ...data, budgets: { ...data.budgets, [$('#month').value]: cents } })) say('Лимит сохранён для выбранного месяца.'); }
  catch (error) { say(error.message); }
});
$('#month').addEventListener('change', () => {
  if (!$('#month').value) { $('#month').value = todayISO().slice(0, 7); say('Выбран текущий месяц.'); }
  render();
});
$('#category-filter').addEventListener('change', render);
$('#cancel-edit').addEventListener('click', clearForm);
$('#demo').addEventListener('click', () => {
  if (data.expenses.length) { say('Демо доступно, когда список расходов пуст.'); return; }
  const date = todayISO();
  const expenses = [ ['Продукты на неделю', 'food', 245050], ['Проездной', 'transport', 125000], ['Книга по JavaScript', 'study', 89900], ['Кофе и прогулка', 'leisure', 37000] ].map(([title, category, cents], index) => ({ id: `demo-${index}`, title, category, cents, date }));
  $('#month').value = date.slice(0, 7);
  if (save({ version: 1, expenses, budgets: { [$('#month').value]: 1500000 } })) say('Добавлены вымышленные примеры расходов.');
});
$('#recovery').addEventListener('click', () => {
  try {
    const url = URL.createObjectURL(new Blob([localStorage.getItem(STORAGE_KEY) || ''], { type: 'text/plain' }));
    const link = document.createElement('a'); link.href = url; link.download = 'pocket-budget-recovery.txt'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch { say('Браузер блокирует чтение исходных данных.'); }
});
clearForm(); render();
