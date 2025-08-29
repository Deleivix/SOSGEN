/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { APP_PAGE_ICONS, APP_PAGES } from './data';
import { showTipOfTheDay } from './utils/helpers';
import { renderDashboard } from './components/DashboardPage';
import { renderSosgen } from './components/SosgenPage';
import { renderRegistroOceano } from './components/RegistroOceanoPage';
import { renderProtocolo } from './components/ProtocoloPage';
import { renderMaritimeSignalsSimulator } from './components/SenalesPage';
import { renderSimulacro } from './components/SimulacroPage';
import { renderInfo } from './components/InfoPage';

const NEW_LOGO_SVG = `<svg class="nav-logo" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path fill="#2D8B8B" d="M50,10 A40,40 0 1 1 50,90 A40,40 0 1 1 50,10 M50,18 A32,32 0 1 0 50,82 A32,32 0 1 0 50,18"></path><path fill="white" d="M50,22 A28,28 0 1 1 50,78 A28,28 0 1 1 50,22"></path><path fill="#8BC34A" d="M50,10 A40,40 0 0 1 90,50 L82,50 A32,32 0 0 0 50,18 Z"></path><path fill="#F7F9FA" d="M10,50 A40,40 0 0 1 50,10 L50,18 A32,32 0 0 0 18,50 Z"></path><path fill="#2D8B8B" d="M50,90 A40,40 0 0 1 10,50 L18,50 A32,32 0 0 0 50,82 Z"></path><path fill="white" d="M90,50 A40,40 0 0 1 50,90 L50,82 A32,32 0 0 0 82,50 Z"></path></svg>`;
const pageRenderStatus: { [key: number]: boolean } = {};

const pageRenderers = [
    renderDashboard,
    renderSosgen,
    renderRegistroOceano,
    renderProtocolo,
    renderMaritimeSignalsSimulator,
    renderSimulacro,
    renderInfo
];

function switchToPage(pageIndex: number, subTarget?: string) {
    document.querySelectorAll('.nav-link').forEach(btn => btn.classList.remove('active'));
    const navLink = document.querySelector(`.nav-link[data-page-index="${pageIndex}"]`);
    if (navLink) {
        navLink.classList.add('active');
    }

    document.querySelectorAll('.page-panel').forEach(panel => panel.classList.remove('active'));
    const activePanel = document.getElementById(`page-${pageIndex}`) as HTMLElement;
    if (activePanel) {
        activePanel.classList.add('active');
        if (!pageRenderStatus[pageIndex]) {
            pageRenderers[pageIndex](activePanel);
            pageRenderStatus[pageIndex] = true;
        }
        // Handle sub-navigation for dashboard quick links
        if (subTarget) {
            const subNavBtn = activePanel.querySelector<HTMLButtonElement>(`.sub-nav-btn[data-target="${subTarget}"]`);
            if (subNavBtn) {
                subNavBtn.click();
            }
        }
    }
}

// Expose switchToPage to the global scope so it can be called from dynamically created HTML
(window as any).switchToPage = switchToPage;

function renderApp(container: HTMLElement) {
    const navHtml = `
        <nav>
            <div class="nav-top"></div>
            <div class="nav-bottom">
                <div class="nav-brand" style="cursor: pointer;" title="Ir al Dashboard">
                    ${NEW_LOGO_SVG}
                    <span>SOSGEN</span>
                </div>
                <div class="nav-links-container">
                    ${APP_PAGES.map((page, index) => `
                        <button class="nav-link ${index === 0 ? 'active' : ''}" data-page-index="${index}" title="${page.name}">
                            ${APP_PAGE_ICONS[index]}
                            <span class="nav-link-text">${page.name}</span>
                        </button>
                    `).join('')}
                </div>
                <div class="theme-switcher">
                     <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M8 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM8 0a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 0zm0 13a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 13zm8-5a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2a.5.5 0 0 1 .5.5zM3 8a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2A.5.5 0 0 1 3 8zm10.657-5.657a.5.5 0 0 1 0 .707l-1.414 1.415a.5.5 0 1 1-.707-.708l1.414-1.414a.5.5 0 0 1 .707 0zm-9.193 9.193a.5.5 0 0 1 0 .707L3.05 13.657a.5.5 0 0 1-.707-.707l1.414-1.414a.5.5 0 0 1 .707 0zm9.193 2.121a.5.5 0 0 1-.707 0l-1.414-1.414a.5.5 0 0 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .707zM4.464 4.465a.5.5 0 0 1-.707 0L2.343 3.05a.5.5 0 1 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .708z"/></svg>
                    <input type="checkbox" id="theme-toggle">
                    <label for="theme-toggle" class="theme-switcher-label"></label>
                     <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M6 .278a.768.768 0 0 1 .08.858 7.208 7.208 0 0 0-.878 3.46c0 4.021 3.278 7.277 7.318 7.277.527 0 1.04-.055 1.533-.16a.787.787 0 0 1 .81.316.733.733 0 0 1-.031.893A8.349 8.349 0 0 1 8.344 16C3.734 16 0 12.286 0 7.71 0 4.266 2.114 1.312 5.124.06A.752.752 0 0 1 6 .278z"/></svg>
                </div>
            </div>
        </nav>
    `;

    const mainContentHtml = `<main>${APP_PAGES.map((_, index) => `<div class="page-panel ${index === 0 ? 'active' : ''}" id="page-${index}"></div>`).join('')}</main>`;
    container.innerHTML = navHtml + mainContentHtml;
    
    const initialActivePanel = container.querySelector<HTMLElement>('.page-panel.active');
    if(initialActivePanel) {
        pageRenderers[0](initialActivePanel);
        pageRenderStatus[0] = true;
    }
}


function addEventListeners(appContainer: HTMLElement) {
    appContainer.addEventListener('click', (event) => {
        const target = event.target as HTMLElement;
        const navLink = target.closest('.nav-link');
        const brandLink = target.closest('.nav-brand');

        if (brandLink) {
            switchToPage(0);
            return;
        }
        if (navLink) {
            const pageIndex = parseInt(navLink.getAttribute('data-page-index')!, 10);
            switchToPage(pageIndex);
            return;
        }
    });

    const themeToggle = document.getElementById('theme-toggle') as HTMLInputElement;
    if (themeToggle) {
        themeToggle.addEventListener('change', () => {
            if (themeToggle.checked) {
                document.body.classList.add('dark-theme');
                localStorage.setItem('theme', 'dark');
            } else {
                document.body.classList.remove('dark-theme');
                localStorage.setItem('theme', 'light');
            }
        });
    }
}

function initializeTheme() {
    const savedTheme = localStorage.getItem('theme');
    const themeToggle = document.getElementById('theme-toggle') as HTMLInputElement;
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-theme');
        if (themeToggle) themeToggle.checked = true;
    } else {
        document.body.classList.remove('dark-theme');
        if (themeToggle) themeToggle.checked = false;
    }
}


document.addEventListener('DOMContentLoaded', () => {
    const appContainer = document.getElementById('app');
    if (appContainer) {
        renderApp(appContainer);
        addEventListeners(appContainer);
        initializeTheme();
        showTipOfTheDay();
    }
});