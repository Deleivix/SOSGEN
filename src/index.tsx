
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { APP_PAGE_ICONS, APP_PAGES, SOSGEN_LOGO_SVG } from './data';
import { showTipOfTheDay } from './utils/helpers';
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

const pageRenderStatus: { [key: number]: boolean } = {};
let isTransitioning = false;
const animationDuration = 400;

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
];

function switchToPage(pageIndex: number, subTabId?: string) {
    if (isTransitioning) return;

    const outgoingPanel = document.querySelector('.page-panel.active') as HTMLElement | null;
    const incomingPanel = document.getElementById(`page-${pageIndex}`) as HTMLElement | null;

    if (!incomingPanel || incomingPanel === outgoingPanel) return;

    isTransitioning = true;
    document.querySelectorAll('.nav-link').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`.nav-link[data-page-index="${pageIndex}"]`)?.classList.add('active');

    if (outgoingPanel) {
        outgoingPanel.classList.add('is-exiting');
        outgoingPanel.classList.remove('active');
    }

    incomingPanel.classList.add('active');
    if (!pageRenderStatus[pageIndex]) {
        pageRenderers[pageIndex](incomingPanel);
        pageRenderStatus[pageIndex] = true;
    }

    if (subTabId) {
        setTimeout(() => {
            const subTabButton = incomingPanel?.querySelector<HTMLButtonElement>(`[data-target="${subTabId}"]`);
            subTabButton?.click();
        }, 0);
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
    
    container.innerHTML = `
        <nav>
            <div class="nav-top"></div>
            <div class="nav-bottom">
                <div class="nav-brand" style="cursor: pointer;" title="Ir a HOME">
                    ${SOSGEN_LOGO_SVG}
                    <span>SOSGEN</span>
                </div>
                <div class="nav-links-container">
                    ${APP_PAGES.map((page, index) => {
                        if (page.name === 'HOME' || (page.name === 'ADMIN' && !user.isAdmin)) return '';
                        return `
                        <button class="nav-link ${index === 0 ? 'active' : ''}" data-page-index="${index}" title="${page.name}">
                            ${APP_PAGE_ICONS[index]}
                            <span class="nav-link-text">${page.name}</span>
                        </button>
                    `}).join('')}
                </div>
                <div class="nav-right-controls">
                    <div class="theme-switcher">
                         <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M8 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM8 0a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 0zm0 13a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 13zm8-5a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2a.5.5 0 0 1 .5.5zM3 8a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2A.5.5 0 0 1 3 8zm10.657-5.657a.5.5 0 0 1 0 .707l-1.414 1.415a.5.5 0 1 1-.707-.708l1.414-1.414a.5.5 0 0 1 .707 0zm-9.193 9.193a.5.5 0 0 1 0 .707L3.05 13.657a.5.5 0 0 1-.707-.707l1.414-1.414a.5.5 0 0 1 .707 0zm9.193 2.121a.5.5 0 0 1-.707 0l-1.414-1.414a.5.5 0 0 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .707zM4.464 4.465a.5.5 0 0 1-.707 0L2.343 3.05a.5.5 0 1 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .708z"/></svg>
                        <input type="checkbox" id="theme-toggle">
                        <label for="theme-toggle" class="theme-switcher-label"></label>
                         <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M6 .278a.768.768 0 0 1 .08.858 7.208 7.208 0 0 0-.878 3.46c0 4.021 3.278 7.277 7.318 7.277.527 0 1.04-.055 1.533-.16a.787.787 0 0 1 .81.316.733.733 0 0 1-.031.893A8.349 8.349 0 0 1 8.344 16C3.734 16 0 12.286 0 7.71 0 4.266 2.114 1.312 5.124.06A.752.752 0 0 1 6 .278z"/></svg>
                    </div>
                    <div class="user-session-controls">
                        <span class="nav-user-display" title="Usuario conectado">${user.username}</span>
                        <button class="logout-btn" id="logout-btn" title="Cerrar sesión de ${user.username}">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M10 12.5a.5.5 0 0 1-.5.5h-8a.5.5 0 0 1-.5-.5v-9a.5.5 0 0 1 .5-.5h8a.5.5 0 0 1 .5.5v2a.5.5 0 0 0 1 0v-2A1.5 1.5 0 0 0 9.5 2h-8A1.5 1.5 0 0 0 0 3.5v9A1.5 1.5 0 0 0 1.5 14h8a1.5 1.5 0 0 0 1.5-1.5v-2a.5.5 0 0 0-1 0z"/><path fill-rule="evenodd" d="M15.854 8.354a.5.5 0 0 0 0-.708l-3-3a.5.5 0 0 0-.708.708L14.293 7.5H5.5a.5.5 0 0 0 0 1h8.793l-2.147 2.146a.5.5 0 0 0 .708.708z"/></svg>
                            <span>Salir</span>
                        </button>
                    </div>
                </div>
            </div>
        </nav>
        <main>${APP_PAGES.map((page, index) => {
            if (page.name === 'ADMIN' && !user.isAdmin) return '';
            return `<div class="page-panel ${index === 0 ? 'active' : ''}" id="page-${index}"></div>`;
        }).join('')}</main>
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
}

function addMainAppEventListeners() {
    const container = document.getElementById('app');
    if (!container) return;

    container.addEventListener('click', (event) => {
        const target = event.target as HTMLElement;
        const navLink = target.closest('.nav-link');
        const brandLink = target.closest('.nav-brand');
        const logoutBtn = target.closest('#logout-btn');

        if (brandLink) switchToPage(0);
        if (navLink) switchToPage(parseInt(navLink.getAttribute('data-page-index')!, 10));
        if (logoutBtn) handleLogout();
    });

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
    // Reset page status to force re-render on next login
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
