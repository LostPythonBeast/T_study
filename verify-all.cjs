// Проверка всех четырёх проектов. Сторонние пакеты не нужны.
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const tests = [
  'internship-board/tests/model.test.js',
  'loop-lab/tests/algorithms.test.js',
  'pocket-budget/tests/model.test.js',
  'book-nook/tests/model.test.js'
].map(file => path.join(__dirname, file));
const result = spawnSync(process.execPath, ['--test', ...tests], { stdio: 'inherit' });
process.exit(result.status ?? 1);
