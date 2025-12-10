
import { getCurrentUser } from "../utils/auth";
import { showToast } from "../utils/helpers";

type Message = {
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
    hasUnread: boolean;
};

let messages: Message[] = [];
let availableUsers: { id: number, username: string }[] = [];
let selectedChatUserId: number | null = null;
let pollInterval: number | null = null;

async function fetchMessages() {
    const user = getCurrentUser();
    if (!user) return;
    try {
        const res = await fetch('/api/messages', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ action: 'get_messages', username: user.username })
        });
        if (res.ok) {
            messages = await res.json();
            renderChat();
        }
    } catch(e) { console.error(e); }
}

async function fetchUsers() {
    const user = getCurrentUser();
    if (!user) return;
    try {
        const res = await fetch('/api/messages', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ action: 'get_users', username: user.username })
        });
        if (res.ok) {
            availableUsers = await res.json();
            renderChat();
        }
    } catch(e) { console.error(e); }
}

async function sendMessage(content: string) {
    const user = getCurrentUser();
    if (!user || !selectedChatUserId) return;
    try {
        await fetch('/api/messages', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                action: 'send_message',
                username: user.username,
                receiverId: selectedChatUserId,
                content
            })
        });
        fetchMessages(); // Refresh immediately
    } catch(e) { showToast("Error al enviar mensaje", "error"); }
}

async function markAsRead(messageIds: number[]) {
    const user = getCurrentUser();
    if (!user || messageIds.length === 0) return;
    try {
        await fetch('/api/messages', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                action: 'mark_read',
                username: user.username,
                messageIds
            })
        });
    } catch(e) { console.error(e); }
}

function renderChat() {
    const chatContainer = document.getElementById('messaging-module');
    if (!chatContainer) return;

    const currentUser = getCurrentUser();
    if (!currentUser) return;

    // 1. Process Users for Sidebar (Combine history + available)
    const chatPartnersMap = new Map<number, ChatUser>();
    
    // Add users from message history
    messages.forEach(m => {
        const isSender = m.sender_id === currentUser.id;
        const partnerId = isSender ? m.receiver_id : m.sender_id;
        const partnerName = isSender ? m.receiver_name : m.sender_name;
        const hasUnread = !isSender && !m.is_read;
        
        if (!chatPartnersMap.has(partnerId)) {
            chatPartnersMap.set(partnerId, { id: partnerId, username: partnerName, hasUnread });
        } else if (hasUnread) {
            chatPartnersMap.get(partnerId)!.hasUnread = true;
        }
    });

    // Add other users from available list if not present
    availableUsers.forEach(u => {
        if (!chatPartnersMap.has(u.id)) {
            chatPartnersMap.set(u.id, { id: u.id, username: u.username, hasUnread: false });
        }
    });

    const chatPartners = Array.from(chatPartnersMap.values());

    // 2. Render Sidebar
    const userListHtml = chatPartners.map(u => `
        <div class="chat-user-item ${u.id === selectedChatUserId ? 'active' : ''} ${u.hasUnread ? 'has-unread' : ''}" data-id="${u.id}">
            <span style="font-weight: 500;">${u.username}</span>
        </div>
    `).join('');

    // 3. Render Conversation
    let chatMainHtml = `<div style="display:flex; align-items:center; justify-content:center; height:100%; color:var(--text-secondary);">Selecciona un usuario para chatear</div>`;
    
    if (selectedChatUserId) {
        const partner = chatPartners.find(u => u.id === selectedChatUserId);
        const conversation = messages.filter(m => 
            (m.sender_id === currentUser.id && m.receiver_id === selectedChatUserId) ||
            (m.sender_id === selectedChatUserId && m.receiver_id === currentUser.id)
        );

        const unreadIds = conversation.filter(m => m.receiver_id === currentUser.id && !m.is_read).map(m => m.id);
        if (unreadIds.length > 0) markAsRead(unreadIds);

        const messagesHtml = conversation.map(m => `
            <div class="chat-message ${m.sender_id === currentUser.id ? 'sent' : 'received'}">
                <div>${m.content}</div>
                <span class="chat-message-time">${new Date(m.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
            </div>
        `).join('');

        chatMainHtml = `
            <div class="chat-header">
                <span>Chat con ${partner?.username || 'Usuario'}</span>
            </div>
            <div class="chat-messages-area" id="chat-scroller">
                ${messagesHtml.length > 0 ? messagesHtml : '<p style="text-align:center; color:var(--text-secondary); margin-top:2rem;">No hay mensajes. ¡Escribe algo!</p>'}
            </div>
            <div class="chat-input-area">
                <input type="text" id="chat-input-field" class="chat-input" placeholder="Escribe un mensaje..." autocomplete="off">
                <button id="chat-send-btn" class="primary-btn-small">Enviar</button>
            </div>
        `;
    }

    chatContainer.innerHTML = `
        <div class="chat-container">
            <div class="chat-sidebar">
                <div style="padding:1rem; border-bottom:1px solid var(--border-color); font-weight:bold;">Usuarios</div>
                <div class="chat-user-list">${userListHtml}</div>
            </div>
            <div class="chat-main">${chatMainHtml}</div>
        </div>
    `;

    // 4. Events
    chatContainer.querySelectorAll('.chat-user-item').forEach(el => {
        el.addEventListener('click', () => {
            selectedChatUserId = parseInt(el.getAttribute('data-id')!, 10);
            renderChat();
        });
    });

    if (selectedChatUserId) {
        const scroller = document.getElementById('chat-scroller');
        if (scroller) scroller.scrollTop = scroller.scrollHeight;

        const input = document.getElementById('chat-input-field') as HTMLInputElement;
        const sendBtn = document.getElementById('chat-send-btn');

        const doSend = () => {
            const val = input.value.trim();
            if (val) {
                sendMessage(val);
                input.value = '';
            }
        };

        sendBtn?.addEventListener('click', doSend);
        input?.addEventListener('keydown', (e) => { if(e.key === 'Enter') doSend(); });
        input?.focus();
    }
}

export function renderProfilePage(container: HTMLElement) {
    const user = getCurrentUser();
    if (!user) return;

    container.innerHTML = `
        <div class="profile-grid">
            <div class="profile-sidebar">
                <div class="profile-info-card">
                    <div class="profile-avatar">${user.username.charAt(0).toUpperCase()}</div>
                    <div class="profile-username">${user.username}</div>
                    <div class="profile-email">Usuario del Sistema</div>
                    <div class="profile-roles">
                        ${user.isAdmin ? '<span class="category-badge importante">ADMIN</span>' : ''}
                        ${user.isSupervisor ? '<span class="category-badge navtex">SUPERVISOR</span>' : ''}
                    </div>
                </div>
            </div>
            <div id="messaging-module" style="height: 100%;"></div>
        </div>
    `;

    fetchUsers();
    fetchMessages();

    if (pollInterval) clearInterval(pollInterval);
    pollInterval = window.setInterval(fetchMessages, 10000); // Poll messages every 10s inside profile
}
