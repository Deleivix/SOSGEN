
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { APP_PAGE_ICONS, APP_PAGES, SOSGEN_LOGO_SVG } from './data';
import { showTipOfTheDay, showToast } from './utils/helpers';
import { setCurrentUser, getCurrentUser, clearCurrentUser, User } from './utils/auth';
import { renderLoginPage } from './components/LoginPage';
import { renderDashboard } from './components/DashboardPage';
import { renderSosgen } from './components/SosgenPage';
import { renderRegistroOceano } from './components/RegistroOceanoPage';
import { renderProtocolo } from './components/ProtocoloPage';
import { renderMaritimeSignalsSimulator } from './components/SenalesPage';
import { renderSimulacro } from './components/SimulacroPage';
import { renderInfo } from './components/InfoPage';
import { renderMeteos } from './components/MeteosPage';
import { renderRadioavisos } from './components/RadioavisosPage';
import { renderAdminPage } from './components/AdminPage';
import { renderFfaaPage } from './components/FfaaPage';
import { renderSupervisorPage } from './components/SupervisorPage';
import { renderProfilePage, stopChatPolling } from './components/ProfilePage';

const pageRenderStatus: { [key: number]: boolean } = {};
let isTransitioning = false;
const animationDuration = 400;

// Page Mapping must match APP_PAGES in data.ts
// 0: HOME, 1: RELAY, 2: OCEANO, 3: PROTOCOLO, 4: NX, 5: WX, 6: FFAA, 7: SEÑALES, 8: SIMULACRO, 9: INFO, 10: ADMIN, 11: SUPERVISOR, 12: PROFILE (Hidden)
const pageRenderers = [
    renderDashboard,
    renderSosgen,
    renderRegistroOceano,
    renderProtocolo,
    renderRadioavisos,
    renderMeteos,
    renderFfaaPage,
    renderMaritimeSignalsSimulator,
    renderSimulacro,
    renderInfo,
    renderAdminPage,
    renderSupervisorPage,
    renderProfilePage
];

// --- SESSION & NOTIFICATION LOGIC ---
let sessionTimeoutId: number | null = null;
let notificationIntervalId: number | null = null;
const SESSION_TIMEOUT_MS = 2 * 60 * 60 * 1000; // 2 Hours
const NOTIFICATION_POLL_MS = 60 * 1000; // 1 Minute

function resetSessionTimeout() {
    if (sessionTimeoutId) window.clearTimeout(sessionTimeoutId);
    sessionTimeoutId = window.setTimeout(() => {
        showToast("Sesión caducada por inactividad.", "error");
        handleLogout();
    }, SESSION_TIMEOUT_MS);
}

async function checkNotifications() {
    const user = getCurrentUser();
    if (!user) return;

    try {
        // Poll messages
        const msgRes = await fetch('/api/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'get_messages', username: user.username })
        });
        
        let hasUnreadMessages = false;
        if (msgRes.ok) {
            const msgs: any[] = await msgRes.json();
            hasUnreadMessages = msgs.some(m => m.receiver_name === user.username && !m.is_read);
        }

        // Poll assigned drills
        const drillRes = await fetch(`/api/user-data?username=${user.username}&type=assigned_drills`);
        let hasPendingDrills = false;
        if (drillRes.ok) {
            const drills: any[] = await drillRes.json();
            hasPendingDrills = drills.length > 0;
        }

        // Update UI
        updateNotificationBadges(hasUnreadMessages, hasPendingDrills);

    } catch (e) {
        console.error("Notification poll failed", e);
    }
}

function updateNotificationBadges(unreadMessages: boolean, pendingDrills: boolean) {
    // 1. Sidebar Trigger Badge (Generic Alert)
    const sidebarTrigger = document.getElementById('sidebar-trigger');
    const existingBadge = sidebarTrigger?.querySelector('.notification-badge');
    if (unreadMessages || pendingDrills) {
        if (!existingBadge && sidebarTrigger) sidebarTrigger.innerHTML += `<span class="notification-badge"></span>`;
    } else {
        if (existingBadge) existingBadge.remove();
    }

    // 2. Drill Tab Badge
    const drillTab = document.querySelector('.nav-link[title="SIMULACRO"]');
    const drillBadge = drillTab?.querySelector('.notification-badge');
    if (pendingDrills) {
        if (!drillBadge && drillTab) drillTab.innerHTML += `<span class="notification-badge" style="background-color: var(--warning-color); border: 1px solid #fff;"></span>`;
    } else {
        if (drillBadge) drillBadge.remove();
    }
}

// --- ROUTING ---

function switchToPage(pageIndex: number, subTabId?: string) {
    if (isTransitioning) return;

    const outgoingPanel = document.querySelector('.page-panel.active') as HTMLElement | null;
    const incomingPanel = document.getElementById(`page-${pageIndex}`) as HTMLElement | null;

    if (!incomingPanel) return;
    if (incomingPanel === outgoingPanel) {
        // Special case: if we switch to same page with a subtab, just do the subtab
        if (subTabId) {
            const subTabButton = incomingPanel?.querySelector<HTMLButtonElement>(`[data-target="${subTabId}"]`);
            subTabButton?.click();
        }
        return;
    }

    // CLEANUP: If we are leaving the Profile page (Index 12), stop the high-frequency polling
    if (outgoingPanel && outgoingPanel.id === 'page-12') {
        stopChatPolling();
    }

    isTransitioning = true;
    document.querySelectorAll('.nav-link').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`.nav-link[data-page-index="${pageIndex}"]`)?.classList.add('active');

    if (outgoingPanel) {
        outgoingPanel.classList.add('is-exiting');
        outgoingPanel.classList.remove('active');
    }

    incomingPanel.classList.add('active');
    // Always render dynamic pages to ensure data freshness
    if (pageIndex === 11 || pageIndex === 12 || !pageRenderStatus[pageIndex]) {
        pageRenderers[pageIndex](incomingPanel);
        pageRenderStatus[pageIndex] = true;
    }

    if (subTabId) {
        setTimeout(() => {
            const subTabButton = incomingPanel?.querySelector<HTMLButtonElement>(`[data-target="${subTabId}"]`);
            subTabButton?.click();
        }, 100);
    }

    setTimeout(() => {
        if (outgoingPanel) outgoingPanel.classList.remove('is-exiting');
        isTransitioning = false;
    }, animationDuration);
}

(window as any).switchToPage = switchToPage;

function renderMainApp(user: User) {
    const container = document.getElementById('app');
    if (!container) return;
    
    // Define the profile page index (last in the list, hidden from standard nav)
    const profilePageIndex = 12; 

    // --- SIDEBAR HTML ---
    const sidebarHTML = `
        <div class="sidebar-overlay" id="sidebar-overlay"></div>
        <div class="app-sidebar" id="app-sidebar">
            <div class="sidebar-header">
                <div class="sidebar-avatar-large">${user.username.charAt(0).toUpperCase()}</div>
                <div class="sidebar-username">${user.username}</div>
                <div class="sidebar-userrole">${user.isAdmin ? 'Administrador' : (user.isSupervisor ? 'Supervisor' : 'Operador')}</div>
            </div>
            <div class="sidebar-content">
                <button class="sidebar-menu-item" id="sidebar-profile-btn" data-page-index="${profilePageIndex}">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 16 16"><path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm2-3a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm4 8c0 1-1 1-1 1H3s-1 0-1-1 1-4 6-4 6 3 6 4zm-1-.004c-.001-.246-.154-.986-.832-1.664C11.516 10.68 10.289 10 8 10c-2.29 0-3.516.68-4.168 1.332-.678.678-.83 1.418-.832 1.664h10z"/></svg>
                    <span>Mi Perfil</span>
                </button>
                <div class="sidebar-divider"></div>
                <div class="sidebar-menu-item sidebar-theme-row">
                    <div style="display:flex; align-items:center; gap:1rem;">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 16 16"><path d="M6 .278a.768.768 0 0 1 .08.858 7.208 7.208 0 0 0-.878 3.46c0 4.021 3.278 7.277 7.318 7.277.527 0 1.04-.055 1.533-.16a.787.787 0 0 1 .81.316.733.733 0 0 1-.031.893A8.349 8.349 0 0 1 8.344 16C3.734 16 0 12.286 0 7.71 0 4.266 2.114 1.312 5.124.06A.752.752 0 0 1 6 .278z"/></svg>
                        <span>Modo Oscuro</span>
                    </div>
                    <input type="checkbox" id="sidebar-theme-toggle" class="theme-switcher-input">
                    <label for="sidebar-theme-toggle" class="theme-switcher-toggle"></label>
                </div>
            </div>
            <div class="sidebar-footer">
                <button class="logout-btn-full" id="sidebar-logout-btn">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M10 12.5a.5.5 0 0 1-.5.5h-8a.5.5 0 0 1-.5-.5v-9a.5.5 0 0 1 .5-.5h8a.5.5 0 0 1 .5.5v2a.5.5 0 0 0 1 0v-2A1.5 1.5 0 0 0 9.5 2h-8A1.5 1.5 0 0 0 0 3.5v9A1.5 1.5 0 0 0 1.5 14h8a1.5 1.5 0 0 0 1.5-1.5v-2a.5.5 0 0 0-1 0z"/><path fill-rule="evenodd" d="M15.854 8.354a.5.5 0 0 0 0-.708l-3-3a.5.5 0 0 0-.708.708L14.293 7.5H5.5a.5.5 0 0 0 0 1h8.793l-2.147 2.146a.5.5 0 0 0 .708.708z"/></svg>
                    <span>Cerrar Sesión</span>
                </button>
            </div>
        </div>
    `;

    container.innerHTML = `
        ${sidebarHTML}
        <nav>
            <div class="nav-top"></div>
            <div class="nav-bottom">
                <div class="nav-brand" style="cursor: pointer;" title="Ir a HOME">
                    ${SOSGEN_LOGO_SVG}
                    <span>SOSGEN</span>
                </div>
                <div class="nav-links-container">
                    ${APP_PAGES.map((page, index) => {
                        if (page.name === 'HOME') return '';
                        if (page.name === 'ADMIN' && !user.isAdmin) return '';
                        if (page.name === 'SUPERVISOR' && !(user.isSupervisor || user.isAdmin)) return '';
                        
                        return `
                        <button class="nav-link ${index === 0 ? 'active' : ''}" data-page-index="${index}" title="${page.name}">
                            ${APP_PAGE_ICONS[index]}
                            <span class="nav-link-text">${page.name}</span>
                        </button>
                    `}).join('')}
                </div>
                <div class="nav-right-controls">
                    <button class="sidebar-trigger-btn" id="sidebar-trigger" title="Menú de Usuario">
                        <div class="sidebar-user-avatar-small">${user.username.charAt(0).toUpperCase()}</div>
                        <span class="sidebar-user-name-small">${user.username}</span>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M2.5 12a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5z"/></svg>
                    </button>
                </div>
            </div>
        </nav>
        <main>
            ${APP_PAGES.map((page, index) => {
                if (page.name === 'ADMIN' && !user.isAdmin) return '';
                if (page.name === 'SUPERVISOR' && !(user.isSupervisor || user.isAdmin)) return '';
                return `<div class="page-panel ${index === 0 ? 'active' : ''}" id="page-${index}"></div>`;
            }).join('')}
            <div class="page-panel" id="page-${profilePageIndex}"></div>
        </main>
    `;

    initializeTheme();
    // Render first page immediately
    const initialActivePanel = container.querySelector<HTMLElement>('.page-panel.active');
    if (initialActivePanel) {
        pageRenderers[0](initialActivePanel);
        pageRenderStatus[0] = true;
    }

    addMainAppEventListeners();
    showTipOfTheDay();
    resetSessionTimeout();
    
    // Start polling for notifications
    if (notificationIntervalId) clearInterval(notificationIntervalId);
    notificationIntervalId = window.setInterval(checkNotifications, NOTIFICATION_POLL_MS);
    checkNotifications(); // Initial check
}

function addMainAppEventListeners() {
    const container = document.getElementById('app');
    if (!container) return;

    // --- SIDEBAR LOGIC ---
    const sidebarTrigger = document.getElementById('sidebar-trigger');
    const sidebar = document.getElementById('app-sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    const logoutBtn = document.getElementById('sidebar-logout-btn');
    const profileBtn = document.getElementById('sidebar-profile-btn');
    const themeToggle = document.getElementById('sidebar-theme-toggle') as HTMLInputElement;

    const toggleSidebar = () => {
        sidebar?.classList.toggle('open');
        overlay?.classList.toggle('open');
    };

    sidebarTrigger?.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleSidebar();
    });

    overlay?.addEventListener('click', toggleSidebar);

    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            handleLogout();
        });
    }

    if (profileBtn) {
        profileBtn.addEventListener('click', () => {
            switchToPage(12); // Profile Index
            toggleSidebar(); // Close sidebar
        });
    }

    if (themeToggle) {
        themeToggle.addEventListener('change', () => {
            const isDark = themeToggle.checked;
            document.body.classList.toggle('dark-theme', isDark);
            localStorage.setItem('theme', isDark ? 'dark' : 'light');
        });
    }

    // --- MAIN NAV LOGIC ---
    container.addEventListener('click', (event) => {
        resetSessionTimeout(); // User activity resets timeout
        const target = event.target as HTMLElement;
        const navLink = target.closest('.nav-link');
        const brandLink = target.closest('.nav-brand');

        if (brandLink) switchToPage(0);
        if (navLink) switchToPage(parseInt(navLink.getAttribute('data-page-index')!, 10));
    });

    // Reset timeout on keypress too
    window.addEventListener('keypress', resetSessionTimeout);
}

function initializeTheme() {
    const savedTheme = localStorage.getItem('theme');
    // Note: ID changed to match sidebar
    const themeToggle = document.getElementById('sidebar-theme-toggle') as HTMLInputElement; 
    const isDark = savedTheme === 'dark';
    document.body.classList.toggle('dark-theme', isDark);
    if (themeToggle) themeToggle.checked = isDark;
}

function handleLogin(user: User) {
    sessionStorage.setItem('sosgen_user', JSON.stringify(user));
    setCurrentUser(user);
    renderMainApp(user);
}

function handleLogout() {
    sessionStorage.removeItem('sosgen_user');
    clearCurrentUser();
    // Stop all polling
    stopChatPolling();
    if (sessionTimeoutId) clearTimeout(sessionTimeoutId);
    if (notificationIntervalId) clearInterval(notificationIntervalId);
    
    Object.keys(pageRenderStatus).forEach(key => delete pageRenderStatus[Number(key)]);
    const container = document.getElementById('app');
    if(container) renderLoginPage(container, handleLogin);
}

document.addEventListener('DOMContentLoaded', () => {
    const appContainer = document.getElementById('app');
    if (!appContainer) return;

    try {
        const savedUser = sessionStorage.getItem('sosgen_user');
        if (savedUser) {
            const user = JSON.parse(savedUser);
            setCurrentUser(user);
            renderMainApp(user);
        } else {
            renderLoginPage(appContainer, handleLogin);
        }
    } catch (e) {
        console.error("Failed to initialize app:", e);
        renderLoginPage(appContainer, handleLogin);
    }
});
