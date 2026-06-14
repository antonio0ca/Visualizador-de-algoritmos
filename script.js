'use strict';

// ---------- Elementos ----------
const container = document.getElementById('bars-container');
const sizeInput = document.getElementById('size-input');
const speedSelect = document.getElementById('speed-select');
const algoSelect = document.getElementById('algo-select');
const generateBtn = document.getElementById('generate-btn');
const startBtn = document.getElementById('start-btn');
const pauseBtn = document.getElementById('pause-btn');
const finishBtn = document.getElementById('finish-btn');
const compCountSpan = document.getElementById('comp-count');
const swapCountSpan = document.getElementById('swap-count');
const timeCountSpan = document.getElementById('time-count');
const virtualSizeInput = document.getElementById('virtual-size-input');
const themeBtn = document.getElementById('theme-btn');
const clearHistoryBtn = document.getElementById('clear-history-btn');

// ---------- Estado ----------
let array = [];
let bars = [];
let delay = 100;
let isSorting = false;
let isPaused = false;
let isSkipping = false;
let comparisons = 0;
let swaps = 0;
let simulationNoise = 1;
let currentSimulatedTime = 0;
let executionHistory = [];

// ---------- Complexidade (Big-O) ----------
const COMPLEXITY = {
    bubble:    { name: 'Bubble Sort',    best: 'O(n)',       avg: 'O(n²)',      worst: 'O(n²)',      space: 'O(1)',     stable: 'Sim', desc: 'Apenas didático. Simples de entender, mas O(n²): evite em produção. Serve para ensinar a ideia de ordenação ou em listas minúsculas.' },
    selection: { name: 'Selection Sort', best: 'O(n²)',      avg: 'O(n²)',      worst: 'O(n²)',      space: 'O(1)',     stable: 'Não', desc: 'Faz o mínimo de trocas possível (O(n)). Útil quando escrever na memória é caro, mas continua O(n²) em comparações.' },
    insertion: { name: 'Insertion Sort', best: 'O(n)',       avg: 'O(n²)',      worst: 'O(n²)',      space: 'O(1)',     stable: 'Sim', desc: 'Excelente para listas pequenas ou quase ordenadas (O(n) no melhor caso). É a base de algoritmos híbridos como o Timsort.' },
    shell:     { name: 'Shell Sort',     best: 'O(n log n)', avg: 'O(n^1.25)',  worst: 'O(n²)',      space: 'O(1)',     stable: 'Não', desc: 'Insertion sort com saltos decrescentes. Bom meio-termo para listas médias, in-place e sem a memória extra do merge.' },
    merge:     { name: 'Merge Sort',     best: 'O(n log n)', avg: 'O(n log n)', worst: 'O(n log n)', space: 'O(n)',     stable: 'Sim', desc: 'Estável e com desempenho garantido O(n log n). Ideal para grandes volumes, ordenação externa e listas ligadas, em troca de O(n) de memória.' },
    quick:     { name: 'Quick Sort',     best: 'O(n log n)', avg: 'O(n log n)', worst: 'O(n²)',      space: 'O(log n)', stable: 'Não', desc: 'Rápido na média e in-place: a escolha padrão de uso geral. Cuidado: com pivôs ruins pode degradar para O(n²).' },
    heap:      { name: 'Heap Sort',      best: 'O(n log n)', avg: 'O(n log n)', worst: 'O(n log n)', space: 'O(1)',     stable: 'Não', desc: 'O(n log n) garantido até no pior caso e in-place. Ótimo quando se precisa de tempo previsível e pouca memória; não é estável.' },
};

const QUADRATIC = ['bubble', 'selection', 'insertion'];

// ---------- Tema ----------
function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('@viz:theme', theme);
}
themeBtn.addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    applyTheme(next);
});

// ---------- Utilitários ----------
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function delayStep() {
    if (isSkipping) return;
    while (isPaused && isSorting) await sleep(60);
    await sleep(delay);
}

function setColor(indices, colorClass) {
    indices.forEach(i => bars[i] && bars[i].classList.add(colorClass));
}

function removeColor(indices, colorClass) {
    indices.forEach(i => bars[i] && bars[i].classList.remove(colorClass));
}

async function swap(i, j) {
    swaps++;
    const tempHeight = bars[i].style.height;
    bars[i].style.height = bars[j].style.height;
    bars[j].style.height = tempHeight;
    [array[i], array[j]] = [array[j], array[i]];
    updateStats();
    await delayStep();
}

// ---------- Geração ----------
function generateArray() {
    if (isSorting) return;
    let size = parseInt(sizeInput.value);
    if (isNaN(size) || size < 10) size = 10;
    if (size > 200) size = 200;
    sizeInput.value = size;

    array = [];
    container.innerHTML = '';
    const width = Math.max(2, Math.floor(880 / size));

    for (let i = 0; i < size; i++) {
        const val = Math.floor(Math.random() * 100) + 5;
        array.push(val);
        const bar = document.createElement('div');
        bar.className = 'bar';
        bar.style.height = `${val * 3}px`;
        bar.style.width = `${width}px`;
        bar.title = `Valor: ${val}`;
        container.appendChild(bar);
    }
    bars = Array.from(container.children);
    resetStats();
}

// ---------- Estatísticas ----------
function resetStats() {
    comparisons = 0;
    swaps = 0;
    compCountSpan.innerText = '0';
    swapCountSpan.innerText = '0';
    timeCountSpan.innerText = '0s';
}

function formatTime(s) {
    if (s < 0.001) return '< 1ms';
    if (s < 1) return s.toFixed(4) + 's';
    if (s < 60) return s.toFixed(2) + 's';
    if (s < 3600) return (s / 60).toFixed(2) + ' min';
    if (s < 86400) return (s / 3600).toFixed(2) + ' h';
    return (s / 86400).toFixed(1) + ' dias';
}

function updateStats() {
    const nSim = parseInt(virtualSizeInput.value) || 10000;
    const algo = algoSelect.value;
    let estimated;

    if (QUADRATIC.includes(algo)) {
        estimated = 3e-9 * nSim * nSim;
        timeCountSpan.style.color = 'var(--bar-active)';
    } else if (algo === 'shell') {
        estimated = 5e-9 * nSim * Math.pow(Math.log2(nSim), 2);
        timeCountSpan.style.color = 'var(--bar-compare)';
    } else {
        estimated = 1e-8 * nSim * Math.log2(nSim);
        timeCountSpan.style.color = 'var(--bar-sorted)';
    }

    estimated *= simulationNoise;
    currentSimulatedTime = estimated;

    timeCountSpan.innerText = formatTime(estimated);
    compCountSpan.innerText = comparisons.toLocaleString('pt-BR');
    swapCountSpan.innerText = swaps.toLocaleString('pt-BR');
}

function updateComplexityPanel() {
    const c = COMPLEXITY[algoSelect.value];
    document.getElementById('cx-name').innerText = c.name;
    document.getElementById('cx-best').innerText = c.best;
    document.getElementById('cx-avg').innerText = c.avg;
    document.getElementById('cx-worst').innerText = c.worst;
    document.getElementById('cx-space').innerText = c.space;
    document.getElementById('cx-stable').innerText = c.stable;
    document.getElementById('cx-desc').innerText = c.desc;
}

// ---------- Histórico ----------
let lastHistoryTime = 0;

function addToHistory(algo, size) {
    const now = Date.now();
    if (now - lastHistoryTime < 800) return;
    lastHistoryTime = now;
    executionHistory.push({
        id: executionHistory.length + 1,
        algo: COMPLEXITY[algo].name,
        size: size,
        timeStr: timeCountSpan.innerText,
        rawTime: currentSimulatedTime,
    });
    renderHistory();
}

function renderHistory() {
    const tbody = document.getElementById('history-body');
    const avgSpan = document.getElementById('history-avg');
    tbody.innerHTML = '';

    if (executionHistory.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="empty">Nenhuma execução ainda</td></tr>';
        avgSpan.innerText = '—';
        return;
    }

    const visible = executionHistory.slice().reverse().slice(0, 6);
    const times = visible.map(it => it.rawTime);
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);

    visible.forEach(item => {
        const row = document.createElement('tr');
        let cls = '';
        if (visible.length > 1) {
            if (item.rawTime === minTime) cls = 'time-best';
            else if (item.rawTime === maxTime) cls = 'time-worst';
        }
        row.innerHTML = `
            <td>${item.id}</td>
            <td>${item.algo}</td>
            <td>${parseInt(item.size).toLocaleString('pt-BR')}</td>
            <td class="${cls}">${item.timeStr}</td>`;
        tbody.appendChild(row);
    });

    const total = executionHistory.reduce((sum, it) => sum + (it.rawTime || 0), 0);
    avgSpan.innerText = formatTime(total / executionHistory.length);
}

// ---------- Algoritmos ----------
async function bubbleSort() {
    const n = array.length;
    for (let i = 0; i < n - 1; i++) {
        for (let j = 0; j < n - i - 1; j++) {
            if (!isSorting) return;
            setColor([j, j + 1], 'compare');
            comparisons++;
            updateStats();
            await delayStep();
            if (array[j] > array[j + 1]) await swap(j, j + 1);
            removeColor([j, j + 1], 'compare');
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
        setColor([i], 'active');
        for (let j = i + 1; j < n; j++) {
            if (!isSorting) return;
            setColor([j], 'compare');
            comparisons++;
            updateStats();
            await delayStep();
            if (array[j] < array[minIdx]) {
                if (minIdx !== i) removeColor([minIdx], 'active');
                minIdx = j;
                setColor([minIdx], 'active');
            } else {
                removeColor([j], 'compare');
            }
        }
        if (minIdx !== i) await swap(i, minIdx);
        removeColor([minIdx, i], 'active');
        bars[i].classList.add('sorted');
    }
}

async function insertionSort() {
    const n = array.length;
    for (let i = 1; i < n; i++) {
        if (!isSorting) return;
        let j = i;
        setColor([i], 'active');
        while (j > 0 && array[j] < array[j - 1]) {
            if (!isSorting) return;
            comparisons++;
            updateStats();
            setColor([j, j - 1], 'compare');
            await delayStep();
            await swap(j, j - 1);
            removeColor([j, j - 1], 'compare');
            j--;
        }
        removeColor([i, j], 'active');
    }
    for (let k = 0; k < n; k++) bars[k].classList.add('sorted');
}

async function shellSort() {
    const n = array.length;
    for (let gap = Math.floor(n / 2); gap > 0; gap = Math.floor(gap / 2)) {
        for (let i = gap; i < n; i++) {
            if (!isSorting) return;
            const tempVal = array[i];
            const tempHeight = bars[i].style.height;
            setColor([i], 'active');
            let j;
            for (j = i; j >= gap && array[j - gap] > tempVal; j -= gap) {
                if (!isSorting) return;
                comparisons++;
                swaps++;
                setColor([j - gap], 'compare');
                updateStats();
                await delayStep();
                array[j] = array[j - gap];
                bars[j].style.height = bars[j - gap].style.height;
                removeColor([j - gap], 'compare');
            }
            array[j] = tempVal;
            bars[j].style.height = tempHeight;
            removeColor([i], 'active');
        }
    }
    for (let k = 0; k < n; k++) bars[k].classList.add('sorted');
}

async function mergeSortHelper(start, end) {
    if (start >= end || !isSorting) return;
    const mid = Math.floor((start + end) / 2);
    await mergeSortHelper(start, mid);
    await mergeSortHelper(mid + 1, end);
    await merge(start, mid, end);
}

async function merge(start, mid, end) {
    if (!isSorting) return;
    const leftArr = array.slice(start, mid + 1);
    const rightArr = array.slice(mid + 1, end + 1);
    let i = 0, j = 0, k = start;
    for (let x = start; x <= end; x++) bars[x].classList.add('active');

    while (i < leftArr.length && j < rightArr.length) {
        if (!isSorting) return;
        comparisons++;
        updateStats();
        if (leftArr[i] <= rightArr[j]) array[k] = leftArr[i++];
        else array[k] = rightArr[j++];
        bars[k].style.height = `${array[k] * 3}px`;
        swaps++;
        await delayStep();
        k++;
    }
    while (i < leftArr.length) {
        if (!isSorting) return;
        array[k] = leftArr[i++];
        bars[k].style.height = `${array[k] * 3}px`;
        swaps++;
        await delayStep();
        k++;
    }
    while (j < rightArr.length) {
        if (!isSorting) return;
        array[k] = rightArr[j++];
        bars[k].style.height = `${array[k] * 3}px`;
        swaps++;
        await delayStep();
        k++;
    }
    for (let x = start; x <= end; x++) bars[x].classList.remove('active');
}

async function quickSortHelper(start, end) {
    if (start >= end || !isSorting) return;
    const index = await partition(start, end);
    if (index === undefined) return;
    await quickSortHelper(start, index - 1);
    await quickSortHelper(index + 1, end);
}

async function partition(start, end) {
    let pivotIndex = start;
    const pivotValue = array[end];
    setColor([end], 'pivot');
    for (let i = start; i < end; i++) {
        if (!isSorting) return;
        setColor([i], 'compare');
        comparisons++;
        updateStats();
        await delayStep();
        if (array[i] < pivotValue) {
            await swap(i, pivotIndex);
            pivotIndex++;
        }
        removeColor([i], 'compare');
    }
    await swap(pivotIndex, end);
    removeColor([end], 'pivot');
    return pivotIndex;
}

async function heapSort() {
    const n = array.length;
    for (let i = Math.floor(n / 2) - 1; i >= 0; i--) {
        if (!isSorting) return;
        await heapify(n, i);
    }
    for (let i = n - 1; i > 0; i--) {
        if (!isSorting) return;
        await swap(0, i);
        bars[i].classList.add('sorted');
        await heapify(i, 0);
    }
    bars[0].classList.add('sorted');
}

async function heapify(n, i) {
    let largest = i;
    const l = 2 * i + 1;
    const r = 2 * i + 2;
    if (l < n) {
        comparisons++;
        setColor([l], 'compare');
        updateStats();
        await delayStep();
        removeColor([l], 'compare');
        if (!isSorting) return;
        if (array[l] > array[largest]) largest = l;
    }
    if (r < n) {
        comparisons++;
        if (array[r] > array[largest]) largest = r;
    }
    if (largest !== i) {
        await swap(i, largest);
        if (!isSorting) return;
        await heapify(n, largest);
    }
}

const ALGORITHMS = {
    bubble: bubbleSort,
    selection: selectionSort,
    insertion: insertionSort,
    shell: shellSort,
    merge: () => mergeSortHelper(0, array.length - 1),
    quick: () => quickSortHelper(0, array.length - 1),
    heap: heapSort,
};

// ---------- Controle ----------
function setControlsDisabled(disabled) {
    startBtn.disabled = disabled;
    generateBtn.disabled = disabled;
    algoSelect.disabled = disabled;
    sizeInput.disabled = disabled;
    virtualSizeInput.disabled = disabled;
}

async function runSort() {
    if (isSorting) return;
    isSorting = true;
    isPaused = false;
    isSkipping = false;
    simulationNoise = 0.9 + Math.random() * 0.2;

    setControlsDisabled(true);
    pauseBtn.disabled = false;
    pauseBtn.innerText = 'Pausar';
    finishBtn.disabled = false;

    bars.forEach(b => b.classList.remove('sorted', 'active', 'compare', 'pivot'));
    resetStats();
    delay = parseInt(speedSelect.value);
    updateStats();

    const algo = algoSelect.value;
    try {
        await ALGORITHMS[algo]();
        if (isSorting) {
            bars.forEach(b => b.classList.add('sorted'));
            addToHistory(algo, virtualSizeInput.value);
        }
    } catch (e) {
        console.error('Erro durante a ordenação:', e);
    } finally {
        isSorting = false;
        isPaused = false;
        isSkipping = false;
        setControlsDisabled(false);
        pauseBtn.disabled = true;
        pauseBtn.innerText = 'Pausar';
        finishBtn.disabled = true;
    }
}

// ---------- Listeners ----------
speedSelect.addEventListener('change', () => { delay = parseInt(speedSelect.value); });
sizeInput.addEventListener('change', generateArray);
generateBtn.addEventListener('click', generateArray);
startBtn.addEventListener('click', runSort);
algoSelect.addEventListener('change', () => { updateComplexityPanel(); updateStats(); });
virtualSizeInput.addEventListener('change', () => { if (!isSorting) updateStats(); });

pauseBtn.addEventListener('click', () => {
    if (!isSorting) return;
    isPaused = !isPaused;
    pauseBtn.innerText = isPaused ? 'Continuar' : 'Pausar';
});

finishBtn.addEventListener('click', () => {
    if (!isSorting) return;
    isSkipping = true;
    isPaused = false;
    finishBtn.disabled = true;
    pauseBtn.disabled = true;
    pauseBtn.innerText = 'Pausar';
});

clearHistoryBtn.addEventListener('click', () => {
    executionHistory = [];
    renderHistory();
});

// ---------- Inicialização ----------
document.addEventListener('DOMContentLoaded', () => {
    applyTheme(localStorage.getItem('@viz:theme') || 'light');
    delay = parseInt(speedSelect.value);
    updateComplexityPanel();
    generateArray();
    updateStats();
    renderHistory();
});
