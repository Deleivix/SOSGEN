/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

// --- DATA STRUCTURES ---
interface Template { title: string; template: string; }
interface Category { category: string; items: Template[]; }
interface QuickRef { category: string; content: string; }
interface Page { name: string; contentRenderer: (container: HTMLElement) => void; }

const NEW_LOGO_SVG = `<svg class="nav-logo" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path fill="#2D8B8B" d="M50,10 A40,40 0 1 1 50,90 A40,40 0 1 1 50,10 M50,18 A32,32 0 1 0 50,82 A32,32 0 1 0 50,18"></path><path fill="white" d="M50,22 A28,28 0 1 1 50,78 A28,28 0 1 1 50,22"></path><path fill="#8BC34A" d="M50,10 A40,40 0 0 1 90,50 L82,50 A32,32 0 0 0 50,18 Z"></path><path fill="#F7F9FA" d="M10,50 A40,40 0 0 1 50,10 L50,18 A32,32 0 0 0 18,50 Z"></path><path fill="#2D8B8B" d="M50,90 A40,40 0 0 1 10,50 L18,50 A32,32 0 0 0 50,82 Z"></path><path fill="white" d="M90,50 A40,40 0 0 1 50,90 L50,82 A32,32 0 0 0 82,50 Z"></path></svg>`;

const APP_PAGE_ICONS = [
    // SOSGEN: Lifebuoy
    `<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><circle cx="12"cy="12" r="4"></circle><line x1="4.93" y1="4.93" x2="9.17" y2="9.17"></line><line x1="14.83" y1="14.83" x2="19.07" y2="19.07"></line><line x1="14.83" y1="9.17" x2="19.07" y2="4.93"></line><line x1="4.93" y1="19.07" x2="9.17" y2="14.83"></line></svg>`,
    // Registro Océano: Clipboard
    `<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>`,
    // PROTOCOLO: Network/Flowchart
    `<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>`,
    // FAROS: Lighthouse
    `<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L6 8v12h12V8L12 2z"/><path d="M6 14h12"/><path d="M10 18h4v-4h-4v4z"/><path d="M2 5l4 3"/><path d="M22 5l-4 3"/></svg>`,
    // SIMULACRO: Target
    `<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle></svg>`,
    // DIARIO: Book
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

const QUICK_REFERENCE_DATA: QuickRef[] = [
    { category: 'Frecuencias', content: `
        <h3 class="reference-table-subtitle">Canales VHF (Anexo 2)</h3>
        <div class="vhf-tables-container">
            <table class="reference-table">
                <caption class="header-coruna">CCR LA CORUÑA</caption>
                <thead><tr class="header-coruna"><th rowspan="2">CCR</th><th rowspan="2">MMSI</th><th rowspan="2">EECC</th><th colspan="2">CANAL</th></tr><tr class="header-coruna"><th>RETEVISIÓN</th><th>SASEMAR</th></tr></thead>
                <tbody>
                    <tr><td rowspan="10">La Coruña</td><td rowspan="10">002241022</td><td>Pasajes</td><td>27</td><td>6</td></tr>
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
                <caption class="header-valencia">CCR VALENCIA</caption>
                <thead><tr class="header-valencia"><th rowspan="2">CCR</th><th rowspan="2">MMSI</th><th rowspan="2">EECC</th><th colspan="2">CANAL</th></tr><tr class="header-valencia"><th>RETEVISIÓN</th><th>SASEMAR</th></tr></thead>
                <tbody>
                    <tr><td rowspan="12">Valencia</td><td rowspan="12">002241024</td><td>Cabo de Gata</td><td>24</td><td>72</td></tr>
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
                <caption class="header-laspalmas">CCR LAS PALMAS</caption>
                <thead><tr class="header-laspalmas"><th rowspan="2">CCR</th><th rowspan="2">MMSI</th><th rowspan="2">EECC</th><th colspan="2">CANAL</th></tr><tr class="header-laspalmas"><th>RETEVISIÓN</th><th>SASEMAR</th></tr></thead>
                <tbody>
                    <tr><td rowspan="12">Las Palmas</td><td rowspan="12">002241026</td><td>Huelva</td><td>26</td><td>6</td></tr>
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
        <h3 class="reference-table-subtitle">Frecuencias MF y HF (Anexo 2)</h3>
        <table class="reference-table">
            <caption class="header-coruna">CCR LA CORUÑA (002241022)</caption>
            <thead><tr><th>Estación / Radio</th><th>Frec. TX MF (kHz)</th><th>Frec. RX MF (kHz)</th><th>DSC Socorro HF (kHz)</th><th>DSC Int. HF (kHz)</th><th>Telefonía HF (kHz)</th></tr></thead>
            <tbody>
                <tr><td>Machichaco Radio</td><td>3.800; 1.677 (D)</td><td>3.340; 2.102 (D)</td><td rowspan="3">4,207.5<br>8.414,5<br>12.577</td><td rowspan="3">4,208.0 (Madrid)<br>4,219,5 (Trijueque)</td><td rowspan="3"><b>Madrid:</b> 4125/4077, 8291/8204, 12290/12230<br><b>Trijueque:</b> 4125/4369, 8291/8728, 12290/13077</td></tr>
                <tr><td>Coruña Radio</td><td>3.791; 1.707 (D)</td><td>3.331; 2.132 (D)</td></tr>
                <tr><td>Finisterre Radio</td><td>3.800; 1.698 (D)</td><td>3.340; 2.123 (D)</td></tr>
            </tbody>
        </table>
        <table class="reference-table">
            <caption class="header-valencia">CCR VALENCIA (002241024)</caption>
            <thead><tr><th>Estación / Radio</th><th>Frec. TX MF (kHz)</th><th>Frec. RX MF (kHz)</th></tr></thead>
            <tbody>
                <tr><td>Cabo la Nao Radio</td><td>3.791; 1.767 (D)</td><td>3.331; 2.111 (D)</td></tr>
                <tr><td>Palma Radio</td><td>3.800; 1.755 (D)</td><td>3.340; 2.099 (D)</td></tr>
                <tr><td>Cabo de Gata Radio</td><td>3.800; 1.704 (D)</td><td>3.340; 2.129 (D)</td></tr>
            </tbody>
        </table>
        <table class="reference-table">
            <caption class="header-laspalmas">CCR LAS PALMAS (002241026)</caption>
            <thead><tr><th>Estación / Radio</th><th>Frec. TX MF (kHz)</th><th>Frec. RX MF (kHz)</th></tr></thead>
            <tbody>
                <tr><td>Tarifa Radio</td><td>3.791; 1.656 (D)</td><td>3.331; 2.081 (D)</td></tr>
                <tr><td>Las Palmas Radio</td><td>3.791; 1.689 (D)</td><td>3.791; 2.114 (D)</td></tr>
                <tr><td>Arrecife Radio</td><td>3.800; 1.644 (D)</td><td>3.340; 2.069 (D)</td></tr>
            </tbody>
        </table>
    `},
    { category: 'Horarios', content: `
        <h3 class="reference-table-subtitle">Horarios de Emisión desde EECC (UTC)</h3>
        <table class="reference-table">
            <thead><tr><th>Servicio</th><th>Estación Radio</th><th>Frecuencia (kHz)</th><th colspan="3">Horarios</th></tr></thead>
            <tbody>
                <tr><td rowspan="3">Boletín WX</td><td>Machichaco, Coruña, Finisterre</td><td>1677, 1707, 1698</td><td>09:03</td><td>15:03</td><td>23:03</td></tr>
                <tr><td>C.Gata, C.Nao, Palma</td><td>1704, 1767, 1755</td><td>10:03</td><td>15:33</td><td>23:33</td></tr>
                <tr><td>L.Palmas, Arrecife, Tarifa</td><td>1689, 1644, 1656</td><td>10:40</td><td>16:03</td><td>22:33</td></tr>
                <tr><td rowspan="3">Radioavisos MF</td><td>Machichaco, Coruña, Finisterre</td><td>1677, 1707, 1698</td><td>07:03</td><td>20:33</td><td></td></tr>
                <tr><td>C.Gata, C.Nao, Palma, Tarifa</td><td>1704, 1767, 1755, 1656</td><td>08:03, 08:40</td><td>19:33, 20:03</td><td></td></tr>
                <tr><td>L.Palmas, Arrecife</td><td>1689, 1644</td><td>06:33</td><td>21:10</td><td></td></tr>
                <tr><td rowspan="3">Radioavisos VHF</td><td>CCR La Coruña</td><td>(ver tabla frec.)</td><td>03:00</td><td>17:33</td><td></td></tr>
                <tr><td>CCR Valencia</td><td>(ver tabla frec.)</td><td>04:10</td><td>18:10</td><td></td></tr>
                <tr><td>CCR Las Palmas</td><td>(ver tabla frec.)</td><td>02:00, 03:40</td><td>16:33, 19:03</td><td></td></tr>
            </tbody>
        </table>
        <h3 class="reference-table-subtitle">Horarios de Emisión Boletines WX desde CCS (UTC)</h3>
        <table class="reference-table">
            <thead><tr><th>CCS</th><th>Canal VHF</th><th>Horarios</th><th>Zona</th></tr></thead>
            <tbody>
                <tr><td>Bilbao</td><td>10-74</td><td>04:33, 08:33, 10:33, 18:33, 20:33</td><td>AC+AM - Cantábrico</td></tr>
                <tr><td>Santander</td><td>72</td><td>05:00, 11:00, 15:00, 21:00</td><td>AC+AM - Cantábrico</td></tr>
                <tr><td>Gijón</td><td>10</td><td>09:00, 21:00</td><td>AC+AM - Cantábrico</td></tr>
                <tr><td>A Coruña</td><td>10</td><td>00:05, 04:05, 08:05, 16:05, 20:05</td><td>AC+AM</td></tr>
                <tr><td>Finisterre</td><td>11</td><td>02:33, 06:33, 10:33, 14:33, 18:33, 22:33</td><td>Pazen, Finisterre, Cantábrico, Porto</td></tr>
                <tr><td>Vigo</td><td>10</td><td>00:15, 04:15, 08:15, 12:15, 16:15, 20:15</td><td>Finisterre, Porto, San Vicente</td></tr>
                <tr><td>Huelva</td><td>10</td><td>04:15, 08:15, 12:15, 20:15</td><td>San Vicente, Cádiz, Estrecho</td></tr>
                <tr><td>Cádiz</td><td>74</td><td>03:15, 07:15, 11:15, 15:15, 19:15, 23:15</td><td>AC+AM - Cádiz, Estrecho</td></tr>
                <tr><td>Tarifa</td><td>10</td><td>00:15, 04:15, 08:15, 12:15, 16:15, 20:15</td><td>AC+AM - Estrecho</td></tr>
                <tr><td>Algeciras</td><td>74</td><td>05:15, 15:15, 23:15</td><td>AC+AM - Alborán, Palos</td></tr>
                <tr><td>Almería</td><td>11</td><td>03:15, 07:15, 11:15, 15:15, 19:15, 23:15</td><td>AC+AM - Alborán, Palos</td></tr>
                <tr><td>Cartagena</td><td>06</td><td>01:15, 05:15, 09:15, 13:15, 17:15, 21:15</td><td>AC+AM - Palos, Cabrera</td></tr>
                <tr><td>Valencia</td><td>10-74</td><td>Verano: 03:15, 12:15, 20:15 / Invierno: 04:15</td><td>AC+AM - Palos, Cabrera, Baleares</td></tr>
                <tr><td>Castellón</td><td>72</td><td>Verano: 07:33, 20:33 / Invierno: 08:33, 21:33</td><td>AC+AM - Baleares</td></tr>
                <tr><td>Tarragona</td><td>74</td><td>Verano: 11:33, 21:33 / Invierno: 12:33, 22:33</td><td>AC+AM - Baleares</td></tr>
                <tr><td>Barcelona</td><td>10</td><td>Verano: 05:00, 14:00, 21:00 / Invierno: 06:00, 15:00, 22:00</td><td>AC+AM - Leon, Menorca, Baleares</td></tr>
                <tr><td>Palma</td><td>10-11</td><td>Verano: 06:35, 09:35, 14:35, 19:35 / Invierno: 07:35, 10:35, 15:35, 20:35</td><td>AC+AM - Menorca, Cabrera, Baleares</td></tr>
                <tr><td>S.C. Tenerife</td><td>72</td><td>00:15, 04:15, 08:15, 12:15, 16:15, 20:15</td><td></td></tr>
            </tbody>
        </table>
    `},
    { category: 'Alfabeto Fonético', content: `...` },
    { category: 'Códigos Q', content: `...` },
    { category: 'Escala Beaufort & Douglas', content: `...` },
    { category: 'Calculadora', content: `...` },
    { category: 'Diccionario', content: `...` }
];
// Note: Content for last 5 items is omitted for brevity as it remains unchanged. It will be copied from the existing file.
QUICK_REFERENCE_DATA[2].content = `...`; // Placeholder for unchanged content
QUICK_REFERENCE_DATA[3].content = `...`;
QUICK_REFERENCE_DATA[4].content = `...`;
QUICK_REFERENCE_DATA[5].content = `...`;
QUICK_REFERENCE_DATA[6].content = `...`;


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
                                            <div class="template-card-actions">
                                                <button class="save-to-log-btn primary-btn-small" aria-label="Guardar en diario: ${item.title}">Guardar en Diario</button>
                                                <button class="copy-btn" aria-label="Copiar ${item.title}">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M4 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2zm2-1a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1zM2 5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-1h-1v1a.5.5 0 0 1-.5.5H2.5a.5.5 0 0 1-.5-.5V6.5a.5.5 0 0 1 .5-.5H3v-1z"/></svg>
                                                    <span>Copiar</span>
                                                </button>
                                            </div>
                                        </div>
                                        <textarea class="styled-textarea template-card-body">${item.template}</textarea>
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
                <div class="wizard-step" data-step="result-pos-in-sar"><div class="procedure-box"><h3>Procedimiento: Válida, con Posición, en Zona SAR (VHF/MF/HF)</h3><ol><li>CCR ACUSE DE RECIBO (ACK).</li><li>VERIFICA POSICIÓN (En puerto no retransmite alerta).</li><li>CCR RETRANSMITE ALERTA.</li><li>CCR A LA ESCUCHA. ESPERA INSTRUCCIONES DEL CCS COORDINADOR.</li><li><b>OCEANO:</b> SAR AUTOMÁTICO CCR Y CNCS -> SÓLO VHF.</li></ol></div></div>
                <div class="wizard-step" data-step="result-pos-out-sar-vhf"><div class="procedure-box"><h3>Procedimiento: Válida, con Posición, fuera de Zona SAR (VHF)</h3><ol><li>CCR NO ACUSE DE RECIBO (NO ACK).</li><li>CCR A LA ESCUCHA A LA ESPERA DE INSTRUCCIONES DEL CNCS.</li><li><b>OCEANO:</b> SAR AUTOMÁTICO CCR Y CNCS -> Sin texto de mensaje.</li></ol></div></div>
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
                <div id="drill-type-selection">
                    <p>Seleccione el tipo de simulacro que desea realizar:</p>
                    <div class="drill-type-options">
                        <button class="secondary-btn" id="drill-dsc-btn" style="width: auto;">Alerta DSC</button>
                        <button class="secondary-btn" id="drill-radio-btn" style="width: auto;">Llamada Radiotelefonía</button>
                    </div>
                </div>
                <div id="drill-loader" class="loader-container" style="display: none;"><div class="loader"></div></div>
                <div id="drill-content" class="drill-content" style="margin-top: 2rem;"></div>
                <button id="drill-restart-btn" class="primary-btn" style="display: none; margin-top: 2rem;">Realizar otro Simulacro</button>
             </div>
        </div>
    `;
    initializeSimulacro();
}


function renderLighthouseSimulator(container: HTMLElement) {
    container.innerHTML = `
        <div class="content-card">
            <h2 class="content-card-title">Simulador de Faros</h2>
            <div class="simulator-display">
                <form id="simulator-form" class="simulator-form" aria-label="Simulador de faros">
                    <input type="text" id="light-char-input" class="simulator-input" placeholder="Ej: Gp Fl(2+1) W 15s" required aria-label="Característica de la luz">
                    <button type="submit" class="simulator-btn">Simular</button>
                </form>
                <div class="lighthouse-schematic" aria-hidden="true">
                    <div class="lighthouse-tower"></div>
                    <div class="lighthouse-top">
                        <div id="lighthouse-light" class="lighthouse-light"></div>
                    </div>
                </div>
                <div id="simulation-info" class="simulation-info" aria-live="polite">
                    <p>Introduzca la característica de una luz y pulse "Simular".</p>
                </div>
            </div>
        </div>
    `;
    initializeLighthouseSimulator();
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

function renderDiario(container: HTMLElement) {
    const logbook = JSON.parse(localStorage.getItem('app_logbook') || '[]');
    
    container.innerHTML = `
        <div class="content-card" style="max-width: 1200px;">
            <h2 class="content-card-title">Diario de Guardia</h2>
            ${logbook.length === 0 ? '<p class="drill-placeholder">No hay eventos registrados en el diario.</p>' : `
            <div id="logbook-list" class="logbook-list">
                ${logbook.slice().reverse().map((entry: any) => `
                    <div class="log-entry" data-id="${entry.id}">
                        <div class="log-entry-header">
                            <span class="log-entry-type">${entry.type}</span>
                            <span class="log-entry-ts">${new Date(entry.timestamp).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'medium' })}</span>
                        </div>
                        <div class="log-entry-content">${renderLogEntryContent(entry)}</div>
                        <div class="log-entry-actions">
                            ${entry.type === 'SOSGEN' ? '<button class="log-edit-btn secondary-btn">Editar</button>' : ''}
                            <button class="log-delete-btn tertiary-btn">Eliminar</button>
                        </div>
                    </div>
                `).join('')}
            </div>
            `}
        </div>
    `;
    
    if (logbook.length > 0) {
        initializeDiario(container);
    }
}

function renderLogEntryContent(entry: any) {
    switch (entry.type) {
        case 'SOSGEN':
            return `
                <div class="log-entry-content-grid-2">
                     <div>
                         <h4>Español</h4>
                         <textarea class="styled-textarea" rows="8" readonly>${entry.content.spanish}</textarea>
                     </div>
                     <div>
                         <h4>Inglés</h4>
                         <textarea class="styled-textarea" rows="8" readonly>${entry.content.english}</textarea>
                     </div>
                </div>`;
        case 'Simulacro DSC':
        case 'Simulacro Radiotelefonía':
            return `
                <div class="log-details">
                    <p><strong>Resultado:</strong> ${entry.content.result}</p>
                    <p><strong>Escenario:</strong></p>
                    <div class="log-scenario">${entry.content.scenario}</div>
                </div>`;
        case 'Conversión Coordenadas':
            return `
                <div class="log-details">
                    <p><strong>Entrada:</strong> ${entry.content.input}</p>
                    <p><strong>Salida (Lat):</strong> ${entry.content.output.lat}</p>
                    <p><strong>Salida (Lon):</strong> ${entry.content.output.lon}</p>
                </div>`;
        case 'Traducción Náutica':
            return `
                <div class="log-details">
                    <p><strong>Entrada:</strong> ${entry.content.input}</p>
                    <p><strong>Salida:</strong> ${entry.content.output}</p>
                </div>`;
        default: // Manual entries from Registro Oceano
            return `<textarea class="styled-textarea" rows="6" readonly>${entry.content.text}</textarea>`;
    }
}

const APP_PAGES: Page[] = [
    { name: 'SOSGEN', contentRenderer: renderSosgen },
    { name: 'Registro Océano', contentRenderer: renderRegistroOceano },
    { name: 'PROTOCOLO', contentRenderer: renderProtocolo },
    { name: 'FAROS', contentRenderer: renderLighthouseSimulator },
    { name: 'SIMULACRO', contentRenderer: renderSimulacro },
    { name: 'DIARIO', contentRenderer: renderDiario },
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
        const needsRefresh = APP_PAGES[pageIndex].name === 'DIARIO';
        if (!activePanel.innerHTML.trim() || needsRefresh) {
            APP_PAGES[pageIndex].contentRenderer(activePanel);
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
    if(initialActivePanel) { APP_PAGES[0].contentRenderer(initialActivePanel); }
}

// --- LOGGING ---
function logAppEvent(type: string, content: object) {
    try {
        const logbook = JSON.parse(localStorage.getItem('app_logbook') || '[]');
        const newEntry = {
            id: Date.now().toString(),
            timestamp: new Date().toISOString(),
            type,
            content
        };
        logbook.push(newEntry);
        localStorage.setItem('app_logbook', JSON.stringify(logbook));
    } catch (e) {
        console.error("Failed to write to logbook:", e);
    }
}


// --- EVENT HANDLERS & LOGIC ---
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

// --- LIGHTHOUSE SIMULATOR LOGIC ---
let simulationTimeoutId: number | null = null;
interface LightConfig { rhythm: string; group: number[]; color: string; period: number; }
const LIGHT_CHARACTERISTIC_TERMS = { 'F': { es: 'Fija', en: 'Fixed' }, 'FL': { es: 'Destellos', en: 'Flashing' }, 'GP FL': { es: 'Grupo de Destellos', en: 'Group Flashing' }, 'LFL': { es: 'Destello Largo', en: 'Long-Flashing' }, 'OC': { es: 'Ocultaciones', en: 'Occulting' }, 'GP OC': { es: 'Grupo de Ocultaciones', en: 'Group Occulting' }, 'ISO': { es: 'Isofase', en: 'Isophase' }, 'W': { es: 'Blanca', en: 'White' }, 'R': { es: 'Roja', en: 'Red' }, 'G': { es: 'Verde', en: 'Green' }, 'Y': { es: 'Amarilla', en: 'Yellow' }, 'BU': { es: 'Azul', en: 'Blue' }, };

function generateCharacteristicDescription(config: LightConfig): string {
    const rhythmTerm = LIGHT_CHARACTERISTIC_TERMS[config.rhythm as keyof typeof LIGHT_CHARACTERISTIC_TERMS];
    const colorTerm = LIGHT_CHARACTERISTIC_TERMS[config.color as keyof typeof LIGHT_CHARACTERISTIC_TERMS];
    if (!rhythmTerm || !colorTerm) return '';
    let groupText = config.group.length > 1 || config.group[0] > 1 ? ` (${config.group.join('+')})` : '';
    const es = `Luz de ${rhythmTerm.es}${groupText}, color ${colorTerm.es.toLowerCase()}, con un período de ${config.period} segundos.`;
    const en = `${rhythmTerm.en}${groupText} light, ${colorTerm.en} color, with a period of ${config.period} seconds.`;
    return `<p class="desc-lang"><strong>ES:</strong> ${es}</p><p class="desc-lang"><strong>EN:</strong> ${en}</p><hr class="info-divider">`;
}

function parseLightCharacteristic(input: string): LightConfig | null {
    const cleanInput = input.trim().toUpperCase();
    const rhythmMatch = cleanInput.match(/^(LFL|GP FL|FL|GP OC|OC|ISO|F)\s*(?:\(([\d\+]+)\))?/);
    const colorMatch = cleanInput.match(/\b(W|R|G|Y|BU)\b/);
    const periodMatch = cleanInput.match(/(\d+(?:\.\d+)?)\s*S/);
    if (!rhythmMatch || !colorMatch || !periodMatch) return null;
    let group: number[] = [1];
    if (rhythmMatch[2]) { group = rhythmMatch[2].includes('+') ? rhythmMatch[2].split('+').map(Number) : [parseInt(rhythmMatch[2], 10)]; }
    return { rhythm: rhythmMatch[1], group, color: colorMatch[1], period: parseFloat(periodMatch[1]) };
}

function runSimulation(lightEl: HTMLElement, infoEl: HTMLElement, config: LightConfig) {
    if (simulationTimeoutId) clearTimeout(simulationTimeoutId);
    lightEl.className = `lighthouse-light ${config.color.toLowerCase()}`;
    let sequence: { state: 'on' | 'off'; duration: number; }[] = [];
    let desc = `<strong>Secuencia:</strong> `;
    const flash = 0.5, longFlash = 2.0, intraEclipse = 1.0, interEclipse = 3.0;
    let time = 0;
    switch (config.rhythm) {
        case 'F': sequence = [{ state: 'on', duration: config.period * 1000 }]; desc += `${config.period}s Luz.`; break;
        case 'LFL': const lflE = (config.period - longFlash) * 1000; sequence = [{ state: 'on', duration: longFlash * 1000 }]; desc += `${longFlash}s Luz`; if (lflE > 0) { sequence.push({ state: 'off', duration: lflE }); desc += `, ${lflE / 1000}s Osc.`; } break;
        case 'ISO': const isoP = (config.period / 2) * 1000; sequence = [{ state: 'on', duration: isoP }, { state: 'off', duration: isoP }]; desc += `${config.period / 2}s Luz, ${config.period / 2}s Osc.`; break;
        case 'OC': case 'GP OC': const totalOcc = config.group.reduce((a, b) => a + b, 0); const occDur = (config.period * 0.4) / totalOcc; const lightDur = (config.period * 0.6) / totalOcc; for (let i = 0; i < totalOcc; i++) { sequence.push({ state: 'on', duration: lightDur * 1000 }, { state: 'off', duration: occDur * 1000 }); desc += `${lightDur.toFixed(1)}s Luz, ${occDur.toFixed(1)}s Osc.` + (i < totalOcc - 1 ? ", " : ""); } break;
        case 'FL': case 'GP FL': config.group.forEach((count, i) => { for (let j = 0; j < count; j++) { sequence.push({ state: 'on', duration: flash * 1000 }); time += flash; desc += `${flash}s Luz`; if (j < count - 1) { sequence.push({ state: 'off', duration: intraEclipse * 1000 }); time += intraEclipse; desc += `, ${intraEclipse}s Osc.`; } } if (i < config.group.length - 1) { sequence.push({ state: 'off', duration: interEclipse * 1000 }); time += interEclipse; desc += `, ${interEclipse}s Osc.`; } }); const finalE = (config.period - time) * 1000; if (finalE > 0) { sequence.push({ state: 'off', duration: finalE }); desc += `, ${finalE / 1000}s Osc.`; } break;
        default: desc = 'Característica no reconocida.';
    }
    infoEl.innerHTML = generateCharacteristicDescription(config) + `<p>${desc}</p>`;
    let idx = 0;
    function next() { if (!sequence.length) return; const step = sequence[idx]; lightEl.classList.toggle('on', step.state === 'on'); simulationTimeoutId = window.setTimeout(() => { idx = (idx + 1) % sequence.length; next(); }, step.duration); }
    if (sequence.length > 0) next(); else lightEl.classList.remove('on');
}

function initializeLighthouseSimulator() {
    const form = document.getElementById('simulator-form') as HTMLFormElement | null;
    const input = document.getElementById('light-char-input') as HTMLInputElement | null;
    const lightEl = document.getElementById('lighthouse-light');
    const infoEl = document.getElementById('simulation-info');
    if (!form || !input || !lightEl || !infoEl) return;
    form.addEventListener('submit', (e) => { e.preventDefault(); const config = parseLightCharacteristic(input.value); if (config) { runSimulation(lightEl, infoEl, config); } else { if (simulationTimeoutId) clearTimeout(simulationTimeoutId); lightEl.classList.remove('on'); infoEl.innerHTML = '<p class="error">Formato no válido.</p>'; } });
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

            const esMsg = `MAYDAY RELAY (x3)\nAQUI ${fullStationName} (x3)\nMAYDAY\nINFORMACION Nº ${infoNumber} A ${utcTime} UTC.\n\n${extractedData.spanishDescription}\n\nSE REQUIERE A TODOS LOS BARCOS EN LA ZONA, EXTREMAR LA VIGILANCIA, ASISTIR SI ES NECESARIO, E INFORMAR A SALVAMENTO MARITIMO ${mrcc} O ESTACION RADIO COSTERA MAS PROXIMA.\nAQUI ${fullStationName} A ${utcTime} UTC.`;
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

            logAppEvent('SOSGEN', { spanish: esMsg, english: enMsg });
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

        if (!latResult.error && !lonResult.error) {
            logAppEvent('Conversión Coordenadas', {
                input: input,
                output: { lat: latResult.text, lon: lonResult.text }
            });
        }
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
            logAppEvent('Traducción Náutica', { input: textToTranslate, output: data.translation });

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
            const textarea = card?.querySelector('textarea');
            if(textarea) {
                handleCopy(copyBtn, textarea.value);
            }
        }
        
        const saveBtn = target.closest('.save-to-log-btn');
        if (saveBtn instanceof HTMLButtonElement) {
            const card = saveBtn.closest('.template-card');
            const title = card?.querySelector('.template-card-title')?.textContent;
            const text = card?.querySelector('textarea')?.value;
            if (title && text) {
                logAppEvent(title, { text });
                const originalText = saveBtn.textContent;
                saveBtn.textContent = 'Guardado!';
                saveBtn.disabled = true;
                setTimeout(() => {
                    saveBtn.textContent = originalText;
                    saveBtn.disabled = false;
                }, 2000);
            }
        }
    });
}

function initializeInfoTabs(container: HTMLElement) {
    const tabsContainer = container.querySelector('.info-nav-tabs');
    const contentContainer = container.querySelector('.info-content');
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

async function startDrill(drillType: 'dsc' | 'radiotelephony') {
    const drillContent = document.getElementById('drill-content') as HTMLDivElement;
    const loader = document.getElementById('drill-loader') as HTMLDivElement;
    const typeSelection = document.getElementById('drill-type-selection') as HTMLDivElement;
    const restartBtn = document.getElementById('drill-restart-btn') as HTMLButtonElement;

    if (!drillContent || !loader || !typeSelection || !restartBtn) return;
    
    drillContent.innerHTML = '';
    loader.style.display = 'flex';
    typeSelection.style.display = 'none';
    restartBtn.style.display = 'none';

    try {
        const apiResponse = await fetch('/api/simulacro', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: drillType }),
        });
        if (!apiResponse.ok) {
            const errorData = await apiResponse.json();
            throw new Error(errorData.details || 'La API devolvió un error.');
        }
        
        const drillData = await apiResponse.json();
        if (drillData.type === 'dsc') {
            displayDscDrill(drillData, drillContent);
        } else if (drillData.type === 'radiotelephony') {
            displayInteractiveDrill(drillData, drillContent);
        }
        restartBtn.style.display = 'block';

    } catch (error) {
        console.error("Drill Generation Error:", error);
        drillContent.innerHTML = `<p class="error">No se pudo generar el simulacro. Inténtelo de nuevo.</p>`;
        restartBtn.style.display = 'block';
    } finally {
        loader.style.display = 'none';
    }
}

function initializeSimulacro() {
    const dscBtn = document.getElementById('drill-dsc-btn') as HTMLButtonElement;
    const radioBtn = document.getElementById('drill-radio-btn') as HTMLButtonElement;
    const restartBtn = document.getElementById('drill-restart-btn') as HTMLButtonElement;
    const drillContent = document.getElementById('drill-content') as HTMLDivElement;
    const typeSelection = document.getElementById('drill-type-selection') as HTMLDivElement;

    if (!dscBtn || !radioBtn || !restartBtn || !typeSelection) return;

    dscBtn.addEventListener('click', () => startDrill('dsc'));
    radioBtn.addEventListener('click', () => startDrill('radiotelephony'));
    restartBtn.addEventListener('click', () => {
        typeSelection.style.display = 'block';
        drillContent.innerHTML = '';
        restartBtn.style.display = 'none';
    });
}


function displayDscDrill(data: any, container: HTMLDivElement) {
    let html = `<div class="drill-scenario">${data.scenario}</div><div class="drill-questions">`;
    data.questions.forEach((q: any, index: number) => {
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
    container.innerHTML = html;

    const checkBtn = container.querySelector('#drill-check-btn');
    checkBtn?.addEventListener('click', () => {
        const resultText = checkDscDrillAnswers(data, container);
        logAppEvent('Simulacro DSC', { scenario: data.scenario, result: resultText });
        if (checkBtn instanceof HTMLButtonElement) checkBtn.disabled = true;
    }, { once: true });
}

function checkDscDrillAnswers(data: any, container: HTMLDivElement): string {
    let score = 0;
    data.questions.forEach((q: any, index: number) => {
        const questionBlock = container.querySelector(`#question-${index}`) as HTMLElement;
        const correctAnswerIndex = parseInt(q.correctAnswerIndex, 10);
        const selectedOption = container.querySelector<HTMLInputElement>(`input[name="question-${index}"]:checked`);
        
        const options = questionBlock.querySelectorAll('.answer-option');
        options.forEach(opt => {
            opt.classList.add('disabled');
            opt.querySelector('input')?.setAttribute('disabled', 'true');
        });
        options[correctAnswerIndex].classList.add('correct');

        if (selectedOption) {
            const selectedAnswerIndex = parseInt(selectedOption.value, 10);
            if (selectedAnswerIndex === correctAnswerIndex) {
                score++;
            } else {
                if(options[selectedAnswerIndex]) {
                    options[selectedAnswerIndex].classList.add('incorrect');
                }
            }
        }
    });

    const resultText = `${score} de ${data.questions.length} correctas`;
    const resultsEl = container.querySelector('#drill-results') as HTMLDivElement;
    resultsEl.innerHTML = `<h3>Resultado: ${resultText}</h3>`;
    return resultText;
}

function displayInteractiveDrill(data: any, container: HTMLDivElement) {
    let currentQuestionIndex = 0;
    let score = 0;

    // Robust cleanup: Remove any handler that might be lingering from a previous, unfinished drill.
    if ((container as any).__interactiveDrillHandler) {
        container.removeEventListener('change', (container as any).__interactiveDrillHandler);
        delete (container as any).__interactiveDrillHandler;
    }

    function renderQuestion(index: number) {
        const q = data.questions[index];
        const questionHtml = `
            <div class="question-block" data-question-index="${index}">
                <p class="question-text">${index + 1}. ${q.questionText}</p>
                <div class="answer-options">
                     ${q.options.map((opt: string, optIndex: number) => `
                        <label class="answer-option" for="q${index}-opt${optIndex}">
                            <input type="radio" name="question-${index}" id="q${index}-opt${optIndex}" value="${optIndex}">
                            <span>${opt}</span>
                        </label>
                    `).join('')}
                </div>
                <div class="drill-feedback"></div>
            </div>
        `;
        const questionContainer = container.querySelector('.drill-questions') as HTMLDivElement;
        if(questionContainer) {
            questionContainer.innerHTML += questionHtml;
        }
    }

    container.innerHTML = `
        <div class="drill-scenario">${data.scenario}</div>
        <div class="drill-questions"></div>
        <div id="drill-results" class="drill-results-summary"></div>
    `;

    renderQuestion(currentQuestionIndex);
    
    const interactiveDrillHandler = (event: Event) => {
        const target = event.target as HTMLInputElement;
        if (target.type !== 'radio') return;

        const questionBlock = target.closest('.question-block') as HTMLElement;
        if (!questionBlock || questionBlock.dataset.answered) return;
        questionBlock.dataset.answered = 'true';

        const qIndex = parseInt(questionBlock.dataset.questionIndex || '0', 10);
        const questionData = data.questions[qIndex];
        const correctAnswerIndex = questionData.correctAnswerIndex;
        const selectedAnswerIndex = parseInt(target.value, 10);

        const options = questionBlock.querySelectorAll('.answer-option');
        options.forEach(opt => {
            opt.classList.add('disabled');
            opt.querySelector('input')?.setAttribute('disabled', 'true');
        });

        const feedbackEl = questionBlock.querySelector('.drill-feedback') as HTMLDivElement;
        
        if (selectedAnswerIndex === correctAnswerIndex) {
            score++;
            options[selectedAnswerIndex].classList.add('correct');
            feedbackEl.classList.add('correct');
            feedbackEl.innerHTML = `<strong>Correcto.</strong> ${questionData.feedback}`;
        } else {
            options[selectedAnswerIndex].classList.add('incorrect');
            options[correctAnswerIndex].classList.add('correct');
            feedbackEl.classList.add('incorrect');
            feedbackEl.innerHTML = `<strong>Incorrecto.</strong> ${questionData.feedback}`;
        }

        currentQuestionIndex++;
        if (currentQuestionIndex < data.questions.length) {
            setTimeout(() => renderQuestion(currentQuestionIndex), 1000);
        } else {
            const resultText = `${score} de ${data.questions.length} correctas`;
            const resultsEl = container.querySelector('#drill-results') as HTMLDivElement;
            if (resultsEl) {
                resultsEl.innerHTML = `
                    <h3>Resultado Final: ${resultText}</h3>
                    <h4>Resumen del Escenario Completo:</h4>
                    <p class="drill-full-details">${data.fullDetails}</p>
                `;
            }
            logAppEvent('Simulacro Radiotelefonía', { scenario: data.fullDetails, result: resultText });
            
            // Final cleanup of the current handler
            if ((container as any).__interactiveDrillHandler) {
                container.removeEventListener('change', (container as any).__interactiveDrillHandler);
                delete (container as any).__interactiveDrillHandler;
            }
        }
    };
    
    // Store a reference to the handler on the container and add the listener.
    // This allows for robust cleanup at the start of the next drill.
    (container as any).__interactiveDrillHandler = interactiveDrillHandler;
    container.addEventListener('change', interactiveDrillHandler);
}


function initializeDiario(container: HTMLElement) {
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
            const spanishText = (entryEl.querySelector('.log-entry-sosgen-grid textarea:nth-child(1)') as HTMLTextAreaElement)?.value;
            const englishText = (entryEl.querySelector('.log-entry-sosgen-grid textarea:nth-child(2)') as HTMLTextAreaElement)?.value;
            
            let logbook = JSON.parse(localStorage.getItem('app_logbook') || '[]');
            const entryIndex = logbook.findIndex((entry: any) => entry.id === entryId);
            if (entryIndex > -1) {
                logbook[entryIndex].content.spanish = spanishText;
                logbook[entryIndex].content.english = englishText;
                localStorage.setItem('app_logbook', JSON.stringify(logbook));
            }

            const textareas = entryEl.querySelectorAll('textarea');
            textareas.forEach(ta => ta.readOnly = true);
            target.textContent = 'Editar';
            target.classList.add('log-edit-btn', 'secondary-btn');
            target.classList.remove('log-save-btn', 'primary-btn-small');
            entryEl.classList.remove('editing');
        }

        if (target.classList.contains('log-delete-btn')) {
            if (confirm('¿Está seguro de que desea eliminar esta entrada del diario?')) {
                let logbook = JSON.parse(localStorage.getItem('app_logbook') || '[]');
                const updatedLogbook = logbook.filter((entry: any) => entry.id !== entryId);
                localStorage.setItem('app_logbook', JSON.stringify(updatedLogbook));
                entryEl.style.animation = 'fadeOut 0.5s ease forwards';
                entryEl.addEventListener('animationend', () => {
                    entryEl.remove();
                     if (updatedLogbook.length === 0 && container) {
                        renderDiario(container); // Re-render to show empty message
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

function migrateLogbook() {
    const oldLog = localStorage.getItem('sosgen_logbook');
    const newLog = localStorage.getItem('app_logbook');
    if (oldLog && !newLog) {
        localStorage.setItem('app_logbook', oldLog);
        // We can remove the old logbook to clean up, but it's safer to leave it
        // in case of issues. Let's leave it for now.
        // localStorage.removeItem('sosgen_logbook');
    }
}


document.addEventListener('DOMContentLoaded', () => {
    migrateLogbook();
    const appContainer = document.getElementById('app');
    if (appContainer) {
        renderApp(appContainer);
        addEventListeners(appContainer);
        initializeTheme();
    }
});