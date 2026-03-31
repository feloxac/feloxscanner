const keyInput = document.getElementById('key-input');
const keySubmit = document.getElementById('key-submit');
const keyError = document.getElementById('key-error');
const progressFill = document.getElementById('progress-fill');
const progressText = document.getElementById('progress-text');

function showScreen(name) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById('screen-' + name).classList.add('active');
}

keySubmit.addEventListener('click', async () => {
    const key = keyInput.value.trim();
    if (key.length !== 6 || !/^\d{6}$/.test(key)) {
        keyError.textContent = 'Please enter a valid 6-digit PIN.';
        return;
    }

    keyError.textContent = '';
    keySubmit.disabled = true;
    keySubmit.textContent = 'Validating...';

    try {
        const result = await window.electronAPI.validateKey(key);
        if (result.valid) {
            showScreen('scan');
            window.electronAPI.startScan(key);
        } else {
            keyError.textContent = result.error || 'Invalid or expired PIN.';
        }
    } catch (e) {
        keyError.textContent = 'Connection error. Please try again.';
    }

    keySubmit.disabled = false;
    keySubmit.textContent = 'START';
});

keyInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') keySubmit.click();
});

window.electronAPI.onScanProgress((data) => {
    const { percent, text } = data;
    progressFill.style.width = percent + '%';
    progressText.textContent = text;
});

window.electronAPI.onScanComplete((data) => {
    showScreen('done');
    const doneStatus = document.getElementById('done-status');
    const doneText = document.getElementById('done-text');

    if (data.threats > 0) {
        doneStatus.textContent = 'THREATS FOUND';
        doneStatus.style.color = '#ef4444';
        doneText.textContent = 'Scan complete. ' + data.threats + ' threat(s) detected. Results uploaded.';
    } else {
        doneStatus.textContent = 'CLEAN';
        doneStatus.style.color = '#10b981';
        doneText.textContent = 'Scan complete. No threats found. Results uploaded.';
    }
});
