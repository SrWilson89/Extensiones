// background.js

// Nota: En este MVP, la lógica de aumentar energía por tiempo
// no está completamente implementada aquí para mantener la simpleza,
// pero el archivo es necesario para el Service Worker.
// La interacción se manejará principalmente desde el popup.js por ahora.

// Puedes añadir listeners para el futuro, como:
/*
chrome.tabs.onActivated.addListener(function(activeInfo) {
    // Lógica para añadir energía o rastrear el foco
});
*/

console.log("Pixel Buddy Service Worker iniciado.");