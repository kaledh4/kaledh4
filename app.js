if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').then(registration => {
        console.log("SW registered");
    }).catch(err => {
        console.log("SW registration failed: ", err);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const settingsBtn = document.getElementById('settings-btn');
    const modal = document.getElementById('settings-modal');
    const closeBtn = document.querySelector('.close-btn');
    const settingsForm = document.getElementById('settings-form');
    const csvUrlInput = document.getElementById('csv-url');
    const lowThresholdInput = document.getElementById('low-threshold');
    const highThresholdInput = document.getElementById('high-threshold');
    const dataContainer = document.getElementById('data-container');

    // --- Constants and State ---
    const CSV_URL_KEY = 'csvUrl';
    const LOW_THRESHOLD_KEY = 'lowThreshold';
    const HIGH_THRESHOLD_KEY = 'highThreshold';
    const DEFAULT_CSV_URL = 'dummy_data.csv';
    let state = {
        lowThreshold: 0.1,
        highThreshold: 0.65
    };

    // --- Modal Logic ---
    settingsBtn.addEventListener('click', () => modal.style.display = 'block');
    closeBtn.addEventListener('click', () => modal.style.display = 'none');
    window.addEventListener('click', (event) => {
        if (event.target == modal) modal.style.display = 'none';
    });

    settingsForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const newUrl = csvUrlInput.value;
        const newLow = parseFloat(lowThresholdInput.value);
        const newHigh = parseFloat(highThresholdInput.value);

        localStorage.setItem(CSV_URL_KEY, newUrl);
        if (!isNaN(newLow)) {
            localStorage.setItem(LOW_THRESHOLD_KEY, newLow);
            state.lowThreshold = newLow;
        }
        if (!isNaN(newHigh)) {
            localStorage.setItem(HIGH_THRESHOLD_KEY, newHigh);
            state.highThreshold = newHigh;
        }

        fetchAndDisplayData();
        modal.style.display = 'none';
    });

    // --- Data Fetching and Rendering ---
    function parseCSV(csvText) {
        const rows = csvText.trim().split('\n');
        return rows.map(row => {
            const values = [];
            let currentVal = '';
            let inQuotes = false;
            for (const char of row) {
                if (char === '"') {
                    inQuotes = !inQuotes;
                } else if (char === ',' && !inQuotes) {
                    values.push(currentVal.trim());
                    currentVal = '';
                } else {
                    currentVal += char;
                }
            }
            values.push(currentVal.trim());
            return values;
        });
    }

    function getColorClass(value, low, high) {
        const num = parseFloat(value);
        if (isNaN(num) || low == null || high == null || high <= low) return '';

        if (num <= low) return 'gradient-1';
        if (num >= high) return 'gradient-10';

        const percentage = (num - low) / (high - low);
        const gradientIndex = Math.ceil(percentage * 8) + 1; // Map to gradients 2-9
        return `gradient-${gradientIndex}`;
    }

    function renderData(data) {
        const halvingRow = createHalvingRow();
        const fullData = [halvingRow, ...data];

        const table = document.createElement('table');
        table.className = 'data-table';
        const tbody = document.createElement('tbody');

        fullData.forEach(rowData => {
            const tr = document.createElement('tr');
            const currentPrice = parseFloat(rowData[1]);
            const potentialHigh = parseFloat(rowData[4]);

            rowData.forEach((cellData, index) => {
                const td = document.createElement('td');
                td.textContent = cellData;

                if (index === 1) { // Apply color to current price column
                    const colorClass = getColorClass(cellData, state.lowThreshold, state.highThreshold);
                    if (colorClass) {
                        td.classList.add(colorClass);
                    }
                }
                tr.appendChild(td);
            });

            // Calculate and add "x" value cell
            const xCell = document.createElement('td');
            if (!isNaN(currentPrice) && !isNaN(potentialHigh) && currentPrice > 0) {
                const xValue = (potentialHigh / currentPrice).toFixed(2) + 'x';
                xCell.textContent = xValue;
            }
            tr.appendChild(xCell);

            tbody.appendChild(tr);
        });

        table.appendChild(tbody);
        dataContainer.innerHTML = '';
        dataContainer.appendChild(table);
    }

    async function fetchAndDisplayData() {
        const url = localStorage.getItem(CSV_URL_KEY) || DEFAULT_CSV_URL;
        try {
            const response = await fetch(url, { cache: 'no-cache' });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const csvText = await response.text();
            const data = parseCSV(csvText);
            renderData(data);
        } catch (error) {
            console.error('Error fetching or parsing data:', error);
            dataContainer.innerHTML = `<p class="error">Could not load data. Please check the CSV URL in Settings.</p>`;
        }
    }

    // --- Halving Countdown ---
    function createHalvingRow() {
        const halvingDate = new Date('2028-07-01T00:00:00');
        const now = new Date();
        const diffTime = halvingDate - now;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return ['Halving', `Days Remaining: ${diffDays}`, 'Block: 1,050,000', 'Reward: 1.5625 BTC', ''];
    }

    // --- Initial Load and State Management ---
    function loadState() {
        const savedUrl = localStorage.getItem(CSV_URL_KEY) || DEFAULT_CSV_URL;
        const savedLow = parseFloat(localStorage.getItem(LOW_THRESHOLD_KEY));
        const savedHigh = parseFloat(localStorage.getItem(HIGH_THRESHOLD_KEY));

        csvUrlInput.value = savedUrl;
        if (!isNaN(savedLow)) {
            state.lowThreshold = savedLow;
            lowThresholdInput.value = savedLow;
        }
        if (!isNaN(savedHigh)) {
            state.highThreshold = savedHigh;
            highThresholdInput.value = savedHigh;
        }
    }

    function initializeApp() {
        loadState();
        fetchAndDisplayData();

        // Refresh data every 5 minutes
        setInterval(fetchAndDisplayData, 5 * 60 * 1000);
    }

    initializeApp();
});
