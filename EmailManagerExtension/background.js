// ===================================================
// CONFIGURACIÓN DE CREDENCIALES (SOLO OUTLOOK)
// ===================================================

const CLIENT_ID_OUTLOOK = 'ca7385a0-e1aa-47d6-8cc4-9efe500c81a0'; 

const OUTLOOK_SCOPES = [
  'https://graph.microsoft.com/Mail.Read',
  'https://graph.microsoft.com/Mail.ReadWrite',
  'openid', 
  'profile',
  'https://graph.microsoft.com/User.Read' 
];

// ===================================================
// FUNCIONES DE CONTROL DE ESTADO E INTERFAZ (Badge)
// ===================================================

// Función que consulta el número de no leídos y actualiza el badge.
async function updateUnreadCount() {
    chrome.storage.local.get('activeToken', async (data) => {
        const token = data.activeToken;
        if (!token) {
            // Limpiar el badge si no hay sesión activa
            chrome.action.setBadgeText({ text: '' });
            chrome.action.setBadgeBackgroundColor({ color: '#6C757D' }); 
            return;
        }

        try {
            // Endpoint específico para contar correos no leídos de la bandeja de entrada
            const url = 'https://graph.microsoft.com/v1.0/me/mailfolders/inbox/messages?$filter=isRead eq false&$count=true';
            
            const response = await fetch(url, {
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Prefer': 'odata.include-annotations="odata.count"' // Solicita el conteo total
                }
            });

            if (!response.ok) {
                console.error(`Error al obtener el conteo de no leídos: ${response.statusText}`);
                chrome.action.setBadgeText({ text: '!' }); // Señal de error
                chrome.action.setBadgeBackgroundColor({ color: '#DC3545' }); // Rojo de error
                return;
            }

            const data = await response.json();
            // El conteo total está en la propiedad '@odata.count'
            const unreadCount = data['@odata.count'] || 0; 
            
            const text = unreadCount > 0 ? String(unreadCount) : '';
            
            chrome.action.setBadgeText({ text: text });
            chrome.action.setBadgeBackgroundColor({ color: '#0078D4' }); // Azul de Outlook
            
        } catch (error) {
            console.error('Fallo en updateUnreadCount:', error);
            chrome.action.setBadgeText({ text: '?' });
            chrome.action.setBadgeBackgroundColor({ color: '#FFC107' });
        }
    });
}

// 1. Persistencia de Sesión al INICIO del Navegador (CRÍTICO)
chrome.runtime.onStartup.addListener(() => {
    // Cuando el navegador se inicia, comprobamos inmediatamente si hay un token
    // guardado y actualizamos el contador.
    console.log("Navegador iniciado. Verificando sesión...");
    updateUnreadCount();
});

// 2. Ejecutar la comprobación al instalar (primera vez)
chrome.runtime.onInstalled.addListener(() => {
    updateUnreadCount();
});


// 3. Ejecutar la comprobación cada vez que se abre la extensión (popup)
chrome.action.onClicked.addListener(() => {
    updateUnreadCount();
});


// ===================================================
// OTRAS FUNCIONES (startAuthFlow, fetchUserInfo, etc.)
// ... (Mantener las funciones auxiliares aquí)
// ===================================================
async function fetchUserInfo(token) {
    const response = await fetch('https://graph.microsoft.com/v1.0/me', {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!response.ok) {
        const errorDetail = response.statusText || `Código de estado: ${response.status}`;
        throw new Error(`Error al obtener info del usuario: ${errorDetail}`);
    }
    
    const data = await response.json();
    
    return {
        email: data.mail || data.userPrincipalName || 'Desconocido', 
        name: data.displayName || 'Outlook User'
    };
}


async function startAuthFlow() {
    // ... (El código de startAuthFlow es el mismo que antes, usa OUTLOOK_SCOPES)
    const clientId = CLIENT_ID_OUTLOOK;
    const scopes = OUTLOOK_SCOPES.join(' ');
    const redirectUri = chrome.identity.getRedirectURL("oauth2");

    const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?` +
                  `client_id=${clientId}&` +
                  `response_type=token&` + 
                  `redirect_uri=${encodeURIComponent(redirectUri)}&` +
                  `scope=${encodeURIComponent(scopes)}&` +
                  `state=outlook_auth&` +
                  `response_mode=fragment`;

    return new Promise((resolve, reject) => {
        chrome.identity.launchWebAuthFlow({ url: authUrl, interactive: true }, async (responseUrl) => {
            if (chrome.runtime.lastError || !responseUrl) {
                const errorMessage = chrome.runtime.lastError ? chrome.runtime.lastError.message : 'Autenticación cancelada o fallida.';
                return reject(errorMessage);
            }

            const params = new URLSearchParams(new URL(responseUrl.replace('#', '?')).search);
            const accessToken = params.get('access_token');
            
            if (!accessToken) {
                return reject('Token de acceso no encontrado.');
            }

            try {
                const userInfo = await fetchUserInfo(accessToken);
                chrome.storage.local.set({ 
                    activeToken: accessToken, 
                    activeService: 'outlook',
                    activeUserEmail: userInfo.email,
                    activeUserName: userInfo.name
                }, () => {
                    // LLAMADA CLAVE: Actualiza el contador tras un inicio de sesión exitoso
                    updateUnreadCount(); 
                    resolve({ success: true, token: accessToken, email: userInfo.email, name: userInfo.name, service: 'outlook' });
                });
            } catch (e) {
                reject('Error al obtener la información del usuario: ' + e.message);
            }
        });
    });
}
// ... (Continúa con fetchOutlookEmails y deleteEmail)
async function fetchOutlookEmails(token) {
    const url = 'https://graph.microsoft.com/v1.0/me/mailfolders/inbox/messages?$top=10&$select=id,subject,sender,bodyPreview';
    const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) throw new Error(`Error de Outlook: ${response.statusText}. El token puede haber expirado.`);

    const data = await response.json();
    return (data.value || []).map(message => ({
        id: message.id,
        snippet: message.bodyPreview,
        subject: message.subject || '(Sin asunto)',
        from: message.sender.emailAddress.name || 'Desconocido'
    }));
}

async function deleteEmail(service, token, messageId) {
    if (service !== 'outlook') {
        throw new Error('Servicio no soportado para borrar en este modo de cuenta única.');
    }
    
    const url = `https://graph.microsoft.com/v1.0/me/messages/${messageId}`;
    const response = await fetch(url, {
        method: 'DELETE', 
        headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok && response.status !== 204) {
        throw new Error(`Error al borrar: ${response.statusText}`);
    }
    
    // LLAMADA CLAVE: Actualizar el contador tras el borrado
    updateUnreadCount(); 
    return { success: true };
}
// ===================================================
// OYENTE PRINCIPAL DE MENSAJES (Manejador del Popup)
// ===================================================

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  
  if (request.action === 'authenticate') {
    startAuthFlow()
      .then(result => {
        sendResponse(result);
      })
      .catch(error => {
        sendResponse({ success: false, error: error });
      });
    return true; 
  }
  
  if (request.action === 'logout') {
      chrome.storage.local.remove(['activeToken', 'activeService', 'activeUserEmail', 'activeUserName'], () => {
          
          // LLAMADA CLAVE: Limpiar el badge tras cerrar sesión
          updateUnreadCount();
          
          const logoutUrl = 'https://login.microsoftonline.com/common/oauth2/v2.0/logout?post_logout_redirect_uri=' + encodeURIComponent(chrome.identity.getRedirectURL("oauth2"));
          
          chrome.identity.launchWebAuthFlow({ url: logoutUrl, interactive: false }, () => {
              sendResponse({ success: true });
          });
      });
      return true; 
  }

  // 3. Manejar la Lectura de Correos (Ahora solo llama a updateUnreadCount al final)
  if (request.action === 'getEmails') {
    chrome.storage.local.get(['activeToken', 'activeService'], async (data) => {
      if (!data.activeToken || data.activeService !== 'outlook') {
        return sendResponse({ success: false, error: 'No autenticado o servicio incorrecto.' });
      }

      try {
        const emails = await fetchOutlookEmails(data.activeToken);
        // LLAMADA CLAVE: Actualiza el badge después de cargar la lista (por si han cambiado)
        updateUnreadCount(); 
        sendResponse({ success: true, emails: emails, service: data.activeService });
      } catch (error) {
        sendResponse({ success: false, error: error.message });
      }
    });
    return true; 
  }

  // 4. Manejar el Borrado de Correos
  if (request.action === 'deleteEmail') {
    chrome.storage.local.get(['activeToken', 'activeService'], async (data) => {
      if (!data.activeToken || data.activeService !== 'outlook') {
        return sendResponse({ success: false, error: 'No autenticado o servicio incorrecto.' });
      }

      try {
        await deleteEmail(data.activeService, data.activeToken, request.messageId);
        sendResponse({ success: true });
      } catch (error) {
        sendResponse({ success: false, error: error.message });
      }
    });
    return true; 
  }
});

// Inicializa el contador al cargar el Service Worker (ejecución inicial)
updateUnreadCount();