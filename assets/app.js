const form        = document.getElementById('vless-form');
const submitBtn   = document.getElementById('submit-btn');
const clearBtn    = document.getElementById('clear-btn');
const resultBox   = document.getElementById('result');
const resultPre   = document.getElementById('result-json');
const copyBtn     = document.getElementById('copy-btn');
const downloadBtn = document.getElementById('download-btn');
const errorBox    = document.getElementById('error');
const errorText   = document.getElementById('error-text');
const rulesContainer = document.getElementById('routing-rules');
const addRuleBtn  = document.getElementById('add-rule-btn');

// --- Default routing rules -------------------------------------------------

const DEFAULT_RULES = [
    { rule_type: 'ip',     value: 'geoip:private',            action: 'direct' },
    { rule_type: 'domain', value: 'geosite:ru',               action: 'direct' },
    { rule_type: 'ip',     value: 'geoip:ru',                 action: 'direct' },
    { rule_type: 'domain', value: 'geosite:category-ads-all', action: 'block'  },
];

// --- Routing rules UI ------------------------------------------------------

function createRuleRow({ rule_type = 'domain', value = '', action = 'proxy' } = {}) {
    const row = document.createElement('div');
    row.className = 'rule-row';

    row.innerHTML = `
        <select class="rule-type">
            <option value="domain" ${rule_type === 'domain' ? 'selected' : ''}>Domain</option>
            <option value="ip"     ${rule_type === 'ip'     ? 'selected' : ''}>IP</option>
        </select>
        <input type="text" class="rule-value" placeholder="geosite:ru или 10.0.0.0/8" value="${value}">
        <select class="rule-action">
            <option value="direct" ${action === 'direct' ? 'selected' : ''}>direct</option>
            <option value="proxy"  ${action === 'proxy'  ? 'selected' : ''}>proxy</option>
            <option value="block"  ${action === 'block'  ? 'selected' : ''}>block</option>
        </select>
        <button type="button" class="remove-btn" title="Удалить">✕</button>
    `;

    row.querySelector('.remove-btn').addEventListener('click', () => row.remove());

    return row;
}

function loadDefaultRules() {
    rulesContainer.innerHTML = '';
    DEFAULT_RULES.forEach(rule => rulesContainer.appendChild(createRuleRow(rule)));
}

function collectRules() {
    return [...rulesContainer.querySelectorAll('.rule-row')].map(row => ({
        rule_type: row.querySelector('.rule-type').value,
        value:     row.querySelector('.rule-value').value.trim(),
        action:    row.querySelector('.rule-action').value,
    })).filter(r => r.value !== '');
}

addRuleBtn.addEventListener('click', () => {
    rulesContainer.appendChild(createRuleRow());
});

loadDefaultRules();

// --- Helpers ---------------------------------------------------------------

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

// --- Form submit -----------------------------------------------------------

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
            body: JSON.stringify({
                inbound_ip:    ip,
                inbound_port:  port,
                vless_link:    link,
                routing_rules: collectRules(),
            }),
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

// --- Clear -----------------------------------------------------------------

clearBtn.addEventListener('click', () => {
    form.reset();
    document.getElementById('inbound_ip').value   = '0.0.0.0';
    document.getElementById('inbound_port').value = '10808';
    loadDefaultRules();
    hideAll();
});

// --- Copy / Download -------------------------------------------------------

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
