document.addEventListener('DOMContentLoaded', function() {
    // Selectores del Hub
    const tabButtons = document.querySelectorAll('.tab-button');
    const appContainers = document.querySelectorAll('.app-container');
    const themeToggle = document.getElementById('themeToggle');
    const body = document.body;

    // --- LÓGICA DEL TEMA (GLOBAL) ---
    // Usamos chrome.storage si está disponible, si no, localStorage
    const storageArea = chrome.storage.local;
    
    storageArea.get('theme', (data) => {
        const savedTheme = data.theme || localStorage.getItem('theme') || 'light-mode';
        body.className = savedTheme;
        updateThemeIcon();
    });

    function saveTheme(theme) {
        storageArea.set({ theme });
        localStorage.setItem('theme', theme); // Fallback para desarrollo sin extensión
    }

    function updateThemeIcon() {
        themeToggle.textContent = body.classList.contains('dark-mode') ? '☀️' : '🌙';
    }

    themeToggle.addEventListener('click', function() {
        let newTheme;
        if (body.classList.contains('light-mode')) {
            body.classList.remove('light-mode');
            body.classList.add('dark-mode');
            newTheme = 'dark-mode';
        } else {
            body.classList.remove('dark-mode');
            body.classList.add('light-mode');
            newTheme = 'light-mode';
        }
        saveTheme(newTheme);
        updateThemeIcon();
    });

    // --- LÓGICA DEL CAMBIO DE PESTAÑA (HUB) ---
    function changeTab(appName) {
        // Desactivar botones y ocultar contenedores
        tabButtons.forEach(btn => btn.classList.remove('active'));
        appContainers.forEach(container => container.classList.remove('active'));

        // Activar el botón y contenedor seleccionados
        const activeTabButton = document.querySelector(`.tab-button[data-app="${appName}"]`);
        const activeAppContainer = document.getElementById(`${appName}-app`);
        
        if (activeTabButton) activeTabButton.classList.add('active');
        if (activeAppContainer) activeAppContainer.classList.add('active');

        // Llama a la función de inicialización de la app
        // Se asume que cada app tiene su propio script JS (apps/passwords.js, apps/notes.js, etc.)
        if (appName === 'passwords' && window.initPasswords) {
            window.initPasswords();
        }
        if (appName === 'notes' && window.initNotes) {
            window.initNotes();
        }
        if (appName === 'primary' && window.initPrimary) {
            window.initPrimary();
        }
    }

    // Listener para los botones de las pestañas
    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            changeTab(this.dataset.app);
        });
    });

    // Mostrar Contraseñas al cargar por defecto
    changeTab('passwords'); 
});