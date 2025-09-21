if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').then(registration => {
        console.log("SW registered");
    }).catch(err => {
        console.log("SW registration failed: ", err);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const assetGrid = document.getElementById('asset-grid');
    const settingsBtn = document.getElementById('settings-btn');
    const modal = document.getElementById('settings-modal');
    const closeBtn = document.querySelector('.close-btn');

    const settingsMainView = document.getElementById('settings-main-view');
    const csvUrlForm = document.getElementById('csv-url-form');
    const csvUrlInput = document.getElementById('csv-url');
    const assetSettingsList = document.getElementById('asset-settings-list');

    const settingsAssetView = document.getElementById('settings-asset-view');
    const settingsBackBtn = document.getElementById('settings-back-btn');
    const assetSettingName = document.getElementById('asset-setting-name');
    const assetSettingsForm = document.getElementById('asset-settings-form');
    const assetTickerInput = document.getElementById('asset-ticker-input');
    const lowThresholdInput = document.getElementById('low-threshold');
    const highThresholdInput = document.getElementById('high-threshold');

    // --- Constants and State ---
    const CSV_URL_KEY = 'csvUrl';
    const THRESHOLDS_KEY = 'assetThresholds';
    const DEFAULT_CSV_URL = 'dummy_data.csv';
    let state = {
        portfolio: [],
        thresholds: {}
    };

    // --- Settings UI Logic ---
    function showAssetSettingsView(assetName) {
        const assetThresholds = state.thresholds[assetName] || {};
        assetSettingName.textContent = `Settings for ${assetName}`;
        assetTickerInput.value = assetName;
        lowThresholdInput.value = assetThresholds.low || '';
        highThresholdInput.value = assetThresholds.high || '';
        settingsMainView.style.display = 'none';
        settingsAssetView.style.display = 'block';
    }

    function showMainSettingsView() {
        settingsMainView.style.display = 'block';
        settingsAssetView.style.display = 'none';
    }

    function populateAssetSettingsList() {
        assetSettingsList.innerHTML = '';
        state.portfolio.forEach(asset => {
            const assetName = asset[0];
            const button = document.createElement('button');
            button.className = 'asset-setting-item';
            button.textContent = assetName;
            button.addEventListener('click', () => showAssetSettingsView(assetName));
            assetSettingsList.appendChild(button);
        });
    }

    settingsBtn.addEventListener('click', () => {
        populateAssetSettingsList();
        modal.style.display = 'block';
    });
    closeBtn.addEventListener('click', () => modal.style.display = 'none');
    window.addEventListener('click', (event) => {
        if (event.target == modal) modal.style.display = 'none';
    });
    settingsBackBtn.addEventListener('click', showMainSettingsView);

    csvUrlForm.addEventListener('submit', (e) => {
        e.preventDefault();
        localStorage.setItem(CSV_URL_KEY, csvUrlInput.value);
        fetchData();
    });

    assetSettingsForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const assetName = assetTickerInput.value;
        const newLow = parseFloat(lowThresholdInput.value);
        const newHigh = parseFloat(highThresholdInput.value);

        if (!state.thresholds[assetName]) {
            state.thresholds[assetName] = {};
        }
        if (!isNaN(newLow)) state.thresholds[assetName].low = newLow;
        if (!isNaN(newHigh)) state.thresholds[assetName].high = newHigh;

        localStorage.setItem(THRESHOLDS_KEY, JSON.stringify(state.thresholds));
        renderData();
        showMainSettingsView();
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

    function getColorClass(value, assetName) {
        const thresholds = state.thresholds[assetName];
        if (!thresholds) return '';

        const num = parseFloat(value);
        const { low, high } = thresholds;

        if (isNaN(num) || low == null || high == null || high <= low) return '';

        if (num <= low) return 'gradient-1';
        if (num >= high) return 'gradient-10';

        const percentage = (num - low) / (high - low);
        const gradientIndex = Math.ceil(percentage * 8) + 1;
        return `gradient-${gradientIndex}`;
    }

    function renderData() {
        assetGrid.innerHTML = '';
        state.portfolio.forEach(assetData => {
            const card = createAssetCard(assetData);
            if (card) {
                assetGrid.appendChild(card);
            }
        });
    }

    function createAssetCard(assetData) {
        const assetName = assetData[0];
        if (!assetName) return null;

        const currentPrice = parseFloat(assetData[1]);
        const potentialHigh = parseFloat(assetData[4]);

        const card = document.createElement('div');
        card.className = 'asset-card';

        const cardHeader = document.createElement('div');
        cardHeader.className = 'card-header';
        const nameEl = document.createElement('span');
        nameEl.className = 'asset-name';
        nameEl.textContent = assetName;
        cardHeader.appendChild(nameEl);
        card.appendChild(cardHeader);

        const cardBody = document.createElement('div');
        cardBody.className = 'card-body';

        const thresholds = state.thresholds[assetName];
        let riskLevelValue = 'N/A';
        let riskColorClass = '';
        if (thresholds && thresholds.low != null && thresholds.high != null && thresholds.high > thresholds.low) {
            const percentage = (currentPrice - thresholds.low) / (thresholds.high - thresholds.low);
            if (percentage >= 0 && percentage <= 1) {
                riskLevelValue = percentage.toFixed(3);
            }
            riskColorClass = getColorClass(currentPrice, assetName);
        }
        const riskPoint = createDataPoint('Risk Level', riskLevelValue, riskColorClass);
        riskPoint.querySelector('.value').classList.add('risk-level');
        cardBody.appendChild(riskPoint);

        cardBody.appendChild(createDataPoint('Current Price', assetData[1] || 'N/A'));

        if (!isNaN(potentialHigh) && !isNaN(currentPrice) && currentPrice > 0) {
            const upside = ((potentialHigh / currentPrice) - 1) * 100;
            cardBody.appendChild(createDataPoint('Potential Upside', `${upside.toFixed(0)}%`));

            const xValue = potentialHigh / currentPrice;
            cardBody.appendChild(createDataPoint('X\'s', `${xValue.toFixed(2)}x`));
        }

        card.appendChild(cardBody);
        return card;
    }

    function createDataPoint(label, value, colorClass = null) {
        const dataPoint = document.createElement('div');
        dataPoint.className = 'data-point';

        const labelEl = document.createElement('span');
        labelEl.className = 'label';
        labelEl.textContent = label;

        const valueEl = document.createElement('span');
        valueEl.className = 'value';
        valueEl.textContent = value;

        if (colorClass) {
            valueEl.classList.add(colorClass);
        }

        dataPoint.appendChild(labelEl);
        dataPoint.appendChild(valueEl);
        return dataPoint;
    }

    async function fetchData() {
        const url = localStorage.getItem(CSV_URL_KEY) || DEFAULT_CSV_URL;
        try {
            const response = await fetch(url, { cache: 'no-cache' });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const csvText = await response.text();
            state.portfolio = parseCSV(csvText);
            renderData();
        } catch (error) {
            console.error('Error fetching or parsing data:', error);
            assetGrid.innerHTML = `<p class="error">Could not load data. Please check the CSV URL in Settings.</p>`;
        }
    }

    // --- Initial Load and State Management ---
    function loadState() {
        const savedUrl = localStorage.getItem(CSV_URL_KEY) || DEFAULT_CSV_URL;
        csvUrlInput.value = savedUrl;

        const savedThresholds = JSON.parse(localStorage.getItem(THRESHOLDS_KEY)) || {};
        state.thresholds = savedThresholds;
    }

    async function initializeApp() {
        loadState();
        await fetchData();

        setInterval(fetchData, 5 * 60 * 1000);
    }

    initializeApp();
});
