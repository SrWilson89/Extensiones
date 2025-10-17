// ===================================================
// CONFIGURACIÓN DE CREDENCIALES (SOLO OUTLOOK)
// ===================================================

const CLIENT_ID_OUTLOOK = 'ca7385a0-e1aa-47d6-8cc4-9efe500c81a0'; 

// Añadimos 'User.Read' para asegurar que podemos obtener el email y el nombre del usuario.
const OUTLOOK_SCOPES = [
  'https://graph.microsoft.com/Mail.Read',
  'https://graph.microsoft.com/Mail.ReadWrite',
  'openid', 
  'profile',
  'https://graph.microsoft.com/User.Read' 
];

// ===================================================
// FUNCIÓN DE AUTENTICACIÓN CENTRAL
// ===================================================

// Función para obtener info básica del usuario de Microsoft Graph
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
    // Usamos solo Outlook para la autenticación
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

            // OBTENER Y GUARDAR INFO DEL USUARIO
            try {
                const userInfo = await fetchUserInfo(accessToken);
                // Guardar el token y la información en el storage (UNA SOLA CUENTA)
                chrome.storage.local.set({ 
                    activeToken: accessToken, 
                    activeService: 'outlook',
                    activeUserEmail: userInfo.email,
                    activeUserName: userInfo.name
                }, () => {
                    resolve({ success: true, token: accessToken, email: userInfo.email, name: userInfo.name, service: 'outlook' });
                });
            } catch (e) {
                reject('Error al obtener la información del usuario: ' + e.message);
            }
        });
    });
}

// NOTA: fetchGmailEmails y deleteEmail(service='gmail') deberían ser eliminados 
// si la extensión se enfoca SOLO en Outlook, pero se mantienen abajo por si acaso.
// ===================================================
// FUNCIONES DE ACCESO A LAS APIS (Outlook)
// ===================================================

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
    // Solo permitimos el borrado si es Outlook
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
    return { success: true };
}


// ===================================================
// OYENTE PRINCIPAL DE MENSAJES (Manejador del Popup)
// ===================================================

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  
  // 1. Manejar la Autenticación (siempre Outlook)
  if (request.action === 'authenticate') {
    startAuthFlow() // Ya no necesita el parámetro service
      .then(result => {
        sendResponse(result);
      })
      .catch(error => {
        sendResponse({ success: false, error: error });
      });
    return true; 
  }
  
  // 2. Manejar el Cierre de Sesión (Logout) << NUEVA LÓGICA
  if (request.action === 'logout') {
      // Limpiar el storage de la extensión
      chrome.storage.local.remove(['activeToken', 'activeService', 'activeUserEmail', 'activeUserName'], () => {
          
          // Opcional pero recomendado: Forzar el cierre de sesión en Microsoft (limpia cookies)
          const logoutUrl = 'https://login.microsoftonline.com/common/oauth2/v2.0/logout?post_logout_redirect_uri=' + encodeURIComponent(chrome.identity.getRedirectURL("oauth2"));
          
          chrome.identity.launchWebAuthFlow({ url: logoutUrl, interactive: false }, () => {
              sendResponse({ success: true });
          });
      });
      return true; 
  }

  // 3. Manejar la Lectura de Correos
  if (request.action === 'getEmails') {
    chrome.storage.local.get(['activeToken', 'activeService'], async (data) => {
      if (!data.activeToken || data.activeService !== 'outlook') {
        return sendResponse({ success: false, error: 'No autenticado o servicio incorrecto.' });
      }

      try {
        const emails = await fetchOutlookEmails(data.activeToken);
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

// Nota: Las funciones fetchGmailEmails y deleteEmail(service='gmail') del código anterior 
// han sido omitidas aquí para simplificar al enfoque de cuenta única de Outlook.