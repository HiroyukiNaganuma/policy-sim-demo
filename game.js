const COLS = 10;
const ROWS = 20;
const BLOCK = 30;

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const levelEl = document.getElementById('level');
const linesEl = document.getElementById('lines');
const overlay = document.getElementById('overlay');
const startBtn = document.getElementById('startBtn');

const colors = {
  I: '#4bd6ff',
  O: '#ffe24c',
  T: '#b579ff',
  S: '#66e67d',
  Z: '#ff6d7a',
  J: '#6597ff',
  L: '#ffac54',
};

const pieces = {
  I: [[1, 1, 1, 1]],
  O: [[1, 1], [1, 1]],
  T: [[0, 1, 0], [1, 1, 1]],
  S: [[0, 1, 1], [1, 1, 0]],
  Z: [[1, 1, 0], [0, 1, 1]],
  J: [[1, 0, 0], [1, 1, 1]],
  L: [[0, 0, 1], [1, 1, 1]],
};

const state = {
  board: createBoard(),
  current: null,
  score: 0,
  lines: 0,
  level: 1,
  dropCounter: 0,
  dropInterval: 650,
  lastTime: 0,
  running: false,
  paused: false,
  gameOver: false,
};

function createBoard() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(0));
}

function rotate(matrix) {
  return matrix[0].map((_, i) => matrix.map((row) => row[i]).reverse());
}

function randomPiece() {
  const types = Object.keys(pieces);
  const type = types[Math.floor(Math.random() * types.length)];
  return {
    type,
    matrix: pieces[type].map((row) => [...row]),
    x: Math.floor((COLS - pieces[type][0].length) / 2),
    y: 0,
  };
}

function collide(board, piece) {
  for (let y = 0; y < piece.matrix.length; y++) {
    for (let x = 0; x < piece.matrix[y].length; x++) {
      if (!piece.matrix[y][x]) continue;
      const nx = piece.x + x;
      const ny = piece.y + y;
      if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
      if (ny >= 0 && board[ny][nx]) return true;
    }
  }
  return false;
}

function merge(board, piece) {
  piece.matrix.forEach((row, y) => {
    row.forEach((cell, x) => {
      if (cell) {
        const by = piece.y + y;
        if (by >= 0) board[by][piece.x + x] = piece.type;
      }
    });
  });
}

function clearLines() {
  let cleared = 0;
  for (let y = ROWS - 1; y >= 0; y--) {
    if (state.board[y].every(Boolean)) {
      state.board.splice(y, 1);
      state.board.unshift(Array(COLS).fill(0));
      cleared++;
      y++;
    }
  }

  if (cleared > 0) {
    const linePoints = [0, 100, 300, 500, 800];
    state.score += linePoints[cleared] * state.level;
    state.lines += cleared;
    state.level = Math.floor(state.lines / 10) + 1;
    state.dropInterval = Math.max(120, 650 - (state.level - 1) * 50);
    updateStats();
  }
}

function spawn() {
  state.current = randomPiece();
  if (collide(state.board, state.current)) {
    state.running = false;
    state.gameOver = true;
    overlay.textContent = 'ゲームオーバー - スタートで再挑戦';
    overlay.classList.remove('hidden');
  }
}

function hardDrop() {
  while (!collide(state.board, state.current)) {
    state.current.y++;
  }
  state.current.y--;
  lockPiece();
}

function lockPiece() {
  merge(state.board, state.current);
  clearLines();
  spawn();
}

function move(offset) {
  state.current.x += offset;
  if (collide(state.board, state.current)) state.current.x -= offset;
}

function softDrop() {
  state.current.y++;
  if (collide(state.board, state.current)) {
    state.current.y--;
    lockPiece();
  }
  state.dropCounter = 0;
}

function rotateCurrent() {
  const original = state.current.matrix;
  state.current.matrix = rotate(state.current.matrix);
  if (collide(state.board, state.current)) {
    state.current.x++;
    if (collide(state.board, state.current)) {
      state.current.x -= 2;
      if (collide(state.board, state.current)) {
        state.current.x++;
        state.current.matrix = original;
      }
    }
  }
}

function drawCell(x, y, type) {
  ctx.fillStyle = colors[type];
  ctx.fillRect(x * BLOCK, y * BLOCK, BLOCK, BLOCK);
  ctx.strokeStyle = '#101833';
  ctx.strokeRect(x * BLOCK, y * BLOCK, BLOCK, BLOCK);
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  state.board.forEach((row, y) => {
    row.forEach((cell, x) => {
      if (cell) drawCell(x, y, cell);
    });
  });

  if (state.current) {
    state.current.matrix.forEach((row, y) => {
      row.forEach((cell, x) => {
        if (cell) drawCell(state.current.x + x, state.current.y + y, state.current.type);
      });
    });
  }
}

function updateStats() {
  scoreEl.textContent = String(state.score);
  linesEl.textContent = String(state.lines);
  levelEl.textContent = String(state.level);
}

function update(time = 0) {
  if (!state.running || state.paused) return;

  const delta = time - state.lastTime;
  state.lastTime = time;
  state.dropCounter += delta;

  if (state.dropCounter > state.dropInterval) {
    softDrop();
  }

  draw();
  requestAnimationFrame(update);
}

function startGame() {
  state.board = createBoard();
  state.score = 0;
  state.lines = 0;
  state.level = 1;
  state.dropInterval = 650;
  state.dropCounter = 0;
  state.lastTime = 0;
  state.running = true;
  state.paused = false;
  state.gameOver = false;
  updateStats();
  spawn();
  draw();
  overlay.classList.add('hidden');
  requestAnimationFrame(update);
}

startBtn.addEventListener('click', startGame);

window.addEventListener('keydown', (event) => {
  if (!state.running && event.key.toLowerCase() !== 'p') return;

  if (event.key.toLowerCase() === 'p' && state.running) {
    state.paused = !state.paused;
    overlay.textContent = state.paused ? '一時停止中 (Pで再開)' : '';
    overlay.classList.toggle('hidden', !state.paused);
    if (!state.paused) {
      state.lastTime = performance.now();
      requestAnimationFrame(update);
    }
    return;
  }

  if (state.paused) return;

  if (event.key === 'ArrowLeft') move(-1);
  if (event.key === 'ArrowRight') move(1);
  if (event.key === 'ArrowDown') softDrop();
  if (event.key === 'ArrowUp') rotateCurrent();
  if (event.code === 'Space') {
    event.preventDefault();
    hardDrop();
  }

  draw();
});

draw();
