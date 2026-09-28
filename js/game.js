const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const nextCanvas = document.getElementById('nextCanvas');
const nextCtx = nextCanvas.getContext('2d');
const scoreVal = document.getElementById('score-val');
const levelVal = document.getElementById('level-val');
const highScoreVal = document.getElementById('high-score-val');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayMessage = document.getElementById('overlay-message');
const startButton = document.getElementById('start-button');
const pauseButton = document.getElementById('pause-button');
const restartButton = document.getElementById('restart-button');
const comboMessage = document.getElementById('combo-message');

const ROWS = 12;
const COLS = 6;
const SIZE = 60;
const PUYO_COLORS = ['#ff3333', '#33cc33', '#3333ff', '#ffff33'];
const HIGH_SCORE_KEY = 'puyo-puyo-high-score';

function fitBoardToScreen() {
    const availableHeight = window.innerHeight - 170;
    const availableWidth = Math.min(window.innerWidth - 24, 360);
    const displayWidth = Math.max(180, Math.min(availableWidth, availableHeight / 2));
    canvas.style.width = `${displayWidth}px`;
    canvas.style.height = `${displayWidth * 2}px`;
}

const PUYO_IMAGES = PUYO_COLORS.map((color) => {
    const image = new Image();
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60">
        <defs><radialGradient id="shine" cx="35%" cy="25%">
            <stop offset="0" stop-color="#fff" stop-opacity=".9"/>
            <stop offset=".25" stop-color="${color}"/>
            <stop offset="1" stop-color="#000" stop-opacity=".25"/>
        </radialGradient></defs>
        <circle cx="30" cy="30" r="25" fill="url(#shine)" stroke="#000" stroke-width="2">
            <animate attributeName="r" values="24;27;24" dur=".8s" repeatCount="indefinite"/>
        </circle>
        <circle cx="21" cy="18" r="5" fill="#fff" opacity=".7">
            <animate attributeName="opacity" values=".35;.9;.35" dur=".8s" repeatCount="indefinite"/>
        </circle></svg>`;
    image.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    return image;
});

let board;
let currentPiece;
let nextColors;
let score = 0;
let level = 1;
let gameOver = false;
let gameStarted = false;
let paused = false;
let locking = false;
let comboChain = 0;
let gravityTimer;

function randomColor() {
    return Math.floor(Math.random() * 4) + 1;
}

function randomColors() {
    return [randomColor(), randomColor(), randomColor()];
}

function createPiece(colors) {
    return {
        p1: { x: 2, y: 1, color: colors[0] },
        p2: { x: 2, y: 0, color: colors[1] },
        p3: { x: 3, y: 1, color: colors[2] },
        rotation: 0
    };
}

function resetGame() {
    board = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
    score = 0;
    level = 1;
    gameOver = false;
    paused = false;
    locking = false;
    comboChain = 0;
    nextColors = randomColors();
    scoreVal.textContent = score;
    levelVal.textContent = level;
    currentPiece = null;
    updateHighScore();
    drawNextPiece();
}

function startGame() {
    resetGame();
    gameStarted = true;
    spawnPiece();
    overlay.classList.add('hidden');
    pauseButton.disabled = false;
    pauseButton.textContent = 'Pausar';
    startGravity();
    draw();
}

function showOverlay(title, message, buttonText) {
    overlayTitle.textContent = title;
    overlayMessage.textContent = message;
    startButton.textContent = buttonText;
    overlay.classList.remove('hidden');
}

function endGame() {
    gameOver = true;
    gameStarted = false;
    clearInterval(gravityTimer);
    updateHighScore();
    pauseButton.disabled = true;
    showOverlay('Game Over', `Puntuación final: ${score}`, 'Jugar otra vez');
    draw();
}

function togglePause() {
    if (!gameStarted || gameOver) return;
    paused = !paused;
    pauseButton.textContent = paused ? 'Continuar' : 'Pausar';
    if (paused) {
        showOverlay('Pausa', 'El juego está pausado.', 'Continuar');
    } else {
        overlay.classList.add('hidden');
    }
}

function startGravity() {
    clearInterval(gravityTimer);
    const speed = Math.max(150, 1000 - (level - 1) * 100);
    gravityTimer = setInterval(() => {
        if (gameStarted && !paused && !gameOver) {
            drop();
            draw();
        }
    }, speed);
}

function spawnPiece() {
    currentPiece = createPiece(nextColors);
    nextColors = randomColors();
    drawNextPiece();
    if (!isValid(currentPiece.p1.x, currentPiece.p1.y) ||
        !isValid(currentPiece.p2.x, currentPiece.p2.y) ||
        !isValid(currentPiece.p3.x, currentPiece.p3.y)) {
        endGame();
    }
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawGrid();
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            if (board[r][c] !== 0) drawPuyo(ctx, c, r, board[r][c]);
        }
    }
    if (currentPiece && !gameOver) {
        drawGhostPiece();
        [currentPiece.p1, currentPiece.p2, currentPiece.p3].forEach((puyo) => {
            if (puyo.y >= 0) drawPuyo(ctx, puyo.x, puyo.y, puyo.color);
        });
    }
}

function drawGrid() {
    ctx.save();
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            ctx.fillStyle = (r + c) % 2 === 0 ? 'rgba(255,255,255,.025)' : 'rgba(0,0,0,.08)';
            ctx.fillRect(c * SIZE, r * SIZE, SIZE, SIZE);
            ctx.strokeStyle = 'rgba(210,190,255,.16)';
            ctx.lineWidth = 1;
            ctx.strokeRect(c * SIZE + .5, r * SIZE + .5, SIZE - 1, SIZE - 1);
        }
    }
    ctx.restore();
}

function getDropDistance() {
    if (!currentPiece) return 0;
    const pieces = [currentPiece.p1, currentPiece.p2, currentPiece.p3];
    let distance = 0;
    while (pieces.every((puyo) => isValid(puyo.x, puyo.y + distance + 1))) {
        distance++;
    }
    return distance;
}

function drawGhostPiece() {
    const distance = getDropDistance();
    if (distance === 0) return;

    ctx.save();
    ctx.setLineDash([6, 4]);
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#f7d85c';
    ctx.shadowColor = '#f7d85c';
    ctx.shadowBlur = 8;

    [currentPiece.p1, currentPiece.p2, currentPiece.p3].forEach((puyo) => {
        const x = puyo.x * SIZE + SIZE / 2;
        const y = (puyo.y + distance) * SIZE + SIZE / 2;
        ctx.beginPath();
        ctx.arc(x, y, SIZE / 2 - 7, 0, Math.PI * 2);
        ctx.stroke();
    });
    ctx.restore();
}

function drawPuyo(context, x, y, colorIndex) {
    const image = PUYO_IMAGES[colorIndex - 1];
    if (image.complete) context.drawImage(image, x * SIZE, y * SIZE, SIZE, SIZE);
}

function drawNextPiece() {
    nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
    if (!nextColors) return;
    nextColors.forEach((color, index) => drawPuyo(nextCtx, index, 0, color));
}

function move(dir) {
    if (!currentPiece || paused || gameOver) return;
    const pieces = [currentPiece.p1, currentPiece.p2, currentPiece.p3];
    if (pieces.every((puyo) => isValid(puyo.x + dir, puyo.y))) {
        pieces.forEach((puyo) => { puyo.x += dir; });
    }
}

function isValid(x, y) {
    if (y < 0) return x >= 0 && x < COLS;
    return x >= 0 && x < COLS && y < ROWS && board[y][x] === 0;
}

function rotate() {
    if (!currentPiece || paused || gameOver) return;
    const nextRot = (currentPiece.rotation + 1) % 4;
    let p2x = currentPiece.p1.x;
    let p2y = currentPiece.p1.y;
    let p3x = currentPiece.p1.x;
    let p3y = currentPiece.p1.y;

    if (nextRot === 0) { p2y--; p3x++; }
    if (nextRot === 1) { p2x++; p3y++; }
    if (nextRot === 2) { p2y++; p3x--; }
    if (nextRot === 3) { p2x--; p3y--; }

    if (isValid(p2x, p2y) && isValid(p3x, p3y)) {
        currentPiece.p2.x = p2x;
        currentPiece.p2.y = p2y;
        currentPiece.p3.x = p3x;
        currentPiece.p3.y = p3y;
        currentPiece.rotation = nextRot;
    }
}

function drop() {
    if (!currentPiece || paused || gameOver || locking) return;
    const pieces = [currentPiece.p1, currentPiece.p2, currentPiece.p3];
    if (pieces.every((puyo) => isValid(puyo.x, puyo.y + 1))) {
        pieces.forEach((puyo) => { puyo.y++; });
    } else {
        lockPiece();
    }
}

function lockPiece() {
    locking = true;
    comboChain = 0;
    [currentPiece.p1, currentPiece.p2, currentPiece.p3].forEach((puyo) => {
        if (puyo.y >= 0) board[puyo.y][puyo.x] = puyo.color;
    });
    applyGravity().then(checkMatches);
}

function applyGravity() {
    return new Promise((resolve) => {
        let moved = false;
        for (let c = 0; c < COLS; c++) {
            for (let r = ROWS - 2; r >= 0; r--) {
                if (board[r][c] !== 0 && board[r + 1][c] === 0) {
                    let currentRow = r;
                    while (currentRow < ROWS - 1 && board[currentRow + 1][c] === 0) {
                        board[currentRow + 1][c] = board[currentRow][c];
                        board[currentRow][c] = 0;
                        currentRow++;
                        moved = true;
                    }
                }
            }
        }
        if (moved) {
            draw();
            setTimeout(() => resolve(applyGravity()), 100);
        } else {
            resolve();
        }
    });
}

function checkMatches() {
    const visited = Array.from({ length: ROWS }, () => Array(COLS).fill(false));
    let elementsToRemove = [];
    let matchFound = false;

    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            if (board[r][c] !== 0 && !visited[r][c]) {
                const cluster = [];
                dfs(r, c, board[r][c], cluster, visited);
                if (cluster.length >= 4) {
                    elementsToRemove = elementsToRemove.concat(cluster);
                    matchFound = true;
                    score += cluster.length * 10 * level * Math.max(1, comboChain + 1);
                }
            }
        }
    }

    if (matchFound) {
        comboChain++;
        showCombo(comboChain);
        elementsToRemove.forEach(([r, c]) => { board[r][c] = 0; });
        updateScore();
        draw();
        setTimeout(() => applyGravity().then(checkMatches), 200);
    } else {
        comboChain = 0;
        locking = false;
        spawnPiece();
        draw();
    }
}

function showCombo(chain) {
    comboMessage.textContent = chain > 1 ? `¡Combo x${chain}!` : '¡Buena combinación!';
    comboMessage.classList.remove('show');
    void comboMessage.offsetWidth;
    comboMessage.classList.add('show');
}

function dfs(r, c, color, cluster, visited) {
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return;
    if (visited[r][c] || board[r][c] !== color) return;
    visited[r][c] = true;
    cluster.push([r, c]);
    dfs(r + 1, c, color, cluster, visited);
    dfs(r - 1, c, color, cluster, visited);
    dfs(r, c + 1, color, cluster, visited);
    dfs(r, c - 1, color, cluster, visited);
}

function updateScore() {
    scoreVal.textContent = score;
    const newLevel = Math.floor(score / 100) + 1;
    if (newLevel !== level) {
        level = newLevel;
        levelVal.textContent = level;
        startGravity();
    }
    updateHighScore();
}

function updateHighScore() {
    const highScore = Math.max(score, Number(localStorage.getItem(HIGH_SCORE_KEY) || 0));
    if (score >= highScore) localStorage.setItem(HIGH_SCORE_KEY, String(score));
    highScoreVal.textContent = highScore;
}

window.addEventListener('keydown', (event) => {
    if (event.key.toLowerCase() === 'p') togglePause();
    if (!gameStarted || paused || gameOver) return;
    if (event.key === 'ArrowLeft') move(-1);
    if (event.key === 'ArrowRight') move(1);
    if (event.key === 'ArrowUp') rotate();
    if (event.key === 'ArrowDown') drop();
    if (event.key.startsWith('Arrow')) event.preventDefault();
    draw();
});

window.addEventListener('resize', fitBoardToScreen);

startButton.addEventListener('click', () => {
    if (paused) {
        togglePause();
    } else {
        startGame();
    }
});

pauseButton.addEventListener('click', togglePause);
restartButton.addEventListener('click', startGame);

resetGame();
fitBoardToScreen();
showOverlay('Puyo Puyo', 'Forma grupos de cuatro o más Puyos iguales.', 'Comenzar');
draw();
setInterval(() => { draw(); drawNextPiece(); }, 50);
