import test from 'node:test';
import assert from 'node:assert/strict';
import { parseMoney, validDate, validateExpense, monthSummary, parseSaved } from '../js/model.js';

test('суммы хранятся в целых копейках', () => {
  assert.equal(parseMoney('0,10') + parseMoney('0.20'), 30);
  assert.equal(parseMoney('12.5'), 1250);
  assert.equal(parseMoney('9999999.99'), 999999999);
  for (const text of ['0', '-1', '1.001', '1e3', '', '10000000', 'abc']) assert.throws(() => parseMoney(text));
});
test('расход проверяет описание, категорию и дату', () => {
  const data = { title: ' Книга ', category: 'study', date: '2026-11-01', amount: '899,90' };
  assert.equal(validateExpense(data).title, 'Книга');
  assert.equal(validateExpense(data).cents, 89990);
  assert.throws(() => validateExpense({ ...data, category: '__proto__' }));
  assert.throws(() => validateExpense({ ...data, title: '' }));
  assert.equal(validDate('2024-02-29'), true);
  assert.equal(validDate('2026-02-29'), false);
});
test('итоги ограничены месяцем и считаются по категориям', () => {
  const rows = [{ id: 'a', date: '2026-11-01', cents: 1000, category: 'food' }, { id: 'b', date: '2026-10-01', cents: 9900, category: 'food' }, { id: 'c', date: '2026-11-03', cents: 3000, category: 'study' }];
  const result = monthSummary(rows, '2026-11');
  assert.equal(result.total, 4000);
  assert.equal(result.categories.food, 1000);
  assert.equal(result.categories.study, 3000);
  assert.equal(result.rows[0].id, 'c');
  assert.equal(rows[0].id, 'a');
  assert.equal(monthSummary(rows, '2026-12').total, 0);
});
test('сохранение не принимает повреждённые данные и повторные id', () => {
  const row = { id: 'a', title: 'Книга', category: 'study', date: '2026-11-01', cents: 12345 };
  const data = { version: 1, expenses: [row], budgets: { '2026-11': 100000 } };
  assert.deepEqual(parseSaved(JSON.stringify(data)), data);
  for (const bad of [null, {}, { ...data, expenses: [row, row] }, { ...data, expenses: [{ ...row, cents: 1.1 }] }, { ...data, budgets: { '2026-13': 10 } }, { ...data, expenses: [{ ...row, title: {} }] }]) assert.throws(() => parseSaved(JSON.stringify(bad)));
});
