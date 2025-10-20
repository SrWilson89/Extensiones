document.addEventListener('DOMContentLoaded', () => {
    // Elementos del DOM
    const authButton = document.getElementById('auth-button');
    const statusSpan = document.getElementById('current-account-status');
    const statusBar = document.getElementById('account-status-container');
    const chatInterface = document.getElementById('chat-interface');
    const emptyStateSection = document.getElementById('empty-state-section');
    const chatList = document.getElementById('chat-list');
    const refreshButton = document.getElementById('refresh-button');
    const activeChatWindow = document.getElementById('active-chat-window');
    const chatHeader = document.getElementById('chat-header');
    const messagesContainer = document.getElementById('messages-container');
    const messageInput = document.getElementById('message-input');
    const sendButton = document.getElementById('send-button');

    let isAuthenticated = false;
    let isLoadingChats = false;

    // ===================================================
    // LÓGICA DE UI Y ESTADO
    // ===================================================

    function updateUIState(userName = null) {
        if (isAuthenticated) {
            authButton.textContent = 'Cerrar Sesión';
            authButton.classList.remove('btn-primary');
            authButton.classList.add('btn-secondary');
            statusSpan.textContent = `Conectado como u/${userName}`;
            statusBar.classList.add('connected');
            emptyStateSection.style.display = 'none';
            chatInterface.style.display = 'flex';
            loadChats();
        } else {
            authButton.textContent = 'Conectar con Reddit';
            authButton.classList.add('btn-primary');
            authButton.classList.remove('btn-secondary');
            statusSpan.textContent = 'Desconectado';
            statusBar.classList.remove('connected');
            chatInterface.style.display = 'none';
            emptyStateSection.style.display = 'flex';
            chatList.innerHTML = '';
            activeChatWindow.style.display = 'none';
        }
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
                updateUIState(response.userName);
            } else {
                alert(`Error de autenticación: ${response.error}`);
                isAuthenticated = false;
                updateUIState();
            }
        });
    }

    function handleLogout() {
        if (confirm('¿Estás seguro de que quieres cerrar la sesión de Reddit?')) {
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
    // LÓGICA DE CHAT Y RENDERIZADO
    // ===================================================

    function timeAgo(timestamp) {
        const now = Date.now() / 1000;
        const seconds = Math.floor(now - timestamp);
        if (seconds < 60) return `hace ${seconds} seg`;
        if (seconds < 3600) return `hace ${Math.floor(seconds / 60)} min`;
        if (seconds < 86400) return `hace ${Math.floor(seconds / 3600)} h`;
        return `hace ${Math.floor(seconds / 86400)} d`;
    }

    function renderChats(chats) {
        chatList.innerHTML = '';
        if (chats.length === 0) {
            chatList.innerHTML = `<p class="empty-state-message">No tienes chats/mensajes privados recientes.</p>`;
            return;
        }
        chats.forEach(chat => {
            const item = document.createElement('div');
            item.className = 'chat-item' + (chat.is_new ? ' unread' : '');
            item.dataset.id = chat.id;
            item.setAttribute('role', 'button');
            item.setAttribute('aria-selected', 'false');
            const chatName = chat.author || chat.subject;
            item.innerHTML = `
                <div class="chat-info">
                    <div class="chat-name">${chatName}</div>
                    <div class="chat-preview">${chat.subject.substring(0, 50)}...</div>
                    <div class="chat-timestamp">${timeAgo(chat.created_utc)}</div>
                </div>
                ${chat.is_new ? '<span class="unread-indicator">●</span>' : ''}
            `;
            chatList.appendChild(item);
        });
    }

    function loadChats() {
        if (isLoadingChats) return;
        isLoadingChats = true;
        chatList.innerHTML = '<div class="loading-spinner"></div>';
        chrome.storage.local.get('cachedChats', (data) => {
            if (data.cachedChats) {
                renderChats(data.cachedChats);
            }
            chrome.runtime.sendMessage({ action: 'getChats' }, (response) => {
                isLoadingChats = false;
                if (response.success) {
                    chrome.storage.local.set({ cachedChats: response.chats });
                    renderChats(response.chats);
                } else {
                    chatList.innerHTML = `<p class="empty-state-message error-message">Error al cargar chats: ${response.error}. Intenta cerrar sesión y volver a conectar.</p>`;
                }
            });
        });
    }

    function handleChatSelection(e) {
        if (e.type === 'click' || e.key === 'Enter' || e.key === ' ') {
            const item = e.target.closest('.chat-item');
            if (!item) return;
            const chatId = item.dataset.id;
            const chatName = item.querySelector('.chat-name').textContent;
            document.querySelectorAll('.chat-item').forEach(i => i.setAttribute('aria-selected', 'false'));
            item.setAttribute('aria-selected', 'true');
            chrome.runtime.sendMessage({ action: 'getChatDetails', chatId }, (response) => {
                if (response.success) {
                    chatHeader.textContent = `Chateando con ${chatName}`;
                    messagesContainer.innerHTML = `
                        <div class="message">
                            <p><strong>${chatName}:</strong> ${response.chat.body}</p>
                            <span class="message-timestamp">${timeAgo(response.chat.created_utc)}</span>
                        </div>
                    `;
                    activeChatWindow.style.display = 'flex';
                    messageInput.placeholder = `Escribe un mensaje para ${chatName}...`;
                    messageInput.disabled = false;
                    sendButton.disabled = false;
                    item.classList.remove('unread');
                    const indicator = item.querySelector('.unread-indicator');
                    if (indicator) indicator.remove();
                    messagesContainer.scrollTop = messagesContainer.scrollHeight;
                } else {
                    messagesContainer.innerHTML = `<p class="empty-state-message error-message">Error al cargar mensajes: ${response.error}</p>`;
                }
            });
        }
    }

    function handleSendMessage() {
        const message = messageInput.value.trim();
        if (!message) {
            alert('Por favor, escribe un mensaje.');
            return;
        }
        if (message.length > 1000) {
            alert('El mensaje es demasiado largo.');
            return;
        }
        chrome.runtime.sendMessage({
            action: 'sendMessage',
            recipient: chatHeader.textContent.replace('Chateando con ', ''),
            message
        }, (response) => {
            if (response.success) {
                messagesContainer.innerHTML += `
                    <div class="message sent">
                        <p><strong>Tú:</strong> ${message}</p>
                        <span class="message-timestamp">${timeAgo(Date.now() / 1000)}</span>
                    </div>
                `;
                messageInput.value = '';
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            } else {
                alert(`Error al enviar mensaje: ${response.error}`);
            }
        });
    }

    // ===================================================
    // INICIALIZACIÓN
    // ===================================================

    function initialize() {
        chrome.storage.local.get(['activeToken', 'activeUserName'], (data) => {
            if (data.activeToken && data.activeUserName) {
                isAuthenticated = true;
                updateUIState(data.activeUserName);
            } else {
                isAuthenticated = false;
                updateUIState();
            }
        });
    }

    authButton.addEventListener('click', handleAuthClick);
    refreshButton.addEventListener('click', () => {
        if (isAuthenticated) loadChats();
    });
    chatList.addEventListener('click', handleChatSelection);
    chatList.addEventListener('keydown', handleChatSelection);
    sendButton.addEventListener('click', handleSendMessage);
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSendMessage();
    });

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'sessionExpired') {
            isAuthenticated = false;
            updateUIState();
            alert('Tu sesión ha expirado. Por favor, vuelve a conectar con Reddit.');
        }
    });

    initialize();
});