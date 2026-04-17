"use strict";

/* ─────────────────────────────────────────
   ESTADO
   ───────────────────────────────────────── */
const state = {
    N: 4,
    board: [],    // board[row][col] = true/false (reina)
    seconds: 0,
    timerInterval: null,
    gameRunning: false,
    animating: false,
    animTimeouts: [],
};

/* ══════════════════════════════════════════
   NAVEGACIÓN
   ══════════════════════════════════════════ */
function setView(id) {
    ['splash', 'instructions', 'game'].forEach(v =>
        document.getElementById(v).style.display = v === id ? 'block' : 'none'
    );
}
function showSplash() {
    stopAnim();
    stopTimer();
    setView('splash');
    updateNBtns();
}
function showInstructions() { setView('instructions'); }
function startGame() {
    setView('game');
    initGame();
}

/* ══════════════════════════════════════════
   SELECCIÓN DE N
   ══════════════════════════════════════════ */
function selectN(n) {
    state.N = n;
    updateNBtns();
    document.getElementById('splash-n').textContent = n;
    buildBoardPreview();
}
function updateNBtns() {
    document.querySelectorAll('.n-btn').forEach(b =>
        b.classList.toggle('active', parseInt(b.dataset.n) === state.N)
    );
}

/* tablero decorativo del splash (solución de N=4 fija) */
function buildBoardPreview() {
    const bp = document.getElementById('bp');
    bp.innerHTML = '';
    // solución fija 4×4 para decoración: reinas en (0,1),(1,3),(2,0),(3,2)
    const queens = [[0, 1], [1, 3], [2, 0], [3, 2]];
    for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 4; c++) {
            const d = document.createElement('div');
            const isQ = queens.some(([qr, qc]) => qr === r && qc === c);
            d.className = 'bp-cell ' + ((r + c) % 2 === 0 ? 'light' : 'dark') + (isQ ? ' queen' : '');
            bp.appendChild(d);
        }
    }
}

/* ══════════════════════════════════════════
   INIT / RESET
   ══════════════════════════════════════════ */
function initGame() {
    stopAnim();
    stopTimer();

    const N = state.N;
    state.board = Array.from({ length: N }, () => Array(N).fill(false));
    state.seconds = 0;
    state.gameRunning = true;

    document.getElementById('timer-val').textContent = '0:00';
    document.getElementById('queens-val').textContent = '0';
    document.getElementById('n-label').textContent = `Tablero ${N}×${N} · ${N} reinas`;

    buildDOM();
    renderAll();
    buildRowProgress();
    setHint('Coloca las reinas en el tablero', false);
    startTimer();

    document.getElementById('btn-solve').disabled = false;
}
function resetGame() { initGame(); }

/* ══════════════════════════════════════════
   TIMER
   ══════════════════════════════════════════ */
function startTimer() {
    state.timerInterval = setInterval(() => {
        state.seconds++;
        const m = Math.floor(state.seconds / 60);
        const s = state.seconds % 60;
        document.getElementById('timer-val').textContent =
            `${m}:${s.toString().padStart(2, '0')}`;
    }, 1000);
}
function stopTimer() {
    clearInterval(state.timerInterval);
    state.timerInterval = null;
}

/* ══════════════════════════════════════════
   CONSTRUCCIÓN DEL DOM DEL TABLERO
   ══════════════════════════════════════════ */
function buildDOM() {
    const N = state.N;
    const board = document.getElementById('board');
    board.innerHTML = '';

    // tamaño de celda responsivo
    const maxW = Math.min(window.innerWidth - 80, 520);
    const cellSize = Math.floor(maxW / N);
    board.style.gridTemplateColumns = `repeat(${N}, ${cellSize}px)`;
    board.style.width = `${cellSize * N}px`;

    // etiquetas de fila (letras)
    const rowLabels = document.getElementById('row-labels');
    rowLabels.innerHTML = '';
    for (let r = 0; r < N; r++) {
        const lbl = document.createElement('div');
        lbl.className = 'row-label';
        lbl.style.height = `${cellSize}px`;
        lbl.style.width = '18px';
        lbl.textContent = String.fromCharCode(65 + r); // A, B, C...
        rowLabels.appendChild(lbl);
    }

    // etiquetas de columna (números)
    const colLabels = document.getElementById('col-labels');
    colLabels.innerHTML = '';
    colLabels.style.gridTemplateColumns = `repeat(${N}, ${cellSize}px)`;
    colLabels.style.width = `${cellSize * N}px`;
    for (let c = 0; c < N; c++) {
        const lbl = document.createElement('div');
        lbl.className = 'col-label';
        lbl.style.height = '18px';
        lbl.textContent = c + 1;
        colLabels.appendChild(lbl);
    }

    // celdas
    for (let r = 0; r < N; r++) {
        for (let c = 0; c < N; c++) {
            const cell = document.createElement('div');
            cell.className = 'cell ' + ((r + c) % 2 === 0 ? 'light' : 'dark');
            cell.style.fontSize = `${cellSize * 0.58}px`;
            cell.id = `cell-${r}-${c}`;
            cell.addEventListener('click', () => clickCell(r, c));
            board.appendChild(cell);
        }
    }
}

function buildRowProgress() {
    const N = state.N;
    const rp = document.getElementById('row-progress');
    rp.innerHTML = '';
    for (let r = 0; r < N; r++) {
        const pip = document.createElement('div');
        pip.className = 'row-pip';
        pip.id = `pip-${r}`;
        rp.appendChild(pip);
    }
}

/* ══════════════════════════════════════════
   LÓGICA DEL JUEGO
   ══════════════════════════════════════════ */
function clickCell(r, c) {
    if (!state.gameRunning || state.animating) return;

    // toggle reina
    state.board[r][c] = !state.board[r][c];

    const placed = countQueens();
    document.getElementById('queens-val').textContent = placed;

    renderAll();
    updateRowProgress();

    // verificar si hay conflictos
    const conflicts = getConflictCells();
    if (conflicts.size > 0) {
        setHint('Conflicto detectado — dos reinas se atacan', true);
        return;
    }

    if (placed === state.N) {
        // ¡ganó!
        state.gameRunning = false;
        stopTimer();
        setHint('¡Solución correcta!', false);
        setTimeout(showWin, 400);
    } else if (placed < state.N) {
        const remaining = state.N - placed;
        setHint(`Coloca ${remaining} reina${remaining !== 1 ? 's' : ''} más`, false);
    }
}

function countQueens() {
    return state.board.flat().filter(Boolean).length;
}

/**
 * Devuelve Set de "r,c" de celdas con reinas en conflicto.
 */
function getConflictCells() {
    const N = state.N;
    const conflicts = new Set();
    for (let r1 = 0; r1 < N; r1++) {
        for (let c1 = 0; c1 < N; c1++) {
            if (!state.board[r1][c1]) continue;
            for (let r2 = 0; r2 < N; r2++) {
                for (let c2 = 0; c2 < N; c2++) {
                    if (r1 === r2 && c1 === c2) continue;
                    if (!state.board[r2][c2]) continue;
                    if (r1 === r2 || c1 === c2 ||
                        Math.abs(r1 - r2) === Math.abs(c1 - c2)) {
                        conflicts.add(`${r1},${c1}`);
                        conflicts.add(`${r2},${c2}`);
                    }
                }
            }
        }
    }
    return conflicts;
}

/**
 * Devuelve Set de "r,c" amenazadas por cualquier reina (para shading).
 */
function getThreatenedCells() {
    const N = state.N;
    const threatened = new Set();
    for (let r = 0; r < N; r++) {
        for (let c = 0; c < N; c++) {
            if (!state.board[r][c]) continue;
            for (let i = 0; i < N; i++) {
                if (i !== c) threatened.add(`${r},${i}`);
                if (i !== r) threatened.add(`${i},${c}`);
            }
            for (let d = 1; d < N; d++) {
                [[r + d, c + d], [r + d, c - d], [r - d, c + d], [r - d, c - d]].forEach(([nr, nc]) => {
                    if (nr >= 0 && nr < N && nc >= 0 && nc < N) threatened.add(`${nr},${nc}`);
                });
            }
        }
    }
    return threatened;
}

/* ══════════════════════════════════════════
   RENDER
   ══════════════════════════════════════════ */
function renderAll() {
    const N = state.N;
    const conflicts = getConflictCells();
    const threatened = getThreatenedCells();

    for (let r = 0; r < N; r++) {
        for (let c = 0; c < N; c++) {
            const cell = document.getElementById(`cell-${r}-${c}`);
            if (!cell) continue;
            const base = (r + c) % 2 === 0 ? 'light' : 'dark';
            let cls = `cell ${base}`;
            const key = `${r},${c}`;
            if (state.board[r][c]) {
                cls += ' has-queen';
                if (conflicts.has(key)) cls += ' conflict';
            } else {
                if (conflicts.has(key)) cls += ' conflict';
                else if (threatened.has(key)) cls += ' threatened';
            }
            cell.className = cls;
        }
    }
}

function updateRowProgress() {
    const N = state.N;
    const conflicts = getConflictCells();
    for (let r = 0; r < N; r++) {
        const pip = document.getElementById(`pip-${r}`);
        if (!pip) continue;
        const hasQueen = state.board[r].some(Boolean);
        const hasConflict = [...conflicts].some(k => k.startsWith(`${r},`));
        pip.className = 'row-pip' +
            (hasConflict ? ' conflict-pip' : hasQueen ? ' filled' : '');
    }
}

/* ══════════════════════════════════════════
   HINT
   ══════════════════════════════════════════ */
let hintTimeout = null;
function setHint(msg, isError) {
    const el = document.getElementById('hint-text');
    el.textContent = msg;
    el.className = 'hint-text' + (isError ? ' error' : '');
    clearTimeout(hintTimeout);
    if (isError) {
        hintTimeout = setTimeout(() => {
            if (el.classList.contains('error')) {
                el.textContent = 'Coloca las reinas en el tablero';
                el.className = 'hint-text';
            }
        }, 2000);
    }
}

/* ══════════════════════════════════════════
   ALGORITMO BACKTRACKING (mismo que Java)
   ══════════════════════════════════════════ */

/**
 * esSeguro — igual que en Java:
 *   - verifica columna hacia arriba
 *   - diagonal izquierda superior
 *   - diagonal derecha superior
 */
function esSeguro(tablero, fila, col) {
    const N = tablero.length;
    for (let i = 0; i < fila; i++)
        if (tablero[i][col]) return false;
    for (let i = fila - 1, j = col - 1; i >= 0 && j >= 0; i--, j--)
        if (tablero[i][j]) return false;
    for (let i = fila - 1, j = col + 1; i >= 0 && j < N; i--, j++)
        if (tablero[i][j]) return false;
    return true;
}

/**
 * Genera la traza de pasos del backtracking:
 * cada paso = { type, row, col }
 *   type: 'try'      → intentando colocar (esSeguro=true, antes de recursión)
 *         'place'    → se coloca definitivamente (parte de solución)
 *         'backtrack'→ se quita (backtracking)
 *         'skip'     → esSeguro=false, se salta
 *         'solved'   → tablero completo
 */
function buildTrace(N) {
    const steps = [];
    const tablero = Array.from({ length: N }, () => Array(N).fill(false));

    function resolver(fila) {
        if (fila === N) {
            steps.push({ type: 'solved', board: tablero.map(r => [...r]) });
            return true;
        }
        for (let col = 0; col < N; col++) {
            if (esSeguro(tablero, fila, col)) {
                steps.push({ type: 'try', row: fila, col });
                tablero[fila][col] = true;
                if (resolver(fila + 1)) {
                    return true;
                }
                tablero[fila][col] = false;
                steps.push({ type: 'backtrack', row: fila, col });
            } else {
                steps.push({ type: 'skip', row: fila, col });
            }
        }
        return false;
    }

    resolver(0);
    return steps;
}

/* ══════════════════════════════════════════
   ANIMACIÓN DE SOLUCIÓN
   ══════════════════════════════════════════ */
function stopAnim() {
    state.animating = false;
    state.animTimeouts.forEach(clearTimeout);
    state.animTimeouts = [];
}

function animateSolution() {
    closeWin();
    stopAnim();

    // reiniciar tablero limpio
    const N = state.N;
    state.board = Array.from({ length: N }, () => Array(N).fill(false));
    state.gameRunning = false;
    state.animating = true;
    stopTimer();

    document.getElementById('btn-solve').disabled = true;
    document.getElementById('queens-val').textContent = '0';

    renderAll();
    updateRowProgress();
    setHint('Ejecutando backtracking recursivo...', false);

    const steps = buildTrace(N);

    // velocidad: más rápido para tableros grandes
    const speed = N <= 4 ? 340 : N <= 6 ? 200 : 100;

    steps.forEach((step, i) => {
        const t = setTimeout(() => {
            if (!state.animating) return;
            applyAnimStep(step);
        }, i * speed);
        state.animTimeouts.push(t);
    });

    // al terminar
    const endT = setTimeout(() => {
        if (!state.animating) return;
        state.animating = false;
        state.gameRunning = false;
        document.getElementById('btn-solve').disabled = false;

        // limpiar clases de animación
        for (let r = 0; r < N; r++)
            for (let c = 0; c < N; c++) {
                const cell = document.getElementById(`cell-${r}-${c}`);
                if (cell) {
                    cell.classList.remove('anim-try', 'anim-back', 'anim-ok');
                }
            }

        renderAll();
        updateRowProgress();
        setHint('Solución óptima — backtracking completado', false);

        setTimeout(showWin, 500);
    }, steps.length * speed + 200);
    state.animTimeouts.push(endT);
}

function applyAnimStep(step) {
    const N = state.N;

    if (step.type === 'solved') {
        // pintar todo en verde brevemente
        for (let r = 0; r < N; r++)
            for (let c = 0; c < N; c++) {
                const cell = document.getElementById(`cell-${r}-${c}`);
                if (cell && step.board[r][c]) cell.classList.add('anim-ok');
            }
        return;
    }

    const cell = document.getElementById(`cell-${step.row}-${step.col}`);
    if (!cell) return;

    if (step.type === 'try') {
        // colocar reina en state.board
        state.board[step.row][step.col] = true;
        cell.classList.remove('anim-back', 'anim-skip');
        cell.classList.add('anim-try');
        renderAll();
        updateRowProgress();
        const n = countQueens();
        document.getElementById('queens-val').textContent = n;
        setHint(`Fila ${step.row + 1} → col ${step.col + 1}: esSeguro()=true, colocando...`, false);

    } else if (step.type === 'backtrack') {
        state.board[step.row][step.col] = false;
        cell.classList.remove('anim-try', 'anim-ok');
        cell.classList.add('anim-back');
        renderAll();
        updateRowProgress();
        const n = countQueens();
        document.getElementById('queens-val').textContent = n;
        setHint(`Fila ${step.row + 1} → col ${step.col + 1}: backtrack ↩ quitando reina`, true);

        setTimeout(() => cell.classList.remove('anim-back'), 260);

    } else if (step.type === 'skip') {
        cell.classList.add('anim-back');
        setHint(`Fila ${step.row + 1} → col ${step.col + 1}: esSeguro()=false, saltando`, true);
        setTimeout(() => cell.classList.remove('anim-back'), 180);
    }
}

/* ══════════════════════════════════════════
   MODAL DE VICTORIA
   ══════════════════════════════════════════ */
function showWin() {
    const m = Math.floor(state.seconds / 60);
    const s = state.seconds % 60;
    document.getElementById('win-time').textContent =
        state.animating ? '—' : `${m}:${s.toString().padStart(2, '0')}`;
    document.getElementById('win-queens').textContent = state.N;
    document.getElementById('win-msg').textContent =
        `${state.N} reinas colocadas correctamente en tablero ${state.N}×${state.N}`;
    document.getElementById('win-overlay').classList.add('show');
}
function closeWin() {
    document.getElementById('win-overlay').classList.remove('show');
}

/* ══════════════════════════════════════════
   INIT
   ══════════════════════════════════════════ */
buildBoardPreview();
updateNBtns();
document.getElementById('splash-n').textContent = state.N;