import { QUICK_REFERENCE_DATA, PHONE_DIRECTORY_DATA } from "../data";
import { debounce, initializeInfoTabs, showToast } from "../utils/helpers";

export function renderInfo(container: HTMLElement) {
    const fullQuickRefData = [...QUICK_REFERENCE_DATA];
    fullQuickRefData[0] = { category: 'Buscador MMSI', content: `
        <div class="mmsi-searcher">
            <h3 class="reference-table-subtitle">Buscador Inteligente de Buques por MMSI (OSINT)</h3>
            <p class="translator-desc">Introduzca un MMSI (Identidad del Servicio Móvil Marítimo) de 9 dígitos para buscar información pública del buque utilizando IA para consultar bases de datos oficiales y de seguimiento.</p>
            <form id="mmsi-search-form" class="simulator-form" style="max-width: none;">
                <input type="text" id="mmsi-search-input" class="simulator-input" placeholder="Introduzca MMSI de 9 dígitos..." pattern="[0-9]{9}" title="Debe ser un número de 9 dígitos." required>
                <button id="mmsi-search-btn" class="simulator-btn" type="submit">Buscar</button>
            </form>
            <div id="mmsi-result-container">
                 <p class="drill-placeholder">Introduzca un MMSI para comenzar la búsqueda.</p>
            </div>
        </div>
    `};
    fullQuickRefData[1] = { category: 'Directorio', content: `
        <h3 class="reference-table-subtitle">Directorio Telefónico Marítimo</h3>
        <input type="search" id="phone-search-input" class="phone-directory-search" placeholder="Buscar por nombre, centro, etc.">
        <div id="phone-directory-list" class="phone-directory-list">
            <!-- Phone entries will be rendered here by JS -->
        </div>
    `};
    fullQuickRefData[2] = { category: 'Frecuencias', content: `
        <h3 class="reference-table-subtitle">Canales VHF</h3>
        <div class="vhf-tables-container">
            <table class="reference-table">
                <caption class="header-coruna">CCR LA CORUÑA (002241022)</caption>
                <thead><tr><th>EECC</th><th>Canal Retevisión</th><th>Canal Sasemar</th></tr></thead>
                <tbody>
                    <tr><td>Pasajes</td><td>27</td><td>6</td></tr>
                    <tr><td>Bilbao</td><td>26</td><td>74</td></tr>
                    <tr><td>Santander</td><td>24</td><td>72</td></tr>
                    <tr><td>Cabo Peñas</td><td>27</td><td>6</td></tr>
                    <tr><td>Navia</td><td>62</td><td>74</td></tr>
                    <tr><td>Cabo Ortegal</td><td>2</td><td>72</td></tr>
                    <tr><td>Coruña</td><td>26</td><td>6</td></tr>
                    <tr><td>Finisterre</td><td>22</td><td>74</td></tr>
                    <tr><td>Vigo</td><td>20</td><td>6</td></tr>
                    <tr><td>La Guardia</td><td>82</td><td>72</td></tr>
                </tbody>
            </table>
            <table class="reference-table">
                <caption class="header-valencia">CCR VALENCIA (002241024)</caption>
                <thead><tr><th>EECC</th><th>Canal Retevisión</th><th>Canal Sasemar</th></tr></thead>
                <tbody>
                    <tr><td>Cabo de Gata</td><td>24</td><td>72</td></tr>
                    <tr><td>Melilla</td><td>25</td><td>6</td></tr>
                    <tr><td>Cartagena</td><td>27</td><td>6</td></tr>
                    <tr><td>Cabo la Nao</td><td>85</td><td>74</td></tr>
                    <tr><td>Castellón</td><td>28</td><td>72</td></tr>
                    <tr><td>Tarragona</td><td>24</td><td>6</td></tr>
                    <tr><td>Barcelona</td><td>60</td><td>74</td></tr>
                    <tr><td>Begur</td><td>23</td><td>6</td></tr>
                    <tr><td>Cadaqués</td><td>27</td><td>72</td></tr>
                    <tr><td>Menorca</td><td>85</td><td>6</td></tr>
                    <tr><td>Palma</td><td>7</td><td>72</td></tr>
                    <tr><td>Ibiza</td><td>3</td><td>6</td></tr>
                </tbody>
            </table>
            <table class="reference-table">
                <caption class="header-laspalmas">CCR LAS PALMAS (002241026)</caption>
                <thead><tr><th>EECC</th><th>Canal Retevisión</th><th>Canal Sasemar</th></tr></thead>
                <tbody>
                    <tr><td>Huelva</td><td>26</td><td>6</td></tr>
                    <tr><td>Cádiz</td><td>28</td><td>74</td></tr>
                    <tr><td>Tarifa</td><td>83</td><td>6</td></tr>
                    <tr><td>Málaga</td><td>26</td><td>72</td></tr>
                    <tr><td>Motril</td><td>81</td><td>74</td></tr>
                    <tr><td>La Palma</td><td>20</td><td>6</td></tr>
                    <tr><td>Hierro</td><td>23</td><td>74</td></tr>
                    <tr><td>Gomera</td><td>24</td><td>6</td></tr>
                    <tr><td>Tenerife</td><td>27</td><td>72</td></tr>
                    <tr><td>Las Palmas</td><td>26</td><td>74</td></tr>
                    <tr><td>Fuerteventura</td><td>22</td><td>6</td></tr>
                    <tr><td>Yaiza</td><td>3</td><td>74</td></tr>
                    <tr><td>Arrecife</td><td>25</td><td>72</td></tr>
                    <tr><td>Restinga</td><td>2</td><td>72</td></tr>
                    <tr><td>Garafía</td><td>60</td><td>74</td></tr>
                </tbody>
            </table>
        </div>
    `};
    fullQuickRefData[3] = { category: 'Alfabeto Fonético', content: `
        <table class="reference-table">
            <thead><tr><th>Letra</th><th>Código</th><th>Letra</th><th>Código</th></tr></thead>
            <tbody>
                <tr><td>A</td><td>Alfa</td><td>N</td><td>November</td></tr>
                <tr><td>B</td><td>Bravo</td><td>O</td><td>Oscar</td></tr>
                <tr><td>C</td><td>Charlie</td><td>P</td><td>Papa</td></tr>
                <tr><td>D</td><td>Delta</td><td>Q</td><td>Quebec</td></tr>
                <tr><td>E</td><td>Echo</td><td>R</td><td>Romeo</td></tr>
                <tr><td>F</td><td>Foxtrot</td><td>S</td><td>Sierra</td></tr>
                <tr><td>G</td><td>Golf</td><td>T</td><td>Tango</td></tr>
                <tr><td>H</td><td>Hotel</td><td>U</td><td>Uniform</td></tr>
                <tr><td>I</td><td>India</td><td>V</td><td>Victor</td></tr>
                <tr><td>J</td><td>Juliett</td><td>W</td><td>Whiskey</td></tr>
                <tr><td>K</td><td>Kilo</td><td>X</td><td>X-ray</td></tr>
                <tr><td>L</td><td>Lima</td><td>Y</td><td>Yankee</td></tr>
                <tr><td>M</td><td>Mike</td><td>Z</td><td>Zulu</td></tr>
            </tbody>
        </table>`
    };
    fullQuickRefData[4] = { category: 'Códigos Q', content: `
        <table class="reference-table">
            <thead><tr><th>Código</th><th>Significado</th></tr></thead>
            <tbody>
                <tr><td>QTH</td><td>¿Cuál es su posición? / Mi posición es...</td></tr>
                <tr><td>QSO</td><td>¿Puede comunicar con...? / Puedo comunicar con...</td></tr>
                <tr><td>QRZ</td><td>¿Quién me llama? / Le llama...</td></tr>
                <tr><td>QRT</td><td>¿Debo cesar la transmisión? / Cese la transmisión.</td></tr>
                <tr><td>QRV</td><td>¿Está usted listo? / Estoy listo.</td></tr>
                <tr><td>QSL</td><td>¿Puede acusar recibo? / Acuso recibo.</td></tr>
                <tr><td>QSY</td><td>¿Debo cambiar de frecuencia? / Cambie a la frecuencia...</td></tr>
            </tbody>
        </table>`
    };
    fullQuickRefData[5] = { category: 'Escalas', content: `
        <h3 class="reference-table-subtitle">Escala Beaufort / Beaufort Wind Scale</h3>
        <table class="reference-table">
            <thead>
                <tr>
                    <th>Fuerza</th>
                    <th>Denominación / Designation</th>
                    <th>Nudos</th>
                    <th>Estado del Mar / Sea State</th>
                </tr>
            </thead>
            <tbody>
                <tr><td>0</td><td>Calma / Calm</td><td>&lt; 1</td><td>Espejo / Like a mirror</td></tr>
                <tr><td>1</td><td>Ventolina / Light air</td><td>1-3</td><td>Rizos / Ripples</td></tr>
                <tr><td>2</td><td>Brisa muy débil / Light breeze</td><td>4-6</td><td>Olas pequeñas / Small wavelets</td></tr>
                <tr><td>3</td><td>Brisa débil / Gentle breeze</td><td>7-10</td><td>Borreguillos dispersos / Scattered white horses</td></tr>
                <tr><td>4</td><td>Brisa moderada / Moderate breeze</td><td>11-16</td><td>Borreguillos frecuentes / Frequent white horses</td></tr>
                <tr><td>5</td><td>Brisa fresca / Fresh breeze</td><td>17-21</td><td>Olas moderadas, muchos borreguillos / Moderate waves, many white horses</td></tr>
                <tr><td>6</td><td>Brisa fuerte / Strong breeze</td><td>22-27</td><td>Olas grandes, crestas rompientes / Large waves, white foam crests</td></tr>
                <tr><td>7</td><td>Viento fuerte / Near gale</td><td>28-33</td><td>Mar gruesa, espuma en vetas / Sea heaps up, foam in streaks</td></tr>
                <tr><td>8</td><td>Temporal / Gale</td><td>34-40</td><td>Mar muy gruesa, rompientes / Moderately high waves, breaking crests</td></tr>
                <tr><td>9</td><td>Temporal fuerte / Strong gale</td><td>41-47</td><td>Mar arbolada, visibilidad reducida / High waves, reduced visibility</td></tr>
                <tr><td>10</td><td>Temporal duro / Storm</td><td>48-55</td><td>Mar muy arbolada, superficie blanca / Very high waves, surface white</td></tr>
                <tr><td>11</td><td>Temporal muy duro / Violent storm</td><td>56-63</td><td>Mar montañosa, visibilidad muy mala / Exceptionally high waves, poor visibility</td></tr>
                <tr><td>12</td><td>Huracán / Hurricane</td><td>&gt; 64</td><td>Mar excepcional, aire lleno de espuma / Air filled with foam and spray</td></tr>
            </tbody>
        </table>
        <h3 class="reference-table-subtitle">Escala Douglas / Douglas Sea Scale</h3>
        <table class="reference-table">
            <thead>
                <tr>
                    <th>Grado</th>
                    <th>Descripción / Description</th>
                    <th>Altura de Olas (m) / Wave Height (m)</th>
                </tr>
            </thead>
            <tbody>
                <tr><td>0</td><td>Calma / Calm</td><td>0</td></tr>
                <tr><td>1</td><td>Mar rizada / Rippled</td><td>0 - 0.1</td></tr>
                <tr><td>2</td><td>Mar llana / Smooth</td><td>0.1 - 0.5</td></tr>
                <tr><td>3</td><td>Marejadilla / Slight</td><td>0.5 - 1.25</td></tr>
                <tr><td>4</td><td>Marejada / Moderate</td><td>1.25 - 2.5</td></tr>
                <tr><td>5</td><td>Fuerte marejada / Rough</td><td>2.5 - 4</td></tr>
                <tr><td>6</td><td>Mar gruesa / Very rough</td><td>4 - 6</td></tr>
                <tr><td>7</td><td>Mar muy gruesa / High</td><td>6 - 9</td></tr>
                <tr><td>8</td><td>Mar arbolada / Very high</td><td>9 - 14</td></tr>
                <tr><td>9</td><td>Mar montañosa / Phenomenal</td><td>&gt; 14</td></tr>
            </tbody>
        </table>
        `
    };
    fullQuickRefData[6] = { category: 'Calculadora', content: `
        <div class="coord-converter">
            <h3 class="reference-table-subtitle">Conversor de Coordenadas</h3>
            <p class="translator-desc">Introduzca un par de coordenadas (Latitud y Longitud) para convertirlas al formato estándar <strong>gg° mm,ddd' N/S ggg° mm,ddd' E/W</strong>. Use espacios como separadores.</p>
            <div class="converter-form">
                <textarea id="coord-input" class="styled-textarea" rows="2" placeholder="Ej: 43 21 30.5 N 008 25 15 W\nEj: 43 21.5 N 008 25.2 W\nEj: 43.358 -8.420"></textarea>
                <button id="coord-convert-btn" class="primary-btn">Convertir</button>
            </div>
            <div id="coord-result" class="translation-result" aria-live="polite"></div>
        </div>
    `};
    fullQuickRefData[7] = { category: 'Diccionario', content: `
        <div class="nautical-translator">
            <h3 class="reference-table-subtitle">Traductor Náutico (IA)</h3>
            <p class="translator-desc">Traduce términos o frases cortas entre español e inglés.</p>
            <textarea id="translator-input" class="styled-textarea" rows="3" placeholder="Ej: virar por avante"></textarea>
            <button id="translator-btn" class="primary-btn">Traducir</button>
            <div id="translator-result" class="translation-result"></div>
        </div>
        <h3 class="reference-table-subtitle">Términos Comunes / Common Terms</h3>
        <table class="reference-table">
             <thead><tr><th>Español</th><th>Inglés</th></tr></thead>
             <tbody>
                <tr><td>Babor</td><td>Port</td></tr>
                <tr><td>Estribor</td><td>Starboard</td></tr>
                <tr><td>Proa</td><td>Bow</td></tr>
                <tr><td>Popa</td><td>Stern</td></tr>
                <tr><td>Barlovento</td><td>Windward</td></tr>
                <tr><td>Sotavento</td><td>Leeward</td></tr>
                <tr><td>Nudo</td><td>Knot</td></tr>
                <tr><td>Ancla</td><td>Anchor</td></tr>
                <tr><td>Timón</td><td>Rudder</td></tr>
                <tr><td>Deriva</td><td>Leeway / Drift</td></tr>
                <tr><td>Rumbo</td><td>Heading / Course</td></tr>
                <tr><td>Escora</td><td>Heel / List</td></tr>
             </tbody>
        </table>
        `
    };

    container.innerHTML = `
        <div class="content-card">
            <div class="info-nav-tabs">
                 ${fullQuickRefData.map((item, index) => `
                    <button class="info-nav-btn ${index === 0 ? 'active' : ''}" data-target="ref-tab-${index}">
                        ${item.category}
                    </button>
                `).join('')}
            </div>
            <main class="info-content">
                ${fullQuickRefData.map((item, index) => `
                    <div class="sub-tab-panel ${index === 0 ? 'active' : ''}" id="ref-tab-${index}">
                       ${item.content}
                    </div>
                `).join('')}
            </main>
        </div>
    `;
    initializeInfoTabs(container);
    initializeMmsiSearcher();
    initializePhoneDirectory();
    initializeNauticalTranslator();
    initializeCoordinateConverter();
}

function renderMmsiResults(data: any, container: HTMLElement) {
    const { vesselInfo: details, sources } = data;
    const na = 'No disponible';

    if (!details) {
        container.innerHTML = `<p class="drill-placeholder">No se pudo obtener la información del buque.</p>`;
        return;
    }
    
    const detailsMap: Record<string, string | null | undefined> = {
        'MMSI': details.mmsi,
        'Indicativo': details.callSign,
        'IMO': details.imo,
        'Bandera': details.flag
    };

    const characteristicsMap: Record<string, string | null | undefined> = {
        'Eslora': details.length,
        'Manga': details.beam,
        'Arqueo Bruto': details.grossTonnage,
    };
    
    const voyageMap: Record<string, string | null | undefined> = {
        'Última Posición': details.lastPosition,
        'Timestamp': details.positionTimestamp,
        'Destino': details.currentVoyage?.destination,
        'ETA': details.currentVoyage?.eta,
        'Estado': details.currentVoyage?.status,
    };

    const createGridItems = (map: Record<string, string | null | undefined>) => {
        let html = '';
        for (const [label, value] of Object.entries(map)) {
            if (value) {
                html += `
                <div class="mmsi-detail-item">
                    <span>${label}</span>
                    <strong>${value}</strong>
                </div>`;
            }
        }
        return html;
    };
    
    const keyDetailsHtml = createGridItems(detailsMap);
    const characteristicsHtml = createGridItems(characteristicsMap);
    const voyageHtml = createGridItems(voyageMap);

    container.innerHTML = `
        <div class="mmsi-result-card">
            <h4 class="mmsi-result-title">
                ${details.stationName || 'Nombre Desconocido'}
            </h4>
            <div class="mmsi-detail-item" style="grid-column: 1 / -1; background-color: var(--bg-card); border: none; padding-left: 0; padding-top: 0; margin-bottom: 1rem;">
                <span style="background: var(--accent-color); color: white; padding: .2em .5em; border-radius: 4px; font-size: .8em; font-weight: 500;">${details.stationType || na}</span>
            </div>
            
            ${details.summary ? `
                <div class="mmsi-summary">
                    <p>${details.summary}</p>
                </div>
            ` : ''}

            ${keyDetailsHtml ? `
                <h5 class="reference-table-subtitle" style="margin-top:0;">Datos Principales</h5>
                <div class="mmsi-details-grid">${keyDetailsHtml}</div>
            ` : ''}

            ${characteristicsHtml ? `
                <h5 class="reference-table-subtitle">Características</h5>
                <div class="mmsi-details-grid">${characteristicsHtml}</div>
            ` : ''}

            ${voyageHtml ? `
                <h5 class="reference-table-subtitle">Último Viaje</h5>
                <div class="mmsi-details-grid">${voyageHtml}</div>
            ` : ''}

            ${(sources && sources.length > 0) ? `
            <div class="mmsi-sources">
                <h5>Fuentes Consultadas</h5>
                <ul class="mmsi-sources-list">
                    ${sources.map((s: any) => `<li><a href="${s.web.uri}" target="_blank" rel="noopener noreferrer">${s.web.title || s.web.uri}</a></li>`).join('')}
                </ul>
            </div>` : ''}
        </div>
    `;
}


async function initializeMmsiSearcher() {
    const form = document.getElementById('mmsi-search-form') as HTMLFormElement;
    const input = document.getElementById('mmsi-search-input') as HTMLInputElement;
    const button = document.getElementById('mmsi-search-btn') as HTMLButtonElement;
    const resultsContainer = document.getElementById('mmsi-result-container') as HTMLDivElement;
    if (!form || !input || !button || !resultsContainer) return;

    const skeletonHtml = `
        <div class="mmsi-result-card">
            <div class="skeleton skeleton-title" style="width: 60%; height: 2em; margin-bottom: 1rem;"></div>
            <div class="skeleton skeleton-text" style="width: 90%; margin-bottom: 0.5rem;"></div>
            <div class="skeleton skeleton-text" style="width: 80%; margin-bottom: 2rem;"></div>
            <h5 class="reference-table-subtitle" style="margin-top:0; margin-bottom: 1rem;"><div class="skeleton skeleton-text" style="width: 30%; height: 1.2em;"></div></h5>
            <div class="mmsi-details-grid">
                ${Array(4).fill('<div class="skeleton skeleton-box" style="height: 4em;"></div>').join('')}
            </div>
            <h5 class="reference-table-subtitle" style="margin-bottom: 1rem;"><div class="skeleton skeleton-text" style="width: 40%; height: 1.2em;"></div></h5>
            <div class="mmsi-details-grid">
                ${Array(3).fill('<div class="skeleton skeleton-box" style="height: 4em;"></div>').join('')}
            </div>
        </div>`;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const mmsi = input.value.trim();
        if (!/^\d{9}$/.test(mmsi)) {
            showToast("Por favor, introduzca un MMSI válido de 9 dígitos.", "error");
            return;
        }

        resultsContainer.innerHTML = skeletonHtml;
        button.disabled = true;

        try {
            const response = await fetch('/api/mmsi-search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mmsi })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.details || 'La API devolvió un error.');
            }

            const data = await response.json();
            
            if (data.error) {
                 resultsContainer.innerHTML = `<p class="drill-placeholder">${data.error.replace('${mmsi}', mmsi)}</p>`;
            } else if (data.vesselInfo) {
                renderMmsiResults(data, resultsContainer);
            } else {
                resultsContainer.innerHTML = `<p class="drill-placeholder">No se encontró información para el MMSI ${mmsi}.</p>`;
            }

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Error al realizar la búsqueda";
            resultsContainer.innerHTML = `<p class="error">${errorMessage}</p>`;
            showToast(errorMessage, 'error');
        } finally {
            button.disabled = false;
        }
    });
}


function initializePhoneDirectory() {
    const searchInput = document.getElementById('phone-search-input') as HTMLInputElement | null;
    const listContainer = document.getElementById('phone-directory-list') as HTMLDivElement | null;
    
    if (!searchInput || !listContainer) return;

    const renderList = (filter = '') => {
        const searchTerm = filter.toLowerCase().trim();
        const filteredData = searchTerm === '' ? PHONE_DIRECTORY_DATA : PHONE_DIRECTORY_DATA.filter(entry => 
            entry.name.toLowerCase().includes(searchTerm) ||
            entry.phones.some(p => p.includes(searchTerm)) ||
            (entry.email && entry.email.toLowerCase().includes(searchTerm)) ||
            entry.keywords.some(k => k.toLowerCase().includes(searchTerm))
        );

        if (filteredData.length === 0) {
            listContainer.innerHTML = `<p class="drill-placeholder">No se encontraron resultados.</p>`;
            return;
        }
        const phoneIcon = `<svg viewBox="0 0 16 16"><path d="M3.654 1.328a.678.678 0 0 0-1.015-.063L1.605 2.3c-.483.484-.661 1.169-.45 1.77a17.568 17.568 0 0 0 4.168 6.608 17.569 17.569 0 0 0 6.608 4.168c.601.211 1.286.033 1.77-.45l1.034-1.034a.678.678 0 0 0-.063-1.015l-2.307-1.794a.678.678 0 0 0-.58-.122l-2.19.547a1.745 1.745 0 0 1-1.657-.459L5.482 8.062a1.745 1.745 0 0 1-.46-1.657l.548-2.19a.678.678 0 0 0-.122-.58L3.654 1.328zM1.884.511a1.745 1.745 0 0 1 2.612.163L6.29 2.98c.329.423.445.974.315 1.494l-.547 2.19a.678.678 0 0 0 .178.643l2.457 2.457a.678.678 0 0 0 .644.178l2.189-.547a1.745 1.745 0 0 1 1.494.315l2.306 1.794c.829.645.905 1.87.163 2.611l-1.034 1.034c-.74.74-1.846 1.065-2.877.702a18.634 18.634 0 0 1-7.01-4.42 18.634 18.634 0 0 1-4.42-7.009c-.362-1.03-.037-2.137.703-2.877L1.885.511z"/></svg>`;
        const faxIcon = `<svg viewBox="0 0 16 16"><path d="M2 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2zm10-1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1M4 5.5a.5.5 0 0 0 .5.5h7a.5.5 0 0 0 0-1h-7a.5.5 0 0 0-.5.5M4 8a.5.5 0 0 0 .5.5h7a.5.5 0 0 0 0-1h-7A.5.5 0 0 0 4 8m0 2.5a.5.5 0 0 0 .5.5h4a.5.5 0 0 0 0-1h-4a.5.5 0 0 0-.5.5"/></svg>`;
        const emailIcon = `<svg viewBox="0 0 16 16"><path d="M.05 3.555A2 2 0 0 1 2 2h12a2 2 0 0 1 1.95 1.555L8 8.414zM0 4.697v7.104l5.803-3.558zM6.761 8.83l-6.57 4.027A2 2 0 0 0 2 14h12a2 2 0 0 0 1.808-1.144l-6.57-4.027L8 9.586zm3.436-.586L16 11.801V4.697z"/></svg>`;

        listContainer.innerHTML = filteredData.map(entry => `
            <div class="phone-entry-card">
                <div class="phone-entry-header">
                     <h4 class="phone-entry-name">${entry.name}</h4>
                </div>
                <div class="phone-entry-contact-grid">
                    ${entry.phones.map(p => `<div class="phone-entry-contact-item">${phoneIcon}<span>${p}</span></div>`).join('')}
                    ${entry.fax ? `<div class="phone-entry-contact-item">${faxIcon}<span>${entry.fax}</span></div>` : ''}
                    ${entry.email ? `<div class="phone-entry-contact-item">${emailIcon}<a href="mailto:${entry.email}">${entry.email}</a></div>` : ''}
                </div>
            </div>
        `).join('');
    };

    searchInput.addEventListener('input', debounce(() => renderList(searchInput.value), 300));
    
    // Initial render
    renderList();
}

// --- COORDINATE CONVERTER LOGIC ---
function initializeCoordinateConverter() {
    const convertBtn = document.getElementById('coord-convert-btn') as HTMLButtonElement;
    const inputEl = document.getElementById('coord-input') as HTMLTextAreaElement;
    const resultEl = document.getElementById('coord-result') as HTMLDivElement;

    if (!convertBtn || !inputEl || !resultEl) return;

    const parseToDD = (input: string): number => {
        let str = input.trim().toUpperCase();
        str = str.replace(/,/g, '.');
        str = str.replace(/[°'"]/g, ' ');

        const parts = str.split(/[\s]+/).filter(p => p.length > 0);

        const hemisphere = parts.find(p => /^[NSEW]$/.test(p));
        const numbers = parts
            .filter(p => !/^[NSEW]$/.test(p))
            .map(p => parseFloat(p));

        if (numbers.some(isNaN) || numbers.length === 0 || numbers.length > 3) {
            return NaN;
        }

        let dd = 0;
        if (numbers.length === 3) { // DMS
            dd = Math.abs(numbers[0]) + numbers[1] / 60 + numbers[2] / 3600;
        } else if (numbers.length === 2) { // DDM
            dd = Math.abs(numbers[0]) + numbers[1] / 60;
        } else { // DD
            dd = numbers[0];
        }

        if (hemisphere && /[SW]/.test(hemisphere)) {
            dd = -Math.abs(dd);
        } else if (hemisphere && /[NE]/.test(hemisphere)) {
            dd = Math.abs(dd);
        } else if (numbers.length === 1 && numbers[0] < 0) {
            dd = numbers[0];
        }

        return dd;
    };

    const parseCoordinatePair = (input: string): { lat: number | null, lon: number | null } => {
        let latStr = '';
        let lonStr = '';
        const upperInput = input.trim().toUpperCase();

        const nsIndex = upperInput.search(/[NS]/);
        const ewIndex = upperInput.search(/[EW]/);

        if (nsIndex > -1 && ewIndex > -1) {
            if (nsIndex < ewIndex) { // Lat Lon order e.g. "40N 70W"
                latStr = upperInput.substring(0, nsIndex + 1);
                lonStr = upperInput.substring(nsIndex + 1);
            } else { // Lon Lat order e.g. "70W 40N"
                lonStr = upperInput.substring(0, ewIndex + 1);
                latStr = upperInput.substring(ewIndex + 1);
            }
        } else {
            const parts = input.trim().replace(/,/g, '.').split(/[\s,;]+/).filter(p => p.length > 0);
            if (parts.length >= 2) {
                latStr = parts[0];
                lonStr = parts[1];
            } else {
                return { lat: null, lon: null };
            }
        }

        const lat = parseToDD(latStr.trim());
        const lon = parseToDD(lonStr.trim());

        return { lat: isNaN(lat) ? null : lat, lon: isNaN(lon) ? null : lon };
    };

    const formatToDDM = (dd: number, isLon: boolean): { text: string, error: boolean } => {
        if (isNaN(dd)) return { text: 'Formato inválido.', error: true };

        if (isLon && (dd < -180 || dd > 180)) {
            return { text: 'Longitud fuera de rango (-180 a 180).', error: true };
        }
        if (!isLon && (dd < -90 || dd > 90)) {
            return { text: 'Latitud fuera de rango (-90 a 90).', error: true };
        }

        const hemisphere = isLon ? (dd >= 0 ? 'E' : 'W') : (dd >= 0 ? 'N' : 'S');
        const absDd = Math.abs(dd);
        const degrees = Math.floor(absDd);
        const minutes = (absDd - degrees) * 60;

        const degStr = isLon ? String(degrees).padStart(3, '0') : String(degrees).padStart(2, '0');
        const minutesWithDecimal = minutes.toFixed(3);
        const [intMin, decMin] = minutesWithDecimal.split('.');
        const formattedMinutes = intMin.padStart(2, '0');

        return { text: `${degStr}° ${formattedMinutes},${decMin}' ${hemisphere}`, error: false };
    };

    convertBtn.addEventListener('click', () => {
        const input = inputEl.value;
        if (!input.trim()) {
            resultEl.innerHTML = '';
            return;
        }

        const coords = parseCoordinatePair(input);

        if (coords.lat === null || coords.lon === null) {
            resultEl.innerHTML = `<p class="error">Formato no reconocido. Por favor, introduzca latitud y longitud. Ejemplo: 43 21.5 N 008 25.2 W</p>`;
            return;
        }

        const latResult = formatToDDM(coords.lat, false);
        const lonResult = formatToDDM(coords.lon, true);

        let htmlResult = '';
        if (latResult.error) {
            htmlResult += `<p class="error"><strong>Latitud:</strong> ${latResult.text}</p>`;
        } else {
            htmlResult += `<p><strong>Latitud:</strong> ${latResult.text}</p>`;
        }

        if (lonResult.error) {
            htmlResult += `<p class="error"><strong>Longitud:</strong> ${lonResult.text}</p>`;
        } else {
            htmlResult += `<p><strong>Longitud:</strong> ${lonResult.text}</p>`;
        }

        resultEl.innerHTML = htmlResult;
    });
}

async function initializeNauticalTranslator() {
    const translateBtn = document.getElementById('translator-btn') as HTMLButtonElement;
    const inputEl = document.getElementById('translator-input') as HTMLTextAreaElement;
    const resultEl = document.getElementById('translator-result') as HTMLDivElement;
    if (!translateBtn || !inputEl || !resultEl) return;

    const skeletonHtml = `<div class="skeleton skeleton-text"></div><div class="skeleton skeleton-text"></div>`;

    translateBtn.addEventListener('click', async () => {
        const textToTranslate = inputEl.value.trim();
        if (!textToTranslate) {
            showToast("El texto no puede estar vacío.", "error");
            return;
        }
        resultEl.innerHTML = skeletonHtml;
        resultEl.classList.add('loading');
        translateBtn.disabled = true;

        try {
            const apiResponse = await fetch('/api/translator', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ textToTranslate })
            });

            if (!apiResponse.ok) {
                const errorData = await apiResponse.json();
                throw new Error(errorData.details || 'La API devolvió un error.');
            }

            const data = await apiResponse.json();
            resultEl.innerHTML = `<p>${data.translation}</p>`;

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Error al traducir";
            resultEl.innerHTML = `<p class="error">${errorMessage}</p>`;
            showToast(errorMessage, 'error');
        } finally {
            translateBtn.disabled = false;
            resultEl.classList.remove('loading');
        }
    });
}