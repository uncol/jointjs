// import '@gufo-labs/font/gufo-font.css';
import { fileSave } from 'browser-fs-access';
import { DiagramEditor } from './diagram.js';
import './style.css';
import { Minimap, ZoomControls } from './ui/index.ts';

// Инициализация редактора
const editor = new DiagramEditor('paper-container');

// Инициализация UI компонентов
const paperContainer = document.getElementById('paper-container');

// Zoom toolbar
const zoomControls = new ZoomControls({
  container: paperContainer,
  viewport: editor.viewport,
  snap: editor.snap,
});

// Minimap
const minimap = new Minimap({
  container: paperContainer,
  paper: editor.paper,
  viewport: editor.viewport,
  paperWidth: editor.paperConfig.width,
  paperHeight: editor.paperConfig.height,
  width: 180,
  height: 120,
});

// Загрузка demo.json при старте
async function loadDemo() {
  try {
    const response = await fetch(import.meta.env.BASE_URL + 'data/demo.json');
    if (response.ok) {
      const data = await response.json();
      editor.fromJSON(data);
      // Update minimap dimensions after loading
      minimap.updateDimensions(editor.paperConfig.width, editor.paperConfig.height);
      console.log('Загружен demo.json');
    } else {
      console.warn('demo.json не найден, создаём простую демо-диаграмму');
      editor.createDemo();
    }
  } catch (err) {
    console.warn('Ошибка загрузки demo.json:', err.message);
    editor.createDemo();
  }
}

loadDemo();

// Hotkeys
document.addEventListener('keydown', (e) => {
  // Ctrl/Cmd + 0: Reset zoom (fit)
  if ((e.ctrlKey || e.metaKey) && e.key === '0') {
    e.preventDefault();
    editor.zoomToFit();
  }
  // Ctrl/Cmd + 1: Fit to view
  if ((e.ctrlKey || e.metaKey) && e.key === '1') {
    e.preventDefault();
    editor.zoomToFit();
  }
  // Ctrl/Cmd + =: Zoom in
  if ((e.ctrlKey || e.metaKey) && (e.key === '=' || e.key === '+')) {
    e.preventDefault();
    editor.zoomIn();
  }
  // Ctrl/Cmd + -: Zoom out
  if ((e.ctrlKey || e.metaKey) && e.key === '-') {
    e.preventDefault();
    editor.zoomOut();
  }
  // G: Toggle grid/free snap
  if (e.key === 'g' || e.key === 'G') {
    if (!e.ctrlKey && !e.metaKey && !e.altKey) {
      editor.toggleSnap();
    }
  }
});

// Обработчики кнопок
document.getElementById('load-btn').addEventListener('click', () => {
  document.getElementById('file-input').click();
});

document.getElementById('clear-btn').addEventListener('click', () => {
  if (confirm('Очистить диаграмму?')) {
    editor.clear();
  }
});

document.getElementById('file-input').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (file) {
    try {
      await editor.loadFromFile(file);
      minimap.updateDimensions(editor.paperConfig.width, editor.paperConfig.height);
      console.log('Диаграмма загружена');
    } catch (err) {
      alert('Ошибка загрузки файла: ' + err.message);
    }
  }
  // Сброс input для повторной загрузки того же файла
  e.target.value = '';
});

// Экспорт для отладки в консоли
window.editor = editor;
window.zoomControls = zoomControls;
window.minimap = minimap;

// Обработчик кнопки "Получить JSON"
const getJsonBtn = document.getElementById('get-json-btn');
if (getJsonBtn) {
  getJsonBtn.addEventListener('click', () => {
    try {
      const data = editor.toJSON();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      fileSave(blob, {
        fileName: 'Untitled.json',
        extensions: ['.json'],
    });
    } catch (err) {
      console.error('Ошибка при получении JSON:', err);
    }
  });
}
