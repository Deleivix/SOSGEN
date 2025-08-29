/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

// --- DATA STRUCTURES ---
interface Template { title: string; template: string; }
interface Category { category: string; items: Template[]; }
interface QuickRef { category: string; content: string; }
interface PhoneEntry { name: string; phones: string[]; fax?: string; email?: string; keywords: string[]; }
interface Page { name: string; contentRenderer: (container: HTMLElement) => void; }

const NEW_LOGO_SVG = `<svg class="nav-logo" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path fill="#2D8B8B" d="M50,10 A40,40 0 1 1 50,90 A40,40 0 1 1 50,10 M50,18 A32,32 0 1 0 50,82 A32,32 0 1 0 50,18"></path><path fill="white" d="M50,22 A28,28 0 1 1 50,78 A28,28 0 1 1 50,22"></path><path fill="#8BC34A" d="M50,10 A40,40 0 0 1 90,50 L82,50 A32,32 0 0 0 50,18 Z"></path><path fill="#F7F9FA" d="M10,50 A40,40 0 0 1 50,10 L50,18 A32,32 0 0 0 18,50 Z"></path><path fill="#2D8B8B" d="M50,90 A40,40 0 0 1 10,50 L18,50 A32,32 0 0 0 50,82 Z"></path><path fill="white" d="M90,50 A40,40 0 0 1 50,90 L50,82 A32,32 0 0 0 82,50 Z"></path></svg>`;

const APP_PAGE_ICONS = [
    // SOSGEN: Lifebuoy
    `<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><circle cx="12"cy="12" r="4"></circle><line x1="4.93" y1="4.93" x2="9.17" y2="9.17"></line><line x1="14.83" y1="14.83" x2="19.07" y2="19.07"></line><line x1="14.83" y1="9.17" x2="19.07" y2="4.93"></line><line x1="4.93" y1="19.07" x2="9.17" y2="14.83"></line></svg>`,
    // Registro Océano: Clipboard
    `<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>`,
    // PROTOCOLO: Network/Flowchart
    `<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>`,
    // SEÑALES: Lighthouse Icon
    `<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L6 8v12h12V8L12 2z"/><path d="M6 14h12"/><path d="M10 18h4v-4h-4v4z"/><path d="M2 5l4 3"/><path d="M22 5l-4 3"/></svg>`,
    // SIMULACRO: Target
    `<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle></svg>`,
    // BITÁCORA: Book
    `<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>`,
    // INFO: Info circle
    `<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`,
];

const REGISTRO_OCEANO_DATA: Category[] = [
    {
        category: 'Programados',
        items: [
          { title: 'Entrada de guardia', template: 'Entrada de guardia, como Back Office Technician, gestionando “OWP-0X” en el “CCR XXXXX”, “turno de XXXX”.' },
          { title: 'Salida de guardia', template: 'Salida de guardia.' },
          { title: 'Comprobación de equipos', template: 'Realizada comprobación de equipos (banda), así como líneas telefónicas, DIVOS, Servicio Navtex, Grafana, AISWeb, NIMBUS y Service Desk. Resultado del check.' },
          { title: 'Documentación', template: 'Documentación turno de “TURNO”.' },
        ],
      },
      {
        category: 'Transmisiones',
        items: [
            { title: 'Transmisión programada WX Aguas Costeras', template: 'Realizada transmisión programada de Información Meteorológica y Marina para Aguas Costeras de “Añadir zona”, vía canales de trabajo de las Estaciones Costeras correspondientes, previo aviso en canal 16.' },
            { title: 'Transmisión programada WX Alta Mar', template: 'Realizada transmisión programada de Información Meteorológica y Marina para Alta Mar, zonas de “Añadir zona”, vía frecuencias de trabajo de las Estaciones Costeras correspondientes, previo aviso en 2.182kHz.' },
            { title: 'Transmisión programada NR', template: 'Realizada transmisión programada de Radioavisos en vigor, vía estaciones costeras correspondientes, previo anuncio en canal 16/2.182kHz.' },
            { title: 'Transmisión eventual WX', template: 'Realizada transmisión eventual de Información Meteorológica y Marina para “Añadir zona”, solicitada por el buque/embarcación “Nombre/CallSign”, vía canal/es de trabajo de la/s Estación/es Costera/s de “Añadir EECC”.' },
            { title: 'Transmisión eventual NR', template: 'Realizada transmisión eventual del Radiaviso “NR-XXXX/XXXX”, vía canales/frecuencias de trabajo de las Estaciones Costeras correspondientes, previa llamada selectiva digital (canal 70/2.187,5kHz), y anuncio en (canal16/2.182kHz).' },
            { title: 'Transmisión eventual de NR por petición de Sasemar', template: 'Realizada transmisión eventual del Radiaviso “NR-XXXX/XXXX” (TTT), vía canales/frecuencias de trabajo de las Estaciones Costeras correspondientes, previa llamada selectiva digital (canal 70/2.187,5kHz), y anuncio en (canal16/2.182kHz).' },
            { title: 'Transmisión AT', template: 'Realizada transmisión de Aviso de Temporal “AT-XXXX-XXXX”, vía frecuencias de trabajo de las Estaciones Costeras correspondientes, previa llamada selectiva digital (2.187,5kHz), y anuncio en 2.182kHz.' },
            { title: 'Transmisión Fenómenos Adversos', template: 'Realizada transmisión de Boletín de Fenómenos Adversos de Nivel “XXXXX”, en vigor para Aguas Costeras de “Añadir zona”, vía canales de trabajo de las Estaciones Costeras correspondientes, previa llamada selectiva digital (canal 70), y anuncio en canal 16.' }
        ]
      },
      { category: 'Radiocheck', items: [ { title: 'Formato Radiocheck', template: `Embarcación: “Nombre/Callsign”\nPosición: “Latitud-Longitud/Puerto”\nVía de contacto: “Tipo de comunicación, Estación Costera y canal”\nResultado TX: “1/5,…,5/5”\nResultado RX: “1/5,…,5/5”` } ] },
      { category: 'Otros', items: [ { title: 'Reorganización del Servicio', template: 'Por contingencias, se reorganiza el servicio en el “CCR que transfiere” hacia el “CCR que asume transferencia” en turno de “Añadir turno”.' } ] }
];

const PHONE_DIRECTORY_DATA: PhoneEntry[] = [
    { name: 'CNCS', phones: ['917 559 132', '917 559 133', '917 559 138', '608 229 010'], fax: '915 26 14 40', email: 'cncs@sasemar.es', keywords: ['madrid', 'nacional'] },
    { name: 'RADIOAVISOS', phones: ['917 559 191'], fax: '917 55 91 92', email: 'radioavisos.cncs@sasemar.es', keywords: ['navtex', 'avisos'] },
    { name: 'CCS BILBAO', phones: ['944 839 286', '944 837 053', '690 608 803'], fax: '944 83 91 61', email: 'bilbao@sasemar.es', keywords: ['bizkaia', 'euskadi'] },
    { name: 'CCS SANTANDER', phones: ['942 21 30 60', '942 21 30 30', '690 615 645', '609 430 310'], fax: '942 21 36 38', email: 'santander@sasemar.es', keywords: ['cantabria'] },
    { name: 'CCS GIJÓN', phones: ['985 326 050', '985 326 373', '985 300 475', '690 634 123', '629 837 682'], fax: '985 32 09 08', email: 'gijon@sasemar.es', keywords: ['asturias'] },
    { name: 'CCS A CORUÑA', phones: ['981 209 548', '981 270 405', '606 195 875'], fax: '981 20 95 18', email: 'coruna@sasemar.es', keywords: ['galicia'] },
    { name: 'CCS FINISTERRE', phones: ['981 767 738', '981 767 320', '981 767 500', '690 607 377'], fax: '981 76 77 40', email: 'finisterre@sasemar.es', keywords: ['galicia'] },
    { name: 'CCS VIGO', phones: ['986 228 874', '986 222 230', '630 347 746'], fax: '986 22 89 57', email: 'vigo@sasemar.es', keywords: ['galicia', 'pontevedra'] },
    { name: 'CCS HUELVA', phones: ['959 243 000', '959 243 061'], fax: '959 24 21 03', email: 'huelva@sasemar.es', keywords: ['andalucia'] },
    { name: 'CCS CÁDIZ', phones: ['956 214 253', '690 633 848'], fax: '956 22 60 91', email: 'cadiz@sasemar.es', keywords: ['andalucia'] },
    { name: 'SASEMAR GUARDIA', phones: ['911 832 906', '618 890 423'], email: 'apsi@sasemar.es', keywords: ['guardia'] },
    { name: 'Antonio Beltrán García', phones: ['917 559 195'], email: 'antoniobg@sasemar.es', keywords: ['sasemar', 'persona'] },
    { name: 'José Ramón Vico García', phones: [], email: 'jramonvg@sasemar.es', keywords: ['sasemar', 'persona'] },
    { name: 'Francisco Maceiras Tajes', phones: ['981 767 500', '619 403 749'], email: 'franciscomt@sasemar.es', keywords: ['sasemar', 'persona'] },
    { name: 'CCS TARIFA', phones: ['956 684 757', '956 684 740', '956 681 452'], fax: '956 68 06 06', email: 'tarifa@sasemar.es', keywords: ['andalucia', 'estrecho'] },
    { name: 'CCS ALGECIRAS', phones: ['956 580 930', '956 580 035'], fax: '956 58 54 02', email: 'algeciras@sasemar.es', keywords: ['andalucia'] },
    { name: 'CCS ALMERÍA', phones: ['950 275 477', '950 270 715', '950 271 726'], fax: '950 27 04 02', email: 'almeria@sasemar.es', keywords: ['andalucia'] },
    { name: 'CCS CARTAGENA', phones: ['968 505 366', '968 529 594', '968 529 517'], fax: '968 52 97 48', email: 'cartagena@sasemar.es', keywords: ['murcia'] },
    { name: 'CCS VALENCIA', phones: ['963 679 204', '963 679 302'], fax: '963 67 94 03', email: 'valencia@sasemar.es', keywords: ['comunidad valenciana'] },
    { name: 'CCS CASTELLÓN', phones: ['964 737 202', '964 737 187'], fax: '964 73 71 05', email: 'castellon@sasemar.es', keywords: ['comunidad valenciana'] },
    { name: 'CCS TARRAGONA', phones: ['977 216 203', '977 216 215'], fax: '977 21 62 09', email: 'tarragona@sasemar.es', keywords: ['cataluña'] },
    { name: 'CCS BARCELONA', phones: ['932 234 759', '932 234 748'], fax: '932 23 46 13', email: 'barcelona@sasemar.es', keywords: ['cataluña'] },
    { name: 'CCS PALMA', phones: ['971 724 562'], fax: '971 72 83 52', email: 'palma@sasemar.es', keywords: ['baleares', 'mallorca'] },
    { name: 'CCS TENERIFE', phones: ['922 597 551', '922 597 550'], fax: '922 59 73 31', email: 'tenerife@sasemar.es', keywords: ['canarias'] },
    { name: 'CCS LAS PALMAS', phones: ['928 467 955', '928 467 965', '928 467 757', '618 068 005'], fax: '928 46 77 60', email: 'laspalmas@sasemar.es', keywords: ['canarias', 'gran canaria'] }
];

const QUICK_REFERENCE_DATA: QuickRef[] = [
    { category: 'Directorio', content: `...` },
    { category: 'Frecuencias', content: `...` },
    { category: 'Alfabeto Fonético', content: `...` },
    { category: 'Códigos Q', content: `...` },
    { category: 'Escalas', content: `...` },
    { category: 'Calculadora', content: `...` },
    { category: 'Diccionario', content: `...` }
];

const pageRenderStatus: { [key: number]: boolean } = {};


// --- RENDER FUNCTIONS ---
function renderRegistroOceano(container: HTMLElement) {
    container.innerHTML = `
        <div class="content-card">
            <div class="registro-oceano-layout">
                <aside class="ro-sidebar">
                    ${REGISTRO_OCEANO_DATA.map((category, index) => `
                        <button class="sub-nav-btn ${index === 0 ? 'active' : ''}" data-target="sub-tab-${category.category.replace(/\s+/g, '-')}">
                            ${category.category}
                        </button>
                    `).join('')}
                </aside>
                <main class="ro-content">
                    ${REGISTRO_OCEANO_DATA.map((category, index) => `
                        <div class="sub-tab-panel ${index === 0 ? 'active' : ''}" id="sub-tab-${category.category.replace(/\s+/g, '-')}">
                            ${category.items.map(item => `
                                    <div class="template-card">
                                        <div class="template-card-header">
                                            <h3 class="template-card-title">${item.title}</h3>
                                            <button class="copy-btn" aria-label="Copiar ${item.title}">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M4 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2zm2-1a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1zM2 5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-1h-1v1a.5.5 0 0 1-.5.5H2.5a.5.5 0 0 1-.5-.5V6.5a.5.5 0 0 1 .5-.5H3v-1z"/></svg>
                                                <span>Copiar</span>
                                            </button>
                                        </div>
                                        <div contenteditable="true" class="template-card-body">${item.template}</div>
                                    </div>`).join('')}
                        </div>
                    `).join('')}
                </main>
            </div>
        </div>
    `;
    initializeRegistroOceano(container);
}

function renderInfo(container: HTMLElement) {
    const fullQuickRefData = [...QUICK_REFERENCE_DATA];
    fullQuickRefData[0] = { category: 'Directorio', content: `
        <h3 class="reference-table-subtitle">Directorio Telefónico Marítimo</h3>
        <input type="search" id="phone-search-input" class="phone-directory-search" placeholder="Buscar por nombre, centro, etc.">
        <div id="phone-directory-list" class="phone-directory-list">
            <!-- Phone entries will be rendered here by JS -->
        </div>
    `};
    fullQuickRefData[1] = { category: 'Frecuencias', content: `
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
    fullQuickRefData[2] = { category: 'Alfabeto Fonético', content: `
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
    fullQuickRefData[3] = { category: 'Códigos Q', content: `
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
    fullQuickRefData[4] = { category: 'Escalas', content: `
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
    fullQuickRefData[5] = { category: 'Calculadora', content: `
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
    fullQuickRefData[6] = { category: 'Diccionario', content: `
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
    initializePhoneDirectory();
    initializeNauticalTranslator();
    initializeCoordinateConverter();
}

function renderProtocolo(container: HTMLElement) {
    container.innerHTML = `
        <div class="content-card">
            <h2 class="content-card-title">Asistente de Protocolo GMDSS</h2>
            <div id="gmdss-wizard">
                <div class="wizard-step active" data-step="start">
                    <h3 class="wizard-question">Inicio: Alerta o llamada de socorro recibida (HF, MF, VHF)</h3>
                    <p>Este asistente le guiará a través del procedimiento estándar para gestionar una alerta de socorro.</p>
                    <div class="wizard-options">
                        <button class="wizard-btn" data-next="step1">Comenzar Procedimiento</button>
                    </div>
                </div>

                <div class="wizard-step" data-step="step1">
                    <h3 class="wizard-question">1. ¿La alerta es VÁLIDA?</h3>
                    <div class="wizard-options">
                        <button class="wizard-btn" data-next="step2">Sí, es Válida</button>
                        <button class="wizard-btn" data-next="result-invalid">No, es Inválida</button>
                    </div>
                </div>

                <div class="wizard-step" data-step="step2">
                    <h3 class="wizard-question">2. ¿La alerta VÁLIDA contiene POSICIÓN?</h3>
                    <div class="wizard-options">
                        <button class="wizard-btn" data-next="step3">Sí, tiene Posición</button>
                        <button class="wizard-btn" data-next="step4">No, sin Posición</button>
                    </div>
                </div>

                <div class="wizard-step" data-step="step3">
                    <h3 class="wizard-question">3. ¿La alerta con POSICIÓN está dentro de la ZONA SAR?</h3>
                    <div class="wizard-options">
                        <button class="wizard-btn" data-next="result-pos-in-sar">Sí, en Zona SAR (VHF/MF/HF)</button>
                        <button class="wizard-btn" data-next="step3a">No, fuera de Zona SAR</button>
                    </div>
                </div>
                
                <div class="wizard-step" data-step="step3a">
                    <h3 class="wizard-question">3a. ¿La alerta (fuera de Zona SAR) se recibió por VHF?</h3>
                    <div class="wizard-options">
                        <button class="wizard-btn" data-next="result-pos-out-sar-vhf">Sí, por VHF</button>
                        <button class="wizard-btn" data-next="result-pos-out-sar-mfhf">No, por MF/HF</button>
                    </div>
                </div>

                <div class="wizard-step" data-step="step4">
                    <h3 class="wizard-question">4. ¿La alerta SIN POSICIÓN se recibió por VHF?</h3>
                    <div class="wizard-options">
                        <button class="wizard-btn" data-next="result-no-pos-vhf">Sí, por VHF</button>
                        <button class="wizard-btn" data-next="result-no-pos-mfhf">No, por MF/HF</button>
                    </div>
                </div>

                <!-- RESULTADOS -->
                <div class="wizard-step" data-step="result-invalid"><div class="procedure-box"><h3>Procedimiento para Alerta NO VÁLIDA (9.1.4)</h3><ol><li>CCR SÓLO ACUSE DE RECIBO (ACK) SI ESTÁ EN ZONA SAR.</li><li>CCR A LA ESCUCHA, INTENTA CONSEGUIR MÁS INFORMACIÓN.</li><li>SI SE CONFIRMA LA ALERTA, SE PASA AL CASO CORRESPONBIENTE DE ALERTA VÁLIDA.</li></ol></div></div>
                <div class="wizard-step" data-step="result-pos-in-sar"><div class="procedure-box"><h3>Procedimiento: Válida, con Posición, en Zona SAR (VHF/MF/HF)</h3><ol><li>CCR ACUSE DE RECIBO (ACK).</li><li>VERIFICA POSICIÓN (En puerto no retransmite alerta).</li><li>CCR RETRANSMITE ALERTA.</li><li>CCR A LA ESCUCHA. ESPERA INSTRUCCIONES DEL CCS COORDINADOR.</li><li><b>OCEANO:</b> SAR AUTOMÁTICO CCR E CNCS -> SÓLO VHF.</li></ol></div></div>
                <div class="wizard-step" data-step="result-pos-out-sar-vhf"><div class="procedure-box"><h3>Procedimiento: Válida, con Posición, fuera de Zona SAR (VHF)</h3><ol><li>CCR NO ACUSE DE RECIBO (NO ACK).</li><li>CCR A LA ESCUCHA A LA ESPERA DE INSTRUCCIONES DEL CNCS.</li><li><b>OCEANO:</b> SAR AUTOMÁTICO CCR E CNCS -> Sin texto de mensaje.</li></ol></div></div>
                <div class="wizard-step" data-step="result-pos-out-sar-mfhf"><div class="procedure-box"><h3>Procedimiento: Válida, con Posición, fuera de Zona SAR (MF/HF)</h3><ol><li>CCR NO ACUSE DE RECIBO (NO ACK).</li><li>CCR A LA ESCUCHA A LA ESPERA DE INSTRUCCIONES DEL CNCS.</li></ol></div></div>
                <div class="wizard-step" data-step="result-no-pos-vhf"><div class="procedure-box"><h3>Procedimiento: Válida, sin Posición (VHF) (9.1.2)</h3><ol><li>CCR ACUSE DE RECIBO (ACK).</li><li>CCR INTENTA CONSEGUIR POSICIÓN (En puerto no retransmite alerta).</li><li>CCR RETRANSMITE ALERTA.</li><li>CCR A LA ESCUCHA. ESPERA INSTRUCCIONES DEL CCS COORDINADOR.</li></ol></div></div>
                <div class="wizard-step" data-step="result-no-pos-mfhf"><div class="procedure-box"><h3>Procedimiento: Válida, sin Posición (MF/HF) (9.1.3)</h3><ol><li>CCR NO ACUSE DE RECIBO (NO ACK).</li><li>CCR A LA ESCUCHA. Y A LA ESPERA DE INSTRUCCIONES.</li></ol></div></div>

                <div class="wizard-controls">
                    <button class="wizard-restart-btn">Reiniciar Procedimiento</button>
                </div>
            </div>
        </div>
    `;
    initializeGmdssWizard();
}

function renderSimulacro(container: HTMLElement) {
    container.innerHTML = `
        <div class="content-card">
             <h2 class="content-card-title">Simulador de Casos Prácticos GMDSS</h2>
             <div class="drill-container">
                 <div class="drill-actions">
                     <button class="primary-btn" data-drill-type="dsc">Simulacro DSC (IA)</button>
                     <button class="primary-btn" data-drill-type="radiotelephony">Simulacro Radiotelefonía (IA)</button>
                 </div>
                 <div id="drill-loader" class="loader-container" style="display: none;"><div class="loader"></div></div>
                 <div id="drill-content" class="drill-content">
                     <p class="drill-placeholder">Seleccione un tipo de simulacro para comenzar.</p>
                 </div>
             </div>
        </div>
    `;
    initializeSimulacro();
}


function renderMaritimeSignalsSimulator(container: HTMLElement) {
    container.innerHTML = `
        <div class="content-card">
            <h2 class="content-card-title">Simulador de Señales Marítimas</h2>
            <div class="info-nav-tabs">
                <button class="info-nav-btn active" data-target="simulator-tab-lighthouse">Faros</button>
                <button class="info-nav-btn" data-target="simulator-tab-buoy">Boyas y Marcas</button>
            </div>
            
            <div id="simulator-tab-lighthouse" class="sub-tab-panel active">
                <div class="simulator-display">
                    <form id="lighthouse-simulator-form" class="simulator-form" aria-label="Simulador de faros">
                        <input type="text" id="lighthouse-char-input" class="simulator-input" placeholder="Ej: Gp Oc(2+1) W 15s" required aria-label="Característica de la luz">
                        <button type="submit" class="simulator-btn">Simular</button>
                    </form>
                    <div class="lighthouse-schematic" aria-hidden="true">
                        <div class="lighthouse-tower"></div>
                        <div class="lighthouse-top">
                            <div id="lighthouse-light" class="lighthouse-light"></div>
                        </div>
                    </div>
                    <div id="lighthouse-simulation-info" class="simulation-info" aria-live="polite">
                        <p>Introduzca la característica de una luz y pulse "Simular".</p>
                    </div>
                </div>
            </div>

            <div id="simulator-tab-buoy" class="sub-tab-panel">
                 <div id="buoy-simulator-controls">
                    <div id="buoy-region-selector" style="display: none;">
                        <span>Región</span>
                        <input type="checkbox" id="buoy-region-input">
                        <label for="buoy-region-input" class="buoy-region-toggle"></label>
                    </div>
                    <div id="buoy-category-selector" class="buoy-selector-group"></div>
                    <div id="buoy-type-selector" class="buoy-selector-group"></div>
                </div>
                <div class="simulator-display">
                    <div class="buoy-visuals-container">
                        <div id="buoy-schematic-container"></div>
                        <div id="buoy-light-container">
                            <div id="buoy-light" class="buoy-light-el"></div>
                            <p>Luz / Light</p>
                        </div>
                    </div>
                    <div id="buoy-info-panel" class="simulation-info" aria-live="polite">
                        <p>Seleccione un tipo de señal para comenzar la simulación.</p>
                    </div>
                </div>
            </div>
        </div>
    `;
    initializeInfoTabs(container); // Re-use the tab switching logic
    initializeLighthouseSimulator();
    initializeBuoySimulator();
}

function renderSosgen(container: HTMLElement) {
    container.innerHTML = `
        <div class="page-banner">
            <h1 class="banner-title">
                ${NEW_LOGO_SVG.replace('nav-logo', 'banner-logo')}
                <span>SOSGEN</span>
            </h1>
            <p class="banner-subtitle">Convierte descripciones de emergencias marítimas en mensajes MAYDAY RELAY estandarizados para comunicaciones radio costeras oficiales.</p>
        </div>
        <div class="content-card">
            <h2 class="content-card-title">Información de Socorro</h2>
            <textarea id="sosgen-input" class="styled-textarea" rows="6" placeholder="Ej: Desde Coruña Radio, coordinado por MRCC Finisterre: Buque 'Aurora' (MMSI 224123456) con 5 POB tiene una vía de agua en 43°21'N 008°25'W."></textarea>
            <button id="sosgen-generate-btn" class="primary-btn">Generar Mensaje</button>
            <div id="sosgen-results" class="sosgen-results"></div>
        </div>
    `;
    initializeSosgen();
}

function renderBitacora(container: HTMLElement) {
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

const APP_PAGES: Page[] = [
    { name: 'SOSGEN', contentRenderer: renderSosgen },
    { name: 'Registro Océano', contentRenderer: renderRegistroOceano },
    { name: 'PROTOCOLO', contentRenderer: renderProtocolo },
    { name: 'SEÑALES', contentRenderer: renderMaritimeSignalsSimulator },
    { name: 'SIMULACRO', contentRenderer: renderSimulacro },
    { name: 'BITÁCORA', contentRenderer: renderBitacora },
    { name: 'INFO', contentRenderer: renderInfo },
];

function switchToPage(pageIndex: number) {
    document.querySelectorAll('.nav-link').forEach(btn => btn.classList.remove('active'));
    const navLink = document.querySelector(`.nav-link[data-page-index="${pageIndex}"]`);
    if (navLink) {
        navLink.classList.add('active');
    }

    document.querySelectorAll('.page-panel').forEach(panel => panel.classList.remove('active'));
    const activePanel = document.getElementById(`page-${pageIndex}`) as HTMLElement;
    if (activePanel) {
        activePanel.classList.add('active');
        if (!pageRenderStatus[pageIndex]) {
            APP_PAGES[pageIndex].contentRenderer(activePanel);
            pageRenderStatus[pageIndex] = true;
        }
    }
}


function renderApp(container: HTMLElement) {
    const navHtml = `
        <nav>
            <div class="nav-top"></div>
            <div class="nav-bottom">
                <div class="nav-brand" style="cursor: pointer;" title="Ir a la página principal de SOSGEN">
                    ${NEW_LOGO_SVG}
                    <span>SOSGEN</span>
                </div>
                <div class="nav-links-container">
                    ${APP_PAGES.map((page, index) => `
                        <button class="nav-link ${index === 0 ? 'active' : ''}" data-page-index="${index}" title="${page.name}">
                            ${APP_PAGE_ICONS[index]}
                            <span class="nav-link-text">${page.name}</span>
                        </button>
                    `).join('')}
                </div>
                <div class="theme-switcher">
                     <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M8 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM8 0a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 0zm0 13a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 13zm8-5a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2a.5.5 0 0 1 .5.5zM3 8a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2A.5.5 0 0 1 3 8zm10.657-5.657a.5.5 0 0 1 0 .707l-1.414 1.415a.5.5 0 1 1-.707-.708l1.414-1.414a.5.5 0 0 1 .707 0zm-9.193 9.193a.5.5 0 0 1 0 .707L3.05 13.657a.5.5 0 0 1-.707-.707l1.414-1.414a.5.5 0 0 1 .707 0zm9.193 2.121a.5.5 0 0 1-.707 0l-1.414-1.414a.5.5 0 0 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .707zM4.464 4.465a.5.5 0 0 1-.707 0L2.343 3.05a.5.5 0 1 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .708z"/></svg>
                    <input type="checkbox" id="theme-toggle">
                    <label for="theme-toggle" class="theme-switcher-label"></label>
                     <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M6 .278a.768.768 0 0 1 .08.858 7.208 7.208 0 0 0-.878 3.46c0 4.021 3.278 7.277 7.318 7.277.527 0 1.04-.055 1.533-.16a.787.787 0 0 1 .81.316.733.733 0 0 1-.031.893A8.349 8.349 0 0 1 8.344 16C3.734 16 0 12.286 0 7.71 0 4.266 2.114 1.312 5.124.06A.752.752 0 0 1 6 .278z"/></svg>
                </div>
            </div>
        </nav>
    `;

    const mainContentHtml = `<main>${APP_PAGES.map((_, index) => `<div class="page-panel ${index === 0 ? 'active' : ''}" id="page-${index}"></div>`).join('')}</main>`;
    container.innerHTML = navHtml + mainContentHtml;
    
    const initialActivePanel = container.querySelector<HTMLElement>('.page-panel.active');
    if(initialActivePanel) {
        APP_PAGES[0].contentRenderer(initialActivePanel);
        pageRenderStatus[0] = true;
    }
}

// --- LOGGING ---
function logSosgenEvent(type: string, content: object): object | null {
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

function updateBitacoraView(newEntry: any) {
    const bitacoraPanel = document.getElementById('page-5'); // BITÁCORA is index 5
    if (pageRenderStatus[5] && bitacoraPanel) {
        let logbookList = bitacoraPanel.querySelector('#logbook-list');
        
        if (!logbookList) {
            renderBitacora(bitacoraPanel);
        } else {
            const newEntryHTML = createLogEntryHTML(newEntry);
            logbookList.insertAdjacentHTML('afterbegin', newEntryHTML);
        }
    }
}

// --- EVENT HANDLERS & LOGIC ---
/**
 * Debounce function to limit the rate at which a function gets called.
 */
function debounce(func: Function, delay: number) {
    let timeoutId: number;
    return function(this: any, ...args: any[]) {
        clearTimeout(timeoutId);
        timeoutId = window.setTimeout(() => func.apply(this, args), delay);
    };
}

async function handleCopy(button: HTMLButtonElement, textToCopy: string) {
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

// --- MARITIME SIGNALS SIMULATOR LOGIC ---
let simulationTimeoutId: number | null = null;
interface LightConfig { rhythm: string; group: (string | number)[]; color: string; period: number; altColor?: string; }

const LIGHT_CHARACTERISTIC_TERMS: { [key: string]: { es: string; en: string } } = {
    // Rhythms
    'F': { es: 'Fija', en: 'Fixed' },
    'FL': { es: 'de Destellos', en: 'Flashing' },
    'LFL': { es: 'de Destello Largo', en: 'Long-Flashing' },
    'OC': { es: 'de Ocultaciones', en: 'Occulting' },
    'ISO': { es: 'Isofase', en: 'Isophase' },
    'Q': { es: 'de Centelleos', en: 'Quick' },
    'VQ': { es: 'de Centelleos Muy Rápidos', en: 'Very Quick' },
    'UQ': { es: 'de Centelleos Ultrarrápidos', en: 'Ultra Quick' },
    'IQ': { es: 'de Centelleos Interrumpidos', en: 'Interrupted Quick' },
    'IVQ': { es: 'de Centelleos Muy Rápidos Interrumpidos', en: 'Interrupted Very Quick' },
    'IUQ': { es: 'de Centelleos Ultrarrápidos Interrumpidos', en: 'Interrupted Ultra Quick' },
    'MO': { es: 'de Código Morse', en: 'Morse Code' },
    'F FL': { es: 'Fija y de Destellos', en: 'Fixed and Flashing' },
    'AL': { es: 'Alternativa', en: 'Alternating' },
    // Groupings
    'GROUP': { es: 'de Grupo', en: 'Group' },
    'COMPOSITE': { es: 'de Grupo Compuesto', en: 'Composite Group' },
    // Colors
    'W': { es: 'Blanca', en: 'White' },
    'R': { es: 'Roja', en: 'Red' },
    'G': { es: 'Verde', en: 'Green' },
    'Y': { es: 'Amarilla', en: 'Yellow' },
    'BU': { es: 'Azul', en: 'Blue' },
};

function generateCharacteristicDescription(config: LightConfig): string {
    const { rhythm, group, color, period, altColor } = config;

    if (!LIGHT_CHARACTERISTIC_TERMS[rhythm]) return '<p class="error">Característica no reconocida.</p>';
    
    let esDesc = "Luz ";
    let enDesc = "";
    
    if (group.length > 0) {
        if (rhythm === 'MO') {
            esDesc += `${LIGHT_CHARACTERISTIC_TERMS['MO'].es} (${group[0]})`;
            enDesc += `${LIGHT_CHARACTERISTIC_TERMS['MO'].en} (${group[0]}) Light`;
        } else if (group.includes('LFL')) { // South Cardinal
            esDesc += `${LIGHT_CHARACTERISTIC_TERMS[rhythm].es} (${group[0]}) + 1 destello largo`;
            enDesc += `${LIGHT_CHARACTERISTIC_TERMS[rhythm].en} (${group[0]}) + 1 long flash`;
        } else if (group.length > 1) { // Composite group
            esDesc += `${LIGHT_CHARACTERISTIC_TERMS['COMPOSITE'].es} ${LIGHT_CHARACTERISTIC_TERMS[rhythm].es} (${group.join('+')})`;
            enDesc += `${LIGHT_CHARACTERISTIC_TERMS['COMPOSITE'].en} ${LIGHT_CHARACTERISTIC_TERMS[rhythm].en} Light (${group.join('+')})`;
        } else { // Simple group
             esDesc += `${LIGHT_CHARACTERISTIC_TERMS['GROUP'].es} ${LIGHT_CHARACTERISTIC_TERMS[rhythm].es} (${group[0]})`;
             enDesc += `${LIGHT_CHARACTERISTIC_TERMS['GROUP'].en} ${LIGHT_CHARACTERISTIC_TERMS[rhythm].en} Light (${group[0]})`;
        }
    } else { // No group
        esDesc += LIGHT_CHARACTERISTIC_TERMS[rhythm].es;
        enDesc += `${LIGHT_CHARACTERISTIC_TERMS[rhythm].en} Light`;
    }

    if (rhythm === 'AL') {
        esDesc += `, colores ${LIGHT_CHARACTERISTIC_TERMS[color].es.toLowerCase()} y ${LIGHT_CHARACTERISTIC_TERMS[altColor!].es.toLowerCase()}`;
        enDesc += `, colors ${LIGHT_CHARACTERISTIC_TERMS[color].en} and ${LIGHT_CHARACTERISTIC_TERMS[altColor!].en}`;
    } else {
        const colorTerm = LIGHT_CHARACTERISTIC_TERMS[color];
        if (colorTerm) {
            esDesc += `, color ${colorTerm.es.toLowerCase()}`;
            enDesc += `, ${colorTerm.en} color`;
        }
    }
    
    if (period > 0) {
        esDesc += `, con un período de ${period} segundos.`;
        enDesc += `, with a period of ${period} seconds.`;
    } else {
        esDesc += '.';
        enDesc += '.';
    }

    return `<p class="desc-lang"><strong>ES:</strong> ${esDesc}</p><p class="desc-lang"><strong>EN:</strong> ${enDesc}</p><hr class="info-divider">`;
}

function parseLightCharacteristic(input: string): LightConfig | null {
    const cleanInput = input.trim().toUpperCase();

    // Special cases first
    const alMatch = cleanInput.match(/^AL[.\s]+([A-Z]{1,2})[.\s]+([A-Z]{1,2})/);
    if (alMatch) {
        const periodMatch = cleanInput.match(/(\d+(?:\.\d+)?)\s*S/);
        return { rhythm: 'AL', group: [], color: alMatch[1], altColor: alMatch[2], period: periodMatch ? parseFloat(periodMatch[1]) : 3 };
    }
    
    const southCardinalMatch = cleanInput.match(/^(Q|VQ)\s*\(6\)\s*\+\s*LFL/);
    if(southCardinalMatch) {
        const colorMatch = cleanInput.match(/\b(W|R|G|Y|BU)\b/);
        const periodMatch = cleanInput.match(/(\d+(?:\.\d+)?)\s*S/);
        return { rhythm: southCardinalMatch[1], group: [6, 'LFL'], color: colorMatch ? colorMatch[1] : 'W', period: periodMatch ? parseFloat(periodMatch[1]) : 15 };
    }
    
    const generalRegex = /^((?:F\s+)?LFL|FL|OC|ISO|F|IVQ|IUQ|IQ|VQ|UQ|Q|MO)\s*(?:\(([^)]+)\))?/;
    const rhythmMatch = cleanInput.match(generalRegex);
    if (!rhythmMatch) return null;

    const rhythm = rhythmMatch[1].replace(/\s+/, ' ');
    const groupStr = rhythmMatch[2];

    const remaining = cleanInput.substring(rhythmMatch[0].length);
    const colorMatch = remaining.match(/\b(W|R|G|Y|BU)\b/);
    const periodMatch = remaining.match(/(\d+(?:\.\d+)?)\s*S/);

    if (!colorMatch && rhythm !== 'AL') return null;

    let group: (string|number)[] = [];
    if (groupStr) {
        if (rhythm === 'MO') {
            group = [groupStr];
        } else if (groupStr.includes('+')) {
            group = groupStr.split('+').map(s => s.trim()).map(Number);
        } else {
            group = [Number(groupStr)];
        }
    }
    
    return { rhythm, group, color: colorMatch ? colorMatch[1] : '', period: periodMatch ? parseFloat(periodMatch[1]) : 0 };
}


function runSimulation(lightEl: HTMLElement, infoEl: HTMLElement, config: LightConfig) {
    if (simulationTimeoutId) clearTimeout(simulationTimeoutId);
    
    let baseClassName = 'buoy-light-el';
    if (lightEl.classList.contains('lighthouse-light')) {
        baseClassName = 'lighthouse-light';
    }

    lightEl.className = `${baseClassName} ${config.color.toLowerCase()}`;
    
    let sequence: { state: 'on' | 'off'; duration: number; color?: string }[] = [];
    let desc = `<strong>Secuencia:</strong> `;
    
    const flash = 0.8, longFlash = 2.0, occultation = 0.8, intraEclipse = 1.0, interEclipse = 3.0;
    const qFlash = 0.5, qEclipse = 0.5; // 60 per minute
    const vqFlash = 0.25, vqEclipse = 0.25; // 120 per minute
    let time = 0;

    switch (config.rhythm) {
        case 'F': sequence.push({ state: 'on', duration: 5000 }); desc += `Luz contínua.`; break;
        case 'LFL': const lflE = (config.period - longFlash) * 1000; sequence.push({ state: 'on', duration: longFlash * 1000 }); desc += `${longFlash}s Luz`; if (lflE > 0) { sequence.push({ state: 'off', duration: lflE }); desc += `, ${lflE / 1000}s Osc.`; } break;
        case 'ISO': const isoP = (config.period / 2) * 1000; sequence.push({ state: 'on', duration: isoP }, { state: 'off', duration: isoP }); desc += `${config.period / 2}s Luz, ${config.period / 2}s Osc.`; break;
        case 'OC':
            // FIX: Add type assertion to handle `string | number` array type in reduce.
            const totalOcc = config.group.length > 0 ? config.group.reduce((a, b) => a + (b as number), 0) : 1;
            config.group = config.group.length > 0 ? config.group : [1]; // default to one occultation if no group
            config.group.forEach((count, i) => {
                const lightDuration = (config.period * 0.7) / totalOcc;
                for (let j = 0; j < (count as number); j++) {
                    sequence.push({ state: 'on', duration: lightDuration * 1000 }, { state: 'off', duration: occultation * 1000 });
                    time += lightDuration + occultation;
                }
                if (i < config.group.length - 1) {
                    sequence.push({ state: 'off', duration: interEclipse * 1000 });
                    time += interEclipse;
                }
            });
            const finalOccEclipse = config.period - time;
            if (finalOccEclipse > 0) sequence.push({ state: 'off', duration: finalOccEclipse * 1000 });
            desc = 'Ver simulación para secuencia.';
            break;
        case 'FL':
            config.group = config.group.length > 0 ? config.group : [1];
            config.group.forEach((count, i) => { for (let j = 0; j < (count as number); j++) { sequence.push({ state: 'on', duration: flash * 1000 }); time += flash; if (j < (count as number) - 1) { sequence.push({ state: 'off', duration: intraEclipse * 1000 }); time += intraEclipse; } } if (i < config.group.length - 1) { sequence.push({ state: 'off', duration: interEclipse * 1000 }); time += interEclipse; } }); const finalE = (config.period - time) * 1000; if (finalE > 0) { sequence.push({ state: 'off', duration: finalE }); }
            desc = 'Ver simulación para secuencia.';
            break;
        case 'Q': case 'VQ': case 'UQ': case 'IQ': case 'IVQ': case 'IUQ':
            const isVQ = config.rhythm.includes('V');
            const isUQ = config.rhythm.includes('U');
            const f = isUQ ? 0.15 : (isVQ ? vqFlash : qFlash);
            const e = isUQ ? 0.15 : (isVQ ? vqEclipse : qEclipse);
            
            if (config.group[1] === 'LFL') { // South Cardinal
                const numFlashes = config.group[0] as number;
                for (let i = 0; i < numFlashes; i++) { sequence.push({ state: 'on', duration: f * 1000 }, { state: 'off', duration: e * 1000 }); time += f + e; }
                sequence.push({ state: 'off', duration: (1.5 - e) * 1000 }); time += (1.5-e);
                sequence.push({ state: 'on', duration: longFlash * 1000 }); time += longFlash;
            } else {
                const numFlashes = config.group.length > 0 ? (config.group[0] as number) : 100; // Continuous if no group
                for (let i = 0; i < numFlashes; i++) { sequence.push({ state: 'on', duration: f * 1000 }, { state: 'off', duration: e * 1000 }); time += f + e; if (config.period > 0 && time >= config.period) break; }
            }

            const totalCycleTime = config.period > 0 ? config.period : (config.rhythm.startsWith('I') ? 10 : 5); // Default periods for interrupted
            if (totalCycleTime > time) {
                 const darkPeriod = totalCycleTime - time;
                 sequence.push({ state: 'off', duration: darkPeriod * 1000 });
            }
            desc = 'Ver simulación para secuencia.';
            break;
        case 'AL':
            sequence.push({ state: 'on', duration: (config.period/2) * 1000, color: config.color.toLowerCase() });
            sequence.push({ state: 'on', duration: (config.period/2) * 1000, color: (config.altColor || '').toLowerCase() });
            desc = `Luz ${config.color} y ${config.altColor} alternante.`;
            break;
        default: desc = 'Característica no implementada en simulador.';
    }

    infoEl.innerHTML = generateCharacteristicDescription(config) + `<p>${desc}</p>`;

    let idx = 0;
    function next() { 
        if (!sequence.length) return; 
        const step = sequence[idx]; 
        lightEl.className = baseClassName; // Reset
        if(step.state === 'on') {
            const colorClass = step.color || config.color.toLowerCase();
            lightEl.classList.add('on', colorClass);
        }
        simulationTimeoutId = window.setTimeout(() => { idx = (idx + 1) % sequence.length; next(); }, step.duration); 
    }
    if (sequence.length > 0) next(); else lightEl.classList.remove('on');
}


function initializeLighthouseSimulator() {
    const form = document.getElementById('lighthouse-simulator-form') as HTMLFormElement | null;
    const input = document.getElementById('lighthouse-char-input') as HTMLInputElement | null;
    const lightEl = document.getElementById('lighthouse-light');
    const infoEl = document.getElementById('lighthouse-simulation-info');
    if (!form || !input || !lightEl || !infoEl) return;
    form.addEventListener('submit', (e) => { 
        e.preventDefault(); 
        const config = parseLightCharacteristic(input.value); 
        if (config) { 
            runSimulation(lightEl, infoEl, config); 
        } else { 
            if (simulationTimeoutId) clearTimeout(simulationTimeoutId); 
            lightEl.className = 'lighthouse-light';
            infoEl.innerHTML = '<p class="error">Formato no válido. Revise la abreviatura IALA.</p>'; 
        } 
    });
}

// --- BUOY & MARKS SIMULATOR LOGIC (NEW) ---

const IALA_BUOY_DATA = [
    // Lateral Marks
    { category: 'Laterales', type: 'Babor', region: 'A', daymark: { shape: 'can', colors: ['red'], topmark: { shape: 'can', color: 'red' } }, light: { characteristic: 'Fl R', color: 'R' }, purpose: 'Región A: Señal de babor. Debe dejarse por babor (izquierda) al entrar a puerto.' },
    { category: 'Laterales', type: 'Estribor', region: 'A', daymark: { shape: 'conical', colors: ['green'], topmark: { shape: 'cone', arrangement: 'up', color: 'green' } }, light: { characteristic: 'Fl G', color: 'G' }, purpose: 'Región A: Señal de estribor. Debe dejarse por estribor (derecha) al entrar a puerto.' },
    { category: 'Laterales', type: 'Babor', region: 'B', daymark: { shape: 'can', colors: ['green'], topmark: { shape: 'can', color: 'green' } }, light: { characteristic: 'Fl G', color: 'G' }, purpose: 'Región B: Señal de babor. Debe dejarse por babor (izquierda) al entrar a puerto.' },
    { category: 'Laterales', type: 'Estribor', region: 'B', daymark: { shape: 'conical', colors: ['red'], topmark: { shape: 'cone', arrangement: 'up', color: 'red' } }, light: { characteristic: 'Fl R', color: 'R' }, purpose: 'Región B: Señal de estribor. Debe dejarse por estribor (derecha) al entrar a puerto.' },
    
    // Preferred Channel Marks
    { category: 'Canal Preferido', type: 'Estribor', region: 'A', daymark: { shape: 'can', colors: ['red', 'green', 'red'], topmark: { shape: 'can', color: 'red' } }, light: { characteristic: 'Fl(2+1) R 10s', color: 'R' }, purpose: 'Región A: Canal preferido a estribor. El canal principal está a la derecha, se puede pasar por babor.' },
    { category: 'Canal Preferido', type: 'Babor', region: 'A', daymark: { shape: 'conical', colors: ['green', 'red', 'green'], topmark: { shape: 'cone', arrangement: 'up', color: 'green' } }, light: { characteristic: 'Fl(2+1) G 10s', color: 'G' }, purpose: 'Región A: Canal preferido a babor. El canal principal está a la izquierda, se puede pasar por estribor.' },
    { category: 'Canal Preferido', type: 'Estribor', region: 'B', daymark: { shape: 'can', colors: ['green', 'red', 'green'], topmark: { shape: 'can', color: 'green' } }, light: { characteristic: 'Fl(2+1) G 10s', color: 'G' }, purpose: 'Región B: Canal preferido a estribor. El canal principal está a la derecha, se puede pasar por babor.' },
    { category: 'Canal Preferido', type: 'Babor', region: 'B', daymark: { shape: 'conical', colors: ['red', 'green', 'red'], topmark: { shape: 'cone', arrangement: 'up', color: 'red' } }, light: { characteristic: 'Fl(2+1) R 10s', color: 'R' }, purpose: 'Región B: Canal preferido a babor. El canal principal está a la izquierda, se puede pasar por estribor.' },

    // Cardinal Marks
    { category: 'Cardinales', type: 'Norte', region: 'Both', daymark: { shape: 'pillar', colors: ['black', 'yellow'], topmark: { shape: 'double_cone', arrangement: 'up', color: 'black' } }, light: { characteristic: 'VQ W', color: 'W' }, purpose: 'Indica que las aguas seguras se encuentran al Norte de la marca. Se debe pasar al Norte de ella.' },
    { category: 'Cardinales', type: 'Este', region: 'Both', daymark: { shape: 'pillar', colors: ['black', 'yellow', 'black'], topmark: { shape: 'double_cone', arrangement: 'base_to_base', color: 'black' } }, light: { characteristic: 'VQ(3) W 5s', color: 'W' }, purpose: 'Indica que las aguas seguras se encuentran al Este de la marca. Se debe pasar al Este de ella.' },
    { category: 'Cardinales', type: 'Sur', region: 'Both', daymark: { shape: 'pillar', colors: ['yellow', 'black'], topmark: { shape: 'double_cone', arrangement: 'down', color: 'black' } }, light: { characteristic: 'VQ(6)+LFl W 10s', color: 'W' }, purpose: 'Indica que las aguas seguras se encuentran al Sur de la marca. Se debe pasar al Sur de ella.' },
    { category: 'Cardinales', type: 'Oeste', region: 'Both', daymark: { shape: 'pillar', colors: ['yellow', 'black', 'yellow'], topmark: { shape: 'double_cone', arrangement: 'point_to_point', color: 'black' } }, light: { characteristic: 'VQ(9) W 10s', color: 'W' }, purpose: 'Indica que las aguas seguras se encuentran al Oeste de la marca. Se debe pasar al Oeste de ella.' },

    // Other Marks
    { category: 'Otras', type: 'Peligro Aislado', region: 'Both', daymark: { shape: 'pillar', colors: ['black', 'red', 'black'], topmark: { shape: 'double_sphere', color: 'black' } }, light: { characteristic: 'Fl(2) W 5s', color: 'W' }, purpose: 'Se erige sobre un peligro de extensión reducida rodeado de aguas navegables. Se puede pasar por cualquier lado.' },
    { category: 'Otras', type: 'Aguas Seguras', region: 'Both', daymark: { shape: 'spherical', colors: ['red', 'white'], vertical: true, topmark: { shape: 'sphere', color: 'red' } }, light: { characteristic: 'Iso W 6s', color: 'W' }, purpose: 'Indica que hay aguas navegables en todas sus bandas. Usada como marca de centro de canal o de recalada.' },
    { category: 'Otras', type: 'Marca Especial', region: 'Both', daymark: { shape: 'optional', colors: ['yellow'], topmark: { shape: 'cross_upright', color: 'yellow' } }, light: { characteristic: 'Fl Y 5s', color: 'Y' }, purpose: 'Indica una zona o configuración especial (zona de ejercicios, cables submarinos, ODAS, etc.).' },
    { category: 'Otras', type: 'Nuevo Peligro', region: 'Both', daymark: { shape: 'pillar', colors: ['blue', 'yellow'], vertical: true, topmark: { shape: 'cross_upright', color: 'yellow' } }, light: { characteristic: 'Al.Bu.Y 3s', color: 'Bu' }, purpose: 'Se usa para señalar peligros descubiertos recientemente que no figuran en las cartas náuticas.' },
];


function renderBuoySchematic(data: any): string {
    const { shape, colors, vertical } = data.daymark;
    const { shape: tmShape, color: tmColor, arrangement: tmArr } = data.daymark.topmark || {};
    
    const palette = {
        red: 'var(--buoy-red)', green: 'var(--buoy-green)', yellow: 'var(--buoy-yellow)',
        black: 'var(--buoy-black)', white: 'var(--buoy-white)', blue: 'var(--buoy-blue)',
        stroke: 'var(--buoy-stroke)', water: 'var(--buoy-water)'
    };

    const viewBox = "0 0 120 220";
    let body = '';
    let topmark = '';
    let bandDefs: string[] = [];
    
    const water = `<path d="M 0 190 Q 60 180, 120 190 V 220 H 0 Z" fill="${palette.water}" fill-opacity="0.7" />`;

    const cx = 60;
    const bodyWidth = 60;
    const bodyHeight = 100;
    const bodyTopY = 190 - bodyHeight;

    let bodyShapePath = '';
    switch (shape) {
        case 'conical': bodyShapePath = `M ${cx},${bodyTopY} L ${cx + bodyWidth/2.5},${bodyTopY + bodyHeight} L ${cx - bodyWidth/2.5},${bodyTopY + bodyHeight} Z`; break;
        case 'can': bodyShapePath = `M ${cx - bodyWidth/2},${bodyTopY} C ${cx - bodyWidth/2},${bodyTopY-5} ${cx + bodyWidth/2},${bodyTopY-5} ${cx + bodyWidth/2},${bodyTopY} V ${bodyTopY + bodyHeight} H ${cx - bodyWidth/2} Z`; break;
        case 'spherical': bodyShapePath = `M ${cx - bodyWidth/2},${bodyTopY + bodyHeight/2} A ${bodyWidth/2} ${bodyHeight/2} 0 1 0 ${cx + bodyWidth/2} ${bodyTopY + bodyHeight/2} A ${bodyWidth/2} ${bodyHeight/2} 0 1 0 ${cx - bodyWidth/2} ${bodyTopY + bodyHeight/2}`; break;
        default: bodyShapePath = `M ${cx - bodyWidth/2.2},${bodyTopY} L ${cx - bodyWidth/2.5},${bodyTopY + bodyHeight} H ${cx + bodyWidth/2.5} L ${cx + bodyWidth/2.2},${bodyTopY} Z`; break;
    }

    if (vertical) {
        const stripeWidth = bodyWidth / colors.length;
        colors.forEach((c: string, i: number) => {
            body += `<rect x="${cx - bodyWidth/2 + i*stripeWidth}" y="${bodyTopY}" width="${stripeWidth}" height="${bodyHeight}" fill="var(--buoy-${c.toLowerCase()})" />`;
        });
    } else {
        const bandHeight = bodyHeight / colors.length;
        colors.forEach((c: string, i: number) => {
            body += `<rect x="${cx - bodyWidth/2}" y="${bodyTopY + i*bandHeight}" width="${bodyWidth}" height="${bandHeight}" fill="var(--buoy-${c.toLowerCase()})" />`;
        });
    }

    if (tmShape) {
        const tmBaseY = bodyTopY - 5;
        const tmColorFill = `fill="var(--buoy-${tmColor?.toLowerCase()})"`;
        const tmStroke = `stroke="${palette.stroke}" stroke-width="1"`;
        let tmPaths = '';

        const conePath = (x: number, y: number, up: boolean) => 
            up ? `M ${x},${y-30} L ${x+15},${y} L ${x-15},${y} Z` 
               : `M ${x},${y} L ${x+15},${y-30} L ${x-15},${y-30} Z`;

        switch(tmShape) {
            case 'cone': tmPaths = conePath(cx, tmBaseY, tmArr === 'up'); break;
            case 'can': tmPaths = `<rect x="${cx-12}" y="${tmBaseY-25}" width="24" height="25" rx="2" />`; break;
            case 'sphere': tmPaths = `<circle cx="${cx}" cy="${tmBaseY-15}" r="15" />`; break;
            case 'cross_upright': tmPaths = `<path d="M ${cx-20},${tmBaseY-20} H ${cx+20} M ${cx},${tmBaseY-40} V ${tmBaseY}" stroke="var(--buoy-${tmColor?.toLowerCase()})" stroke-width="6" stroke-linecap="round" />`; break;
            case 'double_sphere': tmPaths = `<circle cx="${cx}" cy="${tmBaseY-15}" r="12" /><circle cx="${cx}" cy="${tmBaseY-45}" r="12" />`; break;
            case 'double_cone':
                const gap = 4;
                if(tmArr === 'up') tmPaths = `<path d="${conePath(cx, tmBaseY, true)}" /><path d="${conePath(cx, tmBaseY - 30 - gap, true)}" />`;
                if(tmArr === 'down') tmPaths = `<path d="${conePath(cx, tmBaseY, false)}" /><path d="${conePath(cx, tmBaseY + 30 + gap, false)}" />`;
                if(tmArr === 'base_to_base') tmPaths = `<path d="${conePath(cx, tmBaseY, true)}" /><path d="${conePath(cx, tmBaseY - gap, false)}" />`;
                if(tmArr === 'point_to_point') tmPaths = `<path d="${conePath(cx, tmBaseY, false)}" /><path d="${conePath(cx, tmBaseY + gap, true)}" />`;
                break;
        }
        topmark = `<g ${tmColorFill} ${tmStroke}>${tmPaths}</g>`;
    }

    return `
        <svg class="buoy-schematic-svg" viewBox="${viewBox}">
            <defs>
                <clipPath id="bodyClip"><path d="${bodyShapePath}" /></clipPath>
                ${bandDefs.join('')}
            </defs>
            <g clip-path="url(#bodyClip)">${body}</g>
            <path d="${bodyShapePath}" fill="none" stroke="${palette.stroke}" stroke-width="1.5" />
            ${topmark}
            ${water}
        </svg>
    `;
}

function initializeBuoySimulator() {
    const categorySelector = document.getElementById('buoy-category-selector');
    const typeSelector = document.getElementById('buoy-type-selector');
    const regionSelector = document.getElementById('buoy-region-selector');
    const regionInput = document.getElementById('buoy-region-input') as HTMLInputElement;
    const schematicContainer = document.getElementById('buoy-schematic-container');
    const infoPanel = document.getElementById('buoy-info-panel');

    if (!categorySelector || !typeSelector || !schematicContainer || !infoPanel || !regionSelector) return;
    
    const categories = [...new Set(IALA_BUOY_DATA.map(b => b.category))];
    categorySelector.innerHTML = categories.map(c => `<button class="buoy-selector-btn" data-category="${c}">${c}</button>`).join('');

    let currentCategory = '';
    let currentRegion = 'A';

    const updateSimulator = (buoyData: any) => {
        schematicContainer.innerHTML = renderBuoySchematic(buoyData);
        infoPanel.innerHTML = `
            <h4>${buoyData.category} - ${buoyData.type}</h4>
            <p><strong>Día:</strong> Forma ${buoyData.daymark.shape}, colores ${buoyData.daymark.colors.join(' y ')}${buoyData.daymark.vertical ? ' (vertical)' : ''}.</p>
            <p><strong>Luz:</strong> ${buoyData.light.characteristic}</p>
            <p class="purpose-text">${buoyData.purpose}</p>
        `;
        const lightEl = document.getElementById('buoy-light');
        const config = parseLightCharacteristic(buoyData.light.characteristic);
        if (lightEl && config) {
            runSimulation(lightEl, infoPanel, config);
        } else if (lightEl) {
             if (simulationTimeoutId) clearTimeout(simulationTimeoutId);
             lightEl.className = 'buoy-light-el';
        }
    }

    const renderTypeButtons = () => {
        const typesForCategory = IALA_BUOY_DATA
            .filter(b => b.category === currentCategory && (b.region === 'Both' || b.region === currentRegion));
        
        typeSelector.innerHTML = typesForCategory.map(t => `<button class="buoy-selector-btn" data-type="${t.type}">${t.type}</button>`).join('');
        
        // Auto-select first type if available
        if (typesForCategory.length > 0) {
            typeSelector.querySelector('button')?.classList.add('active');
            updateSimulator(typesForCategory[0]);
        } else {
             schematicContainer.innerHTML = '';
             infoPanel.innerHTML = '<p>No hay señales de este tipo para la región seleccionada.</p>';
        }
    }

    categorySelector.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const btn = target.closest<HTMLButtonElement>('.buoy-selector-btn');
        if (btn) {
            currentCategory = btn.dataset.category || '';
            categorySelector.querySelectorAll('button').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            regionSelector.style.display = (currentCategory === 'Laterales' || currentCategory === 'Canal Preferido') ? 'flex' : 'none';
            
            renderTypeButtons();
        }
    });

    typeSelector.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const btn = target.closest<HTMLButtonElement>('.buoy-selector-btn');
        if (btn) {
            const type = btn.dataset.type;
            typeSelector.querySelectorAll('button').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const buoyData = IALA_BUOY_DATA.find(b => b.category === currentCategory && b.type === type && (b.region === 'Both' || b.region === currentRegion));
            if (buoyData) {
                updateSimulator(buoyData);
            }
        }
    });

    regionInput.addEventListener('change', () => {
        currentRegion = regionInput.checked ? 'B' : 'A';
        renderTypeButtons();
    });

    // Initial state
    categorySelector.querySelector('button')?.click();
}

// --- SOSGEN LOGIC ---
async function initializeSosgen() {
    const generateBtn = document.getElementById('sosgen-generate-btn') as HTMLButtonElement;
    const inputEl = document.getElementById('sosgen-input') as HTMLTextAreaElement;
    const resultsEl = document.getElementById('sosgen-results') as HTMLDivElement;
    if (!generateBtn || !inputEl || !resultsEl) return;

    const savedDraft = localStorage.getItem('sosgen_draft');
    if (savedDraft) {
        inputEl.value = savedDraft;
    }

    inputEl.addEventListener('input', () => {
        localStorage.setItem('sosgen_draft', inputEl.value);
    });

    generateBtn.addEventListener('click', async () => {
        const naturalInput = inputEl.value.trim();
        if (!naturalInput) {
            resultsEl.innerHTML = `<p class="error">La descripción no puede estar vacía.</p>`;
            return;
        }
        resultsEl.innerHTML = `<div class="loader-container"><div class="loader"></div></div>`;
        generateBtn.disabled = true;

        try {
            const apiResponse = await fetch('/api/sosgen', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ naturalInput })
            });

            if (!apiResponse.ok) {
                const errorData = await apiResponse.json();
                throw new Error(errorData.details || 'La API devolvió un error.');
            }

            const extractedData = await apiResponse.json();
            
            const missingFields = [];
            if (!extractedData.spanishDescription) missingFields.push("descripción en español");
            if (!extractedData.englishDescription) missingFields.push("descripción en inglés");

            if (missingFields.length > 0) {
              throw new Error(`Falta información. La IA no pudo extraer: ${missingFields.join(', ')}. Por favor, sea más específico en su descripción.`);
            }
            
            const rawStationName = extractedData.stationName?.trim();
            
            let fullStationName = '____________________';
            if (rawStationName) {
              fullStationName = rawStationName.toLowerCase().includes('radio') ? rawStationName : `${rawStationName} Radio`;
            }

            const mrcc = extractedData.mrcc?.trim() || '____________________';
            const utcTime = '____________________';
            const infoNumber = '1';

            const esMsg = `MAYDAY RELAY (x3)\nAQUI ${fullStationName} (x3)\nMAYDAY\nINFORMACION Nº ${infoNumber} A ${utcTime} UTC.\n\n${extractedData.spanishDescription}\n\nSE REQUIERE A TODOS LOS BARCOS EN LA ZONA, EXTREMAR LA VIGILANCIA, ASISTIR SI ES NECESSARIO, E INFORMAR A SALVAMENTO MARITIMO ${mrcc} O ESTACION RADIO COSTERA MAS PROXIMA.\nAQUI ${fullStationName} A ${utcTime} UTC.`;
            const enMsg = `MAYDAY RELAY (x3)\nTHIS IS ${fullStationName} (x3)\nMAYDAY\nINFORMATION Nº ${infoNumber} AT ${utcTime} UTC.\n\n${extractedData.englishDescription}\n\nALL VESSELS IN THE AREA, ARE REQUESTED TO KEEP A SHARP LOOK OUT, ASSIST IF NECESSARY AND MAKE FURTHER REPORTS TO MRCC ${mrcc} OR NEAREST COASTAL RADIO STATION.\nTHIS IS ${fullStationName} AT ${utcTime} UTC.`;
            
            resultsEl.innerHTML = `
                <div class="sosgen-result-box">
                    <div class="sosgen-result-header">
                        <h3>Mensaje en Español</h3>
                        <button class="copy-btn">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M4 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2zm2-1a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1zM2 5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-1h-1v1a.5.5 0 0 1-.5.5H2.5a.5.5 0 0 1-.5-.5V6.5a.5.5 0 0 1 .5-.5H3v-1z"/></svg>
                            <span>Copiar</span>
                        </button>
                    </div>
                    <textarea class="styled-textarea" rows="12">${esMsg}</textarea>
                </div>
                <div class="sosgen-result-box">
                    <div class="sosgen-result-header">
                        <h3>Mensaje en Inglés</h3>
                        <button class="copy-btn">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M4 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2zm2-1a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1zM2 5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-1h-1v1a.5.5 0 0 1-.5.5H2.5a.5.5 0 0 1-.5-.5V6.5a.5.5 0 0 1 .5-.5H3v-1z"/></svg>
                            <span>Copiar</span>
                        </button>
                    </div>
                    <textarea class="styled-textarea" rows="12">${enMsg}</textarea>
                </div>`;
            
            resultsEl.querySelectorAll('.copy-btn').forEach(button => {
                button.addEventListener('click', (e) => {
                    const btn = e.currentTarget as HTMLButtonElement;
                    const resultBox = btn.closest('.sosgen-result-box');
                    const textarea = resultBox?.querySelector('textarea');
                    if(textarea) {
                        handleCopy(btn, textarea.value);
                    }
                });
            });

            const newEntry = logSosgenEvent('SOSGEN', { spanish: esMsg, english: enMsg });
            if (newEntry) {
                updateBitacoraView(newEntry);
            }
            localStorage.removeItem('sosgen_draft');

        } catch (error) {
            console.error("Error generating message:", error);
            const errorMessage = error instanceof Error ? error.message : "Error interno del servidor";
            resultsEl.innerHTML = `<p class="error">${errorMessage}</p>`;
        } finally {
            generateBtn.disabled = false;
        }
    });
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

    translateBtn.addEventListener('click', async () => {
        const textToTranslate = inputEl.value.trim();
        if (!textToTranslate) {
            resultEl.innerHTML = `<p class="error">El texto no puede estar vacío.</p>`;
            return;
        }
        resultEl.innerHTML = `<div class="loader-container" style="padding:1rem 0;"><div class="loader"></div></div>`;
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
            console.error("Translation Error:", error);
            resultEl.innerHTML = `<p class="error">${error instanceof Error ? error.message : "Error al traducir"}</p>`;
        } finally {
            translateBtn.disabled = false;
        }
    });
}


function initializeRegistroOceano(container: HTMLElement) {
    const layout = container.querySelector('.registro-oceano-layout');
    if (!layout) return;

    layout.addEventListener('click', (event) => {
        const target = event.target as HTMLElement;
        const btn = target.closest('.sub-nav-btn');
        if (btn) {
            const targetId = btn.getAttribute('data-target');
            if(!targetId) return;
            layout.querySelectorAll('.sub-nav-btn').forEach(b => b.classList.remove('active'));
            layout.querySelectorAll('.sub-tab-panel').forEach(p => p.classList.remove('active'));
            btn.classList.add('active');
            const panel = layout.querySelector<HTMLElement>(`#${targetId}`);
            if (panel) panel.classList.add('active');
        }
        
        const copyBtn = target.closest('.copy-btn');
        if (copyBtn instanceof HTMLButtonElement) {
            const card = copyBtn.closest('.template-card');
            const body = card?.querySelector('.template-card-body');
            if(body) {
                handleCopy(copyBtn, body.textContent || '');
            }
        }
    });
}

function initializeInfoTabs(container: HTMLElement) {
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


function initializeGmdssWizard() {
    const wizard = document.getElementById('gmdss-wizard');
    if (!wizard) return;

    const restartBtn = wizard.querySelector<HTMLButtonElement>('.wizard-restart-btn');
    const controlsContainer = wizard.querySelector<HTMLElement>('.wizard-controls');

    wizard.addEventListener('click', (event) => {
        const target = event.target as HTMLElement;
        const btn = target.closest<HTMLButtonElement>('.wizard-btn');

        if (btn) {
            const nextStepId = btn.dataset.next;
            if (nextStepId) {
                const currentStep = btn.closest('.wizard-step');
                const nextStep = wizard.querySelector<HTMLElement>(`[data-step="${nextStepId}"]`);

                if (currentStep) currentStep.classList.remove('active');
                if (nextStep) {
                     nextStep.classList.add('active');
                     if (nextStep.querySelector('.procedure-box') && controlsContainer) {
                        controlsContainer.style.display = 'block';
                    }
                }
            }
        }
    });

    if (restartBtn && controlsContainer) {
        restartBtn.addEventListener('click', () => {
            wizard.querySelectorAll<HTMLElement>('.wizard-step').forEach(step => {
                step.classList.remove('active');
            });
            const firstStep = wizard.querySelector<HTMLElement>('[data-step="start"]');
            if (firstStep) {
                firstStep.classList.add('active');
            }
            controlsContainer.style.display = 'none';
        });
    }
}

function initializeSimulacro() {
    const drillContainer = document.querySelector('.drill-container');
    if (!drillContainer) return;

    const drillButtons = drillContainer.querySelectorAll<HTMLButtonElement>('.drill-actions button');
    const drillContent = drillContainer.querySelector<HTMLDivElement>('#drill-content');
    const loader = drillContainer.querySelector<HTMLDivElement>('#drill-loader');

    if (!drillButtons.length || !drillContent || !loader) return;

    const generateDrill = async (drillType: string) => {
        drillContent.innerHTML = '';
        loader.style.display = 'flex';
        drillButtons.forEach(btn => btn.disabled = true);

        try {
            const apiResponse = await fetch('/api/simulacro', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: drillType })
            });

            if (!apiResponse.ok) {
                const errorData = await apiResponse.json();
                throw new Error(errorData.details || 'La API devolvió un error.');
            }
            const drillData = await apiResponse.json();
            
            let html = `<div class="drill-scenario">${drillData.scenario}</div><div class="drill-questions">`;
            drillData.questions.forEach((q: any, index: number) => {
                html += `
                    <div class="question-block" id="question-${index}" data-correct-index="${q.correctAnswerIndex}">
                        <p class="question-text">${index + 1}. ${q.questionText}</p>
                        <div class="answer-options">
                            ${q.options.map((opt: string, optIndex: number) => `
                                <label class="answer-option" for="q${index}-opt${optIndex}">
                                    <input type="radio" name="question-${index}" id="q${index}-opt${optIndex}" value="${optIndex}">
                                    <span>${opt}</span>
                                </label>
                            `).join('')}
                        </div>
                    </div>
                `;
            });
            html += `</div><button id="drill-check-btn" class="primary-btn">Verificar Respuestas</button><div id="drill-results" class="drill-results-summary"></div>`;
            drillContent.innerHTML = html;

            const checkBtn = drillContent.querySelector('#drill-check-btn');
            checkBtn?.addEventListener('click', () => checkDrillAnswers(drillData, drillContent), { once: true });

        } catch (error) {
            console.error("Drill Generation Error:", error);
            drillContent.innerHTML = `<p class="error">No se pudo generar el simulacro. Inténtelo de nuevo.</p>`;
        } finally {
            loader.style.display = 'none';
            drillButtons.forEach(btn => btn.disabled = false);
        }
    };
    
    drillButtons.forEach(button => {
        button.addEventListener('click', () => {
            const drillType = button.dataset.drillType;
            if (drillType) {
                generateDrill(drillType);
            }
        });
    });
}

function checkDrillAnswers(data: any, container: HTMLDivElement) {
    let score = 0;
    data.questions.forEach((q: any, index: number) => {
        const questionBlock = container.querySelector(`#question-${index}`) as HTMLElement;
        if (!questionBlock) return;
        const correctAnswerIndex = parseInt(q.correctAnswerIndex, 10);
        const selectedOption = container.querySelector<HTMLInputElement>(`input[name="question-${index}"]:checked`);
        
        questionBlock.querySelectorAll('.answer-option input').forEach(input => input.setAttribute('disabled', 'true'));
        
        const correctLabel = questionBlock.querySelector<HTMLLabelElement>(`label[for="q${index}-opt${correctAnswerIndex}"]`);
        if (correctLabel) correctLabel.classList.add('correct');

        if (selectedOption) {
            const selectedAnswerIndex = parseInt(selectedOption.value, 10);
            if (selectedAnswerIndex === correctAnswerIndex) {
                score++;
            } else {
                const selectedLabel = questionBlock.querySelector<HTMLLabelElement>(`label[for="q${index}-opt${selectedAnswerIndex}"]`);
                if (selectedLabel) selectedLabel.classList.add('incorrect');
            }
        }

        if (q.feedback) {
            const feedbackEl = document.createElement('div');
            feedbackEl.className = 'answer-feedback';
            feedbackEl.innerHTML = `<p><strong>Explicación:</strong> ${q.feedback}</p>`;
            questionBlock.appendChild(feedbackEl);
        }
    });

    const resultsEl = container.querySelector('#drill-results') as HTMLDivElement;
    if (resultsEl) {
        resultsEl.innerHTML = `<h3>Resultado: ${score} de ${data.questions.length} correctas</h3>`;
        if (data.fullDetails) {
            const detailsEl = document.createElement('div');
            detailsEl.className = 'drill-full-details';
            detailsEl.innerHTML = `<h4>Detalles Completos del Escenario</h4><p>${data.fullDetails}</p>`;
            resultsEl.appendChild(detailsEl);
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


function addEventListeners(appContainer: HTMLElement) {
    appContainer.addEventListener('click', (event) => {
        const target = event.target as HTMLElement;
        const navLink = target.closest('.nav-link');
        const brandLink = target.closest('.nav-brand');

        if (brandLink) {
            switchToPage(0);
            return;
        }
        if (navLink) {
            const pageIndex = parseInt(navLink.getAttribute('data-page-index')!, 10);
            switchToPage(pageIndex);
            return;
        }
    });

    const themeToggle = document.getElementById('theme-toggle') as HTMLInputElement;
    if (themeToggle) {
        themeToggle.addEventListener('change', () => {
            if (themeToggle.checked) {
                document.body.classList.add('dark-theme');
                localStorage.setItem('theme', 'dark');
            } else {
                document.body.classList.remove('dark-theme');
                localStorage.setItem('theme', 'light');
            }
        });
    }
}

function initializeTheme() {
    const savedTheme = localStorage.getItem('theme');
    const themeToggle = document.getElementById('theme-toggle') as HTMLInputElement;
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-theme');
        if (themeToggle) themeToggle.checked = true;
    } else {
        document.body.classList.remove('dark-theme');
        if (themeToggle) themeToggle.checked = false;
    }
}


document.addEventListener('DOMContentLoaded', () => {
    const appContainer = document.getElementById('app');
    if (appContainer) {
        renderApp(appContainer);
        addEventListeners(appContainer);
        initializeTheme();
    }
});