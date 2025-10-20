// pet_data.js

// Factor de escala: cuánto se amplía cada píxel (para un look Tamagotchi)
const PIXEL_SCALE = 5; 

// --- DEFINICIÓN DE LOS PIXELES (SPRITES) ---
// Cada frame es un array de [x, y, color]

// Huevo/Semilla de Píxel (Frame 1 - Ojos Abiertos)
const SEED_FRAME_1 = [
    // Forma del huevo (cuerpo)
    [1, 0, '#8BC34A'], [2, 0, '#8BC34A'],
    [0, 1, '#689F38'], [3, 1, '#689F38'],
    [0, 2, '#8BC34A'], [3, 2, '#8BC34A'],
    [1, 3, '#689F38'], [2, 3, '#689F38'],
    
    // Ojos (parpadeando)
    [1, 1, 'black'], [2, 1, 'black']
];

// Sprite simplificado para pruebas (descomentar para probar)
// const SEED_FRAME_1 = [
//     [2, 2, 'red'] // Un solo píxel rojo en el centro
// ];

// Huevo/Semilla de Píxel (Frame 2 - Ojos Cerrados / Parpadeo)
const SEED_FRAME_2 = [
    // Forma del huevo (cuerpo, sin ojos)
    [1, 0, '#8BC34A'], [2, 0, '#8BC34A'],
    [0, 1, '#689F38'], [3, 1, '#689F38'],
    [0, 2, '#8BC34A'], [3, 2, '#8BC34A'],
    [1, 3, '#689F38'], [2, 3, '#689F38']
];

// Byte Buddy (Robot de Productividad - Frame 1)
const BUDDY_IDLE_FRAME_1 = [
    // Cabeza y cuerpo (Azul)
    [0, 1, '#2196F3'], [4, 1, '#2196F3'],
    [1, 0, '#90CAF9'], [2, 0, '#90CAF9'], [3, 0, '#90CAF9'],
    [1, 1, '#2196F3'], [2, 1, '#0D47A1'], [3, 1, '#2196F3'],
    [1, 2, '#90CAF9'], [2, 2, '#90CAF9'], [3, 2, '#90CAF9'],
    
    // Luces/Ojos (Rojo)
    [1, 1, 'red'], [3, 1, 'red'],
    
    // Pies (Gris)
    [1, 4, 'gray'], [3, 4, 'gray']
];

// --- CONFIGURACIÓN DE LA MASCOTA ---

const PET_CONFIG = {
    'SEED': {
        name: 'Pixel Seed',
        frames: [SEED_FRAME_1, SEED_FRAME_2], 
        animationSpeed: 500, // Cada 500ms (parpadeo)
        evolutionThreshold: 50 
    },
    
    'BUDDY_IDLE': {
        name: 'Byte Buddy',
        frames: [BUDDY_IDLE_FRAME_1], 
        animationSpeed: 1000, 
    }
};

// Estado inicial por defecto (será sobrescrito por chrome.storage)
let CURRENT_PET_STATE = {
    form: 'SEED', 
    energy: 0,
    maxEnergy: 100
};