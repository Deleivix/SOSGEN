
import { DAILY_TIPS } from "../data";

// --- EVENT HANDLERS & LOGIC ---
/**
 * Debounce function to limit the rate at which a function gets called.
 */
export function debounce(func: Function, delay: number) {
    let timeoutId: number;
    return function(this: any, ...args: any[]) {
        window.clearTimeout(timeoutId);
        timeoutId = window.setTimeout(() => func.apply(this, args), delay);
    };
}

export async function handleCopy(textToCopy: string) {
    if (!textToCopy) return;
    try {
        await navigator.clipboard.writeText(textToCopy);
        showToast('¡Copiado al portapapeles!');
    } catch (err) {
        console.error('Error al copiar: ', err);
        showToast('Error al copiar', 'error');
    }
}

export function initializeInfoTabs(container: HTMLElement) {
    const tabsContainer = container.querySelector('.info-nav-tabs');
    
    // Find content container. Prioritize specific classes, fallback to main container if panels exist directly in it.
    let contentContainer = container.querySelector('.content-card, .info-content') as HTMLElement;
    if (!contentContainer || contentContainer.querySelectorAll('.sub-tab-panel').length === 0) {
        if (container.querySelectorAll('.sub-tab-panel').length > 0) {
            contentContainer = container;
        }
    }

    if (!tabsContainer || !contentContainer) return;

    tabsContainer.addEventListener('click', (event) => {
        const target = event.target as HTMLElement;
        const btn = target.closest<HTMLButtonElement>('.info-nav-btn');

        if (btn) {
            const targetId = btn.dataset.target;
            if (!targetId) return;
            
            tabsContainer.querySelectorAll('.info-nav-btn').forEach(b => b.classList.remove('active'));
            contentContainer.querySelectorAll('.sub-tab-panel').forEach(p => p.classList.remove('active'));

            btn.classList.add('active');
            const panel = contentContainer.querySelector<HTMLElement>(`#${targetId}`);
            if (panel) panel.classList.add('active');
        }
    });
}

// --- TOAST NOTIFICATIONS ---
export function showToast(message: string, type: 'success' | 'error' | 'info' = 'success', duration: number = 3000) {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icons = {
        success: `<svg class="toast-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" /></svg>`,
        error: `<svg class="toast-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" /></svg>`,
        info: `<svg class="toast-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" /></svg>`,
    }

    toast.innerHTML = `${icons[type]}<span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('hiding');
        toast.addEventListener('animationend', () => toast.remove());
    }, duration);
}


// --- TIP OF THE DAY MODAL ---
export function showTipOfTheDay() {
    const today = new Date().toDateString();
    const lastShown = localStorage.getItem('sosgen_last_tip_shown');

    if (today === lastShown) {
        return; // Already shown today
    }

    const tip = DAILY_TIPS[Math.floor(Math.random() * DAILY_TIPS.length)];

    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'modal-overlay';
    
    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content';
    modalContent.innerHTML = `
        <h2 class="modal-title">Consejo del Día</h2>
        <p class="modal-text">${tip}</p>
        <button class="primary-btn modal-close-btn">Entendido</button>
    `;

    modalOverlay.appendChild(modalContent);
    document.body.appendChild(modalOverlay);

    const closeModal = () => {
        modalOverlay.style.animation = 'fadeOut 0.3s ease forwards';
        modalOverlay.addEventListener('animationend', () => modalOverlay.remove());
        localStorage.setItem('sosgen_last_tip_shown', today);
    };

    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) {
            closeModal();
        }
    });
    modalContent.querySelector('.modal-close-btn')?.addEventListener('click', closeModal);
}
