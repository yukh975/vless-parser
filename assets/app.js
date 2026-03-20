const form       = document.getElementById('vless-form');
const submitBtn  = document.getElementById('submit-btn');
const clearBtn   = document.getElementById('clear-btn');
const resultBox  = document.getElementById('result');
const resultPre  = document.getElementById('result-json');
const copyBtn    = document.getElementById('copy-btn');
const downloadBtn = document.getElementById('download-btn');
const errorBox   = document.getElementById('error');
const errorText  = document.getElementById('error-text');

function showError(msg) {
    errorBox.classList.remove('hidden');
    errorText.textContent = msg;
    resultBox.classList.add('hidden');
}

function showResult(json) {
    resultPre.textContent = JSON.stringify(json, null, 2);
    resultBox.classList.remove('hidden');
    errorBox.classList.add('hidden');
}

function hideAll() {
    resultBox.classList.add('hidden');
    errorBox.classList.add('hidden');
}

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAll();

    const ip   = document.getElementById('inbound_ip').value.trim();
    const port = parseInt(document.getElementById('inbound_port').value, 10);
    const link = document.getElementById('vless_link').value.trim();

    if (!link.startsWith('vless://')) {
        showError('VLESS-ссылка должна начинаться с vless://');
        return;
    }

    submitBtn.disabled = true;

    try {
        const res = await fetch('api/parse.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ inbound_ip: ip, inbound_port: port, vless_link: link }),
        });

        const data = await res.json();

        if (!res.ok || data.error) {
            showError(data.error ?? `Ошибка сервера: ${res.status}`);
        } else {
            showResult(data);
        }
    } catch (err) {
        showError('Не удалось связаться с сервером: ' + err.message);
    } finally {
        submitBtn.disabled = false;
    }
});

clearBtn.addEventListener('click', () => {
    form.reset();
    document.getElementById('inbound_ip').value = '0.0.0.0';
    hideAll();
});

copyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(resultPre.textContent).then(() => {
        const orig = copyBtn.textContent;
        copyBtn.textContent = '✓ Скопировано';
        setTimeout(() => { copyBtn.textContent = orig; }, 1500);
    });
});

downloadBtn.addEventListener('click', () => {
    const blob = new Blob([resultPre.textContent], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = 'config.json';
    a.click();
    URL.revokeObjectURL(url);
});
