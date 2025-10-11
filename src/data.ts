
// --- DATA STRUCTURES ---
export interface Template { title: string; template: string; }
export interface Category { category: string; items: Template[]; }
export interface QuickRef { category: string; content: string; }
export interface PhoneEntry { name: string; phones: string[]; fax?: string; email?: string; keywords: string[]; }
export interface Page { name: string; }
export type ReferenceTableData = {
    caption: string;
    captionClass: string;
    headers: string[];
    rows: string[][];
}[];

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
    { name: 'CCR CORUÑA', phones: ['981 904 756', 'Consola: 123020'], keywords: ['ccr', 'coruña', 'galicia'] },
    { name: 'CCR LAS PALMAS', phones: ['928 001 690', 'Consola: 133033'], keywords: ['ccr', 'canarias', 'gran canaria'] },
    { name: 'CCR VALENCIA', phones: ['961 027 440', 'Consola: 113010'], keywords: ['ccr', 'comunidad valenciana'] },
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

export const VHF_FREQUENCIES_DATA: ReferenceTableData = [
    {
        caption: 'CCR LA CORUÑA (002241022)',
        captionClass: 'header-coruna',
        headers: ['EECC', 'Canal Retevisión', 'Canal Sasemar'],
        rows: [
            ['Pasajes', '27', '6'], ['Bilbao', '26', '74'], ['Santander', '24', '72'], ['Cabo Peñas', '27', '6'],
            ['Navia', '62', '74'], ['Cabo Ortegal', '2', '72'], ['Coruña', '26', '6'], ['Finisterre', '22', '74'],
            ['Vigo', '20', '6'], ['La Guardia', '82', '72']
        ]
    },
    {
        caption: 'CCR VALENCIA (002241024)',
        captionClass: 'header-valencia',
        headers: ['EECC', 'Canal Retevisión', 'Canal Sasemar'],
        rows: [
            ['Cabo de Gata', '24', '72'], ['Melilla', '25', '6'], ['Cartagena', '27', '6'], ['Cabo la Nao', '85', '74'],
            ['Castellón', '28', '72'], ['Tarragona', '24', '6'], ['Barcelona', '60', '74'], ['Begur', '23', '6'],
            ['Cadaqués', '27', '72'], ['Menorca', '85', '6'], ['Palma', '7', '72'], ['Ibiza', '3', '6']
        ]
    },
    {
        caption: 'CCR LAS PALMAS (002241026)',
        captionClass: 'header-laspalmas',
        headers: ['EECC', 'Canal Retevisión', 'Canal Sasemar'],
        rows: [
            ['Huelva', '26', '6'], ['Cádiz', '28', '74'], ['Tarifa', '83', '6'], ['Málaga', '26', '72'],
            ['Motril', '81', '74'], ['La Palma', '20', '6'], ['Hierro', '23', '74'], ['Gomera', '24', '6'],
            ['Tenerife', '27', '72'], ['Las Palmas', '26', '74'], ['Fuerteventura', '22', '6'],
            ['Yaiza', '3', '74'], ['Arrecife', '25', '72'], ['Restinga', '2', '72'], ['Garafía', '60', '74']
        ]
    }
];

export const PHONETIC_ALPHABET_DATA = {
    headers: ['Letra', 'Código', 'Letra', 'Código'],
    rows: [
        ['A', 'Alfa', 'N', 'November'], ['B', 'Bravo', 'O', 'Oscar'], ['C', 'Charlie', 'P', 'Papa'],
        ['D', 'Delta', 'Q', 'Quebec'], ['E', 'Echo', 'R', 'Romeo'], ['F', 'Foxtrot', 'S', 'Sierra'],
        ['G', 'Golf', 'T', 'Tango'], ['H', 'Hotel', 'U', 'Uniform'], ['I', 'India', 'V', 'Victor'],
        ['J', 'Juliett', 'W', 'Whiskey'], ['K', 'Kilo', 'X', 'X-ray'], ['L', 'Lima', 'Y', 'Yankee'],
        ['M', 'Mike', 'Z', 'Zulu']
    ]
};

export const Q_CODES_DATA = {
    headers: ['Código', 'Significado'],
    rows: [
        ['QTH', '¿Cuál es su posición? / Mi posición es...'],
        ['QSO', '¿Puede comunicar con...? / Puedo comunicar con...'],
        ['QRZ', '¿Quién me llama? / Le llama...'],
        ['QRT', '¿Debo cesar la transmisión? / Cese la transmisión.'],
        ['QRV', '¿Está usted listo? / Estoy listo.'],
        ['QSL', '¿Puede acusar recibo? / Acuso recibo.'],
        ['QSY', '¿Debo cambiar de frecuencia? / Cambie a la frecuencia...']
    ]
};

export const BEAUFORT_SCALE_DATA = {
    headers: ['Fuerza', 'Denominación / Designation', 'Nudos', 'Estado del Mar / Sea State'],
    rows: [
        ['0', 'Calma / Calm', '< 1', 'Espejo / Like a mirror'],
        ['1', 'Ventolina / Light air', '1-3', 'Rizos / Ripples'],
        ['2', 'Brisa muy débil / Light breeze', '4-6', 'Olas pequeñas / Small wavelets'],
        ['3', 'Brisa débil / Gentle breeze', '7-10', 'Borreguillos dispersos / Scattered white horses'],
        ['4', 'Brisa moderada / Moderate breeze', '11-16', 'Borreguillos frecuentes / Frequent white horses'],
        ['5', 'Brisa fresca / Fresh breeze', '17-21', 'Olas moderadas, muchos borreguillos / Moderate waves, many white horses'],
        ['6', 'Brisa fuerte / Strong breeze', '22-27', 'Olas grandes, crestas rompientes / Large waves, white foam crests'],
        ['7', 'Viento fuerte / Near gale', '28-33', 'Mar gruesa, espuma en vetas / Sea heaps up, foam in streaks'],
        ['8', 'Temporal / Gale', '34-40', 'Mar muy gruesa, rompientes / Moderately high waves, breaking crests'],
        ['9', 'Temporal fuerte / Strong gale', '41-47', 'Mar arbolada, visibilidad reducida / High waves, reduced visibility'],
        ['10', 'Temporal duro / Storm', '48-55', 'Mar muy arbolada, superficie blanca / Very high waves, surface white'],
        ['11', 'Temporal muy duro / Violent storm', '56-63', 'Mar montañosa, visibilidad muy mala / Exceptionally high waves, poor visibility'],
        ['12', 'Huracán / Hurricane', '> 64', 'Mar excepcional, aire lleno de espuma / Air filled with foam and spray']
    ]
};

export const DOUGLAS_SCALE_DATA = {
    headers: ['Grado', 'Descripción / Description', 'Altura de Olas (m) / Wave Height (m)'],
    rows: [
        ['0', 'Calma / Calm', '0'],
        ['1', 'Mar rizada / Rippled', '0 - 0.1'],
        ['2', 'Mar llana / Smooth', '0.1 - 0.5'],
        ['3', 'Marejadilla / Slight', '0.5 - 1.25'],
        ['4', 'Marejada / Moderate', '1.25 - 2.5'],
        ['5', 'Fuerte marejada / Rough', '2.5 - 4'],
        ['6', 'Mar gruesa / Very rough', '4 - 6'],
        ['7', 'Mar muy gruesa / High', '6 - 9'],
        ['8', 'Mar arbolada / Very high', '9 - 14'],
        ['9', 'Mar montañosa / Phenomenal', '> 14']
    ]
};

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
