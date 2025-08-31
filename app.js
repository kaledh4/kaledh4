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
    const sheetUrlInput = document.getElementById('sheet-url');
    const sheetIframe = document.getElementById('sheet-iframe');

    // Load saved URL from localStorage
    const savedUrl = localStorage.getItem('sheetUrl');
    if (savedUrl) {
        sheetIframe.src = savedUrl;
        sheetUrlInput.value = savedUrl;
    } else {
        // Set default value for the input field if no URL is saved
        sheetUrlInput.value = "https://docs.google.com/spreadsheets/d/e/2PACX-1vS-5OsqjNT67tgHrxE--6knTnRTxkmfVVsPV8mnHYzIka5wSopTd43MTckKZ1kBiskZtRuIq2q7gCBj/pubhtml?gid=0&single=true&widget=false&headers=false&range=B1:E11&widget=false&chrome=false&rm=minimal";
    }

    // Open modal
    settingsBtn.addEventListener('click', () => {
        modal.style.display = 'block';
    });

    // Close modal
    closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    // Close modal on outside click
    window.addEventListener('click', (event) => {
        if (event.target == modal) {
            modal.style.display = 'none';
        }
    });

    // Handle form submission
    settingsForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const newUrl = sheetUrlInput.value;
        if (newUrl) {
            localStorage.setItem('sheetUrl', newUrl);
            sheetIframe.src = newUrl;
            modal.style.display = 'none';
        }
    });
});
