import test from 'node:test';
import assert from 'node:assert/strict';
import { validateEntry, validDate, parseBackup, selectEntries, isOverdue, demoEntries, todayISO } from '../js/model.js';

const entry = { id: 'test-1', company: 'Студия', role: 'Intern', status: 'test', deadline: '2026-11-03', next: 'Отправить работу', url: 'https://example.com/job' };
test('форма обрезает пробелы и проверяет обязательные поля', () => {
  assert.equal(validateEntry({ ...entry, company: '  Студия ' }).company, 'Студия');
  assert.throws(() => validateEntry({ ...entry, role: '  ' }));
  assert.throws(() => validateEntry({ ...entry, next: 'x'.repeat(301) }));
});
test('опасные URL и неизвестные статусы отклоняются', () => {
  for (const url of ['javascript:alert(1)', 'data:text/html,x', 'not-a-url']) assert.throws(() => validateEntry({ ...entry, url }));
  assert.throws(() => validateEntry({ ...entry, status: '__proto__' }));
  assert.equal(validateEntry({ ...entry, url: '' }).url, '');
});
test('даты проверяются с учётом високосных лет', () => {
  for (const date of ['', '2024-02-29', '2026-12-31']) assert.equal(validDate(date), true);
  for (const date of ['2026-02-29', '2026-04-31', '2026-13-01', '2026-1-01', '0000-01-01', null]) assert.equal(validDate(date), false);
  assert.equal(todayISO(new Date(2026, 0, 2)), '2026-01-02');
});
test('прошедший срок не применяется к офферу и закрытому отклику', () => {
  assert.equal(isOverdue(entry, '2026-11-04'), true);
  assert.equal(isOverdue(entry, '2026-11-03'), false);
  assert.equal(isOverdue({ ...entry, status: 'closed' }, '2026-11-04'), false);
  assert.equal(isOverdue({ ...entry, status: 'offer' }, '2026-11-04'), false);
});
test('поиск, фильтр, сортировка не меняют исходный массив', () => {
  const rows = [{ ...entry, id: 'b', deadline: '' }, { ...entry, id: 'a', status: 'sent', company: 'Арка', deadline: '2026-11-01' }];
  assert.deepEqual(selectEntries(rows).map(e => e.id), ['a', 'b']);
  assert.deepEqual(selectEntries(rows, ' студ ', 'test').map(e => e.id), ['b']);
  assert.equal(rows[0].id, 'b');
  assert.deepEqual(selectEntries(rows, 'zzz'), []);
});
test('резервная копия сохраняет данные и отбрасывает лишние поля', () => {
  assert.deepEqual(parseBackup(JSON.stringify({ version: 1, entries: [{ ...entry, ignored: 'value' }] })), [entry]);
  assert.deepEqual(parseBackup('{"version":1,"entries":[]}'), []);
});
test('повреждённый импорт не принимается', () => {
  for (const data of [null, {}, { version: 2, entries: [] }, { version: 1, entries: [entry, entry] }, { version: 1, entries: [{ ...entry, company: {} }] }, { version: 1, entries: [{ ...entry, deadline: '2026-02-30' }] }, { version: 1, entries: Array(1001).fill(entry) }]) {
    assert.throws(() => parseBackup(JSON.stringify(data)));
  }
  assert.throws(() => parseBackup('broken-json'));
});
test('демо проходит те же правила, что реальные записи', () => {
  const entries = demoEntries(new Date(2026, 10, 1));
  assert.equal(entries.length, 4);
  assert.deepEqual(parseBackup(JSON.stringify({ version: 1, entries })), entries);
});
