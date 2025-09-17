import { handleCopy, showToast } from "../utils/helpers";

const REFRESH_INTERVAL = 60 * 60 * 1000; // 1 hour
let meteosIntervalId: number | null = null;
let isFetchingMeteos: boolean = false;

// ============================================================================
// --- LÓGICA DE PROCESAMIENTO DE BOLETINES (PROPORCIONADA POR EL USUARIO) ---
// ============================================================================

/* ===== Utilidades comunes ===== */
const DIR = new Map(Object.entries({
  N:"norte", S:"sur", E:"este", W:"oeste",
  NE:"noreste", NW:"noroeste", SE:"sureste", SW:"suroeste"
}));

const MESES = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];

function hhmmToWords(hhmm: string): string {
  // "HH:MM" -> "hh mm" en palabras: 08:00 -> ocho cero cero; 00:00 -> cero cero cero cero
  const m = /^(\d{2}):(\d{2})$/.exec(hhmm);
  if (!m) return hhmm;
  const h = parseInt(m[1],10), mi = parseInt(m[2],10);
  const num = (n: number): string => {
    const unidades = ["cero","uno","dos","tres","cuatro","cinco","seis","siete","ocho","nueve"];
    if (n<10) return unidades[n];
    if (n<20) return ["diez","once","doce","trece","catorce","quince","dieciséis","diecisiete","dieciocho","diecinueve"][n-10];
    if (n%10===0) return ["veinte","treinta","cuarenta","cincuenta"][n/10-2];
    const dec = ["veinti","treinta y ","cuarenta y ","cincuenta y "][Math.floor(n/10)-2];
    return Math.floor(n/10)===2 ? (dec + ["uno","dos","tres","cuatro","cinco","seis","siete","ocho","nueve"][n%10-1])
                                : (dec + ["uno","dos","tres","cuatro","cinco","seis","siete","ocho","nueve"][n%10-1]);
  };
  const H = h===0 ? "cero" : num(h);
  const M = mi===0 ? "cero cero" : (mi<10 ? "cero " + num(mi) : num(mi));
  return `${H} ${M}`;
}

function isoToFechaEnPalabras(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(+d)) return { fecha: iso, horaPalabras: '', hhmm: '' };
  const dia = d.getUTCDate();
  const mes = MESES[d.getUTCMonth()];
  const año = d.getUTCFullYear();
  const hh = String(d.getUTCHours()).padStart(2,"0");
  const mm = String(d.getUTCMinutes()).padStart(2,"0");
  return {
    fecha: `${dia} de ${mes} de ${año}`,
    horaPalabras: `${hhmmToWords(`${hh}:${mm}`)} UTC`,
    hhmm: `${hh}:${mm}`
  };
}

function expandDirs(t: string): string {
  // prioriza dobles (NE,SW,...) y luego simples
  for (const k of ["NE","NW","SE","SW","N","S","E","W"]) {
    t = t.replace(new RegExp(`\\b${k}\\b`, "g"), DIR.get(k)!);
  }
  return t;
}

function expandMar(t: string): string {
  return t
   .replace(/\bcomponente\s+([nsew])\b/gi, (_,d)=>`componente ${DIR.get(d.toUpperCase())}`)
   .replace(/\b(\d+)\s*m\b/gi, "$1 metros")
   .replace(/[º°�]\s*([NS])/gi, "° $1")
   .replace(/\báreas de mala\b/gi,"áreas de mala visibilidad")
   .replace(/anticicl[\u00f3o]n/gi,"anticiclón");
}

function beaufortPalabras(t: string): string {
  const w = (nStr: string) => {
    const mapa = ["cero","uno","dos","tres","cuatro","cinco","seis","siete","ocho","nueve","diez","once","doce"];
    const x = parseInt(nStr,10);
    return (x>=0 && x<=12) ? mapa[x] : nStr;
  };
  return t
    .replace(/\bfuerza\s+(\d+)\s+a\s+(\d+)\b/gi,(_,a,b)=>`fuerza ${w(a)} a ${w(b)}`)
    .replace(/\b(\d+)\s+a\s+(\d+)\b/g,(_,a,b)=>`${w(a)} a ${w(b)}`)
    .replace(/\b(\d+)\s*o\s*(\d+)\b/g,(_,a,b)=>`${w(a)} o ${w(b)}`)
    .replace(/\bfuerza\s+(\d+)\b/gi,(_,a)=>`fuerza ${w(a)}`);
}

function presionesMilibares(t: string): string {
  return t
    .replace(/(\b\d{3,4}\b)(?=[^\d]*(rellen|y|\.|,|$))/gi, "$1 milibares");
}

function tidy(t: string): string {
  return t.replace(/\s+/g," ").replace(/\s*;\s*/g,". ").replace(/:\s*/g,". ").replace(/\.\s*\./g,". ").trim();
}

function normalizeMarine(text: string): string {
  let t = text;
  t = expandDirs(t);
  t = expandMar(t);
  t = beaufortPalabras(t);
  t = presionesMilibares(t);
  t = tidy(t);
  if (!/[.!?]$/.test(t)) t += ".";
  return t;
}

function formatAltaMar(xmlDoc: XMLDocument): string {
  const root = xmlDoc.querySelector("root");
  const nombre = (root?.getAttribute("nombre")||"").replace(/30N/i,"30° norte");
  const elaborado = isoToFechaEnPalabras(xmlDoc.querySelector("origen > elaborado")?.textContent||"");
  const inicio = isoToFechaEnPalabras(xmlDoc.querySelector("origen > inicio")?.textContent||"");
  const fin = isoToFechaEnPalabras(xmlDoc.querySelector("origen > fin")?.textContent||"");
  const situ = normalizeMarine(xmlDoc.querySelector("situacion > texto")?.textContent||"");

  const out: string[] = [];
  out.push("Agencia Estatal de Meteorología de España.");
  if (nombre) out.push(`${nombre}.`);
  out.push(`Elaborado el ${elaborado.fecha} a las ${elaborado.horaPalabras}.`);
  out.push(`Válido desde el ${inicio.fecha} a las ${inicio.horaPalabras} hasta el ${fin.fecha} a las ${fin.horaPalabras}.`);
  out.push(`Situación general. ${situ}`);

  xmlDoc.querySelectorAll("prediccion > zona").forEach(z=>{
    const zname = z.getAttribute("nombre");
    const ztxt = normalizeMarine(z.querySelector("texto")?.textContent||"");
    out.push(`${zname}. ${ztxt}`);
  });
  return out.join("\n");
}

function formatAviso(xmlDoc: XMLDocument): string {
  const elaborado = isoToFechaEnPalabras(xmlDoc.querySelector("origen > elaborado")?.textContent||"");
  const fin = isoToFechaEnPalabras(xmlDoc.querySelector("origen > fin")?.textContent||"");
  const lines: string[] = [];
  lines.push("AGENCIA ESTATAL DE METEOROLOGIA DE ESPAÑA", "");
  lines.push("AVISO PARA ALTA MAR", "");
  lines.push("EMITIDO EL " + `${elaborado.fecha.toUpperCase()} A LAS ${hhmmToWords(elaborado.hhmm).toUpperCase()} UTC`, "");
  lines.push("ALCANZA HASTA EL " + `${fin.fecha.toUpperCase()} A LAS ${hhmmToWords(fin.hhmm).toUpperCase()} UTC`, "");
  lines.push("AVISOS: NINGUNO", "", "NO HAY AVISOS.");
  return lines.join("\n");
}

function formatCostero(xmlDoc: XMLDocument): string {
  const nombre = (xmlDoc.querySelector("root")?.getAttribute("nombre")||"").replace(/\.\s*$/,"");
  const elaborado = isoToFechaEnPalabras(xmlDoc.querySelector("origen > elaborado")?.textContent||"");
  const analisis = isoToFechaEnPalabras(xmlDoc.querySelector("situacion > analisis")?.textContent||"");
  const situ = normalizeMarine(xmlDoc.querySelector("situacion > texto")?.textContent||"");
  const avisoTxt = (xmlDoc.querySelector("aviso > texto")?.textContent||"").trim();
  const avisoNorm = avisoTxt ? avisoTxt.toUpperCase() + "." : "NO HAY AVISO.";

  const out: string[] = [];
  out.push("AGENCIA ESTATAL DE METEOROLOGIA DE ESPAÑA", "");
  out.push(nombre.toUpperCase(), "");
  out.push(`EMITIDO A LAS ${hhmmToWords(elaborado.hhmm).toUpperCase()} UTC DEL ${elaborado.fecha.toUpperCase()}`, "");
  out.push("AVISOS VÁLIDOS PARA LAS PRÓXIMAS 24 HORAS:");
  out.push(avisoNorm, "");
  out.push(`SITUACIÓN GENERAL A LAS ${hhmmToWords(analisis.hhmm).toUpperCase()} UTC DEL ${analisis.fecha.toUpperCase()} Y EVOLUCIÓN.`);
  out.push(situ.toUpperCase(), "", "PREDICCIÓN VÁLIDA PARA LAS PRÓXIMAS 24 HORAS:", "");

  xmlDoc.querySelectorAll("prediccion > zona").forEach(z=>{
    const zname = z.getAttribute("nombre");
    const subs = z.querySelectorAll("subzona");
    if (subs.length) {
      out.push(`${zname!.toUpperCase()}:`);
      subs.forEach(sz=>{
        const sname = sz.getAttribute("nombre");
        const txt = normalizeMarine(sz.querySelector("texto")?.textContent||"");
        out.push(`${sname!.toUpperCase()}.`);
        out.push(txt.toUpperCase(), "");
      });
    } else {
      const t = normalizeMarine(z.querySelector("texto")?.textContent||"");
      out.push(`${zname!.toUpperCase()}:`);
      out.push(t.toUpperCase(), "");
    }
  });

  const tend = xmlDoc.querySelector("tendencia > texto")?.textContent || "";
  if (tend) {
    out.push("TENDENCIA DE LOS AVISOS PARA LAS SIGUIENTES 24 HORAS.");
    out.push((tend + ".").toUpperCase());
  }
  return out.join("\n");
}

function parseXml(text: string): XMLDocument {
    const doc = new DOMParser().parseFromString(text, "application/xml");
    const err = doc.querySelector("parsererror");
    if (err) throw new Error("XML inválido: " + err.textContent);
    return doc;
}

// ============================================================================
// --- LÓGICA DE TRADUCCIÓN ---
// ============================================================================
const translationDict: { [key: string]: string } = {
    'norte': 'north', 'sur': 'south', 'este': 'east', 'oeste': 'west',
    'noreste': 'northeast', 'noroeste': 'northwest', 'sureste': 'southeast', 'suroeste': 'southwest',
    'fuerza': 'force', 'variable': 'variable', 'componente': 'component',
    'mar de fondo': 'swell', 'del': 'from the', 'de': 'of',
    'metros': 'meters', 'olas': 'waves', 'mar': 'sea', 'rizada': 'rippled',
    'marejadilla': 'slight sea', 'marejada': 'moderate sea', 'fuerte marejada': 'rough sea',
    'gruesa': 'very rough sea', 'muy gruesa': 'high sea',
    'visibilidad': 'visibility', 'buena': 'good', 'regular': 'moderate', 'mala': 'poor',
    'niebla': 'fog', 'aguaceros': 'showers', 'chubascos': 'squalls',
    'ocasionalmente': 'occasionally', 'principalmente': 'mainly',
    'disminuyendo': 'decreasing', 'arreciando': 'increasing', 'rolando': 'veering',
    'a': 'to', 'y': 'and', 'o': 'or', 'con': 'with',
    'cero': 'zero', 'uno': 'one', 'dos': 'two', 'tres': 'three', 'cuatro': 'four',
    'cinco': 'five', 'seis': 'six', 'siete': 'seven', 'ocho': 'eight', 'nueve': 'nine',
    'diez': 'ten', 'once': 'eleven', 'doce': 'twelve',
    'enero': 'January', 'febrero': 'February', 'marzo': 'March', 'abril': 'April',
    'mayo': 'May', 'junio': 'June', 'julio': 'July', 'agosto': 'August',
    'septiembre': 'September', 'octubre': 'October', 'noviembre': 'November', 'diciembre': 'December',
    'agencia estatal de meteorología de españa': 'Spanish State Meteorological Agency',
    'elaborado el': 'Issued on', 'a las': 'at', 'válido desde el': 'Valid from',
    'hasta el': 'until', 'situación general': 'General situation',
    'predicción': 'forecast', 'aviso para alta mar': 'Gale warning for High Seas',
    'emitido el': 'issued on', 'alcanza hasta el': 'valid until', 'avisos': 'warnings',
    'ninguno': 'none', 'no hay avisos': 'no warnings in force',
    'boletín meteorológico y marino': 'Weather and sea bulletin', 'para las zonas costeras': 'for the coastal areas',
    'avisos válidos para las próximas 24 horas': 'Warnings valid for the next 24 hours',
    'situación general a las': 'General situation at', 'y evolución': 'and evolution',
    'predicción válida para las próximas 24 horas': 'Forecast valid for the next 24 hours',
    'tendencia de los avisos para las siguientes 24 horas': 'Trend for the next 24 hours',
    'aguas costeras': 'coastal waters', 'no hay predicción disponible': 'No forecast available',
    'anticiclón': 'anticyclone', 'baja': 'low', 'rellenándose': 'filling', 'milibares': 'millibars',
    'zonas del atlántico al norte de': 'Atlantic areas north of',
};

function translateText(text: string): string {
    const regex = new RegExp(Object.keys(translationDict).sort((a,b) => b.length - a.length).join('|'), 'gi');
    return text.replace(regex, (matched) => translationDict[matched.toLowerCase()] || matched);
}

// --- STATE MANAGEMENT ---
interface BulletinState {
    id: string; title: string; url: string; fetchKey: string;
    rawContent: string | null;
    processedEsContent: string | null;
    processedEnContent: string | null;
    status: 'idle' | 'loading' | 'done' | 'error';
    error: string | null;
    processor: (doc: XMLDocument) => string;
}

let bulletinStates: Record<string, BulletinState> = {
    'main': { id: 'main', title: 'Boletín Atlántico (FQNT42MM)', url: '/api/meteos', fetchKey: 'rawXml', rawContent: null, processedEsContent: null, processedEnContent: null, status: 'idle', error: null, processor: formatAltaMar },
    'warnings': { id: 'warnings', title: 'Avisos Marítimos (WONT40MM)', url: '/api/main-warnings', fetchKey: 'rawXml', rawContent: null, processedEsContent: null, processedEnContent: null, status: 'idle', error: null, processor: formatAviso },
    'coastal_galicia': { id: 'coastal_galicia', title: 'Costero Galicia (FQXX40MM)', url: '/api/warnings', fetchKey: 'rawGalicia', rawContent: null, processedEsContent: null, processedEnContent: null, status: 'idle', error: null, processor: formatCostero },
    'coastal_cantabrico': { id: 'coastal_cantabrico', title: 'Costero Cantábrico (FQXX41MM)', url: '/api/warnings', fetchKey: 'rawCantabrico', rawContent: null, processedEsContent: null, processedEnContent: null, status: 'idle', error: null, processor: formatCostero },
};

// --- RENDERING LOGIC ---

const renderBulletinCard = (state: BulletinState) => {
    let esContent = '', enContent = '';
    switch (state.status) {
        case 'loading':
            esContent = `<div class="skeleton skeleton-text" style="height: 12em;"></div>`;
            enContent = esContent;
            break;
        case 'error':
            esContent = `<span style="color: var(--danger-color)">Error: ${state.error}</span>`;
            enContent = esContent;
            break;
        case 'done':
            esContent = state.processedEsContent || 'No disponible.';
            enContent = state.processedEnContent || 'No disponible.';
            break;
        default:
            esContent = 'Esperando para cargar...'; enContent = esContent;
    }

    return `
        <div class="bulletins-container">
            <div class="language-column">
                <div class="bulletin-card">
                    <div class="bulletin-card-header">
                        <h3>Español (TTS)</h3>
                        <button class="bulletin-copy-btn" data-lang="es" aria-label="Copiar en español" ${!state.processedEsContent ? 'disabled' : ''}>Copiar</button>
                    </div>
                    <pre class="bulletin-content">${esContent}</pre>
                </div>
            </div>
            <div class="language-column">
                 <div class="bulletin-card">
                    <div class="bulletin-card-header">
                        <h3>Inglés</h3>
                        <button class="bulletin-copy-btn" data-lang="en" aria-label="Copiar en inglés" ${!state.processedEnContent ? 'disabled' : ''}>Copiar</button>
                    </div>
                    <pre class="bulletin-content">${enContent}</pre>
                </div>
            </div>
        </div>
    `;
};

const renderMeteosLayout = () => `
    <div class="meteos-header">
        <div class="meteos-header-text">
            <h2 class="content-card-title" style="margin-bottom: 0.5rem; border: none; padding: 0;">Boletines Meteorológicos Marítimos de AEMET</h2>
            <p class="translator-desc" style="margin-bottom: 0;">Boletines formateados, traducidos y optimizados.</p>
        </div>
        <button id="meteos-refresh-btn" class="secondary-btn">
             <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2z"/><path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466"/></svg>
            <span>Actualizar</span>
        </button>
    </div>
    <div class="bulletins-grid" style="display: grid; grid-template-columns: 1fr; gap: 2rem;">
        ${Object.values(bulletinStates).map(state => `
            <div class="content-card" style="padding: 1.5rem;" data-bulletin-id="${state.id}">
                <h3 style="font-size: 1.1rem; margin-bottom: 1rem;">${state.title}</h3>
                <div class="card-content-wrapper">${renderBulletinCard(state)}</div>
            </div>
        `).join('')}
    </div>
`;

// --- DATA FETCHING & PROCESSING ---
const updateCard = (id: string) => {
    const wrapper = document.querySelector(`.content-card[data-bulletin-id="${id}"] .card-content-wrapper`);
    if (wrapper) {
        wrapper.innerHTML = renderBulletinCard(bulletinStates[id]);
    }
};

async function fetchAndProcessData() {
    if (isFetchingMeteos) return;
    isFetchingMeteos = true;
    
    document.querySelector<HTMLButtonElement>('#meteos-refresh-btn')?.setAttribute('disabled', 'true');
    Object.keys(bulletinStates).forEach(k => { bulletinStates[k].status = 'loading'; });
    
    const meteosContent = document.getElementById('meteos-content');
    if (meteosContent) meteosContent.innerHTML = renderMeteosLayout();

    await Promise.allSettled(Object.values(bulletinStates).map(async (state) => {
        try {
            const response = await fetch(state.url);
            if (!response.ok) throw new Error(`Error ${response.status} de AEMET`);
            const data = await response.json();
            
            state.rawContent = data[state.fetchKey];
            if (!state.rawContent) throw new Error("Respuesta de AEMET vacía.");

            const xmlDoc = parseXml(state.rawContent);
            state.processedEsContent = state.processor(xmlDoc);
            state.processedEnContent = translateText(state.processedEsContent);
            state.status = 'done';
        } catch (e) {
            state.status = 'error';
            state.error = e instanceof Error ? e.message : "Error desconocido.";
            console.error(`Error processing ${state.id}:`, e);
        } finally {
            updateCard(state.id);
        }
    }));

    isFetchingMeteos = false;
    document.querySelector<HTMLButtonElement>('#meteos-refresh-btn')?.removeAttribute('disabled');
}

// --- INITIALIZATION ---
export function renderMeteos(container: HTMLElement) {
    container.innerHTML = `<div id="meteos-content"></div>`;
    fetchAndProcessData();
    if (meteosIntervalId) clearInterval(meteosIntervalId);
    meteosIntervalId = window.setInterval(fetchAndProcessData, REFRESH_INTERVAL);

    container.addEventListener('click', e => {
        const target = e.target as HTMLElement;
        const refreshBtn = target.closest('#meteos-refresh-btn');
        if (refreshBtn && !isFetchingMeteos) {
            fetchAndProcessData();
        }

        const copyBtn = target.closest<HTMLButtonElement>('.bulletin-copy-btn');
        if (copyBtn) {
            const card = copyBtn.closest<HTMLElement>('.content-card');
            const bulletinId = card?.dataset.bulletinId;
            const lang = copyBtn.dataset.lang as 'es' | 'en';
            if (bulletinId && lang) {
                const state = bulletinStates[bulletinId];
                const contentToCopy = lang === 'es' ? state.processedEsContent : state.processedEnContent;
                if (contentToCopy) handleCopy(contentToCopy);
                else showToast("No hay contenido para copiar.", "error");
            }
        }
    });
}
