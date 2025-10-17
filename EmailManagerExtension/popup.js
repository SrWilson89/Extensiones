document.addEventListener('DOMContentLoaded', () => {
  // Elementos del DOM
  const themeToggle = document.getElementById('theme-toggle');
  const authButton = document.getElementById('auth-button');
  const emailList = document.getElementById('email-list');
  const body = document.body;
  const statusSpan = document.getElementById('current-account-status');
  const statusBar = document.getElementById('account-status-container');
  const refreshButton = document.getElementById('refresh-button');
  
  // Variables de estado
  let isAuthenticated = false;

  // ===================================================
  // LÓGICA DE TEMA
  // ===================================================

  chrome.storage.local.get('theme', (data) => {
    if (data.theme === 'dark') {
      body.classList.add('dark-mode');
      themeToggle.querySelector('.theme-icon').textContent = '🌙';
    }
  });

  themeToggle.addEventListener('click', () => {
    body.classList.toggle('dark-mode');
    const isDarkMode = body.classList.contains('dark-mode');
    const newTheme = isDarkMode ? 'dark' : 'light';
    themeToggle.querySelector('.theme-icon').textContent = isDarkMode ? '🌙' : '☀️';
    chrome.storage.local.set({ theme: newTheme });
  });

  // ===================================================
  // LÓGICA DE AUTENTICACIÓN Y UI
  // ===================================================

  // Alterna el estado de la UI (conectado/desconectado)
  function updateUIState(email = null, name = null) {
    if (isAuthenticated) {
      // Estado Conectado
      // Actualiza el HTML del botón, incluyendo el icono de "Logout"
      authButton.innerHTML = `<svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path><polyline points="10 17 15 12 10 7"></polyline><line x1="15" y1="12" x2="3" y2="12"></line></svg>Cerrar Sesión`;
      authButton.classList.add('btn-secondary'); 
      authButton.classList.remove('btn-primary');
      
      statusSpan.textContent = `Conectado como ${name || email}`;
      statusBar.classList.add('connected');
      refreshButton.style.display = 'inline-flex'; 
      loadEmails();
    } else {
      // Estado Desconectado
      // Icono de "Conectar"
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

  // Maneja el clic en el botón (Conectar o Cerrar Sesión)
  function handleAuthClick() {
    if (isAuthenticated) {
      handleLogout();
    } else {
      handleLogin();
    }
  }

  // Flujo de inicio de sesión (Outlook)
  function handleLogin() {
    authButton.textContent = 'Conectando...';

    // Se asume que el background.js solo maneja Outlook
    chrome.runtime.sendMessage({ action: 'authenticate' }, (response) => {
      if (response.success) {
        isAuthenticated = true;
        // Pasa los datos de usuario devueltos
        updateUIState(response.email, response.name); 
      } else {
        alert(`Error de autenticación: ${response.error}`);
        isAuthenticated = false;
        updateUIState();
      }
    });
  }
  
  // Flujo de cierre de sesión
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

  // Dibuja la lista de correos
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
      
      // Usa las clases CSS para el formato
      item.innerHTML = `
        <div class="email-info">
          <div class="email-subject">${email.subject}</div>
          <div class="email-from">De: ${email.from}</div>
          <div class="email-preview">${email.snippet}</div>
        </div>
        <div class="email-actions">
           <button class="delete-btn" data-id="${email.id}" aria-label="Borrar correo">🗑️</button>
        </div>
      `;
      emailList.appendChild(item);
    });
  }

  // Carga los correos
  function loadEmails() {
    emailList.innerHTML = '<p id="status-message">Cargando correos...</p>';
    
    chrome.runtime.sendMessage({ action: 'getEmails' }, (response) => {
      if (response.success) {
        renderEmails(response.emails); 
      } else {
        emailList.innerHTML = `<p id="status-message">Error al cargar correos: ${response.error}. Por favor, vuelve a iniciar sesión.</p>`;
        // Si hay un error de token, forzamos el estado a desconectado
        isAuthenticated = false; 
        updateUIState();
      }
    });
  }

  // Maneja el borrado de correos
  function handleDelete(e) {
    if (!e.target.classList.contains('delete-btn')) return;

    const messageId = e.target.dataset.id;
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
      // 1. Comprueba si hay una cuenta activa y pide sus datos (email/nombre)
      chrome.storage.local.get(['activeToken', 'activeUserEmail', 'activeUserName'], (data) => {
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