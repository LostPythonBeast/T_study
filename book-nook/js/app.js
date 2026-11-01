import { STORAGE_KEY, validateBooks, selectBooks, toggleFavorite, parseFavorites } from './model.js';
const $ = selector => document.querySelector(selector);
let books = [];
let favorites = [];
let onlyFavorites = false;
function node(tag, text, cls = '') { const element = document.createElement(tag); element.textContent = text; element.className = cls; return element; }
function say(text) { $('#message').textContent = text; }
try { favorites = parseFavorites(localStorage.getItem(STORAGE_KEY) || '[]'); }
catch { say('Избранное не удалось прочитать. Можно выбрать книги заново; каталог продолжит работать.'); }

async function loadBooks() {
  $('#loading').hidden = false; $('#load-error').hidden = true;
  $('#results').hidden = true; $('#filters').inert = true;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch('data/books.json', { signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    books = validateBooks(await response.json());
    $('#genre').replaceChildren(node('option', 'Все жанры')); $('#genre').firstChild.value = '';
    const genres = [...new Set(books.map(book => book.genre))];
    for (const genre of genres) { const option = node('option', genre); option.value = genre; $('#genre').append(option); }
    favorites = favorites.filter(id => books.some(book => book.id === id));
    $('#results').hidden = false; $('#filters').inert = false; render();
  } catch {
    $('#load-error').hidden = false;
  } finally { clearTimeout(timeout); $('#loading').hidden = true; }
}

function render() {
  const rows = selectBooks(books, { query: $('#search').value, genre: $('#genre').value, size: $('#size').value, sort: $('#sort').value, onlyFavorites }, favorites);
  $('#result-count').textContent = `${rows.length} из ${books.length}`;
  $('#favorite-count').textContent = favorites.length;
  $('#all-tab').classList.toggle('active', !onlyFavorites); $('#favorites-tab').classList.toggle('active', onlyFavorites);
  $('#all-tab').setAttribute('aria-pressed', String(!onlyFavorites)); $('#favorites-tab').setAttribute('aria-pressed', String(onlyFavorites));
  $('#empty').hidden = rows.length > 0;
  $('#empty-title').textContent = onlyFavorites && !favorites.length ? 'Ваша полка пока пуста' : 'Ничего не найдено';
  $('#grid').replaceChildren();
  for (const book of rows) {
    const card = node('article', '', 'book-card');
    const cover = node('div', '', `cover ${book.color}`);
    cover.append(node('span', 'МАЛЕНЬКАЯ БИБЛИОТЕКА', 'cover-kicker'), node('strong', book.title), node('span', book.author, 'cover-author'));
    const details = node('div', '', 'book-details');
    details.append(node('p', `${book.genre} · ${book.size}`, 'book-meta'), node('h3', book.title), node('p', book.author, 'author'), node('p', book.description, 'description'));
    const tags = node('div', '', 'tags'); for (const tag of book.tags) tags.append(node('span', tag));
    const button = node('button', favorites.includes(book.id) ? '✓ На моей полке' : '＋ На мою полку', 'favorite-button');
    button.setAttribute('aria-pressed', String(favorites.includes(book.id)));
    button.setAttribute('aria-label', `${favorites.includes(book.id) ? 'Убрать' : 'Добавить'} ${book.title}`);
    button.addEventListener('click', () => {
      const next = toggleFavorite(favorites, book.id);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); favorites = next; render(); say('Моя полка обновлена.'); }
      catch { say('Браузер не разрешил сохранить избранное. Изменение не применено.'); }
    });
    details.append(tags, button); card.append(cover, details); $('#grid').append(card);
  }
}
for (const id of ['search', 'genre', 'size', 'sort']) $(`#${id}`).addEventListener('input', render);
$('#all-tab').addEventListener('click', () => { onlyFavorites = false; render(); });
$('#favorites-tab').addEventListener('click', () => { onlyFavorites = true; render(); });
$('#reset').addEventListener('click', () => { $('#search').value = ''; $('#genre').value = ''; $('#size').value = ''; $('#sort').value = 'title'; render(); });
$('#retry').addEventListener('click', loadBooks);
loadBooks();
