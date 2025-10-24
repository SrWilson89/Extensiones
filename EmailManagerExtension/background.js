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
// FUNCIÓN AUXILIAR DE MANEJO DE ICONO (DEBUG)
// ===================================================

function safeSetIcon(pathObjeto) {
    const sizes = ['16', '48', '128'];
    let failed = false;

    sizes.forEach(size => {
        const path = pathObjeto[size];
        
        chrome.action.setIcon({ 
            path: { [size]: path },
            tabId: undefined
        }, () => {
            if (chrome.runtime.lastError) {
                failed = true;
                console.error(`ERROR CRÍTICO: El icono de tamaño ${size} falló.`);
            }
        });
    });

    if (failed) {
         console.warn("ADVERTENCIA: Uno o más iconos no se cargaron.");
    }
}

// ===================================================
// FUNCIONES DE AUTENTICACIÓN MEJORADAS (OUTLOOK)
// ===================================================

// Función para renovación silenciosa del token
async function silentTokenRenewal() {
    return new Promise((resolve, reject) => {
        const redirectUri = `https://${chrome.runtime.id}.chromiumapp.org/`;
        
        // Flujo implícito con prompt=none para renovación silenciosa
        const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${CLIENT_ID_OUTLOOK}` +
                      `&response_type=token` +
                      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
                      `&scope=${encodeURIComponent(OUTLOOK_SCOPES.join(' '))}` +
                      `&prompt=none`; // Silencioso - solo funciona si hay sesión activa

        chrome.identity.launchWebAuthFlow({ 
            url: authUrl, 
            interactive: false // No interactivo para renovación
        }, (redirectUrl) => {
            if (chrome.runtime.lastError) {
                return reject(new Error('Renovación silenciosa falló: ' + chrome.runtime.lastError.message));
            }
            
            if (redirectUrl) {
                try {
                    // Extraer el token del hash de la URL
                    const urlObj = new URL(redirectUrl);
                    const hashParams = new URLSearchParams(urlObj.hash.substring(1));
                    const newToken = hashParams.get('access_token');
                    
                    if (newToken) {
                        // Calcular nueva expiración (1 hora por defecto)
                        const expiryTime = Math.floor(Date.now() / 1000) + 3600;
                        
                        chrome.storage.local.set({
                            activeToken: newToken,
                            tokenExpiry: expiryTime
                        }, () => {
                            resolve(newToken);
                        });
                    } else {
                        reject(new Error('No se pudo obtener token en renovación silenciosa'));
                    }
                } catch (error) {
                    reject(error);
                }
            } else {
                reject(new Error('No redirect URL en renovación silenciosa'));
            }
        });
    });
}

// Función para verificar y renovar token si es necesario
async function ensureValidToken() {
    return new Promise(async (resolve, reject) => {
        chrome.storage.local.get(['activeToken', 'tokenExpiry'], async (data) => {
            const now = Math.floor(Date.now() / 1000);
            
            // Si no hay token o el token expiró (con margen de 10 minutos)
            if (!data.activeToken || !data.tokenExpiry || (data.tokenExpiry - 600) < now) {
                
                // Intentar renovación silenciosa primero
                try {
                    console.log('Intentando renovación silenciosa del token...');
                    const newToken = await silentTokenRenewal();
                    resolve(newToken);
                } catch (silentError) {
                    console.log('Renovación silenciosa falló, se requiere autenticación interactiva:', silentError);
                    // Si la renovación silenciosa falla, necesitamos autenticación interactiva
                    getAuthTokenOutlook(true).then(token => resolve(token)).catch(reject);
                }
            } else {
                // Token todavía válido
                resolve(data.activeToken);
            }
        });
    });
}

// Función de autenticación principal (flujo implícito)
async function getAuthTokenOutlook(interactive = false) {
    return new Promise((resolve, reject) => {
        const redirectUri = `https://${chrome.runtime.id}.chromiumapp.org/`;
        
        // Flujo implícito normal
        const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${CLIENT_ID_OUTLOOK}` +
                      `&response_type=token` +
                      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
                      `&scope=${encodeURIComponent(OUTLOOK_SCOPES.join(' '))}`;

        chrome.identity.launchWebAuthFlow({ 
            url: authUrl, 
            interactive: interactive 
        }, (redirectUrl) => {
            if (chrome.runtime.lastError) {
                return reject(new Error('Fallo en autenticación: ' + chrome.runtime.lastError.message));
            }
            
            if (!redirectUrl) {
                return reject(new Error('La ventana de autenticación se cerró.'));
            }
            
            try {
                // Extraer el token del hash de la URL
                const urlObj = new URL(redirectUrl);
                const hashParams = new URLSearchParams(urlObj.hash.substring(1));
                const token = hashParams.get('access_token');
                
                if (token) {
                    // Calcular expiración (1 hora por defecto)
                    const expiryTime = Math.floor(Date.now() / 1000) + 3600;
                    
                    // Guardar token y expiración
                    chrome.storage.local.set({
                        activeToken: token,
                        tokenExpiry: expiryTime
                    }, () => {
                        resolve(token);
                    });
                } else {
                    const error = hashParams.get('error');
                    const errorDescription = hashParams.get('error_description');
                    reject(new Error(errorDescription || 'No se pudo obtener el token de la respuesta.'));
                }
            } catch (error) {
                reject(error);
            }
        });
    });
}

// ===================================================
// FUNCIÓN DE CONTROL DE ESTADO E INTERFAZ (Badge/Icono)
// ===================================================

async function updateUnreadCount() {
    const ACTIVE_PATHS = { 
        '16': chrome.runtime.getURL('icons/icon16.png'),
        '48': chrome.runtime.getURL('icons/icon48.png'),
        '128': chrome.runtime.getURL('icons/icon128.png')
    };
    const EMPTY_PATHS = { 
        '16': chrome.runtime.getURL('icons/icon16-empty.png'),
        '48': chrome.runtime.getURL('icons/icon48-empty.png'),
        '128': chrome.runtime.getURL('icons/icon128-empty.png')
    };
    
    try {
        // VERIFICAR TOKEN VÁLIDO ANTES DE CONTINUAR
        const token = await ensureValidToken();
        
        // Endpoint específico para contar correos no leídos
        const url = 'https://graph.microsoft.com/v1.0/me/mailfolders/inbox/messages?$filter=isRead eq false&$count=true';
        
        const response = await fetch(url, {
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Prefer': 'odata.include-annotations="odata.count"'
            }
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();
        const unreadCount = data['@odata.count'] || 0;
        
        // Actualizar el Badge
        const text = unreadCount > 0 ? String(unreadCount) : '';
        chrome.action.setBadgeText({ text: text });
        chrome.action.setBadgeBackgroundColor({ color: '#0078D4' });
        
        // Cambiar icono según conteo
        if (unreadCount === 0) {
            safeSetIcon(EMPTY_PATHS);
        } else {
            safeSetIcon(ACTIVE_PATHS);
        }
        
    } catch (error) {
        console.error('Fallo en updateUnreadCount:', error);
        
        // Si el error es de autenticación, limpiar el estado
        if (error.message.includes('autenticación') || error.message.includes('token') || error.message.includes('401')) {
            chrome.storage.local.remove(['activeToken', 'tokenExpiry']);
            chrome.action.setBadgeText({ text: '' });
            chrome.action.setBadgeBackgroundColor({ color: '#6C757D' });
        } else {
            chrome.action.setBadgeText({ text: '?' });
            chrome.action.setBadgeBackgroundColor({ color: '#FFC107' });
        }
        safeSetIcon(ACTIVE_PATHS);
    }
}

// Función para obtener información básica del usuario (nombre y correo)
async function getUserInfo(token) {
    const url = 'https://graph.microsoft.com/v1.0/me';
    const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) {
        throw new Error(`Error al obtener info del usuario: ${response.statusText}`);
    }
    const data = await response.json();
    return { name: data.displayName || 'Usuario', email: data.mail || data.userPrincipalName || 'desconocido' };
}

// ===================================================
// FUNCIONES DE MANEJO DE CORREOS (OUTLOOK)
// ===================================================

// Obtener los 10 primeros correos de la bandeja de entrada
async function fetchOutlookEmails(token) {
    const url = 'https://graph.microsoft.com/v1.0/me/mailfolders/inbox/messages?$top=10&$orderby=receivedDateTime desc&$select=subject,sender,receivedDateTime,isRead,id';

    const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) {
        if (response.status === 401) {
            throw new Error('Token expirado o inválido. Reautenticación necesaria.');
        }
        throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data.value.map(email => ({
        id: email.id,
        subject: email.subject || '(Sin Asunto)',
        sender: email.sender?.emailAddress?.name || email.sender?.emailAddress?.address || 'Desconocido',
        time: email.receivedDateTime,
        isRead: email.isRead
    }));
}

// Borrar un correo
async function deleteEmail(service, token, messageId) {
    if (service !== 'outlook') {
        throw new Error('Servicio de borrado no soportado.');
    }
    
    const url = `https://graph.microsoft.com/v1.0/me/messages/${messageId}`;
    
    const response = await fetch(url, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) {
        throw new Error(`Error ${response.status} al borrar el correo.`);
    }
}

// ===================================================
// MANEJO DE EVENTOS Y MENSAJES DEL SERVICE WORKER
// ===================================================

// 1. Instalar y configurar
chrome.runtime.onInstalled.addListener(() => {
  chrome.action.setBadgeText({ text: '' });
  chrome.action.setBadgeBackgroundColor({ color: '#6C757D' }); 
  
  // Alarmas para verificación periódica
  chrome.alarms.create('checkEmailAlarm', { periodInMinutes: 1 });
  // Alarma para verificación de token cada 30 minutos
  chrome.alarms.create('tokenCheckAlarm', { periodInMinutes: 30 });
  
  chrome.storage.local.set({ theme: 'light' }, () => {
      updateUnreadCount(); 
  });
});

// 2. Manejar el inicio del navegador
chrome.runtime.onStartup.addListener(() => {
    updateUnreadCount();
});

// 3. Manejar las alarmas periódicas
chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'checkEmailAlarm') {
        updateUnreadCount();
    }
    if (alarm.name === 'tokenCheckAlarm') {
        // Verificar token periódicamente para mantenerlo fresco
        chrome.storage.local.get(['activeToken'], (data) => {
            if (data.activeToken) {
                ensureValidToken().catch(error => {
                    console.log('Verificación periódica de token falló:', error);
                });
            }
        });
    }
});

// 4. Listener de mensajes desde popup.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  
  // 4.1. Manejar el Inicio de Sesión
  if (request.action === 'authenticate') {
    chrome.storage.local.set({ activeService: 'outlook' }, async () => {
      try {
        const token = await getAuthTokenOutlook(true);
        const userInfo = await getUserInfo(token);
        
        chrome.storage.local.set({ 
            activeToken: token, 
            activeUserEmail: userInfo.email,
            activeUserName: userInfo.name
        }, () => {
            updateUnreadCount(); 
            sendResponse({ success: true, userEmail: userInfo.email, userName: userInfo.name });
        });
        
      } catch (error) {
        sendResponse({ success: false, error: error.message });
      }
    });
    return true;
  }

  // 4.2. Manejar el Cierre de Sesión
  if (request.action === 'logout') {
    chrome.storage.local.get('activeToken', (data) => {
      if (data.activeToken) {
        chrome.identity.removeCachedAuthToken({ 'token': data.activeToken }, () => {
            chrome.storage.local.remove([
              'activeToken', 
              'activeService', 
              'activeUserEmail', 
              'activeUserName',
              'tokenExpiry'
            ], () => {
                chrome.action.setBadgeText({ text: '' });
                chrome.action.setBadgeBackgroundColor({ color: '#6C757D' });
                updateUnreadCount(); 
                sendResponse({ success: true });
            });
        });
      } else {
        sendResponse({ success: true }); 
      }
    });
    return true;
  }
  
  // 4.3. Manejar la Carga de Correos
  if (request.action === 'getEmails') {
    chrome.storage.local.get(['activeService'], async (data) => {
      if (data.activeService !== 'outlook') {
        return sendResponse({ success: false, error: 'Servicio incorrecto.' });
      }

      try {
        const token = await ensureValidToken();
        const emails = await fetchOutlookEmails(token);
        updateUnreadCount(); 
        sendResponse({ success: true, emails: emails, service: data.activeService });
      } catch (error) {
        sendResponse({ success: false, error: error.message });
      }
    });
    return true; 
  }

  // 4.4. Manejar el Borrado de Correos
  if (request.action === 'deleteEmail') {
    chrome.storage.local.get(['activeService'], async (data) => {
      if (data.activeService !== 'outlook') {
        return sendResponse({ success: false, error: 'Servicio incorrecto.' });
      }

      try {
        const token = await ensureValidToken();
        await deleteEmail(data.activeService, token, request.messageId);
        updateUnreadCount();
        sendResponse({ success: true });
      } catch (error) {
        sendResponse({ success: false, error: error.message });
      }
    });
    return true; 
  }
});