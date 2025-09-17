// Fix: Implement the main application entry point to set up the layout, navigation, and render pages.
import { APP_PAGES, APP_PAGE_ICONS } from './data';
import { renderDashboard } from './components/DashboardPage';
import { renderSosgen } from './components/SosgenPage';
import { renderRegistroOceano } from './components/RegistroOceanoPage';
import { renderProtocolo } from './components/ProtocoloPage';
import { renderRadioavisos } from './components/RadioavisosPage';
import { renderMeteos } from './components/MeteosPage';
import { renderMaritimeSignalsSimulator } from './components/SenalesPage';
import { renderSimulacro } from './components/SimulacroPage';
import { renderInfo } from './components/InfoPage';
import { showTipOfTheDay } from './utils/helpers';

// Mapping page names to their render functions
const pageRenderers: { [key: string]: (container: HTMLElement) => void } = {
    'Dashboard': renderDashboard,
    'SOSGEN': renderSosgen,
    'Registro Océano': renderRegistroOceano,
    'PROTOCOLO': renderProtocolo,
    'Radioavisos': renderRadioavisos,
    'METEOS': renderMeteos,
    'SEÑALES': renderMaritimeSignalsSimulator,
    'SIMULACRO': renderSimulacro,
    'INFO': renderInfo,
};

function App() {
    const appContainer = document.getElementById('app');
    if (!appContainer) return;

    // Create main layout
    appContainer.innerHTML = `
        <div class="app-layout">
            <nav class="sidebar">
                <div class="sidebar-header">
                    <div class="sidebar-logo">SOSGEN</div>
                    <span class="sidebar-version">v1.2</span>
                </div>
                <ul class="nav-list">
                    ${APP_PAGES.map((page, index) => `
                        <li class="nav-item">
                            <a href="#${page.name.toLowerCase().replace(/\s+/g, '-')}" class="nav-link" data-page="${page.name}">
                                ${APP_PAGE_ICONS[index]}
                                <span class="nav-text">${page.name}</span>
                            </a>
                        </li>
                    `).join('')}
                </ul>
                <div class="sidebar-footer">
                    <div class="theme-switcher">
                        <label for="theme-toggle" class="theme-toggle-label">Modo Oscuro</label>
                        <input type="checkbox" id="theme-toggle" class="theme-toggle-input">
                    </div>
                </div>
            </nav>
            <main id="main-content" class="main-content"></main>
        </div>
    `;

    const mainContent = document.getElementById('main-content') as HTMLElement;
    const navLinks = document.querySelectorAll('.nav-link');
    const themeToggle = document.getElementById('theme-toggle') as HTMLInputElement;

    function navigate(pageName: string) {
        // Update URL hash
        window.location.hash = pageName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        
        // Update active link
        navLinks.forEach(link => {
            if (link.getAttribute('data-page') === pageName) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });

        // Render page content
        const renderer = pageRenderers[pageName];
        if (renderer) {
            mainContent.innerHTML = ''; // Clear previous content
            renderer(mainContent);
        } else {
            mainContent.innerHTML = `<h2>Page not found: ${pageName}</h2>`;
        }
    }

    // Handle navigation via clicks
    appContainer.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        // Handle direct nav link clicks
        const navLink = target.closest('.nav-link');
        if (navLink) {
            e.preventDefault();
            const pageName = navLink.getAttribute('data-page');
            if (pageName) navigate(pageName);
        }
        // Handle quick link clicks from the dashboard
        const quickLink = target.closest('.quick-link-item');
        if (quickLink) {
            e.preventDefault();
            const pageName = quickLink.getAttribute('data-page');
            if (pageName) navigate(pageName);
        }
    });
    
    // Handle theme switching
    const applyTheme = (isDark: boolean) => {
        document.body.classList.toggle('dark-theme', isDark);
        localStorage.setItem('sosgen_theme', isDark ? 'dark' : 'light');
        if (themeToggle) themeToggle.checked = isDark;
    };
    
    if (themeToggle) {
        themeToggle.addEventListener('change', () => {
            applyTheme(themeToggle.checked);
        });
    }

    // Initial page load from hash or default
    const initialHash = window.location.hash.substring(1);
    const pageNameFromHash = APP_PAGES.find(p => p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') === initialHash)?.name || 'Dashboard';
    navigate(pageNameFromHash);
    
    // Set initial theme based on saved preference or system setting
    const savedTheme = localStorage.getItem('sosgen_theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    applyTheme(savedTheme === 'dark' || (savedTheme === null && prefersDark));

    // Show tip of the day on first visit
    showTipOfTheDay();
}

// Start the app when the DOM is ready
document.addEventListener('DOMContentLoaded', App);
