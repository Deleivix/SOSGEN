import { User } from "../utils/auth";
import { showToast } from "../utils/helpers";

const NEW_LOGO_SVG = `<svg class="nav-logo" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path fill="#2D8B8B" d="M50,10 A40,40 0 1 1 50,90 A40,40 0 1 1 50,10 M50,18 A32,32 0 1 0 50,82 A32,32 0 1 0 50,18"></path><path fill="white" d="M50,22 A28,28 0 1 1 50,78 A28,28 0 1 1 50,22"></path><path fill="#8BC34A" d="M50,10 A40,40 0 0 1 90,50 L82,50 A32,32 0 0 0 50,18 Z"></path><path fill="#F7F9FA" d="M10,50 A40,40 0 0 1 50,10 L50,18 A32,32 0 0 0 18,50 Z"></path><path fill="#2D8B8B" d="M50,90 A40,40 0 0 1 10,50 L18,50 A32,32 0 0 0 50,82 Z"></path><path fill="white" d="M90,50 A40,40 0 0 1 50,90 L50,82 A32,32 0 0 0 82,50 Z"></path></svg>`;

let isRegisterView = false;

function renderAuthForm(formContainer: HTMLElement, onLogin: (user: User) => void) {
    const formHtml = isRegisterView ? `
        <form id="auth-form" class="login-form">
            <h2 class="form-title">Crear una cuenta</h2>
            <div class="form-group">
                <label for="auth-username-input">Nombre de Usuario</label>
                <input class="simulator-input" type="text" id="auth-username-input" autocomplete="username" required />
            </div>
            <div class="form-group">
                <label for="auth-email-input">Email de Cellnex</label>
                <input class="simulator-input" type="email" id="auth-email-input" autocomplete="email" required placeholder="nombre.apellido@cellnextelecom.com" />
            </div>
            <div class="form-group">
                <label for="auth-password-input">Contraseña</label>
                <input class="simulator-input" type="password" id="auth-password-input" autocomplete="new-password" required />
                <p class="form-note">Esta contraseña es exclusiva para SOSGEN y no está sincronizada con sus credenciales corporativas. Por favor, recuérdela.</p>
            </div>
            <div class="button-container">
                <button type="submit" class="primary-btn" data-auth-action="register">Registrar</button>
            </div>
            <div id="auth-error-message" class="login-error-message"></div>
            <div class="form-switcher">
                <p>¿Ya tienes una cuenta? <button type="button" class="link-btn" data-view="login">Inicia sesión</button></p>
            </div>
        </form>
    ` : `
        <form id="auth-form" class="login-form">
            <h2 class="form-title">Iniciar Sesión</h2>
            <div class="form-group">
                <label for="auth-identifier-input">Usuario o Email</label>
                <input class="simulator-input" type="text" id="auth-identifier-input" autocomplete="username" required autofocus />
            </div>
            <div class="form-group">
                <label for="auth-password-input">Contraseña</label>
                <input class="simulator-input" type="password" id="auth-password-input" autocomplete="current-password" required />
            </div>
            <div class="button-container">
                <button type="submit" class="primary-btn" data-auth-action="login">Iniciar Sesión</button>
            </div>
            <div id="auth-error-message" class="login-error-message"></div>
            <div class="form-switcher">
                <p>¿No tienes una cuenta? <button type="button" class="link-btn" data-view="register">Regístrate</button></p>
            </div>
        </form>
    `;

    formContainer.innerHTML = formHtml;
    const form = formContainer.querySelector('#auth-form');
    if (form) {
        form.addEventListener('submit', (e) => handleAuthSubmit(e, onLogin));
    }

    const switchBtn = formContainer.querySelector('.link-btn');
    if(switchBtn) {
        switchBtn.addEventListener('click', () => {
            isRegisterView = switchBtn.getAttribute('data-view') === 'register';
            renderAuthForm(formContainer, onLogin);
        });
    }
}


async function handleAuthSubmit(e: Event, onLogin: (user: User) => void) {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const submitter = (e as SubmitEvent).submitter as HTMLButtonElement;
    if (!form || !submitter) return;

    const action = submitter.dataset.authAction;
    const errorEl = form.querySelector('#auth-error-message') as HTMLElement;
    errorEl.textContent = '';
    
    const payload: any = { action };
    
    if (action === 'register') {
        const usernameInput = form.querySelector('#auth-username-input') as HTMLInputElement;
        const emailInput = form.querySelector('#auth-email-input') as HTMLInputElement;
        const passwordInput = form.querySelector('#auth-password-input') as HTMLInputElement;

        payload.username = usernameInput.value.trim();
        payload.email = emailInput.value.trim();
        payload.password = passwordInput.value;

        if (!payload.username || !payload.email || !payload.password) {
            errorEl.textContent = 'Usuario, Email y Contraseña son obligatorios.';
            return;
        }
        if (!payload.email.toLowerCase().includes('@cellnex')) {
            errorEl.textContent = 'Debe proporcionar un email de Cellnex válido.';
            return;
        }
    } else if (action === 'login') {
        const identifierInput = form.querySelector('#auth-identifier-input') as HTMLInputElement;
        const passwordInput = form.querySelector('#auth-password-input') as HTMLInputElement;

        payload.identifier = identifierInput.value.trim();
        payload.password = passwordInput.value;
        
        if (!payload.identifier || !payload.password) {
            errorEl.textContent = 'Usuario/Email y Contraseña son obligatorios.';
            return;
        }
    }
    
    const originalButtonText = submitter.textContent;
    submitter.disabled = true;
    submitter.innerHTML = `<div class="spinner" style="width: 16px; height: 16px; border-width: 2px; display: inline-block; margin: 0 auto;"></div>`;
    
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
            isRegisterView = false; // Switch back to login view
            const formContainer = form.parentElement as HTMLElement;
            renderAuthForm(formContainer, onLogin);
        } else if (action === 'login') {
            onLogin(data.user);
        }

    } catch (error) {
        const message = error instanceof Error ? error.message : "Error desconocido";
        errorEl.textContent = message;
    } finally {
        submitter.disabled = false;
        submitter.innerHTML = originalButtonText || '';
    }
}

export function renderLoginPage(container: HTMLElement, onLogin: (user: User) => void) {
    isRegisterView = false; // Reset state on initial render
    container.innerHTML = `
        <div class="login-page">
            <div class="login-container">
                <h1 class="login-title">
                    ${NEW_LOGO_SVG.replace('nav-logo', 'banner-logo')}
                    <span>SOSGEN</span>
                </h1>
                <p class="login-subtitle">Asistente de comunicaciones marítimas con IA.</p>
                <div id="auth-form-container"></div>
            </div>
        </div>
    `;
    const formContainer = container.querySelector('#auth-form-container') as HTMLElement;
    renderAuthForm(formContainer, onLogin);
}