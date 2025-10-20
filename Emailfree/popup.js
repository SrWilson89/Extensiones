document.addEventListener('DOMContentLoaded', () => {
  // Elementos del DOM
  const themeToggle = document.getElementById('theme-toggle');
  const authButton = document.getElementById('auth-button');
  const emailList = document.getElementById('email-list');
  const body = document.body;
  const statusSpan = document.getElementById('current-account-status');
  const statusBar = document.getElementById('account-status-container');
  const refreshButton = document.getElementById('refresh-button');
  const logoutButton = document.getElementById('logout-button');
  
  // ELEMENTOS DE PERSONALIZACIÓN
  const settingsPanel = document.getElementById('settings-panel');
  const settingsToggle = document.getElementById('settings-toggle');
  const closeSettingsBtn = document.getElementById('close-settings-btn'); 
  const emailSection = document.getElementById('email-section'); 

  // 💡 NUEVOS ELEMENTOS PARA GESTIONAR LA VERSIÓN PRO
  const premiumCustomization = document.getElementById('premium-customization'); 
  const premiumMessage = document.getElementById('premium-message');
  
  // Selectores de Personalización (Añadidos para referencia, aunque estén bloqueados)
  const fontSelect = document.getElementById('font-select');
  const accentColorSelect = document.getElementById('accent-color-select');
  const textColorSelect = document.getElementById('textColorSelect');
  const backgroundThemeSelect = document.getElementById('backgroundThemeSelect');
  
  let isAuthenticated = false;

  // Si alguien lee este código y quiere la versión PRO, que mande un email.
  // 📧 Email de contacto para la versión PRO: srwilsonm89@gmail.com 
  const PRO_EMAIL = 'srwilsonm89@gmail.com';
  
  // Paletas de Colores Expandidas
  // ... (Esta sección no necesita cambios, mantenemos los colores por consistencia)
  const ACCENT_COLORS = {
      outlook: { primary: '#0078D4', hover: '#106EBE' },
      green: { primary: '#28A745', hover: '#1E7E34' },
      red: { primary: '#DC3545', hover: '#C82333' },
      purple: { primary: '#6f42c1', hover: '#5a349c' }
  };
  
  // ... (El resto de las funciones auxiliares: applyPreferences, updateUIState, etc.)
  
  // ===================================================
  // LÓGICA DE MANEJO DE ESTADO Y UI
  // ===================================================

  // Función auxiliar para aplicar las preferencias del usuario (solo funciona el modo oscuro en la versión free)
  function applyPreferences(prefs) {
      if (!prefs) return;
      
      // Aplicar color de acento (Solo si fuera PRO, aquí solo se aplica el modo oscuro)
      // Este código se mantiene para la versión PRO futura
      const accent = ACCENT_COLORS[prefs.accentColor] || ACCENT_COLORS.outlook;
      document.documentElement.style.setProperty('--accent-primary', accent.primary);
      document.documentElement.style.setProperty('--accent-primary-hover', accent.hover);
      
      // Aplicar fuente, color de texto y fondo (Funciones PRO, no se aplican en la versión free)
      // document.body.style.setProperty('--font-family', prefs.fontFamily);
      // document.body.style.setProperty('--text-list-color', prefs.textColor);
      // document.body.style.setProperty('--bg-list-theme', prefs.backgroundTheme);
  }

  // Función para actualizar la interfaz después de autenticación
  function updateUIState(email = '', name = '') {
      const authText = document.getElementById('auth-text');
      const container = document.getElementById('container');

      if (isAuthenticated) {
          container.classList.add('logged-in');
          authButton.style.display = 'none';
          logoutButton.style.display = 'inline-block';
          statusSpan.textContent = `Conectado como: ${name} (${email})`;
          statusBar.classList.remove('hidden');
          loadEmails();
      } else {
          container.classList.remove('logged-in');
          authButton.style.display = 'inline-block';
          logoutButton.style.display = 'none';
          statusBar.classList.add('hidden');
          emailList.innerHTML = '<p class="empty-state-text">Inicie sesión para ver sus correos.</p>';
          document.querySelector('.loading-overlay').style.display = 'none';
      }
  }
  
  // Función para manejar el clic en los elementos PRO (Modo "En Construcción")
  function handlePremiumClick(event) {
    event.preventDefault(); 
    
    // Si el usuario hace clic en un selector deshabilitado o en el mensaje de PRO, mostramos la alerta.
    const message = `✨ Funciones de Personalización (Fuente, Color, Fondo): En Construcción.\n\nEstarán disponibles con la **versión PRO** de la extensión.\n\nSi desea la versión PRO, por favor, envíe un correo a:\n${PRO_EMAIL}`;
    
    alert(message);
  }

  // ===================================================
  // LÓGICA PRINCIPAL (Auth, Fetch, Delete)
  // ===================================================

  function handleAuthClick() {
      if (isAuthenticated) {
          handleLogoutClick();
      } else {
          chrome.runtime.sendMessage({ action: 'authenticate' }, (response) => {
              if (response.success) {
                  isAuthenticated = true;
                  updateUIState(response.userEmail, response.userName);
              } else {
                  alert(`Error al iniciar sesión: ${response.error}`);
              }
          });
      }
  }
  
  function handleLogoutClick() {
    chrome.runtime.sendMessage({ action: 'logout' }, (response) => {
        if (response.success) {
            isAuthenticated = false;
            updateUIState();
            // Restablecer el tema a claro por defecto si es necesario (el tema se carga al inicio)
            if (body.classList.contains('dark-mode')) {
                body.classList.remove('dark-mode');
                themeToggle.querySelector('.theme-icon').textContent = '☀️';
                chrome.storage.local.set({ theme: 'light' });
            }
        } else {
            alert(`Error al cerrar sesión: ${response.error}`);
        }
    });
  }

  function loadEmails() {
      const loadingOverlay = document.querySelector('.loading-overlay');
      loadingOverlay.style.display = 'flex';
      emailList.innerHTML = '';
      document.getElementById('empty-state').classList.add('hidden');

      chrome.runtime.sendMessage({ action: 'getEmails' }, (response) => {
          loadingOverlay.style.display = 'none';
          
          if (response.success) {
              displayEmails(response.emails);
          } else {
              emailList.innerHTML = `<p class="error-message">Error al cargar correos: ${response.error}</p>`;
          }
      });
  }
  
  function displayEmails(emails) {
      emailList.innerHTML = '';

      if (emails.length === 0) {
          document.getElementById('empty-state').classList.remove('hidden');
          return;
      }

      emails.forEach(email => {
          const listItem = document.createElement('li');
          listItem.className = `email-item ${email.isRead ? 'read' : 'unread'}`;
          listItem.dataset.messageId = email.id;

          const time = new Date(email.time).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

          listItem.innerHTML = `
              <div class="email-header">
                  <div class="email-sender">${email.sender}</div>
                  <div class="email-time">${time}</div>
              </div>
              <div class="email-subject">${email.subject}</div>
              <button class="delete-btn" aria-label="Borrar correo">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    <line x1="10" y1="11" x2="10" y2="17"></line>
                    <line x1="14" y1="11" x2="14" y2="17"></line>
                </svg>
              </button>
          `;
          emailList.appendChild(listItem);
      });
      document.getElementById('empty-state').classList.add('hidden');
  }

  function handleDelete(event) {
    const deleteBtn = event.target.closest('.delete-btn');
    if (deleteBtn) {
      const emailItem = deleteBtn.closest('.email-item');
      const messageId = emailItem.dataset.messageId;

      if (!confirm('¿Está seguro de que desea borrar este correo?')) {
        return;
      }

      emailItem.style.opacity = 0.5; // Feedback visual
      
      chrome.runtime.sendMessage({ action: 'deleteEmail', messageId: messageId }, (response) => {
        if (response.success) {
          emailItem.remove(); // Borrar de la lista al confirmar
          // Recargar para actualizar el conteo de no leídos
          loadEmails(); 
        } else {
          alert(`Error al borrar: ${response.error}`);
          emailItem.style.opacity = 1;
        }
      });
    }
  }

  // ===================================================
  // INICIALIZACIÓN
  // ===================================================

  function initialize() {
      // 1. Cargar el tema y las preferencias guardadas primero
      chrome.storage.local.get(['activeToken', 'activeUserEmail', 'activeUserName', 'theme', 'preferences'], (data) => {
          
          // Aplicar Tema
          if (data.theme === 'dark') {
              body.classList.add('dark-mode');
              themeToggle.querySelector('.theme-icon').textContent = '🌙';
          }
          
          // Aplicar personalización
          const defaultPrefs = { fontFamily: 'Segoe UI', accentColor: 'outlook', textColor: 'default', backgroundTheme: 'default' };
          applyPreferences(data.preferences || defaultPrefs);

          // 2. Verificar autenticación
          if (data.activeToken) {
              isAuthenticated = true;
              updateUIState(data.activeUserEmail, data.activeUserName);
          } else {
              isAuthenticated = false;
              updateUIState();
          }
      });
      
      // 3. Configurar listeners
      
      // Listener del Modo Oscuro (Gratis)
      themeToggle.addEventListener('click', () => {
          body.classList.toggle('dark-mode');
          const isDark = body.classList.contains('dark-mode');
          themeToggle.querySelector('.theme-icon').textContent = isDark ? '🌙' : '☀️';
          chrome.storage.local.set({ theme: isDark ? 'dark' : 'light' });
      });
      
      // Listener de Botones de Navegación
      settingsToggle.addEventListener('click', () => {
          settingsPanel.classList.remove('hidden');
          emailSection.classList.add('hidden');
      });
      closeSettingsBtn.addEventListener('click', () => {
          settingsPanel.classList.add('hidden');
          emailSection.classList.remove('hidden');
      });
      
      // Listener de la sección PRO (Bloquea y muestra el mensaje)
      if (premiumCustomization) {
          premiumCustomization.addEventListener('click', handlePremiumClick);
      }
  }

  // EVENT LISTENERS GLOBALES
  authButton.addEventListener('click', handleAuthClick);
  logoutButton.addEventListener('click', handleLogoutClick); // Añadido listener para el botón de logout
  emailList.addEventListener('click', handleDelete); 
  refreshButton.addEventListener('click', () => {
      if (isAuthenticated) loadEmails();
  });
  
  initialize();
});