# 1. Navega a tu carpeta (Ejemplo, reemplaza con tu ruta real)
# cd C:\Users\TuUsuario\Desktop\MiExtensionOutlook

# 2. Inicializa Git en la carpeta
git init

# 3. Añade todos los archivos nuevos y modificados
git add .

# 4. Confirma los cambios con un mensaje descriptivo
git commit -m "feat: Versión inicial y funcional de la extensión Outlook"

# 5. Conecta tu repositorio local con el repositorio remoto de GitHub
git remote add origin https://github.com/SrWilson89/Extensiones.git

# 6. Renombra la rama principal a 'main' (práctica estándar)
git branch -M main

# 7. Sube todos los cambios a GitHub (será la primera subida)
git push -u origin main
