import test from 'node:test';
import assert from 'node:assert/strict';
import { ALGORITHMS, parseNumbers, buildTrace } from '../js/algorithms.js';

test('ввод: разделители, отрицательные числа, ноль', () => {
  assert.deepEqual(parseNumbers(' 1, -2; 0\n4 '), [1, -2, 0, 4]);
  assert.deepEqual(parseNumbers('-9999 9999'), [-9999, 9999]);
});
test('ошибочный ввод не превращается в неожиданные числа', () => {
  for (const text of ['', '   ', 'NaN', '1.5', '1e3', '0x10', '10000', '1 a', Array(25).fill('1').join(' ')]) assert.throws(() => parseNumbers(text));
});
test('первое уменьшение: позиция, первый результат, крайние случаи', () => {
  for (const [numbers, expected] of [[[9], -1], [[1, 2, 3], -1], [[1, 1], -1], [[3, 2, 1], 2], [[-1, 0, -2], 3]]) {
    assert.equal(buildTrace('drop', numbers).answer, expected);
  }
});
test('серии: сброс текущей длины и сохранение максимума', () => {
  for (const [numbers, expected] of [[[7], 1], [[2, 2, 2], 3], [[1, 1, 2, 3, 3, 3], 3], [[4, 4, 4, 1, 2], 3]]) {
    assert.equal(buildTrace('run', numbers).answer, expected);
  }
});
test('первый уникальный: ноль является результатом, а не отсутствием', () => {
  for (const [numbers, expected] of [[[0], 0], [[1, 1], 'NONE'], [[5, 2, 5, 3, 2, 4], 3], [[-3, 0, -3], 0]]) {
    assert.equal(buildTrace('unique', numbers).answer, expected);
  }
});
test('снимки Map независимы; исходный массив не меняется', () => {
  const numbers = [5, 5, 2];
  const trace = buildTrace('unique', numbers);
  assert.deepEqual(trace.steps[1].frequencies, [[5, 1]]);
  assert.deepEqual(trace.steps[2].frequencies, [[5, 2]]);
  assert.deepEqual(numbers, [5, 5, 2]);
});
test('примеры согласованы с ответами и шагами кода', () => {
  for (const [kind, data] of Object.entries(ALGORITHMS)) {
    const trace = buildTrace(kind, parseNumbers(data.example));
    assert.equal(String(trace.answer), data.expected);
    assert.equal(trace.steps.at(-1).done, true);
    assert(trace.steps.every(step => step.line >= 0 && step.line < data.code.length));
  }
});
test('все короткие массивы сверяются с независимыми простыми решениями', () => {
  // Полный перебор 363 массивов над {-1, 0, 1}, без случайности.
  for (let length = 1; length <= 5; length++) {
    for (let variant = 0; variant < 3 ** length; variant++) {
      let value = variant;
      const numbers = [];
      for (let i = 0; i < length; i++) { numbers.push(value % 3 - 1); value = Math.floor(value / 3); }
      const dropIndex = numbers.findIndex((n, i) => i > 0 && n < numbers[i - 1]);
      assert.equal(buildTrace('drop', numbers).answer, dropIndex === -1 ? -1 : dropIndex + 1);
      let longest = 1;
      for (let start = 0; start < length; start++) {
        let end = start;
        while (end < length && numbers[end] === numbers[start]) end++;
        longest = Math.max(longest, end - start);
      }
      assert.equal(buildTrace('run', numbers).answer, longest);
      const unique = numbers.filter(n => numbers.filter(other => other === n).length === 1);
      assert.equal(buildTrace('unique', numbers).answer, unique.length ? unique[0] : 'NONE');
    }
  }
});
