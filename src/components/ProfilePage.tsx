
import { getCurrentUser } from "../utils/auth";
import { showToast } from "../utils/helpers";

let usersList: any[] = [];
let activeChatUser: any = null;
let messages: any[] = [];
let chatPollingInterval: number | null = null;

async function fetchMessages(otherUser: string) {
    // If container is gone (user navigated away), stop polling
    const container = document.getElementById('chat-window');
    if (!container && chatPollingInterval) {
        clearInterval(chatPollingInterval);
        chatPollingInterval = null;
        return;
    }

    const user = getCurrentUser();
    if (!user) return;
    try {
        const res = await fetch(`/api/user-data?username=${user.username}&type=messages_conversation&otherUser=${otherUser}`);
        if(res.ok) {
            const newMessages = await res.json();
            // Simple check to avoid re-rendering if no changes (optional but good for performance)
            if (JSON.stringify(newMessages) !== JSON.stringify(messages)) {
                messages = newMessages;
                renderChat();
            }
        }
    } catch(e) { console.error("Error fetching messages", e); }
}

async function sendMessage(e: Event) {
    e.preventDefault();
    const input = document.getElementById('msg-input') as HTMLInputElement;
    const content = input.value.trim();
    if (!content || !activeChatUser) return;
    
    const user = getCurrentUser();
    
    // Optimistic Update
    const tempMsg = {
        sender_name: user?.username,
        content: content,
        timestamp: new Date().toISOString()
    };
    messages.push(tempMsg);
    renderChat();
    input.value = '';

    try {
        await fetch('/api/user-data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                username: user?.username,
                type: 'send_message', 
                data: { receiver: activeChatUser.username, content } 
            })
        });
        // Immediate fetch to sync
        fetchMessages(activeChatUser.username);
    } catch (error) {
        showToast('Error enviando mensaje', 'error');
    }
}

function startPolling(username: string) {
    if (chatPollingInterval) clearInterval(chatPollingInterval);
    fetchMessages(username); // Initial fetch
    chatPollingInterval = window.setInterval(() => {
        fetchMessages(username);
    }, 3000); // Poll every 3 seconds
}

function renderChat() {
    const container = document.getElementById('chat-window');
    if (!container) return;
    
    if (!activeChatUser) {
        container.innerHTML = '<div class="drill-placeholder">Selecciona un usuario para chatear.</div>';
        return;
    }

    const user = getCurrentUser();
    
    // Save scroll position
    const chatBoxOld = container.firstElementChild;
    const isScrolledToBottom = chatBoxOld ? (chatBoxOld.scrollHeight - chatBoxOld.scrollTop === chatBoxOld.clientHeight) : true;

    container.innerHTML = `
        <div style="height: 300px; overflow-y: auto; border: 1px solid var(--border-color); padding: 1rem; margin-bottom: 1rem; display: flex; flex-direction: column; gap: 0.5rem; background: var(--bg-main);">
            ${messages.map(m => `
                <div style="align-self: ${m.sender_name === user?.username ? 'flex-end' : 'flex-start'}; background: ${m.sender_name === user?.username ? 'var(--accent-color)' : 'var(--bg-card)'}; color: ${m.sender_name === user?.username ? 'white' : 'var(--text-primary)'}; padding: 0.5rem 1rem; border-radius: 8px; max-width: 70%; border: 1px solid var(--border-color); box-shadow: 0 1px 2px var(--shadow-color);">
                    <small style="display:block; opacity: 0.8; font-size: 0.7em; margin-bottom: 0.2rem;">${new Date(m.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</small>
                    ${m.content}
                </div>
            `).join('')}
        </div>
        <form id="msg-form" style="display:flex; gap:0.5rem;">
            <input class="simulator-input" id="msg-input" placeholder="Escribe un mensaje..." autocomplete="off">
            <button type="submit" class="primary-btn-small">Enviar</button>
        </form>
    `;
    
    const chatBox = container.firstElementChild;
    if(chatBox && isScrolledToBottom) {
        chatBox.scrollTop = chatBox.scrollHeight;
    }
    
    document.getElementById('msg-form')?.addEventListener('submit', sendMessage);
}

export async function renderProfile(container: HTMLElement) {
    if (chatPollingInterval) {
        clearInterval(chatPollingInterval);
        chatPollingInterval = null;
    }
    activeChatUser = null;
    messages = [];

    const user = getCurrentUser();
    if (!user) return;

    const res = await fetch(`/api/user-data?username=${user.username}&type=messages_users`);
    usersList = await res.json();

    container.innerHTML = `
        <div class="content-card">
            <h2 class="content-card-title">Perfil de ${user.username}</h2>
            <div style="display: grid; grid-template-columns: 200px 1fr; gap: 2rem; height: 500px;">
                <div style="border-right: 1px solid var(--border-color); overflow-y: auto;">
                    <h4 style="margin-bottom: 1rem;">Usuarios</h4>
                    ${usersList.map(u => `
                        <button class="sub-nav-btn user-chat-btn" data-username="${u.username}">
                            ${u.username}
                        </button>
                    `).join('')}
                </div>
                <div id="chat-window" style="display: flex; flex-direction: column;"></div>
            </div>
        </div>
    `;

    container.querySelectorAll('.user-chat-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const username = (e.currentTarget as HTMLElement).dataset.username;
            activeChatUser = usersList.find(u => u.username === username);
            container.querySelectorAll('.user-chat-btn').forEach(b => b.classList.remove('active'));
            (e.currentTarget as HTMLElement).classList.add('active');
            
            messages = []; // Clear current messages while loading
            renderChat();
            startPolling(username!);
        });
    });
    
    renderChat();
}
