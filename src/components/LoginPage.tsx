import { User } from "../utils/auth";
import { showToast } from "../utils/helpers";

const NEW_LOGO_SVG = `<svg class="nav-logo" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path fill="#2D8B8B" d="M50,10 A40,40 0 1 1 50,90 A40,40 0 1 1 50,10 M50,18 A32,32 0 1 0 50,82 A32,32 0 1 0 50,18"></path><path fill="white" d="M50,22 A28,28 0 1 1 50,78 A28,28 0 1 1 50,22"></path><path fill="#8BC34A" d="M50,10 A40,40 0 0 1 90,50 L82,50 A32,32 0 0 0 50,18 Z"></path><path fill="#F7F9FA" d="M10,50 A40,40 0 0 1 50,10 L50,18 A32,32 0 0 0 18,50 Z"></path><path fill="#2D8B8B" d="M50,90 A40,40 0 0 1 10,50 L18,50 A32,32 0 0 0 50,82 Z"></path><path fill="white" d="M90,50 A40,40 0 0 1 50,90 L50,82 A32,32 0 0 0 82,50 Z"></path></svg>`;

export function renderLoginPage(container: HTMLElement, onLogin: (user: User) => void) {
    container.innerHTML = `
        <div class="login-page">
            <div class="login-container">
                <h1 class="login-title">
                    ${NEW_LOGO_SVG.replace('nav-logo', 'banner-logo')}
                    <span>SOSGEN</span>
                </h1>
                <p class="login-subtitle">Asistente de comunicaciones marítimas con IA.</p>
                <form id="auth-form" class="login-form">
                    <div class="form-group">
                        <label for="auth-identifier-input">Usuario o Email</label>
                        <input class="simulator-input" type="text" id="auth-identifier-input" autocomplete="username" required autofocus />
                    </div>
                    <div class="form-group">
                        <label for="auth-email-input">Email (requerido para registro)</label>
                        <input class="simulator-input" type="email" id="auth-email-input" autocomplete="email" placeholder="nombre.apellido@cellnextelecom.com" />
                    </div>
                     <div class="form-group">
                        <label for="auth-password-input">Contraseña</label>
                        <input class="simulator-input" type="password" id="auth-password-input" autocomplete="current-password" required />
                    </div>
                    <div class="button-container">
                        <button type="submit" class="secondary-btn" data-auth-action="register">Registrar</button>
                        <button type="submit" class="primary-btn" data-auth-action="login">Iniciar Sesión</button>
                    </div>
                    <div id="auth-error-message" class="login-error-message"></div>
                </form>
            </div>
        </div>
    `;
    
    const form = container.querySelector('#auth-form');
    if (form) {
        form.addEventListener('submit', (e) => handleAuthSubmit(e, onLogin));
    }
}

async function handleAuthSubmit(e: Event, onLogin: (user: User) => void) {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const submitter = (e as SubmitEvent).submitter as HTMLButtonElement;
    if (!form || !submitter) return;

    const action = submitter.dataset.authAction;
    const identifierInput = form.querySelector('#auth-identifier-input') as HTMLInputElement;
    const emailInput = form.querySelector('#auth-email-input') as HTMLInputElement;
    const passwordInput = form.querySelector('#auth-password-input') as HTMLInputElement;
    const errorEl = form.querySelector('#auth-error-message') as HTMLElement;
    
    const identifier = identifierInput.value.trim();
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    
    // Clear previous errors
    errorEl.textContent = '';
    
    const payload: any = { action, password };

    if (action === 'register') {
        payload.username = identifier; // For register, the first field is the username
        payload.email = email;
        if (!identifier || !email || !password) {
            errorEl.textContent = 'Usuario, Email y Contraseña son obligatorios para registrarse.';
            return;
        }
        if (!email.toLowerCase().includes('@cellnex')) {
            errorEl.textContent = 'Para registrarse, debe proporcionar un email de Cellnex válido.';
            return;
        }
    } else if (action === 'login') {
        payload.identifier = identifier; // For login, the first field is username OR email
        if (!identifier || !password) {
            errorEl.textContent = 'Usuario/Email y Contraseña son obligatorios para iniciar sesión.';
            return;
        }
    }
    
    const originalButtonText = submitter.textContent;
    submitter.disabled = true;
    submitter.innerHTML = `<div class="spinner" style="width: 16px; height: 16px; border-width: 2px; display: inline-block; margin: 0 auto;"></div>`;
    
    const otherButton = form.querySelector<HTMLButtonElement>(`button:not([data-auth-action="${action}"])`);
    if(otherButton) otherButton.disabled = true;

    try {
        const response = await fetch('/api/auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Ocurrió un error.');
        }

        if (action === 'register') {
            showToast('Usuario registrado con éxito. Por favor, inicie sesión.', 'success');
            passwordInput.value = '';
        } else if (action === 'login') {
            onLogin(data.user);
        }

    } catch (error) {
        const message = error instanceof Error ? error.message : "Error desconocido";
        errorEl.textContent = message;
    } finally {
        submitter.disabled = false;
        submitter.innerHTML = originalButtonText || '';
        if(otherButton) otherButton.disabled = false;
    }
}