
import { getCurrentUser } from "../utils/auth";
import { showToast } from "../utils/helpers";

type ChatMessage = {
    id: number;
    content: string;
    created_at: string;
    is_read: boolean;
    sender_id: number;
    sender_name: string;
    receiver_id: number;
    receiver_name: string;
};

type ChatUser = {
    id: number;
    username: string;
    unreadCount: number;
    lastMessage?: string;
    lastMessageTime?: string;
};

let messages: ChatMessage[] = [];
let availableUsers: { id: number, username: string }[] = [];
let selectedChatUser: ChatUser | null = null;
let pollingInterval: number | null = null;

export function stopChatPolling() {
    if (pollingInterval) {
        window.clearInterval(pollingInterval);
        pollingInterval = null;
    }
}

async function fetchMessages() {
    const user = getCurrentUser();
    if (!user) return;
    try {
        const response = await fetch('/api/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'get_messages', username: user.username })
        });
        if (response.ok) {
            messages = await response.json();
            renderChatList();
            if (selectedChatUser) renderChatMessages(false); // Do not force scroll on poll update
        }
    } catch (e) { console.error(e); }
}

async function fetchUsers() {
    const user = getCurrentUser();
    if (!user) return;
    try {
        const response = await fetch('/api/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'get_users', username: user.username })
        });
        if (response.ok) {
            availableUsers = await response.json();
        }
    } catch (e) { console.error(e); }
}

async function sendMessage(content: string) {
    const user = getCurrentUser();
    if (!user || !selectedChatUser) return;
    
    try {
        const response = await fetch('/api/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'send_message',
                username: user.username,
                receiverId: selectedChatUser.id,
                content
            })
        });
        if (response.ok) {
            await fetchMessages(); 
            renderChatMessages(true); // Force scroll on send
        }
    } catch (e) { showToast("Error al enviar mensaje", "error"); }
}

async function markAsRead(chatMessages: ChatMessage[]) {
    const user = getCurrentUser();
    if (!user) return;
    
    const unreadIds = chatMessages
        .filter(m => !m.is_read && m.receiver_id === user.id)
        .map(m => m.id);
    
    if (unreadIds.length > 0) {
        try {
            await fetch('/api/messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'mark_read',
                    username: user.username,
                    messageIds: unreadIds
                })
            });
            // Update local state to reflect read status
            messages.forEach(m => { if(unreadIds.includes(m.id)) m.is_read = true; });
        } catch (e) { console.error(e); }
    }
}

// --- RENDER LOGIC ---

function getChatUsers(): ChatUser[] {
    const user = getCurrentUser();
    if (!user) return [];
    
    const usersMap = new Map<number, ChatUser>();
    
    // We only initially show users we have history with OR if selected manually
    messages.forEach(m => {
        const otherId = m.sender_id === user.id ? m.receiver_id : m.sender_id;
        const otherName = m.sender_id === user.id ? m.receiver_name : m.sender_name;
        
        if (!usersMap.has(otherId)) {
            usersMap.set(otherId, { id: otherId, username: otherName, unreadCount: 0 });
        }
        
        const chatUser = usersMap.get(otherId)!;
        chatUser.lastMessage = m.content;
        chatUser.lastMessageTime = m.created_at;
        
        if (m.receiver_id === user.id && !m.is_read) {
            chatUser.unreadCount++;
        }
    });

    // If we selected a user from the "New Chat" modal but haven't exchanged messages yet, force add them
    if (selectedChatUser && !usersMap.has(selectedChatUser.id)) {
        usersMap.set(selectedChatUser.id, selectedChatUser);
    }

    // Sort by last message time
    return Array.from(usersMap.values()).sort((a, b) => {
        const timeA = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : 0;
        const timeB = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : 0;
        return timeB - timeA;
    });
}

function renderChatList() {
    const listContainer = document.getElementById('chat-user-list');
    if (!listContainer) return;
    
    const users = getChatUsers();
    
    if (users.length === 0) {
        listContainer.innerHTML = '<div style="padding:1rem; font-size:0.8rem; color:var(--text-secondary); text-align:center;">No hay conversaciones.<br>Pulsa + para empezar.</div>';
        return;
    }

    listContainer.innerHTML = users.map(u => `
        <div class="chat-user-item ${selectedChatUser?.id === u.id ? 'active' : ''} ${u.unreadCount > 0 ? 'has-unread' : ''}" data-user-id="${u.id}">
            <div style="background:var(--accent-color); color:white; border-radius:50%; width:40px; height:40px; display:flex; justify-content:center; align-items:center; font-weight:bold; font-size:1.1rem; flex-shrink:0;">${u.username.charAt(0).toUpperCase()}</div>
            <div style="flex-grow:1; min-width:0;">
                <div class="chat-user-name" style="font-size:0.95rem;">${u.username}</div>
                <div style="font-size:0.85rem; color:var(--text-secondary); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${u.lastMessage || 'Nueva conversación'}</div>
            </div>
            ${u.unreadCount > 0 ? `<div style="background:var(--danger-color); color:white; border-radius:50%; width:20px; height:20px; display:flex; justify-content:center; align-items:center; font-size:0.75rem;">${u.unreadCount}</div>` : ''}
        </div>
    `).join('');
}

function renderChatMessages(forceScrollBottom: boolean = false) {
    const container = document.getElementById('chat-messages-area');
    if (!container || !selectedChatUser) return;
    
    const user = getCurrentUser();
    if (!user) return;

    // Check if user was already at bottom before updating (to auto-scroll on new message)
    const isAtBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 100;

    const chatMessages = messages.filter(m => 
        (m.sender_id === user.id && m.receiver_id === selectedChatUser!.id) ||
        (m.sender_id === selectedChatUser!.id && m.receiver_id === user.id)
    );

    // Mark as read when viewing
    markAsRead(chatMessages);

    if (chatMessages.length === 0) {
        container.innerHTML = `<div style="text-align:center; color:var(--text-secondary); margin-top:2rem;">No hay mensajes. Escribe para comenzar.</div>`;
    } else {
        container.innerHTML = chatMessages.map(m => {
            const isMe = m.sender_id === user.id;
            return `
                <div class="chat-message ${isMe ? 'sent' : 'received'}">
                    <div style="white-space: pre-wrap;">${m.content}</div>
                    <span class="chat-message-time">${new Date(m.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                </div>
            `;
        }).join('');
        
        // Scroll to bottom logic
        if (forceScrollBottom || isAtBottom) {
            setTimeout(() => {
                container.scrollTop = container.scrollHeight;
            }, 50);
        }
    }
}

function renderNewChatModal() {
    const modalId = 'new-chat-modal';
    if (document.getElementById(modalId)) return;

    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'modal-overlay';
    modalOverlay.id = modalId;

    const userListHtml = availableUsers.length > 0 
        ? availableUsers.map(u => `
            <div class="chat-user-item new-chat-option" data-user-id="${u.id}" data-username="${u.username}" style="border:none; padding: 0.8rem;">
                <div style="background:var(--text-secondary); color:white; border-radius:50%; width:32px; height:32px; display:flex; justify-content:center; align-items:center; font-weight:bold;">${u.username.charAt(0).toUpperCase()}</div>
                <span>${u.username}</span>
            </div>
          `).join('')
        : '<p style="padding:1rem; color:var(--text-secondary);">No hay otros usuarios disponibles.</p>';

    modalOverlay.innerHTML = `
        <div class="modal-content" style="max-width: 400px; text-align: left; padding:0; overflow:hidden;">
            <div style="padding: 1rem; border-bottom: 1px solid var(--border-color); display:flex; justify-content:space-between; align-items:center;">
                <h3 style="margin:0; font-size:1.1rem;">Nueva Conversación</h3>
                <button class="secondary-btn modal-close-btn" style="padding: 0.3rem 0.6rem;">✕</button>
            </div>
            <div style="max-height: 400px; overflow-y: auto;">
                ${userListHtml}
            </div>
        </div>
    `;

    document.body.appendChild(modalOverlay);

    modalOverlay.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        if (target === modalOverlay || target.classList.contains('modal-close-btn')) {
            modalOverlay.remove();
        }
        
        const option = target.closest('.new-chat-option') as HTMLElement;
        if (option) {
            const id = parseInt(option.dataset.userId!);
            const username = option.dataset.username!;
            openChatWithUser({ id, username, unreadCount: 0 });
            modalOverlay.remove();
        }
    });
}

function openChatWithUser(chatUser: ChatUser) {
    selectedChatUser = chatUser;
    
    // UI Updates
    renderChatList();
    renderChatMessages(true);
    
    const headerTitle = document.getElementById('chat-header-title');
    const input = document.getElementById('chat-input') as HTMLInputElement;
    const btn = document.getElementById('send-msg-btn') as HTMLButtonElement;
    const chatContainer = document.querySelector('.chat-container');
    
    if(headerTitle) headerTitle.textContent = selectedChatUser.username;
    if(input) { input.disabled = false; input.focus(); }
    if(btn) btn.disabled = false;
    
    // Add class for Mobile transition
    if(chatContainer) chatContainer.classList.add('chat-open');
}

function closeChat() {
    selectedChatUser = null;
    renderChatList(); // Clear active state
    const chatContainer = document.querySelector('.chat-container');
    if(chatContainer) chatContainer.classList.remove('chat-open');
}

// --- PROFILE PAGE RENDERER ---
export function renderProfilePage(container: HTMLElement) {
    const user = getCurrentUser();
    if (!user) return;

    container.innerHTML = `
        <div class="content-card">
            <h2 class="content-card-title">Mi Perfil</h2>
            <div class="profile-standalone-container">
                <div class="profile-info-card" style="border:none; padding:0;">
                    <div class="profile-avatar">${user.username.charAt(0).toUpperCase()}</div>
                    <div class="profile-username">${user.username}</div>
                    <div class="profile-roles">
                        ${user.isAdmin ? '<span class="category-badge" style="background-color: var(--accent-color);">Admin</span>' : ''}
                        ${user.isSupervisor ? '<span class="category-badge" style="background-color: var(--info-color);">Supervisor</span>' : ''}
                        <span class="category-badge" style="background-color: var(--text-secondary);">Usuario</span>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// --- MESSAGES PAGE RENDERER ---
export function renderMessagesPage(container: HTMLElement) {
    const user = getCurrentUser();
    if (!user) return;

    // Reset polling if it was running from a previous mount
    stopChatPolling();

    container.innerHTML = `
        <div class="content-card chat-page-wrapper">
            <h2 class="content-card-title">Mensajería Interna</h2>
            <div class="chat-container">
                <div class="chat-sidebar">
                    <div style="padding:1rem; border-bottom:1px solid var(--border-color); font-weight:bold; display:flex; justify-content:space-between; align-items:center;">
                        <span>Conversaciones</span>
                        <button id="new-chat-btn" class="primary-btn-small" style="padding: 0.2rem 0.6rem; font-size:1.1rem; line-height:1;" title="Nuevo Mensaje">+</button>
                    </div>
                    <div id="chat-user-list" class="chat-user-list"></div>
                </div>
                <div class="chat-main">
                    <div class="chat-header">
                        <button class="chat-back-btn" id="chat-back-btn" title="Volver a la lista">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M15 8a.5.5 0 0 0-.5-.5H2.707l3.147-3.146a.5.5 0 1 0-.708-.708l-4 4a.5.5 0 0 0 0 .708l4 4a.5.5 0 0 0 .708-.708L2.707 8.5H14.5A.5.5 0 0 0 15 8z"/></svg>
                        </button>
                        <span id="chat-header-title">Selecciona un usuario</span>
                    </div>
                    <div class="chat-messages-area" id="chat-messages-area">
                        <div style="display:flex; justify-content:center; align-items:center; height:100%; color:var(--text-secondary);">
                            <p>Selecciona una conversación</p>
                        </div>
                    </div>
                    <div class="chat-input-area">
                        <input type="text" id="chat-input" class="chat-input" placeholder="Escribe un mensaje..." disabled>
                        <button id="send-msg-btn" class="primary-btn-small" style="border-radius:20px; padding: 0.6rem 1.2rem;" disabled>
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M15.854.146a.5.5 0 0 1 .11.54l-5.819 14.547a.75.75 0 0 1-1.329.124l-3.178-4.995L.643 7.184a.75.75 0 0 1 .124-1.33L15.314.037a.5.5 0 0 1 .54.11ZM6.636 10.07l2.761 4.338L14.13 2.576 6.636 10.07Zm6.787-8.201L1.591 6.602l4.339 2.76 7.494-7.493Z"/></svg>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Initial fetch
    Promise.all([fetchUsers(), fetchMessages()]).then(() => {
        renderChatList();
        if(selectedChatUser) openChatWithUser(selectedChatUser); 
    });

    // Start Polling for messages
    pollingInterval = window.setInterval(fetchMessages, 5000); // 5s poll

    // Event Listeners
    container.addEventListener('click', e => {
        const target = e.target as HTMLElement;
        
        // Start New Chat
        if (target.closest('#new-chat-btn')) {
            renderNewChatModal();
        }

        // Back Button
        if (target.closest('#chat-back-btn')) {
            closeChat();
        }

        // Select existing chat
        const userItem = target.closest('.chat-user-item');
        if (userItem && !target.closest('#new-chat-btn')) { 
            const userId = parseInt(userItem.getAttribute('data-user-id')!);
            const userObj = getChatUsers().find(u => u.id === userId);
            if (userObj) {
                openChatWithUser(userObj);
            }
        }

        if (target.closest('#send-msg-btn')) {
            const input = document.getElementById('chat-input') as HTMLInputElement;
            if (input && input.value.trim()) {
                sendMessage(input.value.trim());
                input.value = '';
            }
        }
    });

    container.addEventListener('keypress', e => {
        const target = e.target as HTMLInputElement;
        if (target.id === 'chat-input' && e.key === 'Enter' && target.value.trim()) {
            sendMessage(target.value.trim());
            target.value = '';
        }
    });
}
