if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').then(registration => {
        console.log("SW registered");
    }).catch(err => {
        console.log("SW registration failed: ", err);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    const settingsBtn = document.getElementById('settings-btn');
    const modal = document.getElementById('settings-modal');
    const closeBtn = document.querySelector('.close-btn');
    const settingsForm = document.getElementById('settings-form');
    const csvUrlInput = document.getElementById('csv-url');
    const dataContainer = document.getElementById('data-container');
    const countdownTimer = document.getElementById('countdown-timer');
    const halvingDataContainer = document.getElementById('halving-data-container');

    const CSV_URL_KEY = 'csvUrl';
    const DEFAULT_CSV_URL = 'dummy_data.csv';

    // --- Modal Logic ---
    settingsBtn.addEventListener('click', () => modal.style.display = 'block');
    closeBtn.addEventListener('click', () => modal.style.display = 'none');
    window.addEventListener('click', (event) => {
        if (event.target == modal) modal.style.display = 'none';
    });

    settingsForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const newUrl = csvUrlInput.value;
        if (newUrl) {
            localStorage.setItem(CSV_URL_KEY, newUrl);
            fetchAndDisplayData(newUrl);
            modal.style.display = 'none';
        }
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

    function getColorClass(value) {
        const num = parseFloat(value);
        if (isNaN(num)) return '';

        if (num < 0) return 'gradient-1';
        if (num >= 0 && num < 1) return 'gradient-2';
        if (num >= 1 && num < 10) return 'gradient-3';
        if (num >= 10 && num < 50) return 'gradient-4';
        if (num >= 50 && num < 100) return 'gradient-5';
        if (num >= 100 && num < 1000) return 'gradient-6';
        if (num >= 1000 && num < 5000) return 'gradient-7';
        if (num >= 5000 && num < 10000) return 'gradient-8';
        if (num >= 10000 && num < 50000) return 'gradient-9';
        if (num >= 50000) return 'gradient-10';
        return '';
    }

    function renderData(data) {
        const table = document.createElement('table');
        table.className = 'data-table';
        const tbody = document.createElement('tbody');

        data.forEach(rowData => {
            const tr = document.createElement('tr');
            rowData.forEach(cellData => {
                const td = document.createElement('td');
                td.textContent = cellData;
                const colorClass = getColorClass(cellData);
                if (colorClass) {
                    td.classList.add(colorClass);
                }
                tr.appendChild(td);
            });
            tbody.appendChild(tr);
        });

        table.appendChild(tbody);
        dataContainer.innerHTML = '';
        dataContainer.appendChild(table);
    }

    async function fetchAndDisplayData(url) {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const csvText = await response.text();
            const data = parseCSV(csvText);
            renderData(data);
        } catch (error) {
            console.error('Error fetching or parsing data:', error);
            dataContainer.innerHTML = `<p class="error">Could not load data. Please check the CSV URL in Settings.</p>`;
        }
    }

    // --- Halving Countdown and Data ---
    function updateCountdown() {
        const halvingDate = new Date('2028-07-01T00:00:00');
        const now = new Date();
        const diffTime = halvingDate - now;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        countdownTimer.textContent = `${diffDays} days`;
    }

    function displayHalvingData() {
        const halvingData = {
            "Estimated Year": "2028",
            "Block": "1,050,000",
            "Block Reward After Halving": "1.5625 BTC"
        };
        const dl = document.createElement('dl');
        for (const [key, value] of Object.entries(halvingData)) {
            const dt = document.createElement('dt');
            dt.textContent = key;
            const dd = document.createElement('dd');
            dd.textContent = value;
            dl.appendChild(dt);
            dl.appendChild(dd);
        }
        halvingDataContainer.innerHTML = '';
        halvingDataContainer.appendChild(dl);
    }

    // --- Initial Load and Refresh ---
    function initializeApp() {
        const savedUrl = localStorage.getItem(CSV_URL_KEY) || DEFAULT_CSV_URL;
        csvUrlInput.value = savedUrl;
        fetchAndDisplayData(savedUrl);
        updateCountdown();
        displayHalvingData();

        setInterval(() => {
            const currentUrl = localStorage.getItem(CSV_URL_KEY) || DEFAULT_CSV_URL;
            fetchAndDisplayData(currentUrl);
        }, 6 * 60 * 60 * 1000);

        setInterval(updateCountdown, 60 * 60 * 1000);
    }

    initializeApp();
});
