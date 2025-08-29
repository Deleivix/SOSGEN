import { LIGHT_CHARACTERISTIC_TERMS } from "../data";

// --- SIMULATION STATE ---
let simulationTimeoutId: number | null = null;
let currentBuoySimId: number | null = null;
interface LightConfig {
    rhythm: string;
    group: (string | number)[];
    color: string;
    period: number;
    altColor?: string;
}

// --- LIGHTHOUSE SIMULATOR ---
export function initializeLighthouseSimulator() {
    const form = document.getElementById('lighthouse-simulator-form') as HTMLFormElement;
    const input = document.getElementById('lighthouse-char-input') as HTMLInputElement;
    const lightElement = document.getElementById('lighthouse-light') as HTMLElement;
    const infoElement = document.getElementById('lighthouse-simulation-info') as HTMLElement;

    if (!form || !input || !lightElement || !infoElement) return;

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        // Clear previous simulation
        if (simulationTimeoutId) clearTimeout(simulationTimeoutId);
        simulationTimeoutId = null;
        lightElement.className = 'lighthouse-light';

        const characteristic = input.value.trim();
        if (!characteristic) {
            infoElement.innerHTML = '<p>Introduzca la característica de una luz y pulse "Simular".</p>';
            return;
        }

        const config = parseLightCharacteristic(characteristic);

        if ('error' in config) {
            infoElement.innerHTML = `<p class="error">${(config as any).error}</p>`;
        } else {
            infoElement.innerHTML = generateCharacteristicDescription(config as LightConfig);
            runSimulation(config as LightConfig, lightElement);
        }
    });
}


// --- BUOY & MARKS SIMULATOR ---
export function initializeBuoySimulator(buoyData: any[]) {
    const regionToggle = document.getElementById('buoy-region-input') as HTMLInputElement | null;
    const regionSelectorContainer = document.getElementById('buoy-region-selector') as HTMLElement | null;
    const categorySelector = document.getElementById('buoy-category-selector') as HTMLElement | null;
    const typeSelector = document.getElementById('buoy-type-selector') as HTMLElement | null;
    const lightElement = document.getElementById('buoy-light') as HTMLElement | null;
    const infoPanel = document.getElementById('buoy-info-panel') as HTMLElement | null;
    const schematicContainer = document.getElementById('buoy-schematic-container') as HTMLElement | null;

    if (!regionToggle || !categorySelector || !typeSelector || !lightElement || !infoPanel || !schematicContainer || !regionSelectorContainer) return;

    const categories = [...new Set(buoyData.map(b => b.category))];

    const updateUI = () => {
        // Stop previous simulation
        if (currentBuoySimId) clearTimeout(currentBuoySimId);
        currentBuoySimId = null;
        lightElement.className = 'buoy-light-el'; // Reset light classes

        const selectedRegion = regionToggle.checked ? 'B' : 'A';
        const selectedCategory = categorySelector.querySelector<HTMLButtonElement>('.active')?.dataset.category;
        const selectedType = typeSelector.querySelector<HTMLButtonElement>('.active')?.dataset.type;

        regionSelectorContainer.style.display = selectedCategory === 'Laterales' || selectedCategory === 'Canal Preferido' ? 'flex' : 'none';

        if (!selectedCategory || !selectedType) {
            infoPanel.innerHTML = '<p>Seleccione una categoría y un tipo de señal.</p>';
            schematicContainer.innerHTML = '';
            return;
        }

        const buoy = buoyData.find(b =>
            b.category === selectedCategory &&
            b.type === selectedType &&
            (b.region === selectedRegion || b.region === 'Both')
        );

        if (!buoy) {
            infoPanel.innerHTML = `<p class="error">Señal no encontrada para la región ${selectedRegion}.</p>`;
            schematicContainer.innerHTML = '';
            return;
        }

        infoPanel.innerHTML = `<h4>${buoy.type} (${buoy.category})</h4><p><strong>Característica:</strong> ${buoy.light.characteristic}</p><p class="purpose-text">${buoy.purpose}</p>`;
        schematicContainer.innerHTML = generateBuoySVG(buoy);

        const config = parseLightCharacteristic(buoy.light.characteristic);
        if (!('error' in config)) {
            runSimulation(config as LightConfig, lightElement);
        }
    };

    const populateTypes = (category: string) => {
        const types = [...new Set(buoyData.filter(b => b.category === category).map(b => b.type))];
        typeSelector.innerHTML = types.map(t => `<button class="buoy-selector-btn" data-type="${t}">${t}</button>`).join('');
        if (types.length > 0) {
            typeSelector.querySelector<HTMLButtonElement>('button')?.classList.add('active');
        }
    };

    categorySelector.innerHTML = categories.map(c => `<button class="buoy-selector-btn" data-category="${c}">${c}</button>`).join('');
    
    categorySelector.addEventListener('click', e => {
        const target = e.target as HTMLElement;
        if (target.tagName === 'BUTTON') {
            categorySelector.querySelectorAll('button').forEach(b => b.classList.remove('active'));
            target.classList.add('active');
            populateTypes(target.dataset.category!);
            updateUI();
        }
    });

    typeSelector.addEventListener('click', e => {
        const target = e.target as HTMLElement;
        if (target.tagName === 'BUTTON') {
            typeSelector.querySelectorAll('button').forEach(b => b.classList.remove('active'));
            target.classList.add('active');
            updateUI();
        }
    });
    
    regionToggle.addEventListener('change', updateUI);
    categorySelector.querySelector<HTMLButtonElement>('button')?.click();
}


// --- PARSING LOGIC ---
function parseLightCharacteristic(input: string): LightConfig | { error: string } {
    let str = input.trim().toUpperCase().replace(/\./g, '');
    const result: Partial<LightConfig> = { group: [] };

    const periodMatch = str.match(/(\d+(\.\d+)?)S$/);
    result.period = periodMatch ? parseFloat(periodMatch[1]) : 10; // Default 10s
    if(periodMatch) str = str.replace(periodMatch[0], '').trim();

    const colorMatch = str.match(/(W|R|G|Y|BU)(-)?(W|R|G|Y|BU)?$/);
    if (colorMatch) {
        result.color = colorMatch[1];
        if (colorMatch[2] && colorMatch[3]) result.altColor = colorMatch[3];
        str = str.replace(colorMatch[0], '').trim();
    } else {
        result.color = 'W';
    }

    // Handle group prefix like Gp, Gr
    if (str.startsWith('GP') || str.startsWith('GR')) {
        str = str.substring(2).trim();
    }
    
    const rhythmKeys = Object.keys(LIGHT_CHARACTERISTIC_TERMS).sort((a, b) => b.length - a.length);
    for (const key of rhythmKeys) {
        if (str.startsWith(key)) {
            result.rhythm = key;
            str = str.substring(key.length).trim();
            break;
        }
    }

    if (!result.rhythm) return { error: "Ritmo de luz no reconocido." };

    const groupMatch = str.match(/\(([^)]+)\)/);
    if (groupMatch) {
        result.group = result.rhythm === 'MO' ? [groupMatch[1]] : groupMatch[1].split('+').map(g => parseInt(g.trim(), 10));
    } else if (/^\d+$/.test(str)) {
        result.group = [parseInt(str, 10)];
    }

    return result as LightConfig;
}


// --- DESCRIPTION GENERATION ---
function generateCharacteristicDescription(config: LightConfig): string {
    const { rhythm, group, color, period, altColor } = config;

    if (!LIGHT_CHARACTERISTIC_TERMS[rhythm]) return '<p class="error">Característica no reconocida.</p>';
    
    let esDesc = "Luz ";
    let enDesc = "";

    const addGroupInfo = (termKey: string) => {
        if (group.length > 0 && !(group.length === 1 && group[0] === 1)) {
            esDesc += `de Grupo ${LIGHT_CHARACTERISTIC_TERMS[termKey].es}`;
            enDesc += `Group ${LIGHT_CHARACTERISTIC_TERMS[termKey].en}`;
            if (group.length > 1) { // Composite group e.g. (2+1)
                esDesc += ` Compuesto (${group.join('+')})`;
                enDesc += ` Composite (${group.join('+')})`;
            } else {
                esDesc += ` (${group[0]})`;
                enDesc += ` (${group[0]})`;
            }
        } else {
            esDesc += LIGHT_CHARACTERISTIC_TERMS[termKey].es;
            enDesc += LIGHT_CHARACTERISTIC_TERMS[termKey].en;
        }
    };
    
    if (rhythm === 'MO') {
        esDesc += `${LIGHT_CHARACTERISTIC_TERMS['MO'].es} (${group[0]})`;
        enDesc += `${LIGHT_CHARACTERISTIC_TERMS['MO'].en} (${group[0]})`;
    } else if (rhythm === 'AL') {
        esDesc += LIGHT_CHARACTERISTIC_TERMS['AL'].es;
        enDesc += LIGHT_CHARACTERISTIC_TERMS['AL'].en;
    } else {
        addGroupInfo(rhythm);
    }

    if (altColor) {
        esDesc += ` ${LIGHT_CHARACTERISTIC_TERMS[color].es.toLowerCase()} y ${LIGHT_CHARACTERISTIC_TERMS[altColor].es.toLowerCase()}`;
        enDesc += ` ${LIGHT_CHARACTERISTIC_TERMS[color].en} and ${LIGHT_CHARACTERISTIC_TERMS[altColor].en}`;
    } else {
        esDesc += ` ${LIGHT_CHARACTERISTIC_TERMS[color].es.toLowerCase()}`;
        enDesc += ` ${LIGHT_CHARACTERISTIC_TERMS[color].en}`;
    }

    esDesc += `, con un período de ${period} segundos.`;
    enDesc += `, with a period of ${period} seconds.`;

    return `<p class="desc-lang"><b>ES:</b> ${esDesc}</p><hr class="info-divider"><p class="desc-lang"><b>EN:</b> ${enDesc}</p>`;
}

// --- SIMULATION RUNNER ---
function runSimulation(config: LightConfig, lightElement: HTMLElement) {
    const simIdRef = lightElement.id === 'lighthouse-light' ? 'simulationTimeoutId' : 'currentBuoySimId';
    if (simIdRef === 'simulationTimeoutId' && simulationTimeoutId) clearTimeout(simulationTimeoutId);
    if (simIdRef === 'currentBuoySimId' && currentBuoySimId) clearTimeout(currentBuoySimId);
    
    const periodMs = config.period * 1000;
    const sequence: { duration: number; on: boolean; color?: string; }[] = [];
    const defaultColor = config.color.toLowerCase();
    const altColor = config.altColor?.toLowerCase();

    const flash = (duration: number, on: boolean, color = defaultColor) => sequence.push({ duration: duration * 1000, on, color });

    const createFlashes = (count: number, onDuration: number, offDuration: number) => {
        for (let i = 0; i < count; i++) {
            flash(onDuration, true);
            if (i < count - 1) flash(offDuration, false);
        }
    };
    
    switch (config.rhythm) {
        case 'F': flash(config.period, true); break;
        case 'FL': createFlashes((config.group[0] as number) || 1, 0.5, 1); break;
        case 'LFL': createFlashes((config.group[0] as number) || 1, 2, 2); break;
        case 'ISO': flash(config.period / 2, true); flash(config.period / 2, false); break;
        case 'OC': {
            if (config.group.length > 0) {
                 const group = config.group as number[]; // This is the fix: assert type to number[]
                 const totalOffTime = group.reduce((a, b) => a + b, 0) * 1000;
                 const onDuration = (periodMs - totalOffTime) / group.length;
                 group.forEach(off => { flash(onDuration / 1000, true); flash(off, false); });
            } else { flash(periodMs * 0.75 / 1000, true); flash(periodMs * 0.25 / 1000, false); }
            break;
        }
        case 'Q': case 'VQ': case 'UQ': {
            const rate = config.rhythm === 'Q' ? 1 : (config.rhythm === 'VQ' ? 0.5 : 0.25);
            createFlashes((config.group[0] as number) || Math.floor(config.period/rate), rate/2, rate/2);
            break;
        }
        case 'AL':
            if(altColor){ flash(config.period / 2, true, defaultColor); flash(config.period / 2, true, altColor); }
            else { flash(config.period, true); }
            break;
        case 'MO':
            const morseCode: {[key: string]: string} = {'A':'.-', 'B':'-...', 'C':'-.-.', 'D':'-..', 'E':'.', 'F':'..-.', 'G':'--.', 'H':'....', 'I':'..', 'J':'.---', 'K':'-.-', 'L':'.-..', 'M':'--', 'N':'-.', 'O':'---', 'P':'.--.', 'Q':'--.-', 'R':'.-.', 'S':'...', 'T':'-', 'U':'..-', 'V':'...-', 'W':'.--', 'X':'-..-', 'Y':'-.--', 'Z':'--..'};
            const code = morseCode[(config.group[0] as string).toUpperCase()];
            if (code) {
                [...code].forEach(c => { flash(c === '.' ? 0.3 : 0.9, true); flash(0.3, false); });
            }
            break;
        default: // Handle composite groups like (2+1)
            if (config.group.length > 1) {
                (config.group as number[]).forEach(g => { createFlashes(g, 0.5, 0.5); flash(1.5, false); });
            } else { flash(0.5, true); flash(config.period - 0.5, false); }
            break;
    }
    
    const totalSequenceTime = sequence.reduce((sum, s) => sum + s.duration, 0);
    if (totalSequenceTime < periodMs) sequence.push({ duration: periodMs - totalSequenceTime, on: false });

    let currentIndex = 0;
    const animate = () => {
        const currentStep = sequence[currentIndex];
        const lightClass = simIdRef === 'simulationTimeoutId' ? 'lighthouse-light' : 'buoy-light-el';
        lightElement.className = lightClass; // Reset
        if (currentStep.on) lightElement.classList.add('on', currentStep.color || defaultColor);
        
        const simId = setTimeout(() => {
            currentIndex = (currentIndex + 1) % sequence.length;
            animate();
        }, currentStep.duration);
        
        if (simIdRef === 'simulationTimeoutId') simulationTimeoutId = simId; else currentBuoySimId = simId;
    };
    animate();
}

// --- BUOY SVG GENERATION ---
function generateBuoySVG(buoy: any): string {
    const isDark = document.body.classList.contains('dark-theme');
    const stroke = isDark ? 'var(--buoy-stroke-dark)' : 'var(--buoy-stroke-light)';
    const body = getBuoyBody(buoy.daymark, stroke);
    const topmark = getBuoyTopmark(buoy.daymark.topmark, stroke);

    return `<svg class="buoy-schematic-svg" viewBox="0 0 100 150" xmlns="http://www.w3.org/2000/svg"><style>.water{animation:wave 3s infinite ease-in-out}@keyframes wave{0%{transform:translateY(0)}50%{transform:translateY(-3px)}100%{transform:translateY(0)}}</style><g class="water">${topmark}${body}<path d="M -10 120 Q 50 110, 110 120 T -10 120" fill="var(--buoy-water)" opacity="0.8" /></g></svg>`;
}

function getBuoyBody(daymark: any, stroke: string): string {
    const { colors, vertical, shape } = daymark;
    const getFill = (c:string) => `var(--buoy-${c.toLowerCase()})`;
    const y=60, h=60;

    if (colors.length === 1) {
        if (shape === 'can') return `<rect x="35" y="${y}" width="30" height="${h}" fill="${getFill(colors[0])}" stroke="${stroke}" />`;
        if (shape === 'conical') return `<polygon points="30,${y+h} 70,${y+h} 50,${y}" fill="${getFill(colors[0])}" stroke="${stroke}" />`;
        if (shape === 'spherical') return `<circle cx="50" cy="${y+h/2}" r="25" fill="${getFill(colors[0])}" stroke="${stroke}" />`;
        return `<rect x="40" y="${y}" width="20" height="${h}" fill="${getFill(colors[0])}" stroke="${stroke}" />`; // Pillar
    } else {
        let bodySvg = '';
        if (vertical) {
            const w = 100 / colors.length;
            colors.forEach((c:string, i:number) => { bodySvg += `<rect x="${i*w + (50-w*colors.length/2)}" y="${y}" width="${w}" height="${h}" fill="${getFill(c)}" stroke="${stroke}" />`; });
        } else {
            const partH = h / colors.length;
            colors.forEach((c:string, i:number) => {
                const partY = y + (i * partH);
                if (shape === 'conical') {
                    const topW = 20 + i * 10;
                    const bottomW = 20 + (i + 1) * 10;
                    bodySvg += `<polygon points="${50-bottomW/2},${partY+partH} ${50+bottomW/2},${partY+partH} ${50+topW/2},${partY} ${50-topW/2},${partY}" fill="${getFill(c)}" stroke="${stroke}"/>`;
                } else {
                    bodySvg += `<rect x="${shape === 'can' ? 35:40}" y="${partY}" width="${shape === 'can' ? 30:20}" height="${partH}" fill="${getFill(c)}" stroke="${stroke}" />`;
                }
            });
        }
        return bodySvg;
    }
}

function getBuoyTopmark(topmark: any, stroke: string): string {
    if (!topmark) return '';
    const { shape, color, arrangement } = topmark;
    const getFill = (c:string) => `var(--buoy-${c.toLowerCase()})`;
    const y = 45;

    switch (shape) {
        case 'can': return `<rect x="42" y="${y-15}" width="16" height="15" fill="${getFill(color)}" stroke="${stroke}" />`;
        case 'cone': return `<polygon points="40,${y} 60,${y} 50,${y-15}" fill="${getFill(color)}" stroke="${stroke}" />`;
        case 'sphere': return `<circle cx="50" cy="${y-10}" r="10" fill="${getFill(color)}" stroke="${stroke}" />`;
        case 'cross_upright': return `<path d="M 45 30 L 55 30 M 50 25 L 50 35" stroke="${getFill(color)}" stroke-width="3" />`;
        case 'double_sphere': return `<g><circle cx="50" cy="${y-15}" r="8" fill="${getFill(color)}" stroke="${stroke}" /><circle cx="50" cy="${y}" r="8" fill="${getFill(color)}" stroke="${stroke}" /></g>`;
        case 'double_cone':
            if (arrangement === 'up') return `<g><polygon points="40,${y} 60,${y} 50,${y-15}" fill="${getFill(color)}" stroke="${stroke}" /><polygon points="40,${y-15} 60,${y-15} 50,${y-30}" fill="${getFill(color)}" stroke="${stroke}" /></g>`;
            if (arrangement === 'down') return `<g><polygon points="40,${y-15} 60,${y-15} 50,${y}" fill="${getFill(color)}" stroke="${stroke}" /><polygon points="40,${y-30} 60,${y-30} 50,${y-15}" fill="${getFill(color)}" stroke="${stroke}" /></g>`;
            if (arrangement === 'base_to_base') return `<g><polygon points="40,${y-7.5} 60,${y-7.5} 50,${y-22.5}" fill="${getFill(color)}" stroke="${stroke}" /><polygon points="40,${y-7.5} 60,${y-7.5} 50,${y+7.5}" fill="${getFill(color)}" stroke="${stroke}" /></g>`;
            if (arrangement === 'point_to_point') return `<g><polygon points="40,${y-15} 60,${y-15} 50,${y}" fill="${getFill(color)}" stroke="${stroke}" /><polygon points="40,${y} 60,${y} 50,${y-15}" fill="${getFill(color)}" stroke="${stroke}" /></g>`;
            break;
    }
    return '';
}
