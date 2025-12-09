
import { clearCurrentUser } from "./auth";
import { showToast } from "./helpers";

const IDLE_TIMEOUT_MS = 2 * 60 * 60 * 1000; // 2 Hours
let timeoutId: number | null = null;

export function initSessionManager(onTimeout: () => void) {
    const resetTimer = () => {
        if (timeoutId) window.clearTimeout(timeoutId);
        timeoutId = window.setTimeout(() => {
            handleSessionTimeout(onTimeout);
        }, IDLE_TIMEOUT_MS);
    };

    // Listeners for activity
    window.addEventListener('mousemove', resetTimer);
    window.addEventListener('keydown', resetTimer);
    window.addEventListener('click', resetTimer);
    window.addEventListener('scroll', resetTimer);

    // Initial start
    resetTimer();
}

function handleSessionTimeout(onTimeout: () => void) {
    clearCurrentUser();
    sessionStorage.removeItem('sosgen_user');
    showToast('Sesión caducada por inactividad.', 'error', 5000);
    onTimeout();
}
