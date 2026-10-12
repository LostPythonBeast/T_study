"use strict";

// Ключ, под которым приложение хранит список задач в localStorage.
const STORAGE_KEY = "frontend-prep-tracker-v1";

// Примерные задачи отображаются только при первом открытии приложения
// или после нажатия кнопки «Сбросить демо».
const DEMO_TASKS = [
  {
    id: "demo-1",
    title: "Повторить переменные, типы данных и условия",
    category: "javascript",
    priority: "high",
    completed: true,
    createdAt: 1
  },
  {
    id: "demo-2",
    title: "Решить три простые задачи на строки и массивы",
    category: "practice",
    priority: "high",
    completed: false,
    createdAt: 2
  },
  {
    id: "demo-3",
    title: "Освежить семантические HTML-теги",
    category: "html-css",
    priority: "normal",
    completed: false,
    createdAt: 3
  },
  {
    id: "demo-4",
    title: "Разобраться, как работает localStorage",
    category: "javascript",
    priority: "low",
    completed: false,
    createdAt: 4
  }
];

const CATEGORY_LABELS = {
  javascript: "JavaScript",
  "html-css": "HTML / CSS",
  practice: "Практика",
  other: "Другое"
};

const PRIORITY_LABELS = {
  high: "Высокий приоритет",
  normal: "Обычный",
  low: "Низкий приоритет"
};

const taskForm = document.querySelector("#task-form");
const taskTitleInput = document.querySelector("#task-title");
const taskCategorySelect = document.querySelector("#task-category");
const taskPrioritySelect = document.querySelector("#task-priority");
const categoryFilter = document.querySelector("#category-filter");
const taskList = document.querySelector("#task-list");
const emptyState = document.querySelector("#empty-state");
const emptyTitle = document.querySelector("#empty-title");
const emptyDescription = document.querySelector("#empty-description");
const totalCount = document.querySelector("#total-count");
const completedCount = document.querySelector("#completed-count");
const progressPercent = document.querySelector("#progress-percent");
const progressBar = document.querySelector("#progress-bar");
const progressFill = document.querySelector("#progress-fill");
const progressCaption = document.querySelector("#progress-caption");
const visibleCount = document.querySelector("#visible-count");
const remainingCount = document.querySelector("#remaining-count");
const resetDemoButton = document.querySelector("#reset-demo");
const filterButtons = document.querySelectorAll("[data-filter]");

let activeStatusFilter = "all";
let tasks = loadTasks();

/**
 * Загружает задачи из localStorage.
 * Если сохранённых данных нет или они повреждены, используем демо-список.
 */
function loadTasks() {
  try {
    const savedTasks = localStorage.getItem(STORAGE_KEY);

    if (savedTasks === null) {
      return copyDemoTasks();
    }

    const parsedTasks = JSON.parse(savedTasks);

    if (!Array.isArray(parsedTasks)) {
      return copyDemoTasks();
    }

    // Проверяем обязательные поля, чтобы некорректные данные не ломали интерфейс.
    return parsedTasks.filter((task) => {
      return task
        && typeof task.id === "string"
        && typeof task.title === "string"
        && typeof task.completed === "boolean"
        && Object.hasOwn(CATEGORY_LABELS, task.category)
        && Object.hasOwn(PRIORITY_LABELS, task.priority);
    });
  } catch (error) {
    // localStorage может быть недоступен, например в некоторых приватных режимах.
    console.warn("Не удалось загрузить задачи из localStorage:", error);
    return copyDemoTasks();
  }
}

function copyDemoTasks() {
  // Копируем объекты, чтобы не менять исходный шаблон демо-задач.
  return DEMO_TASKS.map((task) => ({ ...task }));
}

/** Сохраняет текущее состояние списка в браузере. */
function saveTasks() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch (error) {
    console.warn("Не удалось сохранить задачи:", error);
  }
}

/** Возвращает задачи, подходящие под текущие фильтры. */
function getVisibleTasks() {
  return tasks.filter((task) => {
    const matchesStatus = activeStatusFilter === "all"
      || (activeStatusFilter === "active" && !task.completed)
      || (activeStatusFilter === "completed" && task.completed);

    const matchesCategory = categoryFilter.value === "all"
      || task.category === categoryFilter.value;

    return matchesStatus && matchesCategory;
  });
}

/** Создаёт один DOM-элемент задачи. Текст добавляется через textContent. */
function createTaskElement(task) {
  const item = document.createElement("li");
  item.className = `task-item${task.completed ? " is-completed" : ""}`;
  item.dataset.taskId = task.id;

  const checkbox = document.createElement("input");
  checkbox.className = "task-check";
  checkbox.type = "checkbox";
  checkbox.checked = task.completed;
  checkbox.dataset.action = "toggle";
  checkbox.setAttribute("aria-label", `Отметить задачу «${task.title}» выполненной`);

  const content = document.createElement("div");
  content.className = "task-content";

  const title = document.createElement("p");
  title.className = "task-title";
  title.textContent = task.title;

  const metadata = document.createElement("div");
  metadata.className = "task-meta";

  const category = document.createElement("span");
  category.className = `category-pill category-${task.category}`;
  category.textContent = CATEGORY_LABELS[task.category];

  const priority = document.createElement("span");
  priority.className = `priority-pill priority-${task.priority}`;
  priority.textContent = PRIORITY_LABELS[task.priority];

  metadata.append(category, priority);
  content.append(title, metadata);

  const deleteButton = document.createElement("button");
  deleteButton.className = "task-delete";
  deleteButton.type = "button";
  deleteButton.dataset.action = "delete";
  deleteButton.textContent = "×";
  deleteButton.setAttribute("aria-label", `Удалить задачу «${task.title}»`);
  deleteButton.title = "Удалить задачу";

  item.append(checkbox, content, deleteButton);
  return item;
}

/** Обновляет список, счётчики и полосу прогресса. */
function render() {
  const visibleTasks = getVisibleTasks();
  const completedTasks = tasks.filter((task) => task.completed).length;
  const unfinishedTasks = tasks.length - completedTasks;
  const progress = tasks.length === 0
    ? 0
    : Math.round((completedTasks / tasks.length) * 100);

  // Пересоздаём видимую часть списка из текущего состояния tasks.
  taskList.replaceChildren(...visibleTasks.map(createTaskElement));

  totalCount.textContent = String(tasks.length);
  completedCount.textContent = String(completedTasks);
  progressPercent.textContent = `${progress}%`;
  progressFill.style.width = `${progress}%`;
  progressBar.setAttribute("aria-valuenow", String(progress));
  visibleCount.textContent = String(visibleTasks.length);
  remainingCount.textContent = `Осталось: ${unfinishedTasks}`;

  if (tasks.length === 0) {
    progressCaption.textContent = "Добавь первую задачу, чтобы начать";
  } else if (unfinishedTasks === 0) {
    progressCaption.textContent = "Отлично! Все задачи выполнены";
  } else {
    progressCaption.textContent = `Ещё ${unfinishedTasks} ${getTaskWord(unfinishedTasks)} до цели`;
  }

  const shouldShowEmptyState = visibleTasks.length === 0;
  emptyState.hidden = !shouldShowEmptyState;
  taskList.hidden = shouldShowEmptyState;

  if (shouldShowEmptyState && tasks.length > 0) {
    emptyTitle.textContent = "По этим фильтрам задач нет";
    emptyDescription.textContent = "Попробуй выбрать другой статус или категорию.";
  } else {
    emptyTitle.textContent = "Пока нет задач";
    emptyDescription.textContent = "Добавь первую задачу через форму слева — и начни двигаться вперёд.";
  }
}

function getTaskWord(number) {
  const lastTwoDigits = number % 100;
  const lastDigit = number % 10;

  if (lastTwoDigits >= 11 && lastTwoDigits <= 14) return "задач";
  if (lastDigit === 1) return "задача";
  if (lastDigit >= 2 && lastDigit <= 4) return "задачи";
  return "задач";
}

/** Обработчик формы: проверяем текст и добавляем новую задачу. */
taskForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const title = taskTitleInput.value.trim();
  if (!title) {
    taskTitleInput.focus();
    return;
  }

  const newTask = {
    id: createTaskId(),
    title,
    category: taskCategorySelect.value,
    priority: taskPrioritySelect.value,
    completed: false,
    createdAt: Date.now()
  };

  tasks.unshift(newTask);
  saveTasks();

  // Новая задача видна сразу: переключаем фильтры на «Все категории» и «Все».
  activeStatusFilter = "all";
  categoryFilter.value = "all";
  updateFilterButtons();
  render();

  taskForm.reset();
  taskTitleInput.focus();
});

/** Делегирование событий: одна обработка кликов для всех кнопок задач. */
taskList.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const taskItem = button.closest("[data-task-id]");
  if (!taskItem) return;

  const taskId = taskItem.dataset.taskId;

  if (button.dataset.action === "delete") {
    tasks = tasks.filter((task) => task.id !== taskId);
    saveTasks();
    render();
  }
});

// Отдельно отслеживаем изменение checkbox, чтобы обновлять статус задачи.
taskList.addEventListener("change", (event) => {
  const checkbox = event.target.closest('input[data-action="toggle"]');
  if (!checkbox) return;

  const taskItem = checkbox.closest("[data-task-id]");
  if (!taskItem) return;

  const task = tasks.find((item) => item.id === taskItem.dataset.taskId);
  if (!task) return;

  task.completed = checkbox.checked;
  saveTasks();
  render();
});

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    activeStatusFilter = button.dataset.filter;
    updateFilterButtons();
    render();
  });
});

categoryFilter.addEventListener("change", render);

resetDemoButton.addEventListener("click", () => {
  const shouldReset = window.confirm("Вернуть начальный пример задач? Текущий список будет заменён.");
  if (!shouldReset) return;

  tasks = copyDemoTasks();
  activeStatusFilter = "all";
  categoryFilter.value = "all";
  updateFilterButtons();
  saveTasks();
  render();
});

function updateFilterButtons() {
  filterButtons.forEach((button) => {
    const isActive = button.dataset.filter === activeStatusFilter;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
}

function createTaskId() {
  // crypto.randomUUID доступен в современных браузерах; оставляем простой fallback.
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }

  return `task-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

// Первый рендер строит интерфейс на основе загруженных задач.
updateFilterButtons();
render();
