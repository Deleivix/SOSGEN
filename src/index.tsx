
import { APP_PAGES, APP_PAGE_ICONS, SOSGEN_LOGO_SVG } from './data';
import { getCurrentUser, setCurrentUser, clearCurrentUser } from './utils/auth';
import { renderLoginPage } from './components/LoginPage';
import { renderDashboard } from './components/DashboardPage';
import { renderSosgen } from './components/SosgenPage';
import { renderRegistroOceano } from './components/RegistroOceanoPage';
import { renderProtocolo } from './components/ProtocoloPage';
import { renderRadioavisos } from './components/RadioavisosPage';
import { renderMeteos } from './components/MeteosPage';
import { renderFfaaPage } from './components/FfaaPage';
import { renderMaritimeSignalsSimulator } from './components/SenalesPage';
import { renderSimulacro } from './components/SimulacroPage';
import { renderInfo } from './components/InfoPage';
import { renderAdminPage } from './components/AdminPage';
import { renderSupervisorPage } from './components/SupervisorPage';
import { renderProfilePage, renderMessagesPage, stopChatPolling } from './components/ProfilePage';
import { showToast, showTipOfTheDay } from './utils/helpers';

const appContainer = document.getElementById('app') as HTMLElement;
let notificationInterval: number | null = null;
let currentPageIndex = 0;

// --- NOTIFICATION SYSTEM ---

function updateNotificationBadges(unreadMessages: boolean, pendingDrills: boolean) {
    // 1. Sidebar Trigger Badge (Top Right User Profile)
    const sidebarTrigger = document.getElementById('sidebar-trigger');
    // Remove existing badge first to avoid duplicates or stale state
    const existingTriggerBadge = sidebarTrigger?.querySelector('.notification-badge');
    if (existingTriggerBadge) existingTriggerBadge.remove();

    if ((unreadMessages || pendingDrills) && sidebarTrigger) {
        const badge = document.createElement('span');
        badge.className = 'notification-badge';
        // Adjust position slightly for the button
        badge.style.top = '0px';
        badge.style.right = '0px';
        sidebarTrigger.appendChild(badge);
    }

    // 2. Sidebar Messages Button (Inside Drawer)
    const msgBtn = document.getElementById('sidebar-messages-btn');
    const existingMsgBadge = msgBtn?.querySelector('.notification-badge');
    if (existingMsgBadge) existingMsgBadge.remove();

    if (unreadMessages && msgBtn) {
        const badge = document.createElement('span');
        badge.className = 'notification-badge';
        badge.style.top = '12px';
        badge.style.right = '12px';
        msgBtn.appendChild(badge);
    }

    // 3. Drill Tab Badge (Navigation Bar)
    // Find the link for SIMULACRO (Index 8 in APP_PAGES)
    const drillTab = document.querySelector(`.nav-link[data-page="8"]`);
    const existingDrillBadge = drillTab?.querySelector('.notification-badge');
    if (existingDrillBadge) existingDrillBadge.remove();

    if (pendingDrills && drillTab) {
        const badge = document.createElement('span');
        badge.className = 'notification-badge';
        badge.style.backgroundColor = 'var(--warning-color)';
        badge.style.border = '1px solid var(--bg-nav-bottom-start)';
        badge.style.right = '4px';
        badge.style.top = '4px';
        drillTab.appendChild(badge);
    }
}

async function checkNotifications() {
    const user = getCurrentUser();
    if (!user) return;

    try {
        // Parallel fetch for efficiency
        const [msgsResponse, drillsResponse] = await Promise.all([
            fetch('/api/messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'get_messages', username: user.username })
            }),
            fetch(`/api/user-data?username=${user.username}&type=assigned_drills`)
        ]);

        let hasUnread = false;
        let hasPendingDrills = false;

        if (msgsResponse.ok) {
            const messages = await msgsResponse.json();
            // Check if any message addressed to me is unread
            hasUnread = messages.some((m: any) => m.receiver_id === user.id && !m.is_read);
        }

        if (drillsResponse.ok) {
            const drills = await drillsResponse.json();
            hasPendingDrills = drills.length > 0;
        }

        updateNotificationBadges(hasUnread, hasPendingDrills);

    } catch (e) {
        // Silent fail on polling errors
        console.warn("Notification check failed", e);
    }
}

function startNotificationPolling() {
    if (notificationInterval) window.clearInterval(notificationInterval);
    checkNotifications(); // Immediate check
    notificationInterval = window.setInterval(checkNotifications, 30000); // Poll every 30s
}

function stopNotificationPolling() {
    if (notificationInterval) {
        window.clearInterval(notificationInterval);
        notificationInterval = null;
    }
}

// --- NAVIGATION & LAYOUT ---

function navigateTo(index: number, subTabId?: string) {
    const user = getCurrentUser();
    if (!user) return;

    // Permissions Check
    if (APP_PAGES[index].name === 'ADMIN' && !user.isAdmin) {
        showToast('Acceso restringido a Administradores', 'error');
        return;
    }
    if (APP_PAGES[index].name === 'SUPERVISOR' && !user.isSupervisor && !user.isAdmin) {
        showToast('Acceso restringido a Supervisores', 'error');
        return;
    }

    // Cleanup previous page effects
    if (currentPageIndex === 13) { // Leaving Messages page
        stopChatPolling();
    }

    currentPageIndex = index;

    // Update UI Active States
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    const activeLink = document.querySelector(`.nav-link[data-page="${index}"]`);
    if (activeLink) activeLink.classList.add('active');

    // Close sidebar if open
    const sidebar = document.querySelector('.app-sidebar');
    const overlay = document.querySelector('.sidebar-overlay');
    if (sidebar) sidebar.classList.remove('open');
    if (overlay) overlay.classList.remove('open');

    // Render Page Content
    const contentContainer = document.getElementById('main-content');
    if (!contentContainer) return;

    // Transition effect
    contentContainer.classList.add('is-exiting');
    
    setTimeout(() => {
        contentContainer.innerHTML = '';
        contentContainer.classList.remove('is-exiting');
        contentContainer.classList.add('active');

        switch (index) {
            case 0: renderDashboard(contentContainer); break;
            case 1: renderSosgen(contentContainer); break;
            case 2: renderRegistroOceano(contentContainer); break;
            case 3: renderProtocolo(contentContainer); break;
            case 4: renderRadioavisos(contentContainer); break;
            case 5: renderMeteos(contentContainer); break;
            case 6: renderFfaaPage(contentContainer); break;
            case 7: renderMaritimeSignalsSimulator(contentContainer); break;
            case 8: renderSimulacro(contentContainer); break;
            case 9: 
                renderInfo(contentContainer); 
                if (subTabId) {
                    const btn = contentContainer.querySelector(`[data-target="${subTabId}"]`) as HTMLElement;
                    if (btn) btn.click();
                }
                break;
            case 10: renderAdminPage(contentContainer); break;
            case 11: renderSupervisorPage(contentContainer); break;
            case 12: renderProfilePage(contentContainer); break;
            case 13: renderMessagesPage(contentContainer); break;
            default: renderDashboard(contentContainer);
        }
        
        // Re-check notifications on navigation to keep badges sync
        checkNotifications();
        
    }, 200);
}

function handleLogout() {
    const user = getCurrentUser();
    if (user) {
        fetch('/api/auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'logout', userId: user.id })
        }).catch(console.error);
    }
    stopNotificationPolling();
    stopChatPolling();
    clearCurrentUser();
    initApp();
}

function toggleTheme() {
    const body = document.body;
    body.classList.toggle('dark-theme');
    const isDark = body.classList.contains('dark-theme');
    localStorage.setItem('sosgen_theme', isDark ? 'dark' : 'light');
}

function renderLayout() {
    const user = getCurrentUser();
    if (!user) return;

    // Filter pages based on role
    const visiblePages = APP_PAGES.map((page, index) => ({...page, index})).filter(p => {
        if (p.name === 'ADMIN') return user.isAdmin;
        if (p.name === 'SUPERVISOR') return user.isSupervisor || user.isAdmin;
        if (p.name === 'PROFILE' || p.name === 'MENSAJES') return false; // Hidden from main nav, in sidebar
        return true;
    });

    appContainer.innerHTML = `
        <nav>
            <div class="nav-top"></div>
            <div class="nav-bottom">
                <div class="nav-brand">
                    ${SOSGEN_LOGO_SVG}
                    <span>SOSGEN</span>
                </div>
                <div class="nav-links-container">
                    ${visiblePages.map(p => `
                        <button class="nav-link" data-page="${p.index}" title="${p.name}">
                            ${APP_PAGE_ICONS[p.index]}
                            <span class="nav-link-text">${p.name}</span>
                        </button>
                    `).join('')}
                </div>
                <div class="nav-right-controls">
                    <button id="sidebar-trigger" class="sidebar-trigger-btn">
                        <div class="sidebar-user-avatar-small">${user.username.charAt(0).toUpperCase()}</div>
                        <span class="sidebar-user-name-small">${user.username}</span>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M2.5 12a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5m0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5m0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5"/></svg>
                    </button>
                </div>
            </div>
        </nav>
        
        <div class="sidebar-overlay"></div>
        <aside class="app-sidebar">
            <div class="sidebar-header">
                <div class="sidebar-avatar-large">${user.username.charAt(0).toUpperCase()}</div>
                <div class="sidebar-username">${user.username}</div>
                <div class="sidebar-userrole">${user.isAdmin ? 'Administrador' : (user.isSupervisor ? 'Supervisor' : 'Operador')}</div>
            </div>
            <div class="sidebar-content">
                <button class="sidebar-menu-item" onclick="window.navigateTo(12)">
                    ${APP_PAGE_ICONS[12]} Mi Perfil
                </button>
                <button class="sidebar-menu-item" id="sidebar-messages-btn" onclick="window.navigateTo(13)" style="position: relative;">
                    ${APP_PAGE_ICONS[13]} Mensajes Internos
                </button>
                <div class="sidebar-divider"></div>
                <div class="sidebar-menu-item sidebar-theme-row">
                    <div style="display:flex; align-items:center; gap:1rem;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16"><path d="M8 11a3 3 0 1 1 0-6 3 3 0 0 1 0 6m0 1a4 4 0 1 0 0-8 4 4 0 0 0 0 8M8 0a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 0m0 13a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 13m8-5a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2a.5.5 0 0 1 .5.5M3 8a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2A.5.5 0 0 1 3 8m10.657-5.657a.5.5 0 0 1 0 .707l-1.414 1.415a.5.5 0 1 1-.707-.708l1.414-1.414a.5.5 0 0 1 .707 0m-9.193 9.193a.5.5 0 0 1 0 .707L3.05 13.657a.5.5 0 0 1-.707-.707l1.414-1.414a.5.5 0 0 1 .707 0m9.193 2.121a.5.5 0 0 1-.707 0l-1.414-1.414a.5.5 0 0 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .707M4.464 4.465a.5.5 0 0 1-.707 0L2.343 3.05a.5.5 0 1 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .708z"/></svg>
                        <span>Tema Oscuro</span>
                    </div>
                    <label>
                        <input type="checkbox" class="theme-switcher-input" id="theme-switch">
                        <div class="theme-switcher-toggle"></div>
                    </label>
                </div>
            </div>
            <div class="sidebar-footer">
                <button class="logout-btn-full" id="logout-btn">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M10 12.5a.5.5 0 0 1-.5.5h-8a.5.5 0 0 1-.5-.5v-9a.5.5 0 0 1 .5-.5h8a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2H2v9h8v-2a.5.5 0 0 1 1 0v2z"/><path fill-rule="evenodd" d="M15.854 8.354a.5.5 0 0 0 0-.708l-3-3a.5.5 0 0 0-.708.708L14.293 7.5H5.5a.5.5 0 0 0 0 1h8.793l-2.147 2.146a.5.5 0 0 0 .708.708l3-3z"/></svg>
                    Cerrar Sesión
                </button>
            </div>
        </aside>

        <main id="main-content" class="page-panel active"></main>
    `;

    // --- EVENT LISTENERS ---
    
    // Navigation
    document.querySelectorAll('.nav-link').forEach(btn => {
        btn.addEventListener('click', () => {
            const pageIndex = parseInt(btn.getAttribute('data-page')!);
            navigateTo(pageIndex);
        });
    });

    // Sidebar Toggle
    const sidebar = document.querySelector('.app-sidebar');
    const overlay = document.querySelector('.sidebar-overlay');
    const trigger = document.getElementById('sidebar-trigger');

    trigger?.addEventListener('click', () => {
        sidebar?.classList.add('open');
        overlay?.classList.add('open');
    });

    overlay?.addEventListener('click', () => {
        sidebar?.classList.remove('open');
        overlay?.classList.remove('open');
    });

    // Logout
    document.getElementById('logout-btn')?.addEventListener('click', handleLogout);

    // Theme Switcher
    const themeSwitch = document.getElementById('theme-switch') as HTMLInputElement;
    const currentTheme = localStorage.getItem('sosgen_theme');
    if (currentTheme === 'dark') {
        document.body.classList.add('dark-theme');
        themeSwitch.checked = true;
    }
    themeSwitch.addEventListener('change', toggleTheme);
}

// Expose navigateTo globally for onclick handlers in HTML strings
(window as any).navigateTo = navigateTo;
(window as any).switchToPage = (pageIndex: number, subTabId?: string) => navigateTo(pageIndex, subTabId);

function initApp() {
    const user = getCurrentUser();
    if (!user) {
        renderLoginPage(appContainer, (loggedInUser) => {
            setCurrentUser(loggedInUser);
            initApp();
        });
    } else {
        renderLayout();
        navigateTo(0); // Go to Dashboard
        showTipOfTheDay();
        startNotificationPolling();
    }
}

// Initial Start
initApp();
