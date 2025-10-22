// --- CONFIGURACIÓN DEL JUEGO ---
const ROWS = 8;
const COLS = 8;
const COLORS = ['yellow', 'blue', 'red', 'pink', 'green'];
const HIGH_SCORE_KEY = 'colorCrushHighScore';

// Puntuación por poderes
const SCORE_4_MATCH = 20; // Puntuación al crear el 'square'
const SCORE_5_MATCH = 50; // Puntuación al crear el 'rayo'
const SCORE_3X3_SQUARE = 90; // Puntuación por 9 fichas eliminadas por el square

// --- CONFIGURACIÓN DEL CASINO ---
const SYMBOLS = ['🍒', '🍋', '🔔', '💎'];
const PAYOUTS = {
    '🍒,🍒,🍒': 5,
    '🍋,🍋,🍋': 8,
    '🔔,🔔,🔔': 12,
    '💎,💎,💎': 20,
    '🍒,🍒': 2, // Dos cerezas en las dos primeras posiciones
};

// --- ESTADO DEL JUEGO ---
let board = [];
let score = 0;
let highScore = 0;
let selectedTile = null;
let isProcessing = false; // Evitar clicks durante animaciones
let isCasinoProcessing = false; // Evitar clicks en casino durante animaciones

const gameBoardEl = document.getElementById('game-board');
const scoreEl = document.getElementById('score');
const highScoreEl = document.getElementById('high-score');
const casinoScoreDisplayEl = document.getElementById('casino-score-display');

// --- ELEMENTOS DEL CASINO ---
const reelEls = [
    document.getElementById('reel-1'),
    document.getElementById('reel-2'),
    document.getElementById('reel-3')
];
const slotBetInput = document.getElementById('slot-bet');
const slotResultEl = document.getElementById('slot-result');

const rouletteNumberEl = document.getElementById('roulette-number');
const rouletteBetInput = document.getElementById('roulette-bet');
const rouletteOptionSelect = document.getElementById('roulette-option');
const rouletteNumberInput = document.getElementById('roulette-number-input');
const rouletteResultEl = document.getElementById('roulette-result');


// ----------------------------------------------------------------------
// GESTIÓN DE VISTAS (NAVEGACIÓN)
// ----------------------------------------------------------------------

function setupNavigation() {
    const tabGame = document.getElementById('tab-game');
    const tabCasino = document.getElementById('tab-casino');
    const viewGame = document.getElementById('view-game');
    const viewCasino = document.getElementById('view-casino');

    tabGame.addEventListener('click', () => {
        // Actualizar clases de botones
        tabGame.classList.add('active');
        tabCasino.classList.remove('active');
        
        // Mostrar vista del juego
        viewGame.classList.remove('hidden-view');
        viewGame.classList.add('active-view');
        
        // Ocultar vista del casino
        viewCasino.classList.remove('active-view');
        viewCasino.classList.add('hidden-view');
        
        updateCasinoScoreDisplay(); // Refrescar puntuación al volver
    });

    tabCasino.addEventListener('click', () => {
        // Actualizar clases de botones
        tabCasino.classList.add('active');
        tabGame.classList.remove('active');
        
        // Mostrar vista del casino
        viewCasino.classList.remove('hidden-view');
        viewCasino.classList.add('active-view');
        
        // Ocultar vista del juego
        viewGame.classList.remove('active-view');
        viewGame.classList.add('hidden-view');
        
        updateCasinoScoreDisplay(); // Refrescar puntuación al entrar
    });

    // Controlar visibilidad del input de número en la ruleta
    rouletteOptionSelect.addEventListener('change', () => {
        rouletteNumberInput.style.display = (rouletteOptionSelect.value === 'number-35') ? 'inline-block' : 'none';
    });
    rouletteNumberInput.style.display = 'none'; // Inicialmente oculto
}

function updateCasinoScoreDisplay() {
    casinoScoreDisplayEl.textContent = score;
}

// ----------------------------------------------------------------------
// GESTIÓN DE ALMACENAMIENTO
// ----------------------------------------------------------------------

async function loadHighScore() {
    const storage = window.chrome?.storage?.local || window.browser?.storage?.local;

    if (storage) {
        const result = await storage.get(HIGH_SCORE_KEY);
        highScore = result[HIGH_SCORE_KEY] || 0;
        highScoreEl.textContent = highScore;
    } else {
        highScore = parseInt(localStorage.getItem(HIGH_SCORE_KEY)) || 0;
        highScoreEl.textContent = highScore;
    }
}

function checkAndSaveHighScore() {
    if (score > highScore) {
        highScore = score;
        highScoreEl.textContent = highScore;
        
        const storage = window.chrome?.storage?.local || window.browser?.storage?.local;
        
        if (storage) {
            storage.set({ [HIGH_SCORE_KEY]: highScore });
        } else {
            localStorage.setItem(HIGH_SCORE_KEY, highScore);
        }
    }
}

// ----------------------------------------------------------------------
// INICIALIZACIÓN DEL TABLERO
// ----------------------------------------------------------------------

function createTileObject(row, col, color, type = 'base') {
    return { row, col, color, type };
}

function initializeBoard() {
    board = [];
    for (let r = 0; r < ROWS; r++) {
        board[r] = [];
        for (let c = 0; c < COLS; c++) {
            let color;
            do {
                color = COLORS[Math.floor(Math.random() * COLORS.length)];
            } while (checkMatchAt(r, c, color));
            
            board[r][c] = createTileObject(r, c, color);
        }
    }
    score = 0;
    scoreEl.textContent = score;
    selectedTile = null;
    isProcessing = false;
    renderBoard();
    updateCasinoScoreDisplay();
}

function checkMatchAt(r, c, color) {
    // Comprobar horizontal
    if (c >= 2 && board[r][c-1]?.color === color && board[r][c-2]?.color === color) {
        return true;
    }
    // Comprobar vertical
    if (r >= 2 && board[r-1][c]?.color === color && board[r-2][c]?.color === color) {
        return true;
    }
    return false;
}

// ----------------------------------------------------------------------
// RENDERIZADO DEL TABLERO
// ----------------------------------------------------------------------

function renderBoard() {
    gameBoardEl.innerHTML = '';

    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            const tileData = board[r][c];
            const tileEl = document.createElement('div');
            
            tileEl.classList.add('tile', `color-${tileData.color}`);
            
            if (tileData.type === 'square') {
                tileEl.classList.add('special-square');
            } else if (tileData.type === 'rayo') {
                tileEl.classList.add('special-rayo');
            }
            
            tileEl.dataset.row = r;
            tileEl.dataset.col = c;
            
            tileEl.addEventListener('click', handleTileClick);
            
            gameBoardEl.appendChild(tileEl);
        }
    }
}

// ----------------------------------------------------------------------
// MANEJO DE EVENTOS
// ----------------------------------------------------------------------

function handleTileClick(event) {
    if (isProcessing) return;
    
    const tileEl = event.currentTarget;
    const r = parseInt(tileEl.dataset.row);
    const c = parseInt(tileEl.dataset.col);
    const clickedTile = board[r][c];

    if (!selectedTile) {
        selectedTile = { r, c, el: tileEl };
        tileEl.classList.add('selected');
        return;
    }
    
    if (selectedTile.r === r && selectedTile.c === c) {
        selectedTile.el.classList.remove('selected');
        selectedTile = null;
        
        if (clickedTile.type === 'rayo') {
            processPowerActivation(clickedTile, null);
        }
        return;
    }

    if (isAdjacent(selectedTile, {r, c})) {
        const t1 = board[selectedTile.r][selectedTile.c];
        const t2 = board[r][c];
        selectedTile.el.classList.remove('selected');
        
        if (t1.type !== 'base' || t2.type !== 'base') {
            attemptPowerSwap(selectedTile, { r, c }, t1, t2);
        } else {
            attemptNormalSwap(selectedTile, { r, c });
        }

        selectedTile = null;
    } else {
        selectedTile.el.classList.remove('selected');
        selectedTile = { r, c, el: tileEl };
        tileEl.classList.add('selected');
    }
}

function isAdjacent(tile1, tile2) {
    const rowDiff = Math.abs(tile1.r - tile2.r);
    const colDiff = Math.abs(tile1.c - tile2.c);
    return (rowDiff + colDiff === 1);
}

// ----------------------------------------------------------------------
// LÓGICA DE SWAP Y MATCHES
// ----------------------------------------------------------------------

async function attemptNormalSwap(tile1, tile2) {
    isProcessing = true;
    
    swapTiles(tile1.r, tile1.c, tile2.r, tile2.c);
    renderBoard();
    
    await sleep(200);
    
    const matches = findAllMatches();
    
    if (matches.length === 0) {
        swapTiles(tile1.r, tile1.c, tile2.r, tile2.c);
        renderBoard();
        isProcessing = false;
        return;
    }
    
    await processMatchesLoop(matches, tile1, tile2);
    isProcessing = false;
}

async function attemptPowerSwap(tile1, tile2, t1Data, t2Data) {
    isProcessing = true;
    
    try {
        if (t1Data.type !== 'base' && t2Data.type !== 'base') {
            // Intercambio de dos poderes (ej. rayo con cuadrado)
            if (t1Data.type === 'rayo' || t2Data.type === 'rayo') {
                // Rayo con otro poder
                await processPowerActivation(t1Data.type === 'rayo' ? t1Data : t2Data, t1Data.type === 'rayo' ? t2Data : t1Data);
            } else {
                // Cuadrado con Cuadrado (simplemente activa ambos)
                await processPowerActivation(t1Data, null);
                await processPowerActivation(t2Data, null);
            }
        } else if (t1Data.type !== 'base') {
            // Poder con base
            await processPowerActivation(t1Data, t2Data);
        } else if (t2Data.type !== 'base') {
            // Base con Poder
            await processPowerActivation(t2Data, t1Data);
        }
        
        await processMatchesLoop(findAllMatches()); // Procesar cualquier match posterior
    } finally {
        isProcessing = false; 
    }
}

function swapTiles(r1, c1, r2, c2) {
    const temp = board[r1][c1];
    board[r1][c1] = board[r2][c2];
    board[r2][c2] = temp;
    
    board[r1][c1].row = r1;
    board[r1][c1].col = c1;
    board[r2][c2].row = r2;
    board[r2][c2].col = c2;
}

// ----------------------------------------------------------------------
// GESTIÓN DE PODERES, DETECCIÓN, CAÍDA Y RELLENO
// ----------------------------------------------------------------------

async function processPowerActivation(specialTile, targetTile) {
    try {
        if (specialTile.type === 'square') {
            await activateSquarePower(specialTile);
        } else if (specialTile.type === 'rayo') {
            await activateRayoPower(specialTile, targetTile);
        }
    } finally {
        await fallAndRefill(); 
        renderBoard();
    }
}

async function activateSquarePower(centerTile) {
    const tilesToClear = [];
    const r = centerTile.row;
    const c = centerTile.col;
    
    // Marcar el centro para eliminarlo
    if (board[r][c] !== null) {
        tilesToClear.push(board[r][c]);
    }
    
    // Marcar el 3x3 alrededor (incluyendo el centro)
    for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
            const nr = r + dr;
            const nc = c + dc;
            
            if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && board[nr][nc] !== null) {
                tilesToClear.push(board[nr][nc]);
            }
        }
    }
    
    await clearTiles(tilesToClear, SCORE_3X3_SQUARE);
}

async function activateRayoPower(rayoTile, targetTile) {
    const tilesToClear = [];
    
    // Eliminar el rayo inmediatamente (para que no afecte la caída)
    if (rayoTile) {
        board[rayoTile.row][rayoTile.col] = null;
    }
    
    if (targetTile && targetTile.type === 'base') {
        // Intercambio con ficha base: elimina todas de ese color
        const targetColor = targetTile.color;
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                if (board[r][c]?.color === targetColor) {
                    tilesToClear.push(board[r][c]);
                }
            }
        }
    } else {
        // Rayo con aire, o con otro poder: elimina un número aleatorio de fichas
        const allTiles = [];
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                if (board[r][c] !== null) {
                    allTiles.push(board[r][c]);
                }
            }
        }
        
        const minCount = 15;
        const maxCount = 25;
        let count = Math.floor(Math.random() * (maxCount - minCount + 1)) + minCount;
        count = Math.min(count, allTiles.length);
        
        for (let i = 0; i < count; i++) {
            const index = Math.floor(Math.random() * allTiles.length);
            tilesToClear.push(allTiles[index]);
            allTiles.splice(index, 1);
        }
    }
    
    // Puntuación base por ficha eliminada: 10
    await clearTiles(tilesToClear, tilesToClear.length * 10);
}

async function clearTiles(tiles, baseScore) {
    if (tiles.length === 0) return;
    
    const uniqueTiles = new Set();
    tiles.forEach(t => uniqueTiles.add(`${t.row},${t.col}`));

    uniqueTiles.forEach(key => {
        const [r, c] = key.split(',').map(Number);
        const el = getTileElement(r, c);
        if (el) el.classList.add('removing');
    });

    await sleep(300);

    uniqueTiles.forEach(key => {
        const [r, c] = key.split(',').map(Number);
        board[r][c] = null;
    });

    score += baseScore;
    scoreEl.textContent = score;
    checkAndSaveHighScore();
    updateCasinoScoreDisplay();
}

function findAllMatches() {
    const matchedGroups = [];
    
    // Buscar matches horizontales
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS - 2; c++) {
            if (board[r][c].type !== 'base') continue;
            
            const color = board[r][c].color;
            let count = 1;
            let matchTiles = [board[r][c]];
            
            for (let k = c + 1; k < COLS && board[r][k].color === color && board[r][k].type === 'base'; k++) {
                count++;
                matchTiles.push(board[r][k]);
            }
            
            if (count >= 3) {
                matchedGroups.push({ tiles: matchTiles, count, direction: 'horizontal' });
            }
            
            if (count > 1) c += count - 1;
        }
    }
    
    // Buscar matches verticales
    for (let c = 0; c < COLS; c++) {
        for (let r = 0; r < ROWS - 2; r++) {
            if (board[r][c].type !== 'base') continue;
            
            const color = board[r][c].color;
            let count = 1;
            let matchTiles = [board[r][c]];
            
            for (let k = r + 1; k < ROWS && board[k][c].color === color && board[k][c].type === 'base'; k++) {
                count++;
                matchTiles.push(board[k][c]);
            }
            
            if (count >= 3) {
                matchedGroups.push({ tiles: matchTiles, count, direction: 'vertical' });
            }
            
            if (count > 1) r += count - 1;
        }
    }
    
    return matchedGroups;
}

async function processMatchesLoop(matches, swapInitiator = null, swapTarget = null) {
    while (matches.length > 0) {
        await processMatches(matches, swapInitiator, swapTarget);
        await fallAndRefill();
        matches = findAllMatches();
    }
}

async function processMatches(matches, swapInitiator, swapTarget) {
    const allMatchedKeys = new Set();
    
    matches.forEach(group => {
        group.tiles.forEach(tile => {
            allMatchedKeys.add(`${tile.row},${tile.col}`);
        });
    });
    
    // Animación de eliminación
    allMatchedKeys.forEach(key => {
        const [r, c] = key.split(',').map(Number);
        const el = getTileElement(r, c);
        if (el) el.classList.add('removing');
    });
    
    await sleep(300);
    
    // Eliminar todas las fichas matched
    allMatchedKeys.forEach(key => {
        const [r, c] = key.split(',').map(Number);
        board[r][c] = null;
    });
    
    let currentScoreIncrease = 0;
    
    // Crear especiales para grupos >=4 y calcular puntuación
    matches.forEach(group => {
        const groupColor = group.tiles[0].color;
        let specialType = null;
        let specialScore = 0;
        
        if (group.count >= 5) {
            specialType = 'rayo';
            specialScore = SCORE_5_MATCH;
        } else if (group.count === 4) {
            specialType = 'square';
            specialScore = SCORE_4_MATCH;
        }
        
        if (specialType) {
            let preferredTile = findPreferredTile(group.tiles, swapTarget, swapInitiator);
            if (!preferredTile) {
                const middleIndex = Math.floor(group.tiles.length / 2);
                preferredTile = group.tiles[middleIndex];
            }
            
            board[preferredTile.row][preferredTile.col] = createTileObject(
                preferredTile.row,
                preferredTile.col,
                groupColor,
                specialType
            );
            
            currentScoreIncrease += specialScore;
        } else {
            // Para matches de 3: 10 por ficha
            currentScoreIncrease += group.count * 10;
        }
    });
    
    score += currentScoreIncrease;
    scoreEl.textContent = score;
    checkAndSaveHighScore();
    updateCasinoScoreDisplay(); 
}

function findPreferredTile(tiles, swapTarget, swapInitiator) {
    const targetKey = swapTarget ? `${swapTarget.r},${swapTarget.c}` : null;
    const initiatorKey = swapInitiator ? `${swapInitiator.r},${swapInitiator.c}` : null;
    
    for (let tile of tiles) {
        const key = `${tile.row},${tile.col}`;
        if (key === targetKey) return tile;
        if (key === initiatorKey) return tile;
    }
    
    return null;
}

async function fallAndRefill() {
    for (let c = 0; c < COLS; c++) {
        let writePos = ROWS - 1;
        
        for (let r = ROWS - 1; r >= 0; r--) {
            if (board[r][c] !== null) {
                if (r !== writePos) {
                    board[writePos][c] = board[r][c];
                    board[writePos][c].row = writePos;
                    board[r][c] = null;
                }
                writePos--;
            }
        }
        
        for (let r = writePos; r >= 0; r--) {
            const color = COLORS[Math.floor(Math.random() * COLORS.length)];
            board[r][c] = createTileObject(r, c, color);
        }
    }
    
    renderBoard();
    await sleep(300);
}

// ----------------------------------------------------------------------
// LÓGICA DEL CASINO: TRAGAPERRAS
// ----------------------------------------------------------------------

function getRandomSymbol() {
    return SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
}

async function spinSlot() {
    if (isCasinoProcessing) return;
    
    const bet = parseInt(slotBetInput.value);
    
    if (isNaN(bet) || bet < 10 || bet % 10 !== 0 || bet > score) {
        slotResultEl.textContent = 'Apuesta inválida o insuficiente. Mín: 10 y múltiplo de 10.';
        return;
    }

    isCasinoProcessing = true;
    slotResultEl.textContent = '¡GIRANDO...! 🤞';
    
    // Deducir apuesta
    score -= bet;
    scoreEl.textContent = score;
    updateCasinoScoreDisplay();
    
    // Animación de giro
    reelEls.forEach(reel => {
        reel.textContent = '🎰';
        reel.classList.add('spin-animation');
    });
    await sleep(1500); 

    // Obtener resultados
    const results = [
        getRandomSymbol(),
        getRandomSymbol(),
        getRandomSymbol()
    ];
    
    // Mostrar resultados y detener animación
    reelEls.forEach((reel, index) => {
        reel.classList.remove('spin-animation');
        // Pequeño retraso para la sensación de detención en cascada
        setTimeout(() => {
            reel.textContent = results[index];
        }, index * 200);
    });

    await sleep(1000); // Esperar que termine la cascada

    // Comprobar ganancias
    const key = results.join(',');
    let winnings = 0;
    
    if (PAYOUTS[key]) {
        // Match exacto de 3
        winnings = bet * PAYOUTS[key];
        slotResultEl.textContent = `¡JACKPOT! 🏆 Ganaste ${winnings} monedas.`;
    } else if (results[0] === '🍒' && results[1] === '🍒') {
        // Dos cerezas
        winnings = bet * PAYOUTS['🍒,🍒'];
        slotResultEl.textContent = `¡Dos Cerezas! 🍒🍒 Ganaste ${winnings} monedas.`;
    } else {
        slotResultEl.textContent = `Perdiste ${bet} monedas. ¡Vuelve a intentarlo!`;
    }

    // Sumar ganancias
    score += winnings;
    scoreEl.textContent = score;
    checkAndSaveHighScore();
    updateCasinoScoreDisplay();
    
    isCasinoProcessing = false;
}

// ----------------------------------------------------------------------
// LÓGICA DEL CASINO: RULETA
// ----------------------------------------------------------------------

const ROULETTE_COLORS = {
    0: 'green', 1: 'red', 2: 'black', 3: 'red', 4: 'black', 5: 'red', 6: 'black',
    7: 'red', 8: 'black', 9: 'red', 10: 'black', 11: 'black', 12: 'red', 13: 'black',
    14: 'red', 15: 'black', 16: 'red', 17: 'black', 18: 'red', 19: 'red', 20: 'black',
    21: 'red', 22: 'black', 23: 'red', 24: 'black', 25: 'red', 26: 'black',
    27: 'red', 28: 'black', 29: 'black', 30: 'red', 31: 'black', 32: 'red', 33: 'black',
    34: 'red', 35: 'black', 36: 'red'
};

async function spinRoulette() {
    if (isCasinoProcessing) return;
    
    const bet = parseInt(rouletteBetInput.value);
    const option = rouletteOptionSelect.value;
    let targetNumber = -1;

    if (option === 'number-35') {
        targetNumber = parseInt(rouletteNumberInput.value);
        if (isNaN(targetNumber) || targetNumber < 0 || targetNumber > 36) {
            rouletteResultEl.textContent = 'Número de apuesta inválido (0-36).';
            return;
        }
    }

    if (isNaN(bet) || bet < 10 || bet % 10 !== 0 || bet > score) {
        rouletteResultEl.textContent = 'Apuesta inválida o insuficiente. Mín: 10 y múltiplo de 10.';
        return;
    }

    isCasinoProcessing = true;
    rouletteResultEl.textContent = '¡HACIENDO GIRAR LA RULETA...! 🎡';
    rouletteNumberEl.textContent = '❓';
    rouletteNumberEl.classList.remove('red', 'black', 'green'); // Limpiar color anterior

    // Deducir apuesta
    score -= bet;
    scoreEl.textContent = score;
    updateCasinoScoreDisplay();
    
    await sleep(2000); // Tiempo de giro

    // Obtener resultado (0 a 36)
    const resultNumber = Math.floor(Math.random() * 37);
    const resultColor = ROULETTE_COLORS[resultNumber];

    // Mostrar resultado
    rouletteNumberEl.textContent = resultNumber;
    rouletteNumberEl.classList.add(resultColor);
    
    // Comprobar ganancias
    let winnings = 0;
    let winMultiplier = 0;
    let didWin = false;

    if (option === 'red' && resultColor === 'red') {
        winMultiplier = 2; didWin = true;
    } else if (option === 'black' && resultColor === 'black') {
        winMultiplier = 2; didWin = true;
    } else if (option === 'even' && resultNumber !== 0 && resultNumber % 2 === 0) {
        winMultiplier = 2; didWin = true;
    } else if (option === 'odd' && resultNumber % 2 !== 0) {
        winMultiplier = 2; didWin = true;
    } else if (option === 'number-35' && resultNumber === targetNumber) {
        winMultiplier = 35; didWin = true;
    }
    
    if (didWin) {
        winnings = bet * winMultiplier;
        score += winnings;
        rouletteResultEl.textContent = `¡GANASTE! El ${resultNumber} es ${resultColor.toUpperCase()}. Ganancia: ${winnings} monedas.`;
    } else {
        rouletteResultEl.textContent = `Perdiste. El resultado fue ${resultNumber} (${resultColor.toUpperCase()}).`;
        // La apuesta ya fue deducida
    }
    
    scoreEl.textContent = score;
    checkAndSaveHighScore();
    updateCasinoScoreDisplay();
    
    isCasinoProcessing = false;
}

// ----------------------------------------------------------------------
// UTILIDADES
// ----------------------------------------------------------------------

function getTileElement(row, col) {
    return gameBoardEl.querySelector(`[data-row="${row}"][data-col="${col}"]`);
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ----------------------------------------------------------------------
// INICIO DEL JUEGO
// ----------------------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
    loadHighScore().then(initializeBoard);
    
    // Match-3 Events
    document.getElementById('restart-button').addEventListener('click', () => {
        initializeBoard();
    });

    // Casino Events
    document.getElementById('spin-button').addEventListener('click', spinSlot);
    document.getElementById('roulette-spin-button').addEventListener('click', spinRoulette);
    
    // Setup Navigation
    setupNavigation();
});