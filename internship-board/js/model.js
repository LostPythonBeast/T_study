export const STATUSES = {
  planned: 'В планах', sent: 'Отклик отправлен', test: 'Тестовое задание',
  interview: 'Собеседование', offer: 'Оффер', closed: 'Закрыто'
};
export const STORAGE_KEY = 'internship-board-v1';

// Даты сравниваются в формате YYYY-MM-DD: без UTC и сдвига часового пояса.
export function todayISO(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function validDate(value) {
  if (value === '') return true;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(0);
  date.setFullYear(y, m - 1, d);
  return y >= 1900 && y <= 9999 && date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

export function validateEntry(data) {
  const company = String(data.company ?? '').trim();
  const role = String(data.role ?? '').trim();
  const next = String(data.next ?? '').trim();
  const url = String(data.url ?? '').trim();
  const deadline = data.deadline ?? '';
  if (!company || company.length > 80) throw new Error('Компания: от 1 до 80 символов.');
  if (!role || role.length > 100) throw new Error('Должность: от 1 до 100 символов.');
  if (next.length > 300) throw new Error('Следующий шаг: не больше 300 символов.');
  if (!Object.hasOwn(STATUSES, data.status)) throw new Error('Неизвестный статус отклика.');
  if (!validDate(deadline)) throw new Error('Укажите существующую дату.');
  if (url) {
    let parsed;
    try { parsed = new URL(url); } catch { throw new Error('Укажите полную ссылку, начиная с https:// или http://.'); }
    if (!['http:', 'https:'].includes(parsed.protocol) || url.length > 2000) throw new Error('Допустимы ссылки http:// и https:// до 2000 символов.');
  }
  return { company, role, status: data.status, deadline, next, url };
}

export function isActive(entry) { return !['offer', 'closed'].includes(entry.status); }
export function isOverdue(entry, today = todayISO()) {
  return isActive(entry) && Boolean(entry.deadline) && entry.deadline < today;
}

export function selectEntries(entries, query = '', status = '', sort = 'deadline') {
  const text = query.trim().toLocaleLowerCase('ru');
  const result = entries.filter(entry => (!status || entry.status === status) &&
    `${entry.company} ${entry.role} ${entry.next}`.toLocaleLowerCase('ru').includes(text));
  return result.sort((a, b) => sort === 'company'
    ? a.company.localeCompare(b.company, 'ru')
    : (a.deadline || '9999').localeCompare(b.deadline || '9999') || a.company.localeCompare(b.company, 'ru'));
}

export function parseBackup(text) {
  const backup = JSON.parse(text);
  if (backup?.version !== 1 || !Array.isArray(backup.entries) || backup.entries.length > 1000) {
    throw new Error('Нужен файл Internship Board версии 1, не больше 1000 записей.');
  }
  const ids = new Set();
  return backup.entries.map(entry => {
    if (!entry || typeof entry.id !== 'string' || !/^[a-zA-Z0-9-]{1,80}$/.test(entry.id) || ids.has(entry.id)) {
      throw new Error('Повреждённый или повторяющийся идентификатор записи.');
    }
    for (const field of ['company', 'role', 'status', 'deadline', 'next', 'url']) {
      if (typeof entry[field] !== 'string') throw new Error(`Неверный тип поля ${field}.`);
    }
    ids.add(entry.id);
    return { id: entry.id, ...validateEntry(entry) };
  });
}

// Только вымышленные примеры. Относительные даты сохраняют полезность демо.
export function demoEntries(now = new Date()) {
  const date = offset => { const d = new Date(now); d.setDate(d.getDate() + offset); return todayISO(d); };
  return [
    { id: 'demo-1', company: 'Северная студия', role: 'Frontend Intern', status: 'test', deadline: date(2), next: 'Проверить форму и отправить тестовое', url: '' },
    { id: 'demo-2', company: 'Орбита', role: 'Стажёр JavaScript', status: 'interview', deadline: date(4), next: 'Подготовить рассказ о проектах', url: '' },
    { id: 'demo-3', company: 'Точка роста', role: 'Frontend Trainee', status: 'sent', deadline: '', next: 'Дождаться ответа рекрутера', url: '' },
    { id: 'demo-4', company: 'Лист', role: 'Стажёр веб-разработчик', status: 'planned', deadline: date(-1), next: 'Уточнить, открыт ли ещё набор', url: '' }
  ];
}
