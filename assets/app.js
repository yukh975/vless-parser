// ============================================================
//  Constants & defaults
// ============================================================

const DEFAULT_DATABASES = ['geosite.dat', 'geoip.dat'];

// Preset values shown as datalist suggestions in the rule value field
const PRESETS = {
    domain: [
        { value: 'ru-blocked',                  label: 'ru-blocked — заблокированные в РФ (antifilter + re:filter)' },
        { value: 'ru-blocked-all',              label: 'ru-blocked-all — все заблокированные в РФ (700k+, осторожно)' },
        { value: 'ru-available-only-inside',    label: 'ru-available-only-inside — доступно только внутри РФ' },
        { value: 'antifilter-download',         label: 'antifilter-download — antifilter.download (700k, осторожно)' },
        { value: 'antifilter-download-community', label: 'antifilter-download-community — community.antifilter.download' },
        { value: 'refilter',                    label: 'refilter — re:filter' },
        { value: 'category-ads-all',            label: 'category-ads-all — рекламные домены' },
        { value: 'win-spy',                     label: 'win-spy — слежка Windows' },
        { value: 'win-update',                  label: 'win-update — обновления Windows' },
        { value: 'win-extra',                   label: 'win-extra — прочие домены Windows' },
        { value: 'ru',                          label: 'ru — российские домены' },
    ],
    ip: [
        { value: 'private', label: 'private — локальные адреса (LAN)' },
        { value: 'ru',      label: 'ru — российские IP-адреса' },
    ],
};

const DEFAULT_RULES = [
    { rule_type: 'ip',     db: 'geoip.dat',   value: 'private',            action: 'direct' },
    { rule_type: 'domain', db: 'geosite.dat',  value: 'ru',                 action: 'direct' },
    { rule_type: 'ip',     db: 'geoip.dat',   value: 'ru',                 action: 'direct' },
    { rule_type: 'domain', db: 'geosite.dat',  value: 'category-ads-all',   action: 'block'  },
];

// ============================================================
//  DOM refs
// ============================================================

const form           = document.getElementById('vless-form');
const submitBtn      = document.getElementById('submit-btn');
const clearBtn       = document.getElementById('clear-btn');
const resultBox      = document.getElementById('result');
const resultPre      = document.getElementById('result-json');
const copyBtn        = document.getElementById('copy-btn');
const downloadBtn    = document.getElementById('download-btn');
const errorBox       = document.getElementById('error');
const errorText      = document.getElementById('error-text');

const dbListEl       = document.getElementById('db-list');
const addDbBtn       = document.getElementById('add-db-btn');
const addDbForm      = document.getElementById('add-db-form');
const newDbName      = document.getElementById('new-db-name');
const confirmDbBtn   = document.getElementById('confirm-db-btn');
const cancelDbBtn    = document.getElementById('cancel-db-btn');

const rulesContainer = document.getElementById('routing-rules');
const addRuleBtn     = document.getElementById('add-rule-btn');

// ============================================================
//  State
// ============================================================

let databases = [];

// ============================================================
//  LocalStorage persistence
// ============================================================

const LS_KEY = 'vless_parser_state';

function saveState() {
    const state = {
        inbound_ip:   document.getElementById('inbound_ip').value,
        inbound_port: document.getElementById('inbound_port').value,
        vless_link:   document.getElementById('vless_link').value,
        databases,
        rules: collectRules(),
    };
    localStorage.setItem(LS_KEY, JSON.stringify(state));
}

function loadState() {
    try {
        const raw = localStorage.getItem(LS_KEY);
        if (!raw) return null;
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

// Auto-save on any input change
document.addEventListener('input', saveState);
document.addEventListener('change', saveState);

// ============================================================
//  Database manager
// ============================================================

function renderDatabases() {
    dbListEl.innerHTML = '';
    databases.forEach((name, idx) => {
        const tag = document.createElement('div');
        tag.className = 'db-tag';
        tag.innerHTML = `
            <span class="db-tag-name">${name}</span>
            <button type="button" class="remove-btn db-remove" title="Удалить">✕</button>
        `;
        tag.querySelector('.db-remove').addEventListener('click', () => {
            databases.splice(idx, 1);
            renderDatabases();
            renderAllRuleDbSelects();
            saveState();
        });
        dbListEl.appendChild(tag);
    });
}

function getDbsForType(ruleType) {
    const prefix = ruleType === 'ip' ? 'geoip' : 'geosite';
    return databases.filter(name => name.startsWith(prefix));
}

addDbBtn.addEventListener('click', () => {
    addDbForm.classList.toggle('hidden');
    newDbName.focus();
});

cancelDbBtn.addEventListener('click', () => {
    addDbForm.classList.add('hidden');
    newDbName.value = '';
});

confirmDbBtn.addEventListener('click', () => {
    const name = newDbName.value.trim();
    if (!name) return;

    if (databases.includes(name)) {
        newDbName.focus();
        return;
    }

    databases.push(name);
    renderDatabases();
    renderAllRuleDbSelects();
    addDbForm.classList.add('hidden');
    newDbName.value = '';
    saveState();
});

newDbName.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); confirmDbBtn.click(); }
    if (e.key === 'Escape') cancelDbBtn.click();
});

// ============================================================
//  Routing rules
// ============================================================

function buildDbSelect(ruleType, selectedDb) {
    const dbs = getDbsForType(ruleType);
    const select = document.createElement('select');
    select.className = 'rule-db';

    dbs.forEach(name => {
        const opt = document.createElement('option');
        opt.value = name;
        opt.textContent = name;
        if (name === selectedDb) opt.selected = true;
        select.appendChild(opt);
    });

    return select;
}

function buildDatalist(ruleType) {
    const listId = `presets-${ruleType}`;
    // Reuse existing datalist if already in DOM
    if (!document.getElementById(listId)) {
        const dl = document.createElement('datalist');
        dl.id = listId;
        (PRESETS[ruleType] ?? []).forEach(({ value, label }) => {
            const opt = document.createElement('option');
            opt.value = value;
            opt.label = label;
            dl.appendChild(opt);
        });
        document.body.appendChild(dl);
    }
    return listId;
}

function createRuleRow({ rule_type = 'domain', db = '', value = '', action = 'proxy' } = {}) {
    const row = document.createElement('div');
    row.className = 'rule-row';

    const typeSelect = document.createElement('select');
    typeSelect.className = 'rule-type';
    typeSelect.innerHTML = `
        <option value="domain" ${rule_type === 'domain' ? 'selected' : ''}>Domain</option>
        <option value="ip"     ${rule_type === 'ip'     ? 'selected' : ''}>IP</option>
    `;

    const defaultDb = db || (rule_type === 'ip' ? 'geoip.dat' : 'geosite.dat');
    const dbSelect = buildDbSelect(rule_type, defaultDb);

    const valueInput = document.createElement('input');
    valueInput.type = 'text';
    valueInput.className = 'rule-value';
    valueInput.placeholder = rule_type === 'ip' ? 'ru / 10.0.0.0/8' : 'ru / category-ads-all';
    valueInput.value = value;
    valueInput.setAttribute('list', buildDatalist(rule_type));
    valueInput.autocomplete = 'off';

    const actionSelect = document.createElement('select');
    actionSelect.className = 'rule-action';
    actionSelect.innerHTML = `
        <option value="direct" ${action === 'direct' ? 'selected' : ''}>direct</option>
        <option value="proxy"  ${action === 'proxy'  ? 'selected' : ''}>proxy</option>
        <option value="block"  ${action === 'block'  ? 'selected' : ''}>block</option>
    `;

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'remove-btn';
    removeBtn.title = 'Удалить';
    removeBtn.textContent = '✕';

    // When rule type changes — rebuild DB select and switch datalist
    typeSelect.addEventListener('change', () => {
        const newType = typeSelect.value;
        const newDbSelect = buildDbSelect(newType, '');
        row.replaceChild(newDbSelect, row.querySelector('.rule-db'));
        valueInput.placeholder = newType === 'ip' ? 'ru / 10.0.0.0/8' : 'ru / category-ads-all';
        valueInput.setAttribute('list', buildDatalist(newType));
        saveState();
    });

    removeBtn.addEventListener('click', () => { row.remove(); saveState(); });

    row.appendChild(typeSelect);
    row.appendChild(dbSelect);
    row.appendChild(valueInput);
    row.appendChild(actionSelect);
    row.appendChild(removeBtn);

    return row;
}

function renderAllRuleDbSelects() {
    rulesContainer.querySelectorAll('.rule-row').forEach(row => {
        const ruleType  = row.querySelector('.rule-type').value;
        const currentDb = row.querySelector('.rule-db')?.value ?? '';
        const newDbSel  = buildDbSelect(ruleType, currentDb);
        row.replaceChild(newDbSel, row.querySelector('.rule-db'));
    });
}

function loadDefaultRules() {
    rulesContainer.innerHTML = '';
    DEFAULT_RULES.forEach(rule => rulesContainer.appendChild(createRuleRow(rule)));
}

function collectRules() {
    return [...rulesContainer.querySelectorAll('.rule-row')].map(row => ({
        rule_type: row.querySelector('.rule-type').value,
        db:        row.querySelector('.rule-db')?.value ?? '',
        value:     row.querySelector('.rule-value').value.trim(),
        action:    row.querySelector('.rule-action').value,
    })).filter(r => r.value !== '');
}

addRuleBtn.addEventListener('click', () => {
    rulesContainer.appendChild(createRuleRow());
    saveState();
});

// ============================================================
//  Init: restore from localStorage or load defaults
// ============================================================

(function init() {
    const state = loadState();

    if (state) {
        document.getElementById('inbound_ip').value   = state.inbound_ip   ?? '0.0.0.0';
        document.getElementById('inbound_port').value = state.inbound_port ?? '10808';
        document.getElementById('vless_link').value   = state.vless_link   ?? '';

        databases = Array.isArray(state.databases) ? state.databases : [...DEFAULT_DATABASES];
        renderDatabases();

        rulesContainer.innerHTML = '';
        const rules = Array.isArray(state.rules) && state.rules.length ? state.rules : DEFAULT_RULES;
        rules.forEach(rule => rulesContainer.appendChild(createRuleRow(rule)));
    } else {
        databases = [...DEFAULT_DATABASES];
        renderDatabases();
        loadDefaultRules();
    }
})();

// ============================================================
//  Form submit
// ============================================================

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

// ============================================================
//  Clear
// ============================================================

clearBtn.addEventListener('click', () => {
    form.reset();
    document.getElementById('inbound_ip').value   = '0.0.0.0';
    document.getElementById('inbound_port').value = '10808';
    databases = [...DEFAULT_DATABASES];
    renderDatabases();
    loadDefaultRules();
    hideAll();
    localStorage.removeItem(LS_KEY);
});

// ============================================================
//  Result helpers
// ============================================================

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

// ============================================================
//  Copy / Download
// ============================================================

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
