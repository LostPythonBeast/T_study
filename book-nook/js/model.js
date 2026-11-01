export const STORAGE_KEY = 'book-nook-favorites-v1';
export const COLORS = ['rose', 'sand', 'blue', 'green', 'lilac'];

export function validateBooks(data) {
  if (!Array.isArray(data) || !data.length || data.length > 100) throw new Error('Каталог имеет неверный формат.');
  const ids = new Set();
  return data.map(book => {
    if (!book || typeof book.id !== 'string' || !/^[a-z0-9-]+$/.test(book.id) || ids.has(book.id)) throw new Error('Идентификаторы книг должны быть уникальными.');
    ids.add(book.id);
    for (const field of ['title', 'author', 'genre', 'size', 'description']) {
      if (typeof book[field] !== 'string' || !book[field].trim() || book[field].length > 400) throw new Error(`Неверное поле ${field}.`);
    }
    if (!COLORS.includes(book.color) || !Array.isArray(book.tags) || book.tags.some(tag => typeof tag !== 'string' || tag.length > 30)) throw new Error('Неверное оформление книги.');
    return { ...book };
  });
}
export function selectBooks(books, { query = '', genre = '', size = '', sort = 'title', onlyFavorites = false } = {}, favorites = []) {
  const text = query.trim().toLocaleLowerCase('ru');
  const rows = books.filter(book => `${book.title} ${book.author}`.toLocaleLowerCase('ru').includes(text)
    && (!genre || book.genre === genre) && (!size || book.size === size)
    && (!onlyFavorites || favorites.includes(book.id)));
  return rows.sort((a, b) => a[sort === 'author' ? 'author' : 'title'].localeCompare(b[sort === 'author' ? 'author' : 'title'], 'ru'));
}
export function toggleFavorite(favorites, id) {
  return favorites.includes(id) ? favorites.filter(value => value !== id) : [...favorites, id];
}
export function parseFavorites(text) {
  const values = JSON.parse(text);
  if (!Array.isArray(values) || values.length > 100 || values.some(value => typeof value !== 'string' || !/^[a-z0-9-]+$/.test(value))) throw new Error('Неверное избранное.');
  return [...new Set(values)];
}
