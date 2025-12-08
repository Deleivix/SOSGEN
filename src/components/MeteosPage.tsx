
import { showToast } from "../utils/helpers";

// ============================================================================
// --- LÓGICA DE ANÁLISIS DE BOLETINES (PROPORCIONADA POR EL USUARIO) ---
// ============================================================================
const DIR = new Map(Object.entries({
    N: "norte", S: "sur", E: "este", W: "oeste",
    NE: "noreste", NW: "noroeste", SE: "sureste", SW: "suroeste"
}));
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

function hhmmToWords(hhmm: string): string {
    const m = /^(\d{2}):(\d{2})$/.exec(hhmm);
    if (!m) return hhmm;
    const h = parseInt(m[1], 10), mi = parseInt(m[2], 10);
    const num = (n: number): string => {
        const unidades = ["cero", "uno", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve"];
        if (n < 10) return unidades[n];
        if (n < 20) return ["diez", "once", "doce", "trece", "catorce", "quince", "dieciséis", "diecisiete", "dieciocho", "diecinueve"][n - 10];
        if (n % 10 === 0) return ["veinte", "treinta", "cuarenta", "cincuenta"][n / 10 - 2];
        const dec = ["veinti", "treinta y ", "cuarenta y ", "cincuenta y "][Math.floor(n / 10) - 2];
        return Math.floor(n / 10) === 2 ? (dec + unidades[n % 10]) : (dec + unidades[n % 10]);
    };
    const H = h === 0 ? "cero" : num(h);
    const M = mi === 0 ? "cero cero" : (mi < 10 ? "cero " + num(mi) : num(mi));
    return `${H} ${M}`;
}

function isoToFechaEnPalabras(iso: string) {
    const d = new Date(iso);
    if (Number.isNaN(+d)) return { fecha: iso, horaPalabras: '', hhmm: '' };
    const dia = d.getUTCDate();
    const mes = MESES[d.getUTCMonth()];
    const año = d.getUTCFullYear();
    const hh = String(d.getUTCHours()).padStart(2, "0");
    const mm = String(d.getUTCMinutes()).padStart(2, "0");
    return {
        fecha: `${dia} de ${mes} de ${año}`,
        horaPalabras: `${hhmmToWords(`${hh}:${mm}`)} UTC`,
        hhmm: `${hh}:${mm}`
    };
}

function expandDirs(t: string): string {
    for (const k of ["NE", "NW", "SE", "SW", "N", "S", "E", "W"]) {
        t = t.replace(new RegExp(`\\b${k}\\b`, "g"), DIR.get(k)!);
    }
    return t;
}

function expandMar(t: string): string {
    return t
        .replace(/\bcomponente\s+([nsew])\b/gi, (_, d) => `componente ${DIR.get(d.toUpperCase())}`)
        .replace(/\b(\d+)\s*m\b/gi, "$1 metros")
        .replace(/[º°]\s*([NS])/gi, "° $1")
        .replace(/\báreas de mala\b/gi, "áreas de mala visibilidad")
        .replace(/\b(localmente|ocasionalmente)\s+mala\b/gi, "$1 visibilidad mala")
        .replace(/anticiclón/gi, "anticiclón");
}

function beaufortPalabras(t: string): string {
    const w = (n: string) => {
        const mapa = ["cero", "uno", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve", "diez", "once", "doce"];
        const x = parseInt(n, 10);
        return (x >= 0 && x <= 12) ? mapa[x] : n;
    };
    return t
        .replace(/\bfuerza\s+(\d+)\s+a\s+(\d+)\b/gi, (_, a, b) => `fuerza ${w(a)} a ${w(b)}`)
        .replace(/\b(\d+)\s+a\s+(\d+)\b/g, (_, a, b) => `${w(a)} a ${w(b)}`)
        .replace(/\b(\d+)\s*o\s*(\d+)\b/g, (_, a, b) => `${w(a)} o ${w(b)}`)
        .replace(/\bfuerza\s+(\d+)\b/gi, (_, a) => `fuerza ${w(a)}`);
}

function presionesMilibares(t: string): string {
    return t.replace(/(\b\d{3,4}\b)(?=[^\d]*(rellen|y|\.|,|$))/gi, "$1 milibares");
}

function tidy(t: string): string {
    return t.replace(/\s+/g, " ").replace(/\s*;\s*/g, ". ").replace(/:\s*/g, ". ").replace(/\.\s*\./g, ". ").trim();
}

function normalizeMarine(text: string): string {
    let t = text;
    t = expandDirs(t);
    t = expandMar(t);
    t = beaufortPalabras(t);
    t = presionesMilibares(t);
    t = tidy(t);
    if (!/[.!?]$/.test(t)) t += ".";
    return t.charAt(0).toUpperCase() + t.slice(1);
}

function formatAltaMar(xmlDoc: XMLDocument): string {
    const root = xmlDoc.querySelector("root");
    const nombre = (root?.getAttribute("nombre") || "").replace(/30\s*N/i, "30 grados NORTE");
    const elaborado = isoToFechaEnPalabras(xmlDoc.querySelector("origen > elaborado")?.textContent || "");
    const inicio = isoToFechaEnPalabras(xmlDoc.querySelector("origen > inicio")?.textContent || "");
    const fin = isoToFechaEnPalabras(xmlDoc.querySelector("origen > fin")?.textContent || "");
    const situ = normalizeMarine(xmlDoc.querySelector("situacion > texto")?.textContent || "");

    const out = [];
    out.push("Agencia Estatal de Meteorología de España.");
    if (nombre) out.push(`${nombre}.`);
    out.push(`Elaborado el ${elaborado.fecha} a las ${elaborado.horaPalabras}.`);
    out.push(`Válido desde el ${inicio.fecha} a las ${inicio.horaPalabras} hasta el ${fin.fecha} a las ${fin.horaPalabras}.`);
    out.push(`Situación general. ${situ}`);

    xmlDoc.querySelectorAll("prediccion > zona").forEach(z => {
        const zname = z.getAttribute("nombre");
        const ztxt = normalizeMarine(z.querySelector("texto")?.textContent || "");
        out.push(`${zname}. ${ztxt}`);
    });
    return out.join("\n\n").toUpperCase();
}

function formatAviso(xmlDoc: XMLDocument): string {
    const elaborado = isoToFechaEnPalabras(xmlDoc.querySelector("origen > elaborado")?.textContent || "");
    const fin = isoToFechaEnPalabras(xmlDoc.querySelector("origen > fin")?.textContent || "");
    
    // Intenta buscar zonas (usando selector descendiente para mayor robustez)
    const avisoNodes = xmlDoc.querySelectorAll("aviso zona");
    
    // Intenta buscar texto general dentro de aviso
    const generalTextNode = xmlDoc.querySelector("aviso > texto");
    const generalText = generalTextNode ? normalizeMarine(generalTextNode.textContent || "") : "";

    const lines = [];
    lines.push("AGENCIA ESTATAL DE METEOROLOGIA DE ESPAÑA", "");
    lines.push("AVISO PARA ALTA MAR", "");
    lines.push(`EMITIDO EL ${elaborado.fecha.toUpperCase()} A LAS ${hhmmToWords(elaborado.hhmm).toUpperCase()} UTC`, "");
    lines.push(`ALCANZA HASTA EL ${fin.fecha.toUpperCase()} A LAS ${hhmmToWords(fin.hhmm).toUpperCase()} UTC`, "");

    let contentFound = false;

    // 1. Zonas específicas
    if (avisoNodes.length > 0) {
        lines.push("AVISOS:");
        avisoNodes.forEach(aviso => {
            const zonaNombre = aviso.getAttribute("nombre")?.toUpperCase();
            const texto = aviso.querySelector("texto")?.textContent || "";
            if (zonaNombre && texto) {
                const cleanText = normalizeMarine(texto).toUpperCase();
                lines.push(`${zonaNombre}: ${cleanText}`);
                contentFound = true;
            }
        });
    }

    // 2. Texto general (si no se encontraron zonas o como complemento si existe)
    // AEMET a veces pone avisos generales sin zonas específicas en WONT40MM
    if (!contentFound && generalText) {
        // Ignoramos si el texto es explícitamente "NO HAY AVISOS" para usar el formato estándar abajo
        if (!generalText.toUpperCase().includes("NO HAY AVISO") && !generalText.toUpperCase().includes("NINGUNO")) {
             lines.push("AVISOS:");
             lines.push(generalText.toUpperCase());
             contentFound = true;
        }
    }

    if (!contentFound) {
        lines.push("AVISOS: NINGUNO", "", "NO HAY AVISOS.");
    }

    return lines.join("\n");
}


function formatCostero(xmlDoc: XMLDocument): string {
    const nombre = (xmlDoc.querySelector("root")?.getAttribute("nombre") || "").replace(/\.\s*$/, "");
    const elaborado = isoToFechaEnPalabras(xmlDoc.querySelector("origen > elaborado")?.textContent || "");
    const analisis = isoToFechaEnPalabras(xmlDoc.querySelector("situacion > analisis")?.textContent || "");
    const situ = normalizeMarine(xmlDoc.querySelector("situacion > texto")?.textContent || "");
    const avisoTxt = (xmlDoc.querySelector("aviso > texto")?.textContent || "").trim();
    const avisoNorm = avisoTxt ? avisoTxt.toUpperCase() + "." : "NO HAY AVISO.";

    const out = [];
    out.push("AGENCIA ESTATAL DE METEOROLOGIA DE ESPAÑA", "");
    out.push(nombre.toUpperCase(), "");
    out.push(`EMITIDO A LAS ${hhmmToWords(elaborado.hhmm).toUpperCase()} UTC DEL ${elaborado.fecha.toUpperCase()}`, "");
    out.push("AVISOS VÁLIDOS PARA LAS PRÓXIMAS 24 HORAS:");
    out.push(avisoNorm, "");
    out.push(`SITUACIÓN GENERAL A LAS ${hhmmToWords(analisis.hhmm).toUpperCase()} UTC DEL ${analisis.fecha.toUpperCase()} Y EVOLUCIÓN.`);
    out.push(situ.toUpperCase(), "", "PREDICCIÓN VÁLIDA PARA LAS PRÓXIMAS 24 HORAS:", "");

    xmlDoc.querySelectorAll("prediccion > zona").forEach(z => {
        const zname = z.getAttribute("nombre");
        const subs = z.querySelectorAll("subzona");
        if (subs.length) {
            out.push(`${zname!.toUpperCase()}:`);
            subs.forEach(sz => {
                const sname = sz.getAttribute("nombre");
                const txt = normalizeMarine(sz.querySelector("texto")?.textContent || "");
                if (sname?.trim().toUpperCase() !== zname?.trim().toUpperCase()) {
                     out.push(`${sname!.toUpperCase()}.`);
                }
                out.push(txt.toUpperCase(), "");
            });
        } else {
            const t = normalizeMarine(z.querySelector("texto")?.textContent || "");
            out.push(`${zname!.toUpperCase()}:`);
            out.push(t.toUpperCase(), "");
        }
    });

    const tend = xmlDoc.querySelector("tendencia > texto")?.textContent || "";
    if (tend) {
        out.push("TENDENCIA DE LOS AVISOS PARA LAS SIGUIENTES 24 HORAS.");
        out.push((tend.trim() + ".").toUpperCase());
    }
    return out.join("\n");
}


function parseXml(text: string): XMLDocument {
    const parser = new DOMParser();
    const doc = parser.parseFromString(text, "application/xml");
    const err = doc.querySelector("parsererror");
    if (err) throw new Error("XML inválido: " + err.textContent);
    return doc;
}
// ============================================================================
// --- COMPONENT STATE & RENDER LOGIC ---
// ============================================================================

let isFetchingMeteos = false;
let meteosIntervalId: number | undefined;
const REFRESH_INTERVAL = 30 * 60 * 1000; // 30 minutes

let processedSpanishTexts: { [key: string]: { spanish: string, error?: string } } = {};

const bulletinProcessors: { [key: string]: (doc: XMLDocument) => string } = {
    'FQNT42MM': formatAltaMar,
    'WONT40MM': formatAviso,
    'FQXX40MM': formatCostero,
    'FQXX41MM': formatCostero,
};

function renderMeteoSkeleton(): string {
    return `
        <div class="meteos-header">
            <div class="meteos-header-text">
                <h2 class="content-card-title" style="margin-bottom: 0.5rem; border: none; padding: 0;">Boletines Meteorológicos Marítimos de AEMET</h2>
                <p class="translator-desc" style="margin-bottom: 0;">Boletines formateados y traducidos. La información se actualiza automáticamente cada 30 minutos o manualmente.</p>
            </div>
            <button id="meteos-refresh-btn" class="secondary-btn" disabled>
                 <svg class="spinner" style="width: 16px; height: 16px;" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                <span>Cargando...</span>
            </button>
        </div>
        <div class="skeleton skeleton-box" style="height: 250px; margin-bottom: 2rem;"></div>
        <div class="skeleton skeleton-box" style="height: 180px; margin-bottom: 2rem;"></div>
        <div class="skeleton skeleton-box" style="height: 250px;"></div>
    `;
}

async function fetchAndProcessBulletins() {
    if (isFetchingMeteos) return;
    isFetchingMeteos = true;
    
    const meteosContent = document.getElementById('meteos-content');
    if (!meteosContent) return;
    meteosContent.innerHTML = renderMeteoSkeleton();

    const bulletinIds = ['FQNT42MM', 'WONT40MM', 'FQXX40MM', 'FQXX41MM'];
    processedSpanishTexts = {}; // Clear previous data

    try {
        const xmlResponses = await Promise.allSettled(
            bulletinIds.map(id => fetch(`/api/aemet?type=bulletin&id=${id}`).then(res => res.json()))
        );

        // 1. Process all Spanish texts
        xmlResponses.forEach((result, index) => {
            const id = bulletinIds[index];
            if (result.status === 'fulfilled' && result.value.xml) {
                try {
                    const xmlDoc = parseXml(result.value.xml);
                    processedSpanishTexts[id] = { spanish: bulletinProcessors[id](xmlDoc) };
                } catch (e) {
                    const message = e instanceof Error ? e.message : 'Error desconocido';
                    processedSpanishTexts[id] = { spanish: '', error: `Error al analizar el boletín: ${message}` };
                }
            } else {
                processedSpanishTexts[id] = { spanish: '', error: 'Error al obtener el boletín.' };
            }
        });

        // 2. Render layout with Spanish text
        renderFinalLayout(processedSpanishTexts);

    } catch (error) {
        meteosContent.innerHTML = `<p class="error">Error general al cargar los boletines.</p>`;
    } finally {
        isFetchingMeteos = false;
        const refreshBtn = document.getElementById('meteos-refresh-btn') as HTMLButtonElement;
        if (refreshBtn) {
            refreshBtn.disabled = false;
            refreshBtn.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2z"/><path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466"/></svg>
                <span>Actualizar</span>`;
        }
    }
}

async function handleTranslate(button: HTMLButtonElement) {
    const id = button.dataset.bulletinId;
    if (!id) return;

    const spanishData = processedSpanishTexts[id];
    if (!spanishData || !spanishData.spanish) {
        showToast("No hay texto en español para traducir.", "error");
        return;
    }
    
    const englishContentEl = document.getElementById(`en-content-${id}`);
    if (!englishContentEl) return;

    englishContentEl.innerHTML = `<div class="loader-container" style="padding: 1rem;"><div class="loader"></div></div>`;
    button.disabled = true;

    try {
        const response = await fetch('/api/translator', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ textToTranslate: spanishData.spanish, context: 'bulletin' })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.details || "La API de traducción falló.");
        }
        
        const result = await response.json();
        englishContentEl.innerHTML = `<pre class="bulletin-content">${result.translation}</pre>`;

    } catch (error) {
        const message = error instanceof Error ? error.message : "Error desconocido";
        englishContentEl.innerHTML = `<div class="error" style="padding: 1rem;">Error al traducir: ${message}</div>`;
        showToast(message, "error");
        button.disabled = false; // Re-enable on error
    }
}


function renderFinalLayout(data: { [key: string]: { spanish: string, error?: string } }) {
    const meteosContent = document.getElementById('meteos-content');
    if (!meteosContent) return;

    const copyButtonHTML = (cardId: string, lang: 'es' | 'en') => `
        <button class="copy-btn bulletin-copy-btn" data-card-id="${cardId}" data-lang="${lang}" aria-label="Copiar boletín">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M4 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2zm2-1a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1zM2 5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1zM2 5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-1h-1v1a.5.5 0 0 1-.5.5H2.5a.5.5 0 0 1-.5-.5V6.5a.5.5 0 0 1 .5-.5H3v-1z"/></svg>
            <span>Copiar</span>
        </button>`;

    const getHtmlForTranslatedBulletin = (id: string, title: string) => {
        const bulletinData = data[id];
        const esContent = bulletinData.error ? `<div class="error" style="padding: 1rem;">${bulletinData.error}</div>` : `<pre class="bulletin-content">${bulletinData.spanish || 'No disponible.'}</pre>`;
        const enPlaceholder = `
            <div class="meteos-progress-container" style="gap: 1rem;">
                <p class="translator-desc" style="margin-bottom: 0;">Haga clic para traducir el boletín a inglés usando IA.</p>
                <button class="secondary-btn translate-btn" data-bulletin-id="${id}">Traducir con IA</button>
            </div>
        `;
        const enContent = bulletinData.error ? `<div class="error" style="padding: 1rem;">${bulletinData.error}</div>` : enPlaceholder;
        
        return `
            <div class="bulletin-card" style="grid-column: 1 / -1;">
                <div class="bulletin-card-header"><h3>${title}</h3></div>
                <div class="bulletins-container" style="padding: 1rem; gap: 1rem;">
                    <div class="language-column">
                        <div class="bulletin-card">
                            <div class="bulletin-card-header"><h4>Español (TTS)</h4>${copyButtonHTML(id, 'es')}</div>
                            ${esContent}
                        </div>
                    </div>
                    <div class="language-column">
                        <div class="bulletin-card">
                             <div class="bulletin-card-header"><h4>Inglés</h4>${copyButtonHTML(id, 'en')}</div>
                            <div id="en-content-${id}">${enContent}</div>
                        </div>
                    </div>
                </div>
            </div>`;
    };
    
    meteosContent.innerHTML = `
        <div class="meteos-header">
             <div class="meteos-header-text">
                <h2 class="content-card-title" style="margin-bottom: 0.5rem; border: none; padding: 0;">Boletines Meteorológicos Marítimos de AEMET</h2>
                <p class="translator-desc" style="margin-bottom: 0;">Boletines formateados y traducidos. La información se actualiza automáticamente cada 30 minutos o manualmente.</p>
            </div>
            <button id="meteos-refresh-btn" class="secondary-btn">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2z"/><path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466"/></svg>
                <span>Actualizar</span>
            </button>
        </div>
        <div style="display: grid; gap: 2rem;">
            ${getHtmlForTranslatedBulletin('FQNT42MM', 'Boletín Atlántico (Alta Mar)')}
            ${getHtmlForTranslatedBulletin('WONT40MM', 'Avisos Marítimos (Alta Mar)')}
            ${getHtmlForTranslatedBulletin('FQXX40MM', 'Boletín Costero Galicia (FQXX40MM)')}
            ${getHtmlForTranslatedBulletin('FQXX41MM', 'Boletín Costero Cantábrico (FQXX41MM)')}
        </div>
    `;
}

export function renderMeteos(container: HTMLElement) {
    container.innerHTML = `<div class="content-card" id="meteos-content"></div>`;
    
    fetchAndProcessBulletins();
    
    if (meteosIntervalId) clearInterval(meteosIntervalId);
    meteosIntervalId = window.setInterval(fetchAndProcessBulletins, REFRESH_INTERVAL);

    container.addEventListener('click', e => {
        const target = e.target as HTMLElement;
        const refreshBtn = target.closest('#meteos-refresh-btn');
        if (refreshBtn && !isFetchingMeteos) {
            fetchAndProcessBulletins();
        }
        
        const translateBtn = target.closest('.translate-btn');
        if (translateBtn instanceof HTMLButtonElement) {
            handleTranslate(translateBtn);
        }

        const copyBtn = target.closest('.bulletin-copy-btn');
        if(copyBtn instanceof HTMLButtonElement) {
            const cardId = copyBtn.dataset.cardId;
            const lang = copyBtn.dataset.lang as 'es' | 'en';
            if (!cardId || !lang) return;

            let textToCopy = '';
            if (lang === 'es') {
                textToCopy = processedSpanishTexts[cardId]?.spanish || '';
            } else {
                const enContentEl = document.getElementById(`en-content-${cardId}`);
                textToCopy = enContentEl?.querySelector('pre')?.textContent || '';
            }
            
            if (textToCopy) {
                navigator.clipboard.writeText(textToCopy);
                showToast('¡Copiado!', 'success');
            } else {
                showToast('No hay contenido para copiar.', 'info');
            }
        }
    });
}
