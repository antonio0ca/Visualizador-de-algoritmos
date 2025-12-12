const container = document.getElementById('bars-container');
const sizeInput = document.getElementById('size-input');
const speedSelect = document.getElementById('speed-select');
const algoSelect = document.getElementById('algo-select');
const generateBtn = document.getElementById('generate-btn');
const startBtn = document.getElementById('start-btn');
const compCountSpan = document.getElementById('comp-count');
const swapCountSpan = document.getElementById('swap-count');
const timeCountSpan = document.getElementById('time-count');
const virtualSizeInput = document.getElementById('virtual-size-input');
const visualCountSpan = document.getElementById('visual-count');

let array = [];
let bars = [];
let delay = 100;
let isSorting = false;
let comparisons = 0;
let swaps = 0;
let startTime = 0;
let simulationNoise = 1; // Fator de variação para cada execução
let currentSimulatedTime = 0; // Armazena o tempo exato calculado

function updateDelay() {
    delay = parseInt(speedSelect.value);
}

speedSelect.addEventListener('change', updateDelay);

function generateArray() {
    if (isSorting) return;

    let size = parseInt(sizeInput.value);
    if (isNaN(size) || size < 10) size = 10;
    if (size > 200) size = 200;
    sizeInput.value = size;

    if (visualCountSpan) visualCountSpan.innerText = size;

    array = [];
    container.innerHTML = '';

    for (let i = 0; i < size; i++) {
        const val = Math.floor(Math.random() * 100) + 5;
        array.push(val);

        const bar = document.createElement('div');
        bar.classList.add('bar');
        bar.style.height = `${val * 3}px`;
        const width = Math.max(2, Math.floor(800 / size));
        bar.style.width = `${width}px`;

        // Tooltip simplificado
        bar.title = `Valor: ${val}`;

        container.appendChild(bar);
    }
    bars = Array.from(container.children);
    resetStats();
}

sizeInput.addEventListener('change', generateArray);
generateBtn.addEventListener('click', generateArray);

function resetStats() {
    comparisons = 0;
    swaps = 0;
    compCountSpan.innerText = '0';
    swapCountSpan.innerText = '0';
    timeCountSpan.innerText = '0s';
}

function updateStats() {
    // Calcula o tempo estimado estimado para o N simulado

    const nSim = parseInt(virtualSizeInput.value) || 10000;
    const algo = algoSelect.value;
    let estimatedSeconds = 0;

    // Constantes calibradas para simulação
    if (['bubble', 'selection', 'insertion'].includes(algo)) {
        // T = k * N^2
        const k = 3e-9;
        estimatedSeconds = k * (nSim * nSim);
        timeCountSpan.style.color = '#e11d48'; // Lento
    } else if (algo === 'java') {
        // Arrays.sort é Dual-Pivot Quicksort, extremamente otimizado
        // T ≈ 0.8 * k * N * log2(N)
        const k = 0.8e-8;
        estimatedSeconds = k * nSim * Math.log2(nSim);
        timeCountSpan.style.color = '#3b82f6'; // Azul (Muito Rápido)
    } else {
        // T = k * N * log2(N)
        const k = 1e-8;
        estimatedSeconds = k * nSim * Math.log2(nSim);
        timeCountSpan.style.color = '#10b981'; // Rápido
    }

    // Aplica o ruído da simulação atual (para não ficar fixo)
    estimatedSeconds *= simulationNoise;
    currentSimulatedTime = estimatedSeconds;

    // Formata o tempo
    let timeText = '';
    if (estimatedSeconds < 0.001) timeText = "< 1ms";
    else if (estimatedSeconds < 1) timeText = estimatedSeconds.toFixed(4) + 's';
    else if (estimatedSeconds < 60) timeText = estimatedSeconds.toFixed(2) + 's';
    else if (estimatedSeconds < 3600) timeText = (estimatedSeconds / 60).toFixed(2) + ' min';
    else if (estimatedSeconds < 86400) timeText = (estimatedSeconds / 3600).toFixed(2) + ' h';
    else timeText = (estimatedSeconds / 86400).toFixed(1) + ' dias';

    timeCountSpan.innerText = timeText;

    // As comparações e trocas podemos deixar as reais da animação
    compCountSpan.innerText = comparisons.toLocaleString('pt-BR');
    swapCountSpan.innerText = swaps.toLocaleString('pt-BR');
}

// --- Atualiza painel de projeção ---
// (Painel removido)


function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// --- Histórico ---
let executionHistory = [];

let lastHistoryTime = 0;

function addToHistory(algo, size, timeStr) {
    const now = Date.now();
    if (now - lastHistoryTime < 1000) return; // Evita duplicatas em menos de 1s
    lastHistoryTime = now;

    // Usa o tempo exato da simulação atual (com ruído)
    let rawTime = currentSimulatedTime;

    executionHistory.push({
        id: executionHistory.length + 1,
        algo: algo,
        size: size,
        timeStr: timeStr,
        rawTime: rawTime
    });

    renderHistory();
}

// ... (renderHistory não muda)

// --- Controle ---
startBtn.addEventListener('click', async () => {
    if (isSorting) return;

    try {
        isSorting = true;

        // Gera um ruído de +/- 10%
        simulationNoise = 0.90 + Math.random() * 0.20;

        startBtn.disabled = true;
        generateBtn.disabled = true;
        algoSelect.disabled = true;
        speedSelect.disabled = true;
        sizeInput.disabled = true;
        if (virtualSizeInput) virtualSizeInput.disabled = true;

        bars.forEach(b => b.classList.remove('sorted', 'active', 'compare'));
        resetStats();
        startTime = Date.now();

        // Força atualização para aplicar novo ruído e armazenar em currentSimulatedTime
        updateStats();
        updateDelay();

        const algo = algoSelect.value;
        if (algo === 'bubble') await bubbleSort();
        else if (algo === 'selection') await selectionSort();
        else if (algo === 'insertion') await insertionSort();
        else if (algo === 'merge') {
            await mergeSortHelper(0, array.length - 1);
            bars.forEach(b => b.classList.add('sorted'));
        }
        else if (algo === 'quick') {
            await quickSortHelper(0, array.length - 1);
            bars.forEach(b => b.classList.add('sorted'));
        }

        // Salva no histórico ao finalizar
        const finalTimeStr = timeCountSpan.innerText;
        const sizeDisp = virtualSizeInput.value;

        addToHistory(algo, sizeDisp, finalTimeStr);

    } catch (e) {
        console.error("Erro durante a ordenação:", e);
    } finally {
        isSorting = false;
        startBtn.disabled = false;
        generateBtn.disabled = false;
        algoSelect.disabled = false;
        speedSelect.disabled = false;
        sizeInput.disabled = false;
        if (virtualSizeInput) virtualSizeInput.disabled = false;
    }
});

function renderHistory() {
    const tbody = document.getElementById('history-body');
    const avgSpan = document.getElementById('history-avg');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (executionHistory.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="padding:10px; color:#888; text-align:center;">Nenhuma execução</td></tr>';
        if (avgSpan) avgSpan.innerText = '-';
        return;
    }

    // Renderiza as ultimas 5 na tabela
    const visibleItems = executionHistory.slice().reverse().slice(0, 5);

    // Encontra min e max apenas entre os visíveis para destacar
    let minTime = Infinity;
    let maxTime = -Infinity;

    visibleItems.forEach(item => {
        if (item.rawTime < minTime) minTime = item.rawTime;
        if (item.rawTime > maxTime) maxTime = item.rawTime;
    });

    visibleItems.forEach(item => {
        const row = document.createElement('tr');

        let timeStyle = 'padding: 5px;';
        if (visibleItems.length > 1) { // Só destaca se tiver mais de 1 para comparar
            if (item.rawTime === minTime) timeStyle += ' color: #10b981; font-weight: bold;';
            else if (item.rawTime === maxTime) timeStyle += ' color: #e11d48; font-weight: bold;';
        }

        row.innerHTML = `
            <td style="padding: 5px;">${item.id}</td>
            <td style="padding: 5px; text-transform: capitalize;">${item.algo}</td>
            <td style="padding: 5px;">${parseInt(item.size).toLocaleString('pt-BR')}</td>
            <td style="${timeStyle}">${item.timeStr}</td>
        `;
        row.style.borderBottom = '1px solid #eee';
        tbody.appendChild(row);
    });

    // Calcula média de TODO o histórico
    let totalSum = 0;
    executionHistory.forEach(item => {
        if (typeof item.rawTime === 'number') {
            totalSum += item.rawTime;
        }
    });

    const count = executionHistory.length;

    if (avgSpan && count > 0) {
        const avg = totalSum / count;

        // Formata média
        let avgText = '';
        if (avg < 0.001) avgText = "< 1ms";
        else if (avg < 1) avgText = avg.toFixed(4) + 's';
        else if (avg < 60) avgText = avg.toFixed(2) + 's';
        else if (avg < 3600) avgText = (avg / 60).toFixed(2) + ' min';
        else if (avg < 86400) avgText = (avg / 3600).toFixed(2) + ' h';
        else avgText = (avg / 86400).toFixed(2) + ' dias';

        avgSpan.innerText = avgText;
    }
}

const clearBtn = document.getElementById('clear-history-btn');
if (clearBtn) {
    clearBtn.addEventListener('click', () => {
        executionHistory = [];
        renderHistory();
    });
}

// Visual Helpers
async function swap(i, j) {
    swaps++;
    const tempHeight = bars[i].style.height;
    bars[i].style.height = bars[j].style.height;
    bars[j].style.height = tempHeight;

    const temp = array[i];
    array[i] = array[j];
    array[j] = temp;

    updateStats();
    await sleep(delay);
}

async function setColor(indices, colorClass) {
    indices.forEach(i => {
        if (bars[i]) bars[i].classList.add(colorClass);
    });
}

async function removeColor(indices, colorClass) {
    indices.forEach(i => {
        if (bars[i]) bars[i].classList.remove(colorClass);
    });
}

// --- Algoritmos (Mesma lógica de antes) ---

async function bubbleSort() {
    const n = array.length;
    for (let i = 0; i < n - 1; i++) {
        for (let j = 0; j < n - i - 1; j++) {
            if (!isSorting) return;

            await setColor([j, j + 1], 'compare');
            comparisons++;
            updateStats();
            await sleep(delay);

            if (array[j] > array[j + 1]) {
                await swap(j, j + 1);
            }

            await removeColor([j, j + 1], 'compare');
        }
        bars[n - 1 - i].classList.add('sorted');
    }
    bars[0].classList.add('sorted');
}

async function selectionSort() {
    const n = array.length;
    for (let i = 0; i < n; i++) {
        if (!isSorting) return;
        let minIdx = i;
        await setColor([i], 'active');

        for (let j = i + 1; j < n; j++) {
            if (!isSorting) return;
            await setColor([j], 'compare');
            comparisons++;
            updateStats();
            await sleep(delay);

            if (array[j] < array[minIdx]) {
                if (minIdx !== i) await removeColor([minIdx], 'active');
                minIdx = j;
                await setColor([minIdx], 'active');
            } else {
                await removeColor([j], 'compare');
            }
        }

        if (minIdx !== i) {
            await swap(i, minIdx);
        }

        await removeColor([minIdx], 'active');
        await removeColor([i], 'active');
        bars[i].classList.add('sorted');
    }
}

async function insertionSort() {
    const n = array.length;
    for (let i = 1; i < n; i++) {
        if (!isSorting) return;
        let j = i;
        await setColor([i], 'active');

        while (j > 0 && array[j] < array[j - 1]) {
            if (!isSorting) return;
            comparisons++;
            updateStats();
            await setColor([j, j - 1], 'compare');
            await sleep(delay);
            await swap(j, j - 1);
            await removeColor([j, j - 1], 'compare');
            j--;
        }
        await removeColor([i, j], 'active');
    }
    for (let k = 0; k < n; k++) bars[k].classList.add('sorted');
}

// Merge Sort
async function mergeSortHelper(start, end) {
    if (start >= end) return;
    if (!isSorting) return;
    const mid = Math.floor((start + end) / 2);
    await mergeSortHelper(start, mid);
    await mergeSortHelper(mid + 1, end);
    await merge(start, mid, end);
}

async function merge(start, mid, end) {
    if (!isSorting) return;
    let leftSize = mid - start + 1;
    let rightSize = end - mid;
    let leftArr = [];
    let rightArr = [];
    for (let i = 0; i < leftSize; i++) leftArr.push(array[start + i]);
    for (let i = 0; i < rightSize; i++) rightArr.push(array[mid + 1 + i]);

    let i = 0, j = 0, k = start;
    for (let x = start; x <= end; x++) bars[x].classList.add('active');

    while (i < leftSize && j < rightSize) {
        if (!isSorting) return;
        comparisons++;
        updateStats();
        if (leftArr[i] <= rightArr[j]) {
            array[k] = leftArr[i];
            bars[k].style.height = `${array[k] * 3}px`;
            swaps++;
            i++;
        } else {
            array[k] = rightArr[j];
            bars[k].style.height = `${array[k] * 3}px`;
            swaps++;
            j++;
        }
        await sleep(delay);
        k++;
    }
    while (i < leftSize) {
        if (!isSorting) return;
        array[k] = leftArr[i];
        bars[k].style.height = `${array[k] * 3}px`;
        swaps++;
        await sleep(delay);
        i++; k++;
    }
    while (j < rightSize) {
        if (!isSorting) return;
        array[k] = rightArr[j];
        bars[k].style.height = `${array[k] * 3}px`;
        swaps++;
        await sleep(delay);
        j++; k++;
    }
    for (let x = start; x <= end; x++) bars[x].classList.remove('active');
}

// Quick Sort
async function quickSortHelper(start, end) {
    if (start >= end) return;
    if (!isSorting) return;
    let index = await partition(start, end);
    await quickSortHelper(start, index - 1);
    await quickSortHelper(index + 1, end);
}

async function partition(start, end) {
    let pivotIndex = start;
    let pivotValue = array[end];
    await setColor([end], 'active');
    for (let i = start; i < end; i++) {
        if (!isSorting) return;
        await setColor([i], 'compare');
        comparisons++;
        updateStats();
        await sleep(delay);
        if (array[i] < pivotValue) {
            await swap(i, pivotIndex);
            pivotIndex++;
        }
        await removeColor([i], 'compare');
    }
    await swap(pivotIndex, end);
    await removeColor([end], 'active');
    return pivotIndex;
}

// --- Controle ---
// --- Controle ---
// Remove listeners antigos (prevenção contra hot-reload duplicando eventos)
const newStartBtn = startBtn.cloneNode(true);
startBtn.parentNode.replaceChild(newStartBtn, startBtn);
// Atualiza a referência para o novo botão
const startBtnClean = document.getElementById('start-btn');

startBtnClean.addEventListener('click', async () => {
    if (isSorting) return;

    try {
        isSorting = true;
        // ... resto da função igual ...

        // Gera um ruído de +/- 10%
        simulationNoise = 0.90 + Math.random() * 0.20;

        startBtnClean.disabled = true; // Usa a nova ref
        generateBtn.disabled = true;
        algoSelect.disabled = true;
        speedSelect.disabled = true;
        sizeInput.disabled = true;
        if (virtualSizeInput) virtualSizeInput.disabled = true;

        bars.forEach(b => b.classList.remove('sorted', 'active', 'compare'));
        resetStats();
        startTime = Date.now();
        updateDelay();

        const algo = algoSelect.value;
        if (algo === 'bubble') await bubbleSort();
        else if (algo === 'selection') await selectionSort();
        else if (algo === 'insertion') await insertionSort();
        else if (algo === 'merge') {
            await mergeSortHelper(0, array.length - 1);
            bars.forEach(b => b.classList.add('sorted'));
        }
        else if (algo === 'quick') {
            await quickSortHelper(0, array.length - 1);
            bars.forEach(b => b.classList.add('sorted'));
        } else if (algo === 'java') {
            await quickSortHelper(0, array.length - 1);
            bars.forEach(b => b.classList.add('sorted'));
        }

        // Salva no histórico
        const finalTimeStr = timeCountSpan.innerText;
        const sizeDisp = virtualSizeInput.value;

        addToHistory(algo, sizeDisp, finalTimeStr);

    } catch (e) {
        console.error("Erro durante a ordenação:", e);
    } finally {
        isSorting = false;
        startBtnClean.disabled = false;
        generateBtn.disabled = false;
        algoSelect.disabled = false;
        speedSelect.disabled = false;
        sizeInput.disabled = false;
        if (virtualSizeInput) virtualSizeInput.disabled = false;
    }
});

// Inicializa
document.addEventListener('DOMContentLoaded', () => {
    updateDelay();
    generateArray();
    renderHistory();
});
