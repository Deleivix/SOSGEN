

// --- DATA STRUCTURES ---
export interface Template { title: string; template: string; }
export interface Category { category: string; items: Template[]; }
export interface QuickRef { category: string; content: string; }
export interface PhoneEntry { name: string; phones: string[]; fax?: string; email?: string; keywords: string[]; }
export interface Page { name: string; }

export const APP_PAGE_ICONS = [
    // Dashboard: Home
    `<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>`,
    // SOSGEN: Lifebuoy
    `<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><circle cx="12"cy="12" r="4"></circle><line x1="4.93" y1="4.93" x2="9.17" y2="9.17"></line><line x1="14.83" y1="14.83" x2="19.07" y2="19.07"></line><line x1="14.83" y1="9.17" x2="19.07" y2="4.93"></line><line x1="4.93" y1="19.07" x2="9.17" y2="14.83"></line></svg>`,
    // Registro Océano: Clipboard
    `<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>`,
    // PROTOCOLO: Network/Flowchart
    `<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>`,
    // Radioavisos: Radio Tower
    `<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4.9 16.1C1 12.2 1 5.8 4.9 1.9"/><path d="M19.1 1.9a10 10 0 0 1 0 14.1"/><path d="M7.8 13.2a6 6 0 0 1 8.4 0"/><path d="M10.6 10.4a2 2 0 0 1 2.8 0"/><path d="M12 18v4"/><path d="m9 18 3 4 3-4"/></svg>`,
    // METEOS: Cloud
    `<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"></path></svg>`,
    // SEÑALES: Lighthouse Icon
    `<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L6 8v12h12V8L12 2z"/><path d="M6 14h12"/><path d="M10 18h4v-4h-4v4z"/><path d="M2 5l4 3"/><path d="M22 5l-4 3"/></svg>`,
    // SIMULACRO: Target
    `<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle></svg>`,
    // INFO: Info circle
    `<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`
];

export const APP_PAGES: Page[] = [
    { name: 'HOME' },
    { name: 'SOSGEN' },
    { name: 'Registro Océano' },
    { name: 'PROTOCOLO' },
    { name: 'Radioavisos' },
    { name: 'METEOS' },
    { name: 'SEÑALES' },
    { name: 'SIMULACRO' },
    { name: 'INFO' },
];

export const STATIONS_VHF = [
    "La Guardia VHF", "Vigo VHF", "Finisterre VHF", "Coruña VHF", "Ortegal VHF",
    "Navia VHF", "Peñas VHF", "Santander VHF", "Bilbao VHF", "Pasajes VHF"
];
export const STATIONS_MF = ["Finisterre MF", "Coruña MF", "Machichaco MF"];
export const ALL_STATIONS = [...STATIONS_VHF, ...STATIONS_MF];

export const REGISTRO_OCEANO_DATA: Category[] = [
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

export const PHONE_DIRECTORY_DATA: PhoneEntry[] = [
    { name: 'CNCS', phones: ['917 559 132', '917 559 133', '917 559 138', '608 229 010'], fax: '915 26 14 40', email: 'cncs@sasemar.es', keywords: ['madrid', 'nacional'] },
    { name: 'RADIOAVISOS', phones: ['917 559 191'], fax: '917 55 91 92', email: 'radioavisos.cncs@sasemar.es', keywords: ['navtex', 'avisos'] },
    { name: 'CCS BILBAO', phones: ['944 839 286', '944 837 053', '690 608 803'], fax: '944 83 91 61', email: 'bilbao@sasemar.es', keywords: ['bizkaia', 'euskadi'] },
    { name: 'CCS SANTANDER', phones: ['942 21 30 60', '942 21 30 30', '690 615 645', '609 430 310'], fax: '942 21 36 38', email: 'santander@sasemar.es', keywords: ['cantabria'] },
    { name: 'CCS GIJÓN', phones: ['985 326 050', '985 326 373', '985 300 475', '690 634 123', '629 837 682'], fax: '985 32 09 08', email: 'gijon@sasemar.es', keywords: ['asturias'] },
    { name: 'CCS A CORUÑA', phones: ['981 209 548', '981 270 405', '606 195 875', '981 904 756', '123020'], fax: '981 20 95 18', email: 'coruna@sasemar.es', keywords: ['galicia'] },
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
    { name: 'CCS VALENCIA', phones: ['963 679 204', '963 679 302', '961 027 440', '113010'], fax: '963 67 94 03', email: 'valencia@sasemar.es', keywords: ['comunidad valenciana'] },
    { name: 'CCS CASTELLÓN', phones: ['964 737 202', '964 737 187'], fax: '964 73 71 05', email: 'castellon@sasemar.es', keywords: ['comunidad valenciana'] },
    { name: 'CCS TARRAGONA', phones: ['977 216 203', '977 216 215'], fax: '977 21 62 09', email: 'tarragona@sasemar.es', keywords: ['cataluña'] },
    { name: 'CCS BARCELONA', phones: ['932 234 759', '932 234 748'], fax: '932 23 46 13', email: 'barcelona@sasemar.es', keywords: ['cataluña'] },
    { name: 'CCS PALMA', phones: ['971 724 562'], fax: '971 72 83 52', email: 'palma@sasemar.es', keywords: ['baleares', 'mallorca'] },
    { name: 'CCS TENERIFE', phones: ['922 597 551', '922 597 550'], fax: '922 59 73 31', email: 'tenerife@sasemar.es', keywords: ['canarias'] },
    { name: 'CCS LAS PALMAS', phones: ['928 467 955', '928 467 965', '928 467 757', '618 068 005', '928 001 690', '133033'], fax: '928 46 77 60', email: 'laspalmas@sasemar.es', keywords: ['canarias', 'gran canaria'] }
];

export const QUICK_REFERENCE_DATA: QuickRef[] = [
    { category: 'Buscador MMSI', content: `...` },
    { category: 'Directorio', content: `...` },
    { category: 'Frecuencias', content: `...` },
    { category: 'Alfabeto Fonético', content: `...` },
    { category: 'Códigos Q', content: `...` },
    { category: 'Escalas', content: `...` },
    { category: 'Calculadora', content: `...` },
    { category: 'Diccionario', content: `...` }
];

export const DAILY_TIPS: string[] = [
    "Recuerde: 'MAYDAY' es para socorro inminente. 'PAN PAN' para urgencia y 'SÉCURITÉ' para seguridad.",
    "Al recibir una alerta DSC, no acuse de recibo (ACK) inmediatamente si no está en la zona SAR. Primero escuche.",
    "La fraseología correcta para acusar recibo de un MAYDAY por voz es: 'MAYDAY, [nombre del buque], THIS IS [su estación], RECEIVED MAYDAY'.",
    "Mantenga la calma durante una emergencia. Hable claro y pausado para asegurar que su mensaje sea entendido.",
    "El Canal 16 de VHF es exclusivamente para llamadas de socorro, urgencia, seguridad y llamadas iniciales.",
    "Una prueba de radio (radiocheck) se solicita diciendo 'RADIOTEST' o 'RADIOCHECK', no diciendo 'MAYDAY TEST'.",
    "La información más crítica a obtener en una llamada de socorro es: Posición, Naturaleza del peligro y Número de personas a bordo (POB).",
    "Si abandona el buque, recuerde llevar la radiobaliza (EPIRB) y una radio VHF portátil con usted.",
    "El silencio en las comunicaciones se impone con 'SEELONCE MAYDAY' por la estación al cargo de la emergencia."
];

export const LIGHT_CHARACTERISTIC_TERMS: { [key: string]: { es: string; en: string } } = {
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

export const IALA_BUOY_DATA = [
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