
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
            if (selectedChatUser) renderChatMessages();
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
            await fetchMessages(); // Refresh immediately
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
            <div style="flex-grow:1;">
                <div style="font-weight:600; font-size:0.95rem;">${u.username}</div>
                <div style="font-size:0.8rem; color:var(--text-secondary); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:180px;">${u.lastMessage || 'Nueva conversación'}</div>
            </div>
            ${u.unreadCount > 0 ? `<div style="background:var(--danger-color); color:white; border-radius:50%; width:20px; height:20px; display:flex; justify-content:center; align-items:center; font-size:0.7rem;">${u.unreadCount}</div>` : ''}
        </div>
    `).join('');
}

function renderChatMessages() {
    const container = document.getElementById('chat-messages-area');
    if (!container || !selectedChatUser) return;
    
    const user = getCurrentUser();
    if (!user) return;

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
                    <div>${m.content}</div>
                    <span class="chat-message-time">${new Date(m.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                </div>
            `;
        }).join('');
        // Scroll to bottom
        container.scrollTop = container.scrollHeight;
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
            selectedChatUser = { id, username, unreadCount: 0 };
            
            // Render UI updates
            renderChatList();
            renderChatMessages();
            
            const header = document.getElementById('chat-header');
            const input = document.getElementById('chat-input') as HTMLInputElement;
            const btn = document.getElementById('send-msg-btn') as HTMLButtonElement;
            
            if(header) header.textContent = selectedChatUser.username;
            if(input) { input.disabled = false; input.focus(); }
            if(btn) btn.disabled = false;

            modalOverlay.remove();
        }
    });
}

function renderProfileInfo() {
    const container = document.getElementById('profile-info-container');
    const user = getCurrentUser();
    if (!container || !user) return;

    container.innerHTML = `
        <div class="profile-info-card">
            <div class="profile-avatar">${user.username.charAt(0).toUpperCase()}</div>
            <div class="profile-username">${user.username}</div>
            <div class="profile-roles">
                ${user.isAdmin ? '<span class="category-badge" style="background-color: var(--accent-color);">Admin</span>' : ''}
                ${user.isSupervisor ? '<span class="category-badge" style="background-color: var(--info-color);">Supervisor</span>' : ''}
                <span class="category-badge" style="background-color: var(--text-secondary);">Usuario</span>
            </div>
        </div>
    `;
}

export function renderProfilePage(container: HTMLElement) {
    const user = getCurrentUser();
    if (!user) return;

    // Reset polling if it was running from a previous mount
    stopChatPolling();

    container.innerHTML = `
        <div class="profile-grid">
            <div class="profile-sidebar" id="profile-info-container">
                <!-- Profile Info Loaded Here -->
            </div>
            <div class="chat-container">
                <div class="chat-sidebar">
                    <div style="padding:1rem; border-bottom:1px solid var(--border-color); font-weight:bold; display:flex; justify-content:space-between; align-items:center;">
                        <span>Mensajes</span>
                        <button id="new-chat-btn" class="primary-btn-small" style="padding: 0.2rem 0.6rem; font-size:1.1rem; line-height:1;" title="Nuevo Mensaje">+</button>
                    </div>
                    <div id="chat-user-list" class="chat-user-list"></div>
                </div>
                <div class="chat-main">
                    <div class="chat-header" id="chat-header">Selecciona un usuario</div>
                    <div class="chat-messages-area" id="chat-messages-area">
                        <div style="display:flex; justify-content:center; align-items:center; height:100%; color:var(--text-secondary);">
                            <p>Selecciona una conversación a la izquierda</p>
                        </div>
                    </div>
                    <div class="chat-input-area">
                        <input type="text" id="chat-input" class="chat-input" placeholder="Escribe un mensaje..." disabled>
                        <button id="send-msg-btn" class="primary-btn-small" style="border-radius:20px; padding: 0.6rem 1.2rem;" disabled>Enviar</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    renderProfileInfo();
    
    // Initial fetch
    Promise.all([fetchUsers(), fetchMessages()]).then(() => {
        renderChatList();
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

        // Select existing chat
        const userItem = target.closest('.chat-user-item');
        if (userItem && !target.closest('#new-chat-btn')) { // Avoid conflict if button inside list
            const userId = parseInt(userItem.getAttribute('data-user-id')!);
            const userObj = getChatUsers().find(u => u.id === userId);
            if (userObj) {
                selectedChatUser = userObj;
                renderChatList(); // Update active state
                renderChatMessages();
                
                const header = document.getElementById('chat-header');
                const input = document.getElementById('chat-input') as HTMLInputElement;
                const btn = document.getElementById('send-msg-btn') as HTMLButtonElement;
                
                if(header) header.textContent = selectedChatUser.username;
                if(input) { input.disabled = false; input.focus(); }
                if(btn) btn.disabled = false;
            }
        }

        if (target.id === 'send-msg-btn') {
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
