// Ключ для сохранения задач в localStorage.
const STORAGE_KEY = "smart-notes-planner.tasks";

const notesInput = document.getElementById("notesInput");
const convertBtn = document.getElementById("convertBtn");
const tasksList = document.getElementById("tasksList");
const tasksCount = document.getElementById("tasksCount");

// Основное состояние приложения.
let tasks = loadTasks();

renderTasks();

convertBtn.addEventListener("click", () => {
  const lines = notesInput.value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length) return;

  const createdTasks = lines.map((text) => ({
    id: crypto.randomUUID(),
    text,
    completed: false,
    deadline: detectDeadline(text),
  }));

  tasks = [...tasks, ...createdTasks];
  notesInput.value = "";

  persistTasks();
  renderTasks();
});

// Делаем обработчики через делегирование, чтобы не навешивать их вручную на каждый элемент.
tasksList.addEventListener("click", (event) => {
  const item = event.target.closest("li.task");
  if (!item) return;

  const taskId = item.dataset.id;

  if (event.target.matches(".delete")) {
    tasks = tasks.filter((task) => task.id !== taskId);
    persistTasks();
    renderTasks();
  }

  if (event.target.matches(".edit")) {
    startEditing(item, taskId);
  }

  if (event.target.matches(".save")) {
    saveEditing(item, taskId);
  }
});

tasksList.addEventListener("change", (event) => {
  if (!event.target.matches("input[type='checkbox']")) return;

  const item = event.target.closest("li.task");
  const taskId = item?.dataset.id;
  if (!taskId) return;

  tasks = tasks.map((task) =>
    task.id === taskId ? { ...task, completed: event.target.checked } : task
  );

  persistTasks();
  renderTasks();
});

function renderTasks() {
  tasksList.innerHTML = "";

  if (!tasks.length) {
    tasksList.innerHTML = '<li class="empty">Пока нет задач. Добавьте первую заметку 👋</li>';
    updateTasksCount();
    return;
  }

  const fragment = document.createDocumentFragment();

  tasks.forEach((task) => {
    const item = document.createElement("li");
    item.className = `task ${task.completed ? "completed" : ""}`;
    item.dataset.id = task.id;

    item.innerHTML = `
      <input type="checkbox" ${task.completed ? "checked" : ""} aria-label="Отметить задачу выполненной" />
      <div class="task__main">
        <p class="task__text">${escapeHtml(task.text)}</p>
        ${task.deadline ? `<span class="task__deadline">⏰ ${task.deadline}</span>` : ""}
      </div>
      <div class="task__actions">
        <button class="icon-button edit" type="button">Редактировать</button>
        <button class="icon-button delete" type="button">Удалить</button>
      </div>
    `;

    fragment.appendChild(item);
  });

  tasksList.appendChild(fragment);
  updateTasksCount();
}

function startEditing(item, taskId) {
  const task = tasks.find((value) => value.id === taskId);
  if (!task) return;

  const main = item.querySelector(".task__main");
  const actions = item.querySelector(".task__actions");
  if (!main || !actions) return;

  main.innerHTML = `
    <input class="task-edit" value="${escapeAttribute(task.text)}" aria-label="Редактирование задачи" />
    <span class="task__deadline">Подсказка: дедлайн пересчитается автоматически</span>
  `;

  actions.innerHTML = `
    <button class="icon-button save" type="button">Сохранить</button>
    <button class="icon-button delete" type="button">Удалить</button>
  `;
}

function saveEditing(item, taskId) {
  const input = item.querySelector(".task-edit");
  const nextText = input?.value.trim();
  if (!nextText) return;

  tasks = tasks.map((task) =>
    task.id === taskId
      ? {
          ...task,
          text: nextText,
          deadline: detectDeadline(nextText),
        }
      : task
  );

  persistTasks();
  renderTasks();
}

function detectDeadline(text) {
  const raw = text.toLowerCase();
  const now = new Date();

  if (raw.includes("сегодня")) {
    return formatDate(now);
  }

  if (raw.includes("завтра")) {
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    return formatDate(tomorrow);
  }

  if (raw.includes("до пятницы")) {
    return formatDate(nextWeekdayDate(now, 5));
  }

  return null;
}

// Возвращает ближайший день недели (targetDay: 0 - воскресенье, 1 - понедельник ... 6 - суббота).
function nextWeekdayDate(fromDate, targetDay) {
  const date = new Date(fromDate);
  const day = date.getDay();
  let diff = (targetDay - day + 7) % 7;

  // "До пятницы" обычно подразумевает ближайшую пятницу, включая сегодняшнюю.
  if (diff === 0) diff = 0;

  date.setDate(date.getDate() + diff);
  return date;
}

function formatDate(date) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

function loadTasks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persistTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function updateTasksCount() {
  const done = tasks.filter((task) => task.completed).length;
  tasksCount.textContent = `${tasks.length} задач, выполнено: ${done}`;
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeAttribute(value) {
  return escapeHtml(value);
}
