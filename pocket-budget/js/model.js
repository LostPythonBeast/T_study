export const CATEGORIES = { food: 'Продукты', transport: 'Транспорт', home: 'Дом', study: 'Обучение', leisure: 'Досуг', other: 'Другое' };
export const STORAGE_KEY = 'pocket-budget-v1';

// Рубли переводим в копейки, чтобы 0.1 + 0.2 не влияло на итог.
export function parseMoney(value) {
  const text = String(value).trim().replace(',', '.');
  if (!/^\d{1,7}(\.\d{1,2})?$/.test(text)) throw new Error('Сумма: от 0,01 до 9 999 999,99 ₽, не больше двух цифр после запятой.');
  const [rubles, coins = ''] = text.split('.');
  const cents = Number(rubles) * 100 + Number(coins.padEnd(2, '0'));
  if (cents <= 0) throw new Error('Сумма должна быть больше нуля.');
  return cents;
}

export function todayISO(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function validDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(0); date.setFullYear(y, m - 1, d);
  return y >= 1900 && date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}
export function validateExpense(data) {
  const title = String(data.title ?? '').trim();
  if (!title || title.length > 80) throw new Error('Описание: от 1 до 80 символов.');
  if (!Object.hasOwn(CATEGORIES, data.category)) throw new Error('Выберите категорию.');
  if (!validDate(data.date)) throw new Error('Укажите существующую дату.');
  return { title, category: data.category, date: data.date, cents: parseMoney(data.amount) };
}
export function monthSummary(expenses, month) {
  const rows = expenses.filter(item => item.date.slice(0, 7) === month);
  let total = 0;
  const categories = {};
  for (const key of Object.keys(CATEGORIES)) categories[key] = 0;
  for (const item of rows) { total += item.cents; categories[item.category] += item.cents; }
  return { rows: rows.sort((a, b) => b.date.localeCompare(a.date)), total, categories };
}
export function parseSaved(text) {
  const data = JSON.parse(text);
  if (data?.version !== 1 || !Array.isArray(data.expenses) || data.expenses.length > 2000 || typeof data.budgets !== 'object' || data.budgets === null || Array.isArray(data.budgets)) throw new Error('Неверный формат данных.');
  const ids = new Set();
  const expenses = data.expenses.map(item => {
    if (!item || typeof item.id !== 'string' || !/^[a-zA-Z0-9-]{1,80}$/.test(item.id) || ids.has(item.id) || typeof item.title !== 'string' || !Number.isInteger(item.cents) || item.cents < 1 || item.cents > 999999999) throw new Error('Некорректный расход.');
    ids.add(item.id);
    const clean = validateExpense({ ...item, amount: (item.cents / 100).toFixed(2) });
    return { id: item.id, ...clean };
  });
  const budgets = {};
  for (const [month, cents] of Object.entries(data.budgets)) {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month) || !validDate(`${month}-01`) || !Number.isInteger(cents) || cents < 1 || cents > 999999999) throw new Error('Неверный лимит месяца.');
    budgets[month] = cents;
  }
  return { version: 1, expenses, budgets };
}
