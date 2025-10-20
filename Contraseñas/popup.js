document.addEventListener('DOMContentLoaded', function() {
    const passwordOutput = document.getElementById('passwordOutput');
    const generateBtn = document.getElementById('generateBtn');
    const lengthInput = document.getElementById('length');

    // Conjunto de caracteres a usar: Mayúsculas, Minúsculas, Números, Símbolos
    const chars = 
        'ABCDEFGHIJKLMNOPQRSTUVWXYZ' + 
        'abcdefghijklmnopqrstuvwxyz' + 
        '0123456789' + 
        '!@#$%^&*()_+~`|}{[]\:;?><,./-=';

    function generatePassword(length) {
        let password = '';
        for (let i = 0; i < length; i++) {
            const randomIndex = Math.floor(Math.random() * chars.length);
            password += chars[randomIndex];
        }
        return password;
    }

    generateBtn.addEventListener('click', function() {
        // Asegurarse de que la longitud esté dentro de límites sensatos
        let len = parseInt(lengthInput.value, 10);
        if (len < 8) len = 8;
        if (len > 24) len = 24;

        const newPassword = generatePassword(len);
        passwordOutput.value = newPassword;

        // Copiar al portapapeles
        passwordOutput.select();
        document.execCommand('copy');

        // (Opcional) Mostrar un feedback
        generateBtn.textContent = '¡Copiada!';
        setTimeout(() => {
            generateBtn.textContent = 'Generar y Copiar';
        }, 1500);
    });
});