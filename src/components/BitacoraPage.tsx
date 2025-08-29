export function renderBitacora(container: HTMLElement) {
    const logbook = JSON.parse(localStorage.getItem('sosgen_logbook') || '[]');
    
    container.innerHTML = `
        <div class="content-card" style="max-width: 1200px;">
            <h2 class="content-card-title">Bitácora de Mensajes Generados</h2>
            ${logbook.length === 0 ? '<p class="drill-placeholder">No hay mensajes generados.</p>' : `
            <div id="logbook-list" class="logbook-list">
                ${logbook.slice().reverse().map(createLogEntryHTML).join('')}
            </div>
            `}
        </div>
    `;
    
    if (logbook.length > 0) {
        initializeBitacora(container);
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

function initializeBitacora(container: HTMLElement) {
    const list = container.querySelector('#logbook-list');
    if (!list) return;

    list.addEventListener('click', e => {
        const target = e.target as HTMLElement;
        const entryEl = target.closest<HTMLElement>('.log-entry');
        if (!entryEl) return;
        const entryId = entryEl.dataset.id;
        if (!entryId) return;

        if (target.classList.contains('log-edit-btn')) {
            const textareas = entryEl.querySelectorAll('textarea');
            textareas.forEach(ta => ta.readOnly = false);
            target.textContent = 'Guardar';
            target.classList.remove('log-edit-btn', 'secondary-btn');
            target.classList.add('log-save-btn', 'primary-btn-small');
            entryEl.classList.add('editing');
            (textareas[0] as HTMLTextAreaElement)?.focus();
        } else if (target.classList.contains('log-save-btn')) {
            const spanishText = (entryEl.querySelector('textarea:nth-of-type(1)') as HTMLTextAreaElement)?.value;
            const englishText = (entryEl.querySelector('textarea:nth-of-type(2)') as HTMLTextAreaElement)?.value;
            
            let logbook = JSON.parse(localStorage.getItem('sosgen_logbook') || '[]');
            const entryIndex = logbook.findIndex((entry: any) => entry.id === entryId);
            if (entryIndex > -1) {
                logbook[entryIndex].content.spanish = spanishText;
                logbook[entryIndex].content.english = englishText;
                localStorage.setItem('sosgen_logbook', JSON.stringify(logbook));
            }

            const textareas = entryEl.querySelectorAll('textarea');
            textareas.forEach(ta => ta.readOnly = true);
            target.textContent = 'Editar';
            target.classList.add('log-edit-btn', 'secondary-btn');
            target.classList.remove('log-save-btn', 'primary-btn-small');
            entryEl.classList.remove('editing');
        }

        if (target.classList.contains('log-delete-btn')) {
            if (confirm('¿Está seguro de que desea eliminar esta entrada de la bitácora?')) {
                let logbook = JSON.parse(localStorage.getItem('sosgen_logbook') || '[]');
                const updatedLogbook = logbook.filter((entry: any) => entry.id !== entryId);
                localStorage.setItem('sosgen_logbook', JSON.stringify(updatedLogbook));
                entryEl.style.animation = 'fadeOut 0.5s ease forwards';
                entryEl.addEventListener('animationend', () => {
                    entryEl.remove();
                     if (updatedLogbook.length === 0 && container) {
                        renderBitacora(container); // Re-render to show empty message
                    }
                });
            }
        }
    });
}
