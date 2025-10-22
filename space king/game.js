// =================================================================
// 👑 SPACE KING: IDLE CRUSADE - LÓGICA DEL JUEGO V0.3
// =================================================================

// --- CONSTANTES DEL JUEGO ---
const TICK_RATE = 100; // ms (10 ticks por segundo)
const SAVE_KEY = 'spaceking_save';

// --- ESTADO DEL JUEGO ---
let game = {
    // Monedas
    gold: 10, // Empezar con algo de oro para probar
    goldPerSecond: 0,
    goldPerHit: 1,
    
    // Estadísticas
    totalDPS: 0,
    zone: 1,
    totalKills: 0,
    
    // Unidades
    units: {
        spaceboy: {
            level: 0,
            baseDamage: 1,
            baseCost: 15,
            cost: 15,
            damage: 0,
            costMultiplier: 1.12,
            unlocked: true
        },
        hatemonger: {
            level: 0,
            baseDamage: 5,
            baseCost: 100,
            cost: 100,
            damage: 0,
            costMultiplier: 1.15,
            unlocked: true
        },
        bpositive: {
            level: 0,
            baseDamage: 25,
            baseCost: 500,
            cost: 500,
            damage: 0,
            costMultiplier: 1.18,
            unlocked: true
        },
        crusader: {
            level: 0,
            baseDamage: 100,
            baseCost: 2500,
            cost: 2500,
            damage: 0,
            costMultiplier: 1.20,
            unlocked: true
        },
        // NUEVAS TROPAS
        inquisitor: {
            level: 0,
            baseDamage: 500,
            baseCost: 10000,
            cost: 10000,
            damage: 0,
            costMultiplier: 1.22,
            unlocked: false,
            requirement: { type: 'gps', level: 10 }
        },
        titan: {
            level: 0,
            baseDamage: 2000,
            baseCost: 50000,
            cost: 50000,
            damage: 0,
            costMultiplier: 1.25,
            unlocked: false,
            requirement: { type: 'gps', level: 20 }
        },
        astartes: {
            level: 0,
            baseDamage: 10000,
            baseCost: 250000,
            cost: 250000,
            damage: 0,
            costMultiplier: 1.28,
            unlocked: false,
            requirement: { type: 'gps', level: 40 }
        },
        emperor: {
            level: 0,
            baseDamage: 50000,
            baseCost: 2000000,
            cost: 2000000,
            damage: 0,
            costMultiplier: 1.30,
            unlocked: false,
            requirement: { type: 'gps', level: 80 }
        }
    },

    // Mejoras de Infraestructura
    upgrades: {
        bureaucracy: {
            level: 0,
            baseCost: 10,
            cost: 10,
            effect: 1, // +1 oro por segundo por nivel
            costMultiplier: 1.15
        },
        recruitment: {
            level: 0,
            baseCost: 50,
            cost: 50,
            effect: 0.02, // 2% de reducción por nivel
            costMultiplier: 1.25
        },
        doctrine: {
            level: 0,
            baseCost: 200,
            cost: 200,
            effect: 0.05, // 5% de aumento de DPS
            costMultiplier: 1.30
        },
        elite: {
            level: 0,
            baseCost: 1000,
            cost: 1000,
            effect: 0.10, // 10% de daño crítico
            costMultiplier: 1.35
        }
    },

    // Enemigo Actual
    enemy: {
        name: "Xeno Menor",
        maxHealth: 100,
        currentHealth: 100,
        level: 1
    },

    // Multiplicadores Globales
    multipliers: {
        unitCostReduction: 1, // Se reduce con recruitment
        dpsBonus: 1, // Se aumenta con doctrine
        criticalBonus: 0 // Se aumenta con elite
    }
};

// --- NOMBRES DE ENEMIGOS POR ZONA ---
const enemyNames = [
    "Xeno Menor", "Hereje Galáctico", "Mutante Estelar", "Traidor del Vacío",
    "Demonio Warp", "Señor del Caos", "Primarca Caído", "Tirano Xeno",
    "Avatar del Caos", "Gran Demonio", "Devorador de Mundos", "Dios Oscuro"
];

// --- REFERENCIAS AL DOM ---
const goldDisplay = document.getElementById('gold-display');
const gpsDisplay = document.getElementById('gold-per-second-display');
const totalDPSDisplay = document.getElementById('total-dps-display');
const zoneDisplay = document.getElementById('zone-display');

const enemyHealthBar = document.getElementById('enemy-health-bar');
const enemyName = document.getElementById('enemy-name');
const enemyLevel = document.getElementById('enemy-level');
const healthText = document.getElementById('health-text');
const lastKill = document.getElementById('last-kill');
const enemySprite = document.getElementById('enemy-sprite');
const damageNumbersContainer = document.getElementById('damage-numbers');

// Botones de Unidades
const btnSpaceboy = document.getElementById('buy-spaceboy');
const btnHatemonger = document.getElementById('buy-hatemonger');
const btnBPositive = document.getElementById('buy-bpositive');
const btnCrusader = document.getElementById('buy-crusader');
const btnInquisitor = document.getElementById('buy-inquisitor');
const btnTitan = document.getElementById('buy-titan');
const btnAstartes = document.getElementById('buy-astartes');
const btnEmperor = document.getElementById('buy-emperor');

// Botones de Mejoras
const btnBureaucracy = document.getElementById('upgrade-bureaucracy');
const btnRecruitment = document.getElementById('upgrade-recruitment');
const btnDoctrine = document.getElementById('upgrade-doctrine');
const btnElite = document.getElementById('upgrade-elite');

// Botones de Control
const btnSave = document.getElementById('btn-save');
const btnLoad = document.getElementById('btn-load');
const btnReset = document.getElementById('btn-reset');
const btnPrestige = document.getElementById('btn-prestige');

// --- FUNCIONES PRINCIPALES ---

// Calcular DPS Total
function calculateTotalDPS() {
    let baseDPS = 0;
    
    // Sumar DPS de todas las unidades
    for (let unitKey in game.units) {
        if (game.units[unitKey].unlocked) {
            baseDPS += game.units[unitKey].damage;
        }
    }
    
    // Aplicar bonificaciones
    let totalDPS = baseDPS * game.multipliers.dpsBonus;
    
    return totalDPS;
}

// Calcular GPS Total - CORREGIDO
function calculateGPS() {
    return game.upgrades.bureaucracy.level * game.upgrades.bureaucracy.effect;
}

// Actualizar multiplicadores globales - CORREGIDO
function updateMultipliers() {
    // Reducción de costo de unidades
    game.multipliers.unitCostReduction = 1 - (game.upgrades.recruitment.level * game.upgrades.recruitment.effect);
    game.multipliers.unitCostReduction = Math.max(0.1, game.multipliers.unitCostReduction); // Mínimo 10%
    
    // Bonus de DPS
    game.multipliers.dpsBonus = 1 + (game.upgrades.doctrine.level * game.upgrades.doctrine.effect);
    
    // Bonus de crítico
    game.multipliers.criticalBonus = game.upgrades.elite.level * game.upgrades.elite.effect;
    game.multipliers.criticalBonus = Math.min(0.5, game.multipliers.criticalBonus); // Máximo 50%
    
    // Actualizar GPS - IMPORTANTE: Esto se llama cada vez que se actualizan los multiplicadores
    game.goldPerSecond = calculateGPS();
}

// Mostrar número de daño flotante
function showDamageNumber(damage) {
    const damageEl = document.createElement('div');
    damageEl.className = 'damage-number';
    damageEl.textContent = Math.floor(damage);
    damageEl.style.left = `${Math.random() * 80 + 10}%`;
    damageEl.style.top = `${Math.random() * 50 + 25}%`;
    
    damageNumbersContainer.appendChild(damageEl);
    
    setTimeout(() => {
        damageEl.remove();
    }, 1000);
}

// --- NUEVAS FUNCIONES PARA DESBLOQUEO ---

// Verificar desbloqueo de unidades
function checkUnitUnlocks() {
    for (let unitKey in game.units) {
        const unit = game.units[unitKey];
        if (!unit.unlocked && unit.requirement) {
            if (unit.requirement.type === 'gps') {
                if (game.upgrades.bureaucracy.level >= unit.requirement.level) {
                    unit.unlocked = true;
                    // Mostrar notificación
                    showUnlockNotification(unitKey);
                }
            }
        }
    }
}

// Mostrar notificación de desbloqueo
function showUnlockNotification(unitKey) {
    const unitNames = {
        inquisitor: "INQUISIDOR",
        titan: "TITÁN IMPERIAL",
        astartes: "ASTARTES",
        emperor: "GUARDIA DEL EMPERADOR"
    };
    
    const notification = document.createElement('div');
    notification.className = 'unlock-notification';
    notification.innerHTML = `
        <div class="unlock-content">
            <h3>¡NUEVA TROPA DESBLOQUEADA!</h3>
            <p>${unitNames[unitKey]} ahora disponible</p>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.add('show');
    }, 100);
    
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.remove();
        }, 500);
    }, 3000);
}

// Bucle Principal del Juego - CORREGIDO
function gameLoop() {
    // 1. Generación de Oro Pasivo - CORREGIDO
    if (game.goldPerSecond > 0) {
        game.gold += game.goldPerSecond / 10; // Dividido entre 10 porque el tick es 100ms (10 ticks por segundo)
    }
    
    // 2. Calcular DPS total
    game.totalDPS = calculateTotalDPS();
    
    // 3. Combate: Reducir vida del enemigo - CORREGIDO
    if (game.enemy.currentHealth > 0 && game.totalDPS > 0) {
        let damageThisTick = game.totalDPS / 10;
        game.enemy.currentHealth -= damageThisTick;
        
        // Generar oro por daño - CORREGIDO
        game.gold += damageThisTick * game.goldPerHit;
        
        // Mostrar número de daño ocasionalmente
        if (Math.random() < 0.1) {
            showDamageNumber(damageThisTick * 10);
        }
    }
    
    // 4. Lógica de muerte del enemigo
    if (game.enemy.currentHealth <= 0) {
        killEnemy();
    }
    
    // 5. Actualizar UI
    updateUI();
}

// Matar enemigo y avanzar
function killEnemy() {
    // Recompensa por muerte
    let killReward = game.enemy.maxHealth * 0.5;
    game.gold += killReward;
    game.totalKills++;
    
    lastKill.textContent = `¡${game.enemy.name} derrotado! +${Math.floor(killReward)} Oro`;
    
    // Avanzar zona cada 10 kills
    if (game.totalKills % 10 === 0) {
        game.zone++;
    }
    
    // Generar nuevo enemigo
    game.enemy.level++;
    game.enemy.maxHealth *= 1.4;
    game.enemy.currentHealth = game.enemy.maxHealth;
    
    // Nombre del enemigo
    let nameIndex = Math.min(Math.floor(game.zone / 2), enemyNames.length - 1);
    game.enemy.name = enemyNames[nameIndex] + (game.zone > 20 ? ` Supremo` : '');
}

// Actualizar Interfaz
function updateUI() {
    // Recursos
    goldDisplay.textContent = formatNumber(Math.floor(game.gold));
    gpsDisplay.textContent = game.goldPerSecond.toFixed(1);
    totalDPSDisplay.textContent = game.totalDPS.toFixed(1);
    zoneDisplay.textContent = game.zone;
    
    // Enemigo
    let healthPercent = Math.max(0, (game.enemy.currentHealth / game.enemy.maxHealth) * 100);
    enemyHealthBar.style.width = `${healthPercent}%`;
    enemyName.textContent = game.enemy.name;
    enemyLevel.textContent = `Nivel ${game.enemy.level}`;
    healthText.textContent = `${formatNumber(Math.floor(game.enemy.currentHealth))} / ${formatNumber(Math.floor(game.enemy.maxHealth))}`;
    
    // Actualizar todas las unidades
    updateUnitUI('spaceboy');
    updateUnitUI('hatemonger');
    updateUnitUI('bpositive');
    updateUnitUI('crusader');
    updateUnitUI('inquisitor');
    updateUnitUI('titan');
    updateUnitUI('astartes');
    updateUnitUI('emperor');
    
    // Actualizar todas las mejoras
    updateUpgradeUI('bureaucracy');
    updateUpgradeUI('recruitment');
    updateUpgradeUI('doctrine');
    updateUpgradeUI('elite');
}

// Actualizar UI de una unidad
function updateUnitUI(unitKey) {
    const unit = game.units[unitKey];
    const card = document.getElementById(`card-${unitKey}`);
    
    if (!unit.unlocked) {
        card.style.display = 'none';
        return;
    }
    
    card.style.display = 'block';
    document.getElementById(`level-${unitKey}`).textContent = unit.level;
    document.getElementById(`dps-${unitKey}`).textContent = formatNumber(unit.damage);
    document.getElementById(`cost-${unitKey}`).textContent = formatNumber(Math.floor(unit.cost));
    
    const btn = document.getElementById(`buy-${unitKey}`);
    btn.disabled = game.gold < unit.cost;
}

// Actualizar UI de una mejora
function updateUpgradeUI(upgradeKey) {
    const upgrade = game.upgrades[upgradeKey];
    const levelEl = document.getElementById(`level-${upgradeKey}`);
    const costEl = document.getElementById(`cost-${upgradeKey}`);
    const btn = document.getElementById(`upgrade-${upgradeKey}`);
    
    if (levelEl) levelEl.textContent = upgrade.level;
    if (costEl) costEl.textContent = formatNumber(Math.floor(upgrade.cost));
    if (btn) btn.disabled = game.gold < upgrade.cost;
}

// Formatear números grandes
function formatNumber(num) {
    if (num < 1000) return num.toString();
    if (num < 1000000) return (num / 1000).toFixed(1) + 'K';
    if (num < 1000000000) return (num / 1000000).toFixed(2) + 'M';
    return (num / 1000000000).toFixed(2) + 'B';
}

// --- FUNCIONES DE COMPRA ---

// Comprar/Mejorar Unidad
function buyUnit(unitKey) {
    const unit = game.units[unitKey];
    
    if (!unit.unlocked) return;
    
    if (game.gold >= unit.cost) {
        game.gold -= unit.cost;
        unit.level++;
        
        // Recalcular daño
        unit.damage = unit.level * unit.baseDamage;
        
        // Recalcular costo con reducción
        unit.cost = unit.baseCost * Math.pow(unit.costMultiplier, unit.level);
        unit.cost *= game.multipliers.unitCostReduction;
        
        updateUI();
    }
}

// Comprar Mejora - CORREGIDO
function buyUpgrade(upgradeKey) {
    const upgrade = game.upgrades[upgradeKey];
    
    if (game.gold >= upgrade.cost) {
        game.gold -= upgrade.cost;
        upgrade.level++;
        
        // Recalcular costo
        upgrade.cost = upgrade.baseCost * Math.pow(upgrade.costMultiplier, upgrade.level);
        
        // Actualizar multiplicadores (esto actualiza el GPS automáticamente)
        updateMultipliers();
        
        // Verificar desbloqueos de unidades
        checkUnitUnlocks();
        
        // Recalcular costos de unidades si es recruitment
        if (upgradeKey === 'recruitment') {
            for (let unitKey in game.units) {
                const unit = game.units[unitKey];
                if (unit.unlocked) {
                    unit.cost = unit.baseCost * Math.pow(unit.costMultiplier, unit.level);
                    unit.cost *= game.multipliers.unitCostReduction;
                }
            }
        }
        
        updateUI();
    }
}

// --- EVENT LISTENERS ---

// Unidades
btnSpaceboy.onclick = () => buyUnit('spaceboy');
btnHatemonger.onclick = () => buyUnit('hatemonger');
btnBPositive.onclick = () => buyUnit('bpositive');
btnCrusader.onclick = () => buyUnit('crusader');
btnInquisitor.onclick = () => buyUnit('inquisitor');
btnTitan.onclick = () => buyUnit('titan');
btnAstartes.onclick = () => buyUnit('astartes');
btnEmperor.onclick = () => buyUnit('emperor');

// Mejoras
btnBureaucracy.onclick = () => buyUpgrade('bureaucracy');
btnRecruitment.onclick = () => buyUpgrade('recruitment');
btnDoctrine.onclick = () => buyUpgrade('doctrine');
btnElite.onclick = () => buyUpgrade('elite');

// Click en el enemigo para daño manual - CORREGIDO
enemySprite.onclick = function() {
    let manualDamage = 1 + (game.totalDPS * 0.1);
    game.enemy.currentHealth -= manualDamage;
    game.gold += manualDamage * game.goldPerHit;
    showDamageNumber(manualDamage);
    
    // Animación de golpe
    enemySprite.style.transform = 'scale(0.9)';
    setTimeout(() => {
        enemySprite.style.transform = 'scale(1)';
    }, 100);
};

// Tabs
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        // Remover active de todos
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        
        // Activar el seleccionado
        this.classList.add('active');
        const tabId = this.getAttribute('data-tab');
        document.getElementById(`tab-${tabId}`).classList.add('active');
    });
});

// --- SISTEMA DE GUARDADO ---

// Guardar Partida
btnSave.onclick = function() {
    try {
        const saveData = JSON.stringify(game);
        localStorage.setItem(SAVE_KEY, saveData);
        alert('¡Partida guardada correctamente!');
    } catch (e) {
        alert('Error al guardar: ' + e.message);
    }
};

// Cargar Partida
btnLoad.onclick = function() {
    try {
        const saveData = localStorage.getItem(SAVE_KEY);
        if (saveData) {
            game = JSON.parse(saveData);
            updateMultipliers(); // Esto actualizará el GPS
            checkUnitUnlocks(); // Verificar desbloqueos al cargar
            alert('¡Partida cargada correctamente!');
            updateUI();
        } else {
            alert('No hay partida guardada');
        }
    } catch (e) {
        alert('Error al cargar: ' + e.message);
    }
};

// Reiniciar Partida
btnReset.onclick = function() {
    if (confirm('¿Estás seguro de que quieres reiniciar? Se perderá todo el progreso.')) {
        localStorage.removeItem(SAVE_KEY);
        location.reload();
    }
};

// Prestigio (placeholder)
btnPrestige.onclick = function() {
    if (game.zone >= 10) {
        if (confirm('¿Realizar Prestigio? Reiniciarás pero obtendrás bonificaciones permanentes.')) {
            alert('Sistema de Prestigio en desarrollo - Próximamente en v0.4');
        }
    } else {
        alert('Necesitas llegar a la Zona 10 para realizar Prestigio');
    }
};

// --- INICIALIZACIÓN ---

// Intentar cargar partida guardada al inicio - CORREGIDO
window.onload = function() {
    const saveData = localStorage.getItem(SAVE_KEY);
    if (saveData) {
        try {
            game = JSON.parse(saveData);
            updateMultipliers(); // Esto inicializará el GPS correctamente
            checkUnitUnlocks(); // Verificar desbloqueos al iniciar
            console.log('Partida cargada automáticamente');
        } catch (e) {
            console.error('Error al cargar partida guardada:', e);
        }
    } else {
        // Si no hay partida guardada, inicializar GPS
        updateMultipliers();
    }
    
    // Iniciar el bucle principal
    setInterval(gameLoop, TICK_RATE);
    
    // Auto-guardado cada 30 segundos
    setInterval(() => {
        try {
            localStorage.setItem(SAVE_KEY, JSON.stringify(game));
            console.log('Auto-guardado realizado');
        } catch (e) {
            console.error('Error en auto-guardado:', e);
        }
    }, 30000);
    
    // Actualizar UI inicial
    updateUI();
    
    console.log('🎮 SPACE KING: IDLE CRUSADE inicializado correctamente');
    console.log('👑 Por el Dios Emperador Espacial');
    console.log('💰 GPS actual:', game.goldPerSecond);
    console.log('🪖 Tropas desbloqueadas:', Object.values(game.units).filter(unit => unit.unlocked).length);
};