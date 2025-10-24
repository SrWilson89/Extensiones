document.addEventListener('DOMContentLoaded', () => {
  // Elementos del DOM
  const themeToggle = document.getElementById('theme-toggle');
  const authButton = document.getElementById('auth-button');
  const emailList = document.getElementById('email-list');
  const body = document.body;
  const statusSpan = document.getElementById('current-account-status');
  const statusBar = document.getElementById('account-status-container');
  const refreshButton = document.getElementById('refresh-button');
  
  // ELEMENTOS DE PERSONALIZACIÓN
  const settingsPanel = document.getElementById('settings-panel');
  const settingsToggle = document.getElementById('settings-toggle');
  const closeSettingsBtn = document.getElementById('close-settings-btn'); 
  const emailSection = document.getElementById('email-section'); 
  const fontSelect = document.getElementById('font-select');
  const accentColorSelect = document.getElementById('accent-color-select');
  const textColorSelect = document.getElementById('text-color-select');
  const backgroundThemeSelect = document.getElementById('background-theme-select');
  
  let isAuthenticated = false;

  // Paletas de Colores Expandidas
  const ACCENT_COLORS = {
      outlook: { primary: '#0078D4', hover: '#106EBE' },
      green: { primary: '#28A745', hover: '#1E7E34' },
      red: { primary: '#DC3545', hover: '#C82333' },
      purple: { primary: '#6F42C1', hover: '#5A38A0' },
      orange: { primary: '#FD7E14', hover: '#D06710' },
      pink: { primary: '#E83E8C', hover: '#D63384' },
      cyan: { primary: '#17A2B8', hover: '#138496' },
      yellow: { primary: '#FFC107', hover: '#E0A800' },
      teal: { primary: '#20C997', hover: '#1AA179' },
      indigo: { primary: '#6610F2', hover: '#5A04E6' }
  };
  
  // Opciones de Color de Texto Expandidas (sensibles al tema)
  const TEXT_COLORS = {
      default: { light: '#212529', dark: '#f0f0f0' }, 
      negro: { light: '#000000', dark: '#FFFFFF' }, 
      blanco: { light: '#FFFFFF', dark: '#000000' }, 
      gris: { light: '#495057', dark: '#CED4DA' },
      azul: { light: '#007BFF', dark: '#66D9EF' },
      rojo: { light: '#DC3545', dark: '#FF6B6B' },
      verde: { light: '#28A745', dark: '#51CF66' },
      morado: { light: '#6F42C1', dark: '#DA77F2' },
      amarillo: { light: '#FFC107', dark: '#FFD43B' },
      naranja: { light: '#FD7E14', dark: '#FFB74D' }
  };

  // Temas de Fondo Nuevos (Define paletas completas para cada tema)
  const BACKGROUND_THEMES = {
      default: { 
          bgPrimary: { light: '#f8f9fa', dark: '#1e1e1e' },
          bgSecondary: { light: '#ffffff', dark: '#252526' },
          bgTertiary: { light: '#e9ecef', dark: '#333333' }
      },
      pastel: { 
          bgPrimary: { light: '#F0E7DB', dark: '#202023' },
          bgSecondary: { light: '#F3D9FA', dark: '#2C2C3A' },
          bgTertiary: { light: '#E2F0CB', dark: '#38384F' }
      },
      vibrant: { 
          bgPrimary: { light: '#FF9F43', dark: '#2C3E50' },
          bgSecondary: { light: '#FF6B6B', dark: '#34495E' },
          bgTertiary: { light: '#4ECDC4', dark: '#7F8C8D' }
      },
      earth: { 
          bgPrimary: { light: '#D2B48C', dark: '#3B2F2F' },
          bgSecondary: { light: '#C19A6B', dark: '#4A3D3D' },
          bgTertiary: { light: '#A67B5B', dark: '#5A4D4D' }
      },
      ocean: { 
          bgPrimary: { light: '#AED6F1', dark: '#1B4F72' },
          bgSecondary: { light: '#85C1E9', dark: '#21618C' },
          bgTertiary: { light: '#5DADE2', dark: '#2874A6' }
      },
      forest: { 
          bgPrimary: { light: '#D4E157', dark: '#1B5E20' },
          bgSecondary: { light: '#AED581', dark: '#2E7D32' },
          bgTertiary: { light: '#9CCC65', dark: '#388E3C' }
      },
      sunset: { 
          bgPrimary: { light: '#FFB74D', dark: '#6A1B9A' },
          bgSecondary: { light: '#FF8A65', dark: '#7B1FA2' },
          bgTertiary: { light: '#FF7043', dark: '#8E24AA' }
      },
      midnight: { 
          bgPrimary: { light: '#E8EAF6', dark: '#0D1117' },
          bgSecondary: { light: '#C5CAE9', dark: '#161B22' },
          bgTertiary: { light: '#9FA8DA', dark: '#21262D' }
      },
      candy: { 
          bgPrimary: { light: '#FCE4EC', dark: '#880E4F' },
          bgSecondary: { light: '#F8BBD0', dark: '#AD1457' },
          bgTertiary: { light: '#F48FB1', dark: '#C2185B' }
      },
      metallic: { 
          bgPrimary: { light: '#E0E0E0', dark: '#212121' },
          bgSecondary: { light: '#BDBDBD', dark: '#424242' },
          bgTertiary: { light: '#9E9E9E', dark: '#616161' }
      }
  };

  // ===================================================
  // LÓGICA DE PERSONALIZACIÓN Y TEMAS
  // ===================================================

  function applyPreferences(prefs) {
      const isDarkMode = body.classList.contains('dark-mode');
      
      // 1. Aplicar Fuente
      body.style.fontFamily = prefs.fontFamily || 'Segoe UI';
      fontSelect.value = prefs.fontFamily || 'Segoe UI';

      // 2. Aplicar Color de Acento (Bordes/Botones)
      const accent = ACCENT_COLORS[prefs.accentColor] || ACCENT_COLORS.outlook;
      document.documentElement.style.setProperty('--accent-primary', accent.primary);
      document.documentElement.style.setProperty('--accent-primary-hover', accent.hover);
      accentColorSelect.value = prefs.accentColor || 'outlook';
      
      // 3. Aplicar Color de Letra
      const textOption = TEXT_COLORS[prefs.textColor] || TEXT_COLORS.default;
      
      if (prefs.textColor && prefs.textColor !== 'default') {
          // Si el usuario eligió un color de letra, lo aplicamos (sensible al modo)
          const finalTextColor = isDarkMode ? textOption.dark : textOption.light;
          document.documentElement.style.setProperty('--text-primary', finalTextColor);
      } else {
          // Si es 'default', dejamos que el CSS nativo (body.dark-mode) lo controle
          document.documentElement.style.removeProperty('--text-primary'); 
      }
      textColorSelect.value = prefs.textColor || 'default';

      // 4. Aplicar Tema de Fondo
      const bgTheme = BACKGROUND_THEMES[prefs.backgroundTheme] || BACKGROUND_THEMES.default;
      const mode = isDarkMode ? 'dark' : 'light';
      document.documentElement.style.setProperty('--bg-primary', bgTheme.bgPrimary[mode]);
      document.documentElement.style.setProperty('--bg-secondary', bgTheme.bgSecondary[mode]);
      document.documentElement.style.setProperty('--bg-tertiary', bgTheme.bgTertiary[mode]);
      backgroundThemeSelect.value = prefs.backgroundTheme || 'default';
  }

  function saveAndApplyPreference(key, value) {
      chrome.storage.local.get('preferences', (data) => {
          const prefs = data.preferences || {};
          prefs[key] = value;
          chrome.storage.local.set({ preferences: prefs }, () => {
              applyPreferences(prefs); 
          });
      });
  }

  // Manejadores de cambios
  fontSelect.addEventListener('change', (e) => { saveAndApplyPreference('fontFamily', e.target.value); });
  accentColorSelect.addEventListener('change', (e) => { saveAndApplyPreference('accentColor', e.target.value); });
  textColorSelect.addEventListener('change', (e) => { saveAndApplyPreference('textColor', e.target.value); });
  backgroundThemeSelect.addEventListener('change', (e) => { saveAndApplyPreference('backgroundTheme', e.target.value); });
  
  // Mostrar/Ocultar Panel con Transición
  function toggleSettingsPanel(show) {
      if (show) {
          settingsPanel.style.opacity = 0;
          settingsPanel.style.transform = 'translateY(20px)';
          settingsPanel.style.display = 'block';
          setTimeout(() => {
              settingsPanel.style.opacity = 1;
              settingsPanel.style.transform = 'translateY(0)';
          }, 10);
      } else {
          settingsPanel.style.opacity = 0;
          settingsPanel.style.transform = 'translateY(20px)';
          setTimeout(() => {
              settingsPanel.style.display = 'none';
          }, 300);
      }
      emailSection.style.display = show ? 'none' : 'block';
      statusBar.style.display = show ? 'none' : 'flex';
      
      // Actualiza el estilo del botón
      settingsToggle.classList.toggle('btn-primary', show);
      settingsToggle.classList.toggle('btn-secondary', !show);
      
      // Si estamos mostrando el panel, aseguramos que se apliquen los colores por si el tema cambió
      if (show) {
           chrome.storage.local.get('preferences', (data) => {
               const defaultPrefs = { fontFamily: 'Segoe UI', accentColor: 'outlook', textColor: 'default', backgroundTheme: 'default' };
               applyPreferences(data.preferences || defaultPrefs);
           });
      }
  }

  settingsToggle.addEventListener('click', () => { toggleSettingsPanel(settingsPanel.style.display === 'none'); });
  closeSettingsBtn.addEventListener('click', () => { toggleSettingsPanel(false); });

  // Lógica de Tema (Actualizada para repintar preferencias)
  themeToggle.addEventListener('click', () => {
    body.classList.toggle('dark-mode');
    const isDarkMode = body.classList.contains('dark-mode');
    const newTheme = isDarkMode ? 'dark' : 'light';
    themeToggle.querySelector('.theme-icon').textContent = isDarkMode ? '🌙' : '☀️';
    chrome.storage.local.set({ theme: newTheme }, () => {
        // Al cambiar el tema, debemos volver a aplicar las preferencias
        chrome.storage.local.get('preferences', (data) => {
            const defaultPrefs = { fontFamily: 'Segoe UI', accentColor: 'outlook', textColor: 'default', backgroundTheme: 'default' };
            applyPreferences(data.preferences || defaultPrefs);
        });
    });
  });

  // ===================================================
  // LÓGICA DE AUTENTICACIÓN Y UI
  // ===================================================

  function updateUIState(email = null, name = null) {
    // Aseguramos que la sección de emails está visible por defecto al cambiar de estado
    toggleSettingsPanel(false); 

    if (isAuthenticated) {
      // Estado Conectado
      authButton.innerHTML = `<svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path><polyline points="10 17 15 12 10 7"></polyline><line x1="15" y1="12" x2="3" y2="12"></line></svg>Cerrar Sesión`;
      authButton.classList.add('btn-secondary'); 
      authButton.classList.remove('btn-primary');
      
      statusSpan.textContent = `Conectado como ${name || email}`;
      statusBar.classList.add('connected');
      refreshButton.style.display = 'inline-flex'; 
      loadEmails();
    } else {
      // Estado Desconectado
      authButton.innerHTML = `<svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path><polyline points="10 17 15 12 10 7"></polyline><line x1="15" y1="12" x2="3" y2="12"></line></svg>Conectar`;
      authButton.classList.add('btn-primary');
      authButton.classList.remove('btn-secondary');
      
      statusSpan.textContent = 'Desconectado.';
      statusBar.classList.remove('connected');
      refreshButton.style.display = 'none';
      renderEmptyState();
    }
  }

  function renderEmptyState() {
      emailList.innerHTML = `
          <div class="empty-state">
              <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="2" y="7" width="20" height="15" rx="2" ry="2"></rect>
                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
              </svg>
              <p id="status-message">Haz clic en 'Conectar' para iniciar sesión con tu cuenta de Outlook</p>
          </div>`;
  }

  function handleAuthClick() {
    if (isAuthenticated) {
      handleLogout();
    } else {
      handleLogin();
    }
  }

  function handleLogin() {
    authButton.textContent = 'Conectando...';

    chrome.runtime.sendMessage({ action: 'authenticate' }, (response) => {
      if (response.success) {
        isAuthenticated = true;
        updateUIState(response.email, response.name); 
      } else {
        alert(`Error de autenticación: ${response.error}`);
        isAuthenticated = false;
        updateUIState();
      }
    });
  }
  
  function handleLogout() {
    if (confirm('¿Estás seguro de que quieres cerrar la sesión de Outlook?')) {
      chrome.runtime.sendMessage({ action: 'logout' }, (response) => {
        if (response.success) {
          isAuthenticated = false;
          updateUIState();
        } else {
          alert('Error al cerrar sesión.');
        }
      });
    }
  }

  // ===================================================
  // LÓGICA DE CORREO Y RENDERIZADO
  // ===================================================

  function renderEmails(emails) {
    emailList.innerHTML = '';
    
    if (emails.length === 0) {
      emailList.innerHTML = `<p id="status-message">Bandeja de Outlook vacía o sin correos recientes.</p>`;
      return;
    }

    emails.forEach(email => {
      const item = document.createElement('div');
      item.className = 'email-item';
      item.dataset.id = email.id; 
      
      item.innerHTML = `
        <div class="email-info">
          <div class="email-subject">${email.subject}</div>
          <div class="email-from">De: ${email.sender}</div>
          <div class="email-preview">${new Date(email.time).toLocaleString()}</div>
        </div>
        <div class="email-actions">
           <button class="delete-btn" data-id="${email.id}" aria-label="Borrar correo">🗑️</button>
        </div>
      `;
      emailList.appendChild(item);
    });
  }

  function loadEmails() {
    emailList.innerHTML = '<p id="status-message">Cargando correos...</p>';
    
    chrome.runtime.sendMessage({ action: 'getEmails' }, (response) => {
      if (response.success) {
        renderEmails(response.emails); 
      } else {
        emailList.innerHTML = `<p id="status-message">Error al cargar correos: ${response.error}. Por favor, vuelve a iniciar sesión.</p>`;
        isAuthenticated = false; 
        updateUIState();
      }
    });
  }

  function handleDelete(e) {
    if (!e.target.closest('.delete-btn')) return;

    const messageId = e.target.closest('.delete-btn').dataset.id;
    const emailItem = e.target.closest('.email-item');
    
    if (confirm('¿Estás seguro de que quieres borrar este correo?')) {
      emailItem.style.opacity = 0.5;
      
      chrome.runtime.sendMessage({ action: 'deleteEmail', messageId: messageId }, (response) => {
        if (response.success) {
          emailItem.remove(); 
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
      chrome.storage.local.get([
          'activeToken', 
          'activeUserEmail', 
          'activeUserName', 
          'theme', 
          'preferences',
          'refreshToken'
      ], (data) => {
          
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
  }

  authButton.addEventListener('click', handleAuthClick);
  emailList.addEventListener('click', handleDelete); 
  refreshButton.addEventListener('click', () => {
      if (isAuthenticated) loadEmails();
  });

  initialize(); 
});