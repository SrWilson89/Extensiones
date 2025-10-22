window.initPasswords = function() {
    const passwordOutput = document.getElementById('passwordOutput');
    const generateBtn = document.getElementById('generateBtn');
    const lengthInput = document.getElementById('length');
    // Aseguramos que solo seleccionamos botones dentro de la app de contraseñas
    const lengthButtons = document.querySelectorAll('#passwords-app .length-btn'); 

    const chars = 
        'ABCDEFGHIJKLMNOPQRSTUVWXYZ' + 
        'abcdefghijklmnopqrstuvwxyz' + 
        '0123456789' + 
        '!@#$%^&*()_+~`|}{[]:;?><,./-=';

    function generatePassword(length) {
        let password = '';
        for (let i = 0; i < length; i++) {
            const randomIndex = Math.floor(Math.random() * chars.length);
            password += chars[randomIndex];
        }
        return password;
    }

    function updatePassword(shouldCopy = false) {
        let len = parseInt(lengthInput.value, 10);
        if (isNaN(len) || len < 8) len = 8;
        if (len > 32) len = 32;

        lengthInput.value = len;

        const newPassword = generatePassword(len);
        passwordOutput.value = newPassword;

        if (shouldCopy) {
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
        button.onclick = function() {
            const length = parseInt(this.dataset.length, 10);
            lengthInput.value = length;
            
            // Actualizar estado activo
            lengthButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');

            updatePassword(false);
        };
    });

    // Input personalizado
    lengthInput.oninput = function() {
        const value = parseInt(this.value, 10);
        
        lengthButtons.forEach(btn => {
            if (parseInt(btn.dataset.length, 10) === value) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        updatePassword(false); 
    };

    // Botón principal: Generar y Copiar
    generateBtn.onclick = function() {
        updatePassword(true);
    };

    // Generar contraseña inicial al cargar (si aún no está)
    if (!passwordOutput.value) {
        updatePassword(false);
    }
};