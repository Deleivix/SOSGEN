
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { APP_PAGE_ICONS, APP_PAGES, SOSGEN_LOGO_SVG, GESTION_ICON } from './data';
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
    // 1. Profile/User Badge
    const userDisplay = document.querySelector('.nav-user-display');
    const existingBadge = userDisplay?.querySelector('.notification-badge');
    if (unreadMessages) {
        if (!existingBadge && userDisplay) userDisplay.innerHTML += `<span class="notification-badge"></span>`;
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
        // Also close any open dropdowns
        document.querySelectorAll('.nav-item-container.open').forEach(el => el.classList.remove('open'));
        return;
    }

    // CLEANUP: If we are leaving the Profile page (Index 12), stop the high-frequency polling
    if (outgoingPanel && outgoingPanel.id === 'page-12') {
        stopChatPolling();
    }

    isTransitioning = true;
    
    // Update active nav state
    // 1. Remove active from all nav links
    document.querySelectorAll('.nav-link').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.dropdown-item').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.nav-item-container').forEach(el => el.classList.remove('active-parent'));

    // 2. Add active to the specific link clicked (could be a top link or a dropdown item)
    const targetLink = document.querySelector(`.nav-link[data-page-index="${pageIndex}"], .dropdown-item[data-page-index="${pageIndex}"]`);
    if (targetLink) {
        targetLink.classList.add('active');
        // If it's a dropdown item, highlight the parent dropdown toggle
        const parentDropdown = targetLink.closest('.nav-item-container');
        if (parentDropdown) {
            parentDropdown.classList.add('active-parent');
            parentDropdown.querySelector('.dropdown-toggle')?.classList.add('active');
        }
    }

    // Close any open dropdowns
    document.querySelectorAll('.nav-item-container.open').forEach(el => el.classList.remove('open'));

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

function renderNavLink(index: number) {
    const page = APP_PAGES[index];
    return `
        <div class="nav-item-container">
            <button class="nav-link ${index === 0 ? 'active' : ''}" data-page-index="${index}" title="${page.name}">
                ${APP_PAGE_ICONS[index]}
                <span class="nav-link-text">${page.name}</span>
            </button>
        </div>
    `;
}

function renderMainApp(user: User) {
    const container = document.getElementById('app');
    if (!container) return;
    
    const profilePageIndex = 12; 

    // Navigation Structure
    const navigationHtml = `
        ${renderNavLink(1)} <!-- RELAY -->
        ${renderNavLink(2)} <!-- OCEANO -->
        ${renderNavLink(3)} <!-- PROTOCOLO -->
        ${renderNavLink(4)} <!-- NX -->
        
        <!-- METEOS Dropdown -->
        <div class="nav-item-container">
            <button class="nav-link dropdown-toggle" title="METEOS">
                ${APP_PAGE_ICONS[5]} <!-- Cloud Icon -->
                <span class="nav-link-text">METEOS</span>
                <svg class="dropdown-arrow" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z"/></svg>
            </button>
            <div class="dropdown-menu">
                <button class="dropdown-item" data-page-index="5">
                    ${APP_PAGE_ICONS[5]} <span>WX (Boletines)</span>
                </button>
                <button class="dropdown-item" data-page-index="6">
                    ${APP_PAGE_ICONS[6]} <span>FFAA (Avisos)</span>
                </button>
            </div>
        </div>

        ${renderNavLink(7)} <!-- SEÑALES -->
        ${renderNavLink(8)} <!-- SIMULACRO -->
        ${renderNavLink(9)} <!-- INFO -->

        <!-- GESTION Dropdown (Admin/Supervisor Only) -->
        ${(user.isAdmin || user.isSupervisor) ? `
            <div class="nav-item-container">
                <button class="nav-link dropdown-toggle" title="GESTIÓN">
                    ${GESTION_ICON}
                    <span class="nav-link-text">GESTIÓN</span>
                    <svg class="dropdown-arrow" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z"/></svg>
                </button>
                <div class="dropdown-menu">
                    ${user.isAdmin ? `
                        <button class="dropdown-item" data-page-index="10">
                            ${APP_PAGE_ICONS[10]} <span>ADMIN</span>
                        </button>
                    ` : ''}
                    ${(user.isAdmin || user.isSupervisor) ? `
                        <button class="dropdown-item" data-page-index="11">
                            ${APP_PAGE_ICONS[11]} <span>SUPERVISOR</span>
                        </button>
                    ` : ''}
                </div>
            </div>
        ` : ''}
    `;

    container.innerHTML = `
        <nav>
            <div class="nav-top"></div>
            <div class="nav-bottom">
                <div class="nav-brand" style="cursor: pointer;" title="Ir a HOME">
                    ${SOSGEN_LOGO_SVG}
                    <span>SOSGEN</span>
                </div>
                <div class="nav-links-container">
                    ${navigationHtml}
                </div>
                <div class="nav-right-controls">
                    <div class="theme-switcher">
                         <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M8 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM8 0a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 0zm0 13a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 13zm8-5a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2a.5.5 0 0 1 .5.5zM3 8a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2A.5.5 0 0 1 3 8zm10.657-5.657a.5.5 0 0 1 0 .707l-1.414 1.415a.5.5 0 1 1-.707-.708l1.414-1.414a.5.5 0 0 1 .707 0zm-9.193 9.193a.5.5 0 0 1 0 .707L3.05 13.657a.5.5 0 0 1-.707-.707l1.414-1.414a.5.5 0 0 1 .707 0zm9.193 2.121a.5.5 0 0 1-.707 0l-1.414-1.414a.5.5 0 0 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .707zM4.464 4.465a.5.5 0 0 1-.707 0L2.343 3.05a.5.5 0 1 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .708z"/></svg>
                        <input type="checkbox" id="theme-toggle">
                        <label for="theme-toggle" class="theme-switcher-label"></label>
                         <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M6 .278a.768.768 0 0 1 .08.858 7.208 7.208 0 0 0-.878 3.46c0 4.021 3.278 7.277 7.318 7.277.527 0 1.04-.055 1.533-.16a.787.787 0 0 1 .81.316.733.733 0 0 1-.031.893A8.349 8.349 0 0 1 8.344 16C3.734 16 0 12.286 0 7.71 0 4.266 2.114 1.312 5.124.06A.752.752 0 0 1 6 .278z"/></svg>
                    </div>
                    <div class="user-session-controls">
                        <span class="nav-user-display" title="Ver Perfil" data-page-index="${profilePageIndex}">${user.username}</span>
                        <button class="logout-btn" id="logout-btn" title="Cerrar sesión">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M10 12.5a.5.5 0 0 1-.5.5h-8a.5.5 0 0 1-.5-.5v-9a.5.5 0 0 1 .5-.5h8a.5.5 0 0 1 .5.5v2a.5.5 0 0 0 1 0v-2A1.5 1.5 0 0 0 9.5 2h-8A1.5 1.5 0 0 0 0 3.5v9A1.5 1.5 0 0 0 1.5 14h8a1.5 1.5 0 0 0 1.5-1.5v-2a.5.5 0 0 0-1 0z"/><path fill-rule="evenodd" d="M15.854 8.354a.5.5 0 0 0 0-.708l-3-3a.5.5 0 0 0-.708.708L14.293 7.5H5.5a.5.5 0 0 0 0 1h8.793l-2.147 2.146a.5.5 0 0 0 .708.708z"/></svg>
                            <span>Salir</span>
                        </button>
                    </div>
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

    container.addEventListener('click', (event) => {
        resetSessionTimeout(); // User activity resets timeout
        const target = event.target as HTMLElement;
        const brandLink = target.closest('.nav-brand');
        const logoutBtn = target.closest('#logout-btn');
        
        // Handle Dropdown Toggles
        const toggleBtn = target.closest('.dropdown-toggle');
        if (toggleBtn) {
            const container = toggleBtn.closest('.nav-item-container');
            if (container) {
                const isOpen = container.classList.contains('open');
                // Close all others
                document.querySelectorAll('.nav-item-container.open').forEach(el => el.classList.remove('open'));
                // Toggle current
                if (!isOpen) container.classList.add('open');
            }
            return; // Stop here for dropdown clicks
        }

        // Close dropdowns if clicking elsewhere (not on a toggle or a dropdown item)
        if (!target.closest('.dropdown-item')) {
             document.querySelectorAll('.nav-item-container.open').forEach(el => el.classList.remove('open'));
        }

        // Handle Nav Links (Standard + Dropdown Items)
        const navItem = target.closest('[data-page-index]');

        if (brandLink) switchToPage(0);
        
        if (navItem) {
            const pageIndex = parseInt(navItem.getAttribute('data-page-index')!, 10);
            if (!isNaN(pageIndex)) {
                switchToPage(pageIndex);
            }
        }
        
        if (logoutBtn) handleLogout();
    });

    // Reset timeout on keypress too
    window.addEventListener('keypress', resetSessionTimeout);

    const themeToggle = document.getElementById('theme-toggle') as HTMLInputElement;
    if (themeToggle) {
        themeToggle.addEventListener('change', () => {
            const isDark = themeToggle.checked;
            document.body.classList.toggle('dark-theme', isDark);
            localStorage.setItem('theme', isDark ? 'dark' : 'light');
        });
    }
}

function initializeTheme() {
    const savedTheme = localStorage.getItem('theme');
    const themeToggle = document.getElementById('theme-toggle') as HTMLInputElement;
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
