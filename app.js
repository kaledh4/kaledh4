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
    const macroSettingsForm = document.getElementById('macro-settings-form');
    const fedStanceSelect = document.getElementById('fed-stance');
    const fedRateInput = document.getElementById('fed-rate');
    const rStarRateInput = document.getElementById('r-star-rate');
    const fedStanceDisplay = document.getElementById('fed-stance-display');
    const interestRateDisplay = document.getElementById('interest-rate-display');

    // --- Constants and State ---
    const CSV_URL_KEY = 'csvUrl';
    const THRESHOLDS_KEY = 'assetThresholds';
    const MACRO_DATA_KEY = 'macroData';
    const DEFAULT_CSV_URL = 'dummy_data.csv';
    let state = {
        portfolio: [], // Will hold data from the CSV
        coinList: {}, // Mapping from symbol to coingecko id
        thresholds: {},
        macro: {}
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

    macroSettingsForm.addEventListener('submit', (e) => {
        e.preventDefault();
        state.macro.fedStance = fedStanceSelect.value;
        state.macro.fedRate = parseFloat(fedRateInput.value);
        state.macro.rStarRate = parseFloat(rStarRateInput.value);
        localStorage.setItem(MACRO_DATA_KEY, JSON.stringify(state.macro));
        displayMacroData();
        alert('Macro data saved!');
    });


    // --- Data Fetching and Rendering ---
    async function fetchCoinList() {
        try {
            const response = await fetch('https://api.coingecko.com/api/v3/coins/list');
            const data = await response.json();
            data.forEach(coin => {
                state.coinList[coin.symbol.toUpperCase()] = coin.id;
            });
        } catch (error) {
            console.error("Error fetching coin list:", error);
        }
    }

    function parseCSV(csvText) {
        const rows = csvText.trim().split('\n');
        return rows.map(row => row.split(','));
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

        const currentPrice = assetData.livePrice;
        const riskLevel = parseFloat(assetData[1]); // The user said this is the risk level
        const potentialHigh = parseFloat(assetData[4]);

        const card = document.createElement('div');
        card.className = 'asset-card';

        // --- Card Header ---
        const cardHeader = document.createElement('div');
        cardHeader.className = 'card-header';
        const nameEl = document.createElement('span');
        nameEl.className = 'asset-name';
        nameEl.textContent = assetName;
        cardHeader.appendChild(nameEl);
        card.appendChild(cardHeader);

        // --- Card Body ---
        const cardBody = document.createElement('div');
        cardBody.className = 'card-body';

        // Risk Level
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

        // Current Price
        const priceText = currentPrice ? `$${currentPrice}` : 'N/A';
        cardBody.appendChild(createDataPoint('Current Price', priceText));

        // Potential Upside
        if (currentPrice && !isNaN(potentialHigh) && currentPrice > 0) {
            const upside = ((potentialHigh / currentPrice) - 1) * 100;
            cardBody.appendChild(createDataPoint('Potential Upside', `${upside.toFixed(0)}%`));
        }

        // X's
        if (currentPrice && !isNaN(potentialHigh) && currentPrice > 0) {
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
        // 1. Fetch portfolio from CSV
        const url = localStorage.getItem(CSV_URL_KEY) || DEFAULT_CSV_URL;
        try {
            const response = await fetch(url, { cache: 'no-cache' });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const csvText = await response.text();
            state.portfolio = parseCSV(csvText);

            // 2. Get coin IDs for the portfolio
            const coinIds = state.portfolio.map(asset => state.coinList[asset[0].toUpperCase()]).filter(id => id).join(',');

            // 3. Fetch prices from CoinGecko
            if (coinIds) {
                const priceResponse = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${coinIds}&vs_currencies=usd`);
                const priceData = await priceResponse.json();

                // 4. Merge prices into portfolio data
                state.portfolio.forEach(asset => {
                    const assetId = state.coinList[asset[0].toUpperCase()];
                    if (priceData[assetId]) {
                        asset.livePrice = priceData[assetId].usd;
                    }
                });
            }

            renderData();

        } catch (error) {
            console.error('Error fetching or parsing data:', error);
            assetGrid.innerHTML = `<p class="error">Could not load data. Please check the CSV URL in Settings.</p>`;
        }
    }

    // --- Macro Data and Halving Countdown ---
    function displayMacroData() {
        fedStanceDisplay.innerHTML = '';
        interestRateDisplay.innerHTML = '';

        if (state.macro.fedStance) {
            fedStanceDisplay.appendChild(createDataPoint('Fed Stance', state.macro.fedStance));
        }
        if (!isNaN(state.macro.fedRate)) {
            interestRateDisplay.appendChild(createDataPoint('Fed Rate', `${state.macro.fedRate}%`));
        }
        if (!isNaN(state.macro.rStarRate)) {
            interestRateDisplay.appendChild(createDataPoint('R* Rate', `${state.macro.rStarRate}%`));
        }
    }

    function updateCountdown() {
        const countdownTimer = document.getElementById('countdown-timer');
        if (!countdownTimer) return;
        const halvingDate = new Date('2028-07-01T00:00:00');
        const now = new Date();
        const diffTime = halvingDate - now;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        countdownTimer.textContent = diffDays;
    }

    // --- Initial Load and State Management ---
    function loadState() {
        const savedUrl = localStorage.getItem(CSV_URL_KEY) || DEFAULT_CSV_URL;
        csvUrlInput.value = savedUrl;

        const savedThresholds = JSON.parse(localStorage.getItem(THRESHOLDS_KEY)) || {};
        state.thresholds = savedThresholds;

        const savedMacro = JSON.parse(localStorage.getItem(MACRO_DATA_KEY)) || {};
        state.macro = savedMacro;
        fedStanceSelect.value = state.macro.fedStance || 'neutral';
        fedRateInput.value = state.macro.fedRate || '';
        rStarRateInput.value = state.macro.rStarRate || '';
    }

    async function initializeApp() {
        loadState();
        await fetchCoinList();
        await fetchData();
        displayMacroData();
        updateCountdown();

        setInterval(fetchData, 5 * 60 * 1000);
        setInterval(updateCountdown, 60 * 60 * 1000);
    }

    initializeApp();
});
