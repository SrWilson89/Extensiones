// background.js

// Client ID proporcionado
const CLIENT_ID_REDDIT = 'uWi6Da23rNyxWAoriwQdrHVw0wtpzw';
const REDDIT_SCOPES = ['identity', 'read', 'privatemessages'];
const AUTHORIZE_URL = 'https://www.reddit.com/api/v1/authorize';
const REDIRECT_URI = `https://${chrome.runtime.id}.chromiumapp.org/`;

// Validar Client ID
if (!CLIENT_ID_REDDIT) {
    console.error('Error: CLIENT_ID_REDDIT no está configurado. Registra una aplicación en https://www.reddit.com/prefs/apps.');
}

// ===================================================
// LÓGICA DE AUTENTICACIÓN
// ===================================================

async function getAuthTokenReddit(interactive = false) {
    return new Promise((resolve, reject) => {
        if (!CLIENT_ID_REDDIT) {
            return reject(new Error('Client ID de Reddit no configurado. Registra una aplicación en https://www.reddit.com/prefs/apps.'));
        }
        const state = Math.random().toString(36).substring(2);
        const authUrl = `${AUTHORIZE_URL}?client_id=${CLIENT_ID_REDDIT}` +
                        `&response_type=token` +
                        `&state=${state}` +
                        `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
                        `&duration=permanent` +
                        `&scope=${REDDIT_SCOPES.join(',')}`;
        console.log('Auth URL:', authUrl); // Log para depuración
        console.log('Redirect URI:', REDIRECT_URI); // Log para verificar el URI
        chrome.identity.launchWebAuthFlow({ url: authUrl, interactive }, (redirectUrl) => {
            if (chrome.runtime.lastError) {
                const errorMsg = chrome.runtime.lastError.message || 'Error desconocido';
                console.error('Auth error:', errorMsg);
                if (errorMsg.includes('Authorization page could not be loaded')) {
                    return reject(new Error('No se pudo cargar la página de autorización. Verifica: 1) Tu conexión a internet, 2) Que el Client ID sea correcto, 3) Que el Redirect URI en https://www.reddit.com/prefs/apps coincida con ' + REDIRECT_URI));
                }
                return reject(new Error(`Fallo en autenticación: ${errorMsg}`));
            }
            if (redirectUrl) {
                try {
                    console.log('Redirect URL:', redirectUrl); // Log para depuración
                    const urlHash = new URL(redirectUrl).hash;
                    const params = new URLSearchParams(urlHash.substring(1));
                    const token = params.get('access_token');
                    const receivedState = params.get('state');
                    if (token && receivedState === state) {
                        resolve(token);
                    } else {
                        reject(new Error('No se pudo obtener el token o el estado no coincide. Verifica el Redirect URI en https://www.reddit.com/prefs/apps.'));
                    }
                } catch (error) {
                    reject(new Error(`Error al procesar la URL de redirección: ${error.message}`));
                }
            } else {
                reject(new Error('La ventana de autenticación se cerró sin completar el proceso.'));
            }
        });
    });
}

async function getUserInfo(token) {
    const url = 'https://oauth.reddit.com/api/v1/me';
    const response = await fetch(url, {
        headers: {
            'Authorization': `Bearer ${token}`,
            'User-Agent': 'ChromeExtension:RedditChatExt:v1.0 (by /u/tu_usuario)' // ← Reemplaza con tu usuario
        }
    });
    if (!response.ok) {
        throw new Error(`Error al obtener info del usuario: ${response.statusText}`);
    }
    const data = await response.json();
    return { name: data.name || 'Reddit User' };
}

// ===================================================
// FUNCIONES DE CHAT
// ===================================================

async function fetchRedditChats(token) {
    const url = 'https://oauth.reddit.com/message/inbox';
    const response = await fetch(url, {
        headers: {
            'Authorization': `Bearer ${token}`,
            'User-Agent': 'ChromeExtension:RedditChatExt:v1.0 (by /u/tu_usuario)' // ← Reemplaza con tu usuario
        }
    });
    if (!response.ok) {
        if (response.status === 401) {
            clearSessionData();
            chrome.runtime.sendMessage({ action: 'sessionExpired' });
            throw new Error('Sesión expirada. Por favor, vuelve a conectar.');
        }
        throw new Error(`Error ${response.status}: ${response.statusText}`);
    }
    const data = await response.json();
    return data.data.children
        .filter(item => item.kind === 't4')
        .map(item => ({
            id: item.data.id,
            subject: item.data.subject,
            author: item.data.author,
            dest: item.data.dest,
            body: item.data.body || 'Sin contenido',
            is_new: item.data.new,
            created_utc: item.data.created_utc
        }));
}

// ===================================================
// MANEJO DE MENSAJES DEL SERVICE WORKER
// ===================================================

function clearSessionData() {
    chrome.storage.local.remove(['activeToken', 'activeUserName', 'cachedChats']);
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'authenticate') {
        (async () => {
            try {
                const token = await getAuthTokenReddit(true);
                const userInfo = await getUserInfo(token);
                chrome.storage.local.set({
                    activeToken: token,
                    activeUserName: userInfo.name
                }, () => {
                    sendResponse({ success: true, userName: userInfo.name });
                });
            } catch (error) {
                console.error('Authentication error:', error.message);
                sendResponse({ success: false, error: error.message });
            }
        })();
        return true;
    }

    if (request.action === 'logout') {
        clearSessionData();
        sendResponse({ success: true });
        return false;
    }

    if (request.action === 'getChats') {
        chrome.storage.local.get('activeToken', async (data) => {
            if (!data.activeToken) {
                return sendResponse({ success: false, error: 'No autenticado.' });
            }
            try {
                const chats = await fetchRedditChats(data.activeToken);
                sendResponse({ success: true, chats: chats });
            } catch (error) {
                sendResponse({ success: false, error: error.message });
            }
        });
        return true;
    }

    if (request.action === 'getChatDetails') {
        chrome.storage.local.get('activeToken', async (data) => {
            if (!data.activeToken) {
                return sendResponse({ success: false, error: 'No autenticado.' });
            }
            try {
                const chats = await fetchRedditChats(data.activeToken);
                const chat = chats.find(c => c.id === request.chatId);
                if (chat) {
                    sendResponse({ success: true, chat });
                } else {
                    sendResponse({ success: false, error: 'Chat no encontrado.' });
                }
            } catch (error) {
                sendResponse({ success: false, error: error.message });
            }
        });
        return true;
    }

    if (request.action === 'sendMessage') {
        chrome.storage.local.get(['activeToken', 'activeUserName'], async (data) => {
            if (!data.activeToken) {
                return sendResponse({ success: false, error: 'No autenticado.' });
            }
            try {
                const response = await fetch('https://oauth.reddit.com/api/compose', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${data.activeToken}`,
                        'User-Agent': 'ChromeExtension:RedditChatExt:v1.0 (by /u/tu_usuario)', // ← Reemplaza con tu usuario
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    body: new URLSearchParams({
                        to: request.recipient,
                        subject: 'Mensaje desde Reddit Chat Extensión',
                        text: request.message
                    })
                });
                if (!response.ok) {
                    if (response.status === 401) {
                        clearSessionData();
                        chrome.runtime.sendMessage({ action: 'sessionExpired' });
                        throw new Error('Sesión expirada. Por favor, vuelve a conectar.');
                    }
                    throw new Error(`Error ${response.status}: ${response.statusText}`);
                }
                sendResponse({ success: true });
            } catch (error) {
                sendResponse({ success: false, error: error.message });
            }
        });
        return true;
    }
});

chrome.runtime.onInstalled.addListener(clearSessionData);