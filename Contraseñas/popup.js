document.addEventListener('DOMContentLoaded', function() {
    const passwordOutput = document.getElementById('passwordOutput');
    const generateBtn = document.getElementById('generateBtn');
    const lengthInput = document.getElementById('length');
    const lengthButtons = document.querySelectorAll('.length-btn');
    const themeToggle = document.getElementById('themeToggle');
    const body = document.body;

    // Conjunto de caracteres a usar: Mayúsculas, Minúsculas, Números, Símbolos
    const chars = 
        'ABCDEFGHIJKLMNOPQRSTUVWXYZ' + 
        'abcdefghijklmnopqrstuvwxyz' + 
        '0123456789' + 
        '!@#$%^&*()_+~`|}{[]:;?><,./-=';

    // Cargar tema guardado
    const savedTheme = localStorage.getItem('theme') || 'light-mode';
    body.className = savedTheme;
    updateThemeIcon();

    function generatePassword(length) {
        let password = '';
        for (let i = 0; i < length; i++) {
            const randomIndex = Math.floor(Math.random() * chars.length);
            password += chars[randomIndex];
        }
        return password;
    }

    function updateThemeIcon() {
        themeToggle.textContent = body.classList.contains('dark-mode') ? '☀️' : '🌙';
    }

    /**
     * Función principal para generar una nueva contraseña, actualizar el campo
     * de texto, y opcionalmente copiar al portapapeles.
     * @param {boolean} shouldCopy - Indica si se debe copiar al portapapeles.
     */
    function updatePassword(shouldCopy = false) {
        // Asegurarse de que la longitud esté dentro de límites sensatos
        let len = parseInt(lengthInput.value, 10);
        if (isNaN(len) || len < 8) len = 8;
        if (len > 32) len = 32;

        // Limitar visualmente el input
        lengthInput.value = len;

        const newPassword = generatePassword(len);
        passwordOutput.value = newPassword;

        if (shouldCopy) {
            // Copiar al portapapeles
            passwordOutput.select();
            document.execCommand('copy');

            // Feedback visual
            generateBtn.textContent = '¡Copiada!';
            generateBtn.classList.add('copied');
            
            setTimeout(() => {
                generateBtn.textContent = 'Generar y Copiar';
                generateBtn.classList.remove('copied');
            }, 1500);
        }
    }


    // Botones de longitud rápida
    lengthButtons.forEach(button => {
        button.addEventListener('click', function() {
            const length = parseInt(this.dataset.length, 10);
            lengthInput.value = length;
            
            // Actualizar estado activo
            lengthButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');

            // ⚡️ AÑADIDO: Generar una nueva contraseña al cambiar la longitud ⚡️
            updatePassword(false);
        });
    });

    // Input personalizado actualiza botones y genera nueva contraseña
    lengthInput.addEventListener('input', function() {
        const value = parseInt(this.value, 10);
        
        // Actualizar estado activo de los botones rápidos
        lengthButtons.forEach(btn => {
            if (parseInt(btn.dataset.length, 10) === value) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        // ⚡️ AÑADIDO: Generar una nueva contraseña al cambiar la longitud manualmente ⚡️
        updatePassword(false); 
    });

    // Toggle de tema (sin cambios, funciona bien)
    themeToggle.addEventListener('click', function() {
        if (body.classList.contains('light-mode')) {
            body.classList.remove('light-mode');
            body.classList.add('dark-mode');
            localStorage.setItem('theme', 'dark-mode');
        } else {
            body.classList.remove('dark-mode');
            body.classList.add('light-mode');
            localStorage.setItem('theme', 'light-mode');
        }
        updateThemeIcon();
    });

    // Botón principal: Generar y Copiar
    generateBtn.addEventListener('click', function() {
        // El botón ahora llama a updatePassword con 'true' para que copie
        updatePassword(true);
    });

    // Generar contraseña inicial al cargar
    const initialLength = parseInt(lengthInput.value, 10);
    // Asegurarse de que el botón de 16 (valor inicial) esté activo
    document.querySelector('.length-btn[data-length="16"]').classList.add('active');
    updatePassword(false);
});