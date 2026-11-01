import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateBooks, selectBooks, toggleFavorite, parseFavorites } from '../js/model.js';
const books = validateBooks(JSON.parse(readFileSync(new URL('../data/books.json', import.meta.url), 'utf8')));
test('восемь записей каталога проходят проверку', () => {
  assert.equal(books.length, 8);
  assert.throws(() => validateBooks([]));
  assert.throws(() => validateBooks([books[0], books[0]]));
  assert.throws(() => validateBooks([{ ...books[0], color: 'invalid' }]));
  assert.throws(() => validateBooks([{ ...books[0], title: null }]));
});
test('поиск учитывает название, автора, пробелы и регистр', () => {
  assert.equal(selectBooks(books, { query: ' ДОСТОЕВСКИЙ ' })[0].id, 'white-nights');
  assert.equal(selectBooks(books, { query: 'шинель' })[0].author, 'Николай Гоголь');
  assert.equal(selectBooks(books, { query: 'нет такой книги' }).length, 0);
});
test('фильтры объединяются; сортировка не меняет каталог', () => {
  const before = books.map(book => book.id);
  const rows = selectBooks(books, { genre: 'Повесть', size: 'Короткое', sort: 'author' });
  assert.equal(rows.length, 2);
  assert(rows.every(book => book.genre === 'Повесть' && book.size === 'Короткое'));
  assert.deepEqual(books.map(book => book.id), before);
});
test('избранное включается, исключается и фильтруется', () => {
  const values = toggleFavorite([], books[0].id);
  assert.deepEqual(selectBooks(books, { onlyFavorites: true }, values).map(book => book.id), [books[0].id]);
  assert.deepEqual(toggleFavorite(values, books[0].id), []);
  assert.deepEqual(values, [books[0].id]);
});
test('сохранённое избранное проверяется и избавляется от повторов', () => {
  assert.deepEqual(parseFavorites('["asya","asya"]'), ['asya']);
  for (const raw of ['null', '{}', '[1]', '["<script>"]', 'bad']) assert.throws(() => parseFavorites(raw));
});
