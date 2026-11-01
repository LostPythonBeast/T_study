export const ALGORITHMS = {
  drop: {
    title: 'Первое уменьшение', tag: 'МАССИВЫ · ПОИСК', complexity: 'O(n) времени · O(1) памяти',
    task: 'Найдите позицию первого числа, которое меньше предыдущего. Позиции считаются с 1. Если уменьшения нет, ответ −1.',
    example: '2 4 4 1 3', expected: '4',
    code: ['let answer = -1;', 'for (let i = 1; i < numbers.length; i++) {', '  if (numbers[i] < numbers[i - 1]) {', '    answer = i + 1;', '    break;', '  }', '}', 'return answer;']
  },
  run: {
    title: 'Самая длинная серия', tag: 'МАССИВЫ · СЧЁТЧИКИ', complexity: 'O(n) времени · O(1) памяти',
    task: 'Найдите максимальное количество одинаковых чисел, стоящих подряд. Для массива из одного числа ответ 1.',
    example: '4 4 1 1 1 2', expected: '3',
    code: ['let current = 1;', 'let best = 1;', 'for (let i = 1; i < numbers.length; i++) {', '  if (numbers[i] === numbers[i - 1]) {', '    current++;', '  } else {', '    current = 1;', '  }', '  best = Math.max(best, current);', '}', 'return best;']
  },
  unique: {
    title: 'Первый уникальный', tag: 'MAP · ПОДСЧЁТ ЧАСТОТ', complexity: 'O(n) времени · O(n) памяти',
    task: 'Найдите первое по порядку число, которое встречается ровно один раз во всём массиве. Если такого нет, напишите NONE.',
    example: '5 2 5 3 2 4', expected: '3',
    code: ['const counts = new Map();', 'for (const number of numbers) {', '  const count = counts.get(number) || 0;', '  counts.set(number, count + 1);', '}', 'for (const number of numbers) {', '  if (counts.get(number) === 1) {', '    return number;', '  }', '}', "return 'NONE';"]
  }
};

export function parseNumbers(text) {
  const trimmed = text.trim();
  if (!trimmed) throw new Error('Введите хотя бы одно число.');
  const tokens = trimmed.split(/[\s,;]+/);
  if (tokens.length > 24) throw new Error('Для наглядного разбора используйте не больше 24 чисел.');
  if (tokens.some(token => !/^-?\d+$/.test(token))) throw new Error('Нужны целые числа через пробел, запятую или точку с запятой.');
  const numbers = tokens.map(Number);
  if (numbers.some(number => !Number.isSafeInteger(number) || Math.abs(number) > 9999)) {
    throw new Error('Каждое число должно быть от −9999 до 9999.');
  }
  return numbers;
}

// Каждый шаг — снимок данных. Интерфейс только показывает готовый снимок.
export function buildTrace(kind, numbers) {
  if (!Object.hasOwn(ALGORITHMS, kind)) throw new Error('Неизвестный алгоритм.');
  if (!Array.isArray(numbers) || numbers.length < 1 || numbers.length > 24 || numbers.some(n => !Number.isInteger(n) || Math.abs(n) > 9999)) {
    throw new Error('Ожидается массив из 1–24 целых чисел от −9999 до 9999.');
  }
  const steps = [];
  function add(index, line, text, variables, frequencies = [], done = false) {
    steps.push({ index, line, text, variables, frequencies, done });
  }
  let answer;
  if (kind === 'drop') {
    answer = -1;
    add(0, 0, 'Пока уменьшение не найдено. Начинаем сравнения со второго числа.', { answer });
    for (let i = 1; i < numbers.length; i++) {
      add(i, 2, `Сравниваем ${numbers[i]} < ${numbers[i - 1]}.`, { i, previous: numbers[i - 1], current: numbers[i], answer });
      if (numbers[i] < numbers[i - 1]) {
        answer = i + 1;
        add(i, 3, `Уменьшение найдено: индекс ${i}, позиция ${answer}. Прерываем цикл.`, { i, answer });
        break;
      }
    }
    add(-1, 7, answer === -1 ? 'Все соседние пары проверены: уменьшения нет.' : `Ответ: позиция ${answer}.`, { answer }, [], true);
  }
  if (kind === 'run') {
    let current = 1;
    let best = 1;
    add(0, 0, 'Первое число уже образует серию длиной 1.', { current, best });
    for (let i = 1; i < numbers.length; i++) {
      if (numbers[i] === numbers[i - 1]) {
        current++;
        add(i, 4, 'Соседние числа совпали. Продлеваем текущую серию.', { i, current, best });
      } else {
        current = 1;
        add(i, 6, 'Новое число: начинаем новую серию длиной 1.', { i, current, best });
      }
      best = Math.max(best, current);
      add(i, 8, 'Обновляем лучшую длину, если текущая серия больше.', { i, current, best });
    }
    answer = best;
    add(-1, 10, `Самая длинная серия содержит ${best} чисел.`, { current, best }, [], true);
  }
  if (kind === 'unique') {
    const counts = new Map();
    add(-1, 0, 'Сначала узнаем, сколько раз встречается каждое число.', { phase: 'Подсчёт частот' });
    for (let i = 0; i < numbers.length; i++) {
      const number = numbers[i];
      const count = counts.get(number) || 0;
      counts.set(number, count + 1);
      add(i, 3, `Число ${number}: теперь встречается ${count + 1} раз.`, { i, number, phase: 'Подсчёт частот' }, [...counts]);
    }
    answer = 'NONE';
    for (let i = 0; i < numbers.length; i++) {
      const number = numbers[i];
      add(i, 6, `Проверяем ${number}: частота ${counts.get(number)}.`, { i, number, phase: 'Поиск первого уникального' }, [...counts]);
      if (counts.get(number) === 1) {
        answer = number;
        add(i, 7, `Первое уникальное число — ${number}.`, { answer }, [...counts], true);
        break;
      }
    }
    if (answer === 'NONE') add(-1, 10, 'Все числа повторяются. Ответ: NONE.', { answer }, [...counts], true);
  }
  return { answer, steps };
}
