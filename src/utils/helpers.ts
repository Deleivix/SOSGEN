import { renderBitacora } from "../components/BitacoraPage";
import { DAILY_TIPS } from "../data";

// --- LOGGING ---
export function logSosgenEvent(type: string, content: object): object | null {
    try {
        const logbook = JSON.parse(localStorage.getItem('sosgen_logbook') || '[]');
        const newEntry = {
            id: Date.now().toString(),
            timestamp: new Date().toISOString(),
            type,
            content
        };
        logbook.push(newEntry);
        localStorage.setItem('sosgen_logbook', JSON.stringify(logbook));
        return newEntry;
    } catch (e) {
        console.error("Failed to write to logbook:", e);
        return null;
    }
}

export function updateBitacoraView(newEntry: any) {
    const bitacoraPanel = document.getElementById('page-5'); // BITÁCORA is index 5
    if (bitacoraPanel?.classList.contains('active')) { // Check if the page has been rendered
        let logbookList = bitacoraPanel.querySelector('#logbook-list');
        
        if (!logbookList) {
            renderBitacora(bitacoraPanel);
        } else {
            const newEntryHTML = createLogEntryHTML(newEntry);
            logbookList.insertAdjacentHTML('afterbegin', newEntryHTML);
        }
    }
}

function createLogEntryHTML(entry: any): string {
    return `
    <div class="log-entry" data-id="${entry.id}">
        <div class="log-entry-header">
            <span class="log-entry-type">${entry.type}</span>
            <span class="log-entry-ts">${new Date(entry.timestamp).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'medium' })}</span>
        </div>
        <div class="log-entry-content">
             <div>
                 <h4>Español</h4>
                 <textarea class="styled-textarea" rows="8" readonly>${entry.content.spanish}</textarea>
             </div>
             <div>
                 <h4>Inglés</h4>
                 <textarea class="styled-textarea" rows="8" readonly>${entry.content.english}</textarea>
             </div>
        </div>
        <div class="log-entry-actions">
            <button class="log-edit-btn secondary-btn">Editar</button>
            <button class="log-delete-btn tertiary-btn">Eliminar</button>
        </div>
    </div>
    `;
}


// --- EVENT HANDLERS & LOGIC ---
/**
 * Debounce function to limit the rate at which a function gets called.
 */
export function debounce(func: Function, delay: number) {
    let timeoutId: number;
    return function(this: any, ...args: any[]) {
        clearTimeout(timeoutId);
        timeoutId = window.setTimeout(() => func.apply(this, args), delay);
    };
}

export async function handleCopy(button: HTMLButtonElement, textToCopy: string) {
    if (textToCopy) {
        try {
            await navigator.clipboard.writeText(textToCopy);
            const originalContent = button.innerHTML;
            button.innerHTML = `<span>Copiado!</span>`;
            button.disabled = true;
            setTimeout(() => { button.innerHTML = originalContent; button.disabled = false; }, 2000);
        } catch (err) { console.error('Error al copiar: ', err); }
    }
}

export function initializeInfoTabs(container: HTMLElement) {
    const tabsContainer = container.querySelector('.info-nav-tabs');
    const contentContainer = container.querySelector('.content-card, .info-content'); // Adjusted selector
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
