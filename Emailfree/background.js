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

/**
 * Función auxiliar para establecer el icono por tamaño y manejar errores detallados.
 * 💡 IMPORTANTE: Si un icono falla, la consola mostrará cuál de los tres es el culpable.
 * @param {Object} pathObjeto - Objeto con las rutas de los iconos por tamaño.
 */
function safeSetIcon(pathObjeto) {
    // Intentar establecer cada icono por separado para identificar al culpable
    const sizes = ['16', '48', '128'];
    let failed = false;

    sizes.forEach(size => {
        const path = pathObjeto[size];
        
        // El objeto de path para setIcon debe tener una propiedad 'path' o 'imageData', 
        // pero Chrome también acepta el formato {16: path16, 48: path48, ...}
        // Sin embargo, para aislar el error, lo llamaremos con el formato { path: 'ruta' } para ese tamaño.
        
        chrome.action.setIcon({ 
            path: { [size]: path }, // Establecer solo el path para el tamaño actual
            tabId: undefined // Para el icono de la extensión global
        }, () => {
            if (chrome.runtime.lastError) {
                failed = true;
                // 🐛 AHORA EL ERROR INDICA EL TAMAÑO FALLIDO
                console.error(`ERROR CRÍTICO: El icono de tamaño ${size} falló.`);
                console.error("Mensaje:", chrome.runtime.lastError.message);
                console.error("Ruta Intentada:", path);
            }
        });
    });

    if (failed) {
         console.warn("ADVERTENCIA: Uno o más iconos no se cargaron. Revise los nombres de archivo en la carpeta 'icons/'.");
    }
}


// ===================================================
// FUNCIÓN DE CONTROL DE ESTADO E INTERFAZ (Badge/Icono)
// ===================================================

/**
 * Función que consulta el número de no leídos y actualiza el badge y el icono.
 */
async function updateUnreadCount() {
    // 💡 CORRECCIÓN DE ESTABILIDAD: Definir los objetos de ruta seguros aquí
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
    
    chrome.storage.local.get('activeToken', async (data) => {
        const token = data.activeToken;
        if (!token) {
            // Limpiar el badge si no hay sesión activa
            chrome.action.setBadgeText({ text: '' });
            chrome.action.setBadgeBackgroundColor({ color: '#6C757D' }); 
            safeSetIcon(ACTIVE_PATHS); 
            return;
        }

        try {
            // Endpoint específico para contar correos no leídos
            const url = 'https://graph.microsoft.com/v1.0/me/mailfolders/inbox/messages?$filter=isRead eq false&$count=true';
            
            const response = await fetch(url, {
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Prefer': 'odata.include-annotations="odata.count"'
                }
            });

            if (!response.ok) {
                // Manejo de error de API: Mostrar '!'
                chrome.action.setBadgeText({ text: '!' }); 
                chrome.action.setBadgeBackgroundColor({ color: '#DC3545' }); 
                safeSetIcon(ACTIVE_PATHS);
                return;
            }

            const data = await response.json();
            const unreadCount = data['@odata.count'] || 0; 
            
            // 1. Actualizar el Badge
            const text = unreadCount > 0 ? String(unreadCount) : '';
            
            chrome.action.setBadgeText({ text: text });
            chrome.action.setBadgeBackgroundColor({ color: '#0078D4' }); 
            
            // 2. LÓGICA CLAVE PARA CAMBIAR EL ICONO:
            if (unreadCount === 0) {
                safeSetIcon(EMPTY_PATHS);
            } else {
                safeSetIcon(ACTIVE_PATHS);
            }
            
        } catch (error) {
            console.error('Fallo en updateUnreadCount:', error);
            // Mostrar '?' en caso de error de red
            chrome.action.setBadgeText({ text: '?' });
            chrome.action.setBadgeBackgroundColor({ color: '#FFC107' });
            safeSetIcon(ACTIVE_PATHS);
        }
    });
}

// ===================================================
// FUNCIONES DE AUTENTICACIÓN (OUTLOOK)
// ===================================================

// Función para obtener un token de acceso
async function getAuthTokenOutlook(interactive = false) {
    return new Promise((resolve, reject) => {
      // La URI de redirección se construye automáticamente con chrome.runtime.id.
      const redirectUri = `https://${chrome.runtime.id}.chromiumapp.org/`; 
      const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${CLIENT_ID_OUTLOOK}` +
                      `&scope=${OUTLOOK_SCOPES.join('%20')}` + 
                      `&response_type=token` +
                      `&redirect_uri=${encodeURIComponent(redirectUri)}`;
                      
      if (interactive) {
          chrome.identity.launchWebAuthFlow({ 'url': authUrl, 'interactive': true }, (redirectUrl) => {
              if (chrome.runtime.lastError) {
                  return reject(new Error('Fallo en autenticación: ' + chrome.runtime.lastError.message));
              }
              if (redirectUrl) {
                  // Extraer el token del hash de la URL de redirección
                  const urlParams = new URLSearchParams(new URL(redirectUrl.replace('#', '?')).search);
                  const token = urlParams.get('access_token');
                  
                  if (token) {
                      resolve(token);
                  } else {
                      reject(new Error('No se pudo obtener el token de la respuesta.'));
                  }
              } else {
                  reject(new Error('La ventana de autenticación se cerró.'));
              }
          });
      } else {
          reject(new Error('No se puede obtener token de forma no interactiva con esta configuración.'));
      }
    });
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
    // Se ordenan por fecha de recepción descendente y se seleccionan campos importantes
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
    // Mapear los datos para el formato de la UI
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
    
    // Endpoint para mover a la carpeta 'Elementos eliminados' (Soft delete)
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

// 1. Instalar y configurar (solo se ejecuta una vez al instalar o actualizar la extensión)
chrome.runtime.onInstalled.addListener(() => {
  // Inicializar el badge en blanco al instalar
  chrome.action.setBadgeText({ text: '' });
  chrome.action.setBadgeBackgroundColor({ color: '#6C757D' }); 
  
  // Establecer la alarma para la verificación periódica de correos (cada 1 minuto = 60 segundos)
  chrome.alarms.create('checkEmailAlarm', { periodInMinutes: 1 });
  
  // Cargar el tema por defecto la primera vez Y ACTUALIZAR EL ESTADO DEL ICONO
  chrome.storage.local.set({ theme: 'light' }, () => {
      // LLAMADA SEGURA después de la instalación
      updateUnreadCount(); 
  });
});

// 2. Manejar el inicio del navegador (Garantiza que el icono se carga correctamente al arrancar)
chrome.runtime.onStartup.addListener(() => {
    updateUnreadCount();
});


// 3. Manejar la alarma periódica para la actualización del badge/icono
chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'checkEmailAlarm') {
        updateUnreadCount();
    }
});

// 4. Listener de mensajes desde popup.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  
  // 4.1. Manejar el Inicio de Sesión
  if (request.action === 'authenticate') {
    chrome.storage.local.set({ activeService: 'outlook' }, async () => {
      try {
        const token = await getAuthTokenOutlook(true); // interactive=true para inicio de sesión
        const userInfo = await getUserInfo(token);
        
        // Guardar token y datos de usuario en el almacenamiento local
        chrome.storage.local.set({ 
            activeToken: token, 
            activeUserEmail: userInfo.email,
            activeUserName: userInfo.name
        }, () => {
            // Actualizar el conteo y el icono después de iniciar sesión
            updateUnreadCount(); 
            sendResponse({ success: true, userEmail: userInfo.email, userName: userInfo.name });
        });
        
      } catch (error) {
        sendResponse({ success: false, error: error.message });
      }
    });
    return true; // Indica que la respuesta es asíncrona
  }

  // 4.2. Manejar el Cierre de Sesión
  if (request.action === 'logout') {
    chrome.storage.local.get('activeToken', (data) => {
      if (data.activeToken) {
        chrome.identity.removeCachedAuthToken({ 'token': data.activeToken }, () => {
            // Limpiar todo el estado de la sesión
            chrome.storage.local.remove(['activeToken', 'activeService', 'activeUserEmail', 'activeUserName'], () => {
                // Limpiar el badge y restaurar icono
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
    return true; // Indica que la respuesta es asíncrona
  }
  
  // 4.3. Manejar la Carga de Correos
  if (request.action === 'getEmails') {
    chrome.storage.local.get(['activeToken', 'activeService'], async (data) => {
      if (!data.activeToken || data.activeService !== 'outlook') {
        return sendResponse({ success: false, error: 'No autenticado o servicio incorrecto.' });
      }

      try {
        const emails = await fetchOutlookEmails(data.activeToken);
        // Actualiza el badge/icono después de cargar la lista
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
    chrome.storage.local.get(['activeToken', 'activeService'], async (data) => {
      if (!data.activeToken || data.activeService !== 'outlook') {
        return sendResponse({ success: false, error: 'No autenticado o servicio incorrecto.' });
      }

      try {
        await deleteEmail(data.activeService, data.activeToken, request.messageId);
        // Actualiza el conteo y el icono después de borrar
        updateUnreadCount();
        sendResponse({ success: true });
      } catch (error) {
        sendResponse({ success: false, error: error.message });
      }
    });
    return true; 
  }
});